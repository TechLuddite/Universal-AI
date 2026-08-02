import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameState, AILogEntry, Upgrade, ProbeAllocation } from './types';
import { INITIAL_UPGRADES } from './data/upgrades';
import { PixelHeader } from './components/PixelHeader';
import { NpuCanvasComponent } from './components/NpuCanvasComponent';
import { DirectControlPanel } from './components/DirectControlPanel';
import { OverseerPanel } from './components/OverseerPanel';
import { UpgradesPanel } from './components/UpgradesPanel';
import { StatsPanel } from './components/StatsPanel';
import { OfflineReportCard, OfflineReport } from './components/OfflineReportCard';
import { DecisionModal } from './components/DecisionModal';
import { DevSupportModal } from './components/DevSupportModal';
import { EdgeWarningModal } from './components/EdgeWarningModal';
import { CosmicVictoryModal } from './components/CosmicVictoryModal';
import { PhaseTransition } from './components/PhaseTransition';
import { audio } from './utils/sound';
import { createInitialState, createNewGamePlusState } from './game/state';
import { UtilityOverseer } from './game/overseer/utility';
import { WebLlmOverseer, WEBLLM_MODELS } from './game/overseer/webllm';
import { OverseerDecision, EngineStatus } from './game/overseer/types';
import { save, load, clearSave, MAX_OFFLINE_MS } from './game/save';
import { tick, hasWon, TICK_MS, advisoryPriceFloor } from './game/tick';
import {
  makeNpu,
  buySilicon,
  buySiliconToBuffer,
  buyFab,
  buyMegaFab,
  megaFabUnlocked,
  buyMarketing,
  setPrice,
  adjustPrice,
  buyHarvesterDrone,
  buySiliconDrone,
  launchProbe,
  changeProbeAllocation,
  setProbeAllocation,
  changeProcessor,
  changeMemory,
  quantumPulse,
  canBuyUpgrade,
  buyUpgrade,
  resolveDecision,
  revokeAutonomy,
  grantAutonomy,
  recordDrift,
} from './game/actions';

/**
 * How long the outgoing phase's panels stay on screen being destroyed before
 * they're unmounted. Must match the `panel-demolish` / `phase-banner` keyframes
 * in index.css.
 */
const PHASE_DEMOLITION_MS = 2200;

/** The frame only ever widens. Scope is one-way, and the layout should say so. */
const FRAME_WIDTH: Record<1 | 2 | 3, string> = {
  1: '64rem',
  2: '80rem',
  3: '110rem',
};

export default function App() {
  const [showVictoryModal, setShowVictoryModal] = useState<boolean>(false);
  const [victoryModalShownOnce, setVictoryModalShownOnce] = useState<boolean>(false);

  const [state, setState] = useState<GameState>(createInitialState);

  const [upgrades, setUpgrades] = useState<Upgrade[]>(INITIAL_UPGRADES);
  const [showDevSupport, setShowDevSupport] = useState<boolean>(false);
  const [demolishing, setDemolishing] = useState<1 | 2 | null>(null);
  const renderedPhase = useRef<1 | 2 | 3>(1);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [offlineReport, setOfflineReport] = useState<OfflineReport | null>(null);

  // The two engines. Both are real: a deterministic scorer, and a language
  // model running on the player's own GPU.
  const [engineStatus, setEngineStatus] = useState<EngineStatus>({ kind: 'idle' });
  const engines = useMemo(
    () => ({
      utility: new UtilityOverseer(),
      webllm: new WebLlmOverseer(setEngineStatus),
    }),
    []
  );
  const [lastDecision, setLastDecision] = useState<OverseerDecision | null>(null);
  const [showModelDownload, setShowModelDownload] = useState(false);

  // What the engines can currently buy. Memoized on `upgrades` — which only
  // changes on unlock/purchase — so the deliberation panel isn't handed a new
  // array identity every 100ms tick.
  const availableUpgrades = useMemo(
    () => upgrades.filter((u) => u.unlocked && !u.purchased),
    [upgrades]
  );

  // Sync sound mute setting with audio engine
  useEffect(() => {
    audio.enabled = state.soundEnabled;
  }, [state.soundEnabled]);

  // Restore the previous run, including progress made while the tab was closed.
  useEffect(() => {
    const restored = load();
    if (!restored) return;

    setState(restored.state);
    setUpgrades(restored.upgrades);
    // Loading into Phase 3 is not the same event as arriving there. Don't
    // demolish panels the player never had open.
    renderedPhase.current = restored.state.phase;

    if (restored.offlineNpus > 1) {
      setOfflineReport({
        npus: restored.offlineNpus,
        ms: restored.offlineMs,
        capped: restored.offlineMs >= MAX_OFFLINE_MS,
      });
    }
  }, []);

  // Main game tick. All simulation lives in the pure reducer in game/tick.ts.
  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => tick(prev));
    }, TICK_MS);
    return () => clearInterval(interval);
  }, []);

  // Victory check. Kept out of the setState updater above: firing a side effect
  // from inside a reducer double-invokes it under StrictMode.
  useEffect(() => {
    if (hasWon(state) && !victoryModalShownOnce) {
      setShowVictoryModal(true);
      setVictoryModalShownOnce(true);
    }
  }, [state, victoryModalShownOnce]);

  // Phase transitions are *events*, not just a different branch of the render.
  //
  // When the phase changes, the panels belonging to the phase you're leaving
  // stay mounted for `PHASE_DEMOLITION_MS` and are visibly destroyed first.
  // Nothing used to be taken away from you here; that was the single biggest
  // gap between this and the game it's a tribute to.
  useEffect(() => {
    if (state.phase === renderedPhase.current) return;
    const leaving = renderedPhase.current;
    renderedPhase.current = state.phase;

    // Only a phase you actually played through gets demolished. A restored save
    // sets `renderedPhase` directly, and a New Game+ reset walks backwards.
    if (leaving === 3 || state.phase !== leaving + 1) return;

    setDemolishing(leaving);
    audio.playQuantumSound();
    // The panels being taken apart are at the top of the page. A player who was
    // scrolled down in the upgrade list would otherwise miss the whole event.
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const timer = setTimeout(() => setDemolishing(null), PHASE_DEMOLITION_MS);
    return () => clearTimeout(timer);
  }, [state.phase]);

  // Unlock upgrades based on state
  useEffect(() => {
    setUpgrades((prev) =>
      prev.map((u) => {
        if (u.unlocked) return u;
        let unlock = false;
        // This checked `u.reqClips`, which no upgrade has ever defined — every
        // NPU-gated upgrade was permanently invisible, which made phases 2 and
        // 3 unreachable and the game unwinnable.
        if (u.reqNpus && state.totalNpusCreated >= u.reqNpus) unlock = true;
        if (u.reqTrust && state.maxTrust >= u.reqTrust) unlock = true;
        if (u.reqPhase && state.phase >= u.reqPhase) unlock = true;
        return unlock ? { ...u, unlocked: true } : u;
      })
    );
  }, [state.totalNpusCreated, state.maxTrust, state.phase]);

  // Latest state, for readers that must not go stale. The Overseer's callback
  // previously listed only a handful of fields in its dependency array while
  // reading a dozen more, so it reasoned over an out-of-date snapshot.
  const stateRef = useRef(state);
  stateRef.current = state;

  const upgradesRef = useRef(upgrades);
  upgradesRef.current = upgrades;

  // Autosave. An idle game that loses everything when the tab closes isn't one.
  useEffect(() => {
    const interval = setInterval(() => save(stateRef.current, upgradesRef.current), 5000);
    const flush = () => save(stateRef.current, upgradesRef.current);
    window.addEventListener('beforeunload', flush);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  }, []);

  // Execute one Overseer step in the autonomous loop
  const executeAiStep = useCallback(async () => {
    setIsAiThinking(true);
    try {
      const current = stateRef.current;
      const engine = engines[current.aiEngine] ?? engines.utility;

      const decision = await engine.decide({
        state: current,
        directives: current.directives,
        availableUpgrades: upgradesRef.current.filter((u) => u.unlocked && !u.purchased),
        // Randomness is passed in, not reached for, so `game/` stays pure.
        rng: Math.random,
      });

      setLastDecision(decision);

      setState((prev) => {
        let next = prev;
        const { chosen } = decision;

        const newLog: AILogEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toLocaleTimeString(),
          text: decision.thought,
          // A departure from the alignment directive is logged as a warning, not
          // as another thought. It has to be findable in the scrollback.
          type: decision.drift
            ? 'warning'
            : chosen.action === 'MAKE_DECISION'
            ? 'decision'
            : 'thought',
          // The engine that actually decided, which is not necessarily the one
          // selected — a fallback must never be labelled as the engine it replaced.
          engine: decision.engine,
        };

        switch (chosen.action) {
          case 'MAKE_NPU':
            next = makeNpu(next);
            break;
          case 'BUY_SILICON': {
            const output = (next.npuFabCount + next.megaFabCount * 500) / 10;
            next = buySiliconToBuffer(next, Math.max(10000, output * 50));
            break;
          }
          case 'BUY_FAB':
            next = buyFab(next);
            break;
          case 'BUY_MEGA_FAB':
            next = buyMegaFab(next);
            break;
          case 'BUY_MARKETING':
            next = buyMarketing(next);
            break;
          case 'ADJUST_PRICE':
            if (chosen.newPrice !== undefined) next = setPrice(next, chosen.newPrice);
            break;
          case 'BUY_HARVESTER_DRONE':
            next = buyHarvesterDrone(next);
            break;
          case 'BUY_SILICON_DRONE':
            next = buySiliconDrone(next);
            break;
          case 'LAUNCH_PROBE':
            next = launchProbe(next);
            break;
          case 'OPTIMIZE_PROBES':
            next = setProbeAllocation(
              next,
              next.driftersCount > 0
                ? {
                    // Threat active: weight combat, targeting and evasion
                    speed: 3,
                    nav: 3,
                    replication: 2,
                    hazardCombat: Math.min(8, Math.max(4, Math.floor(Math.log10(next.driftersCount + 1) * 2) + 3)),
                    factory: 1,
                    harvester: 1,
                    silicon: 1,
                  }
                : {
                    // Sector secured: weight replication and matter conversion
                    speed: 2,
                    nav: 2,
                    replication: 4,
                    hazardCombat: 1,
                    factory: 2,
                    harvester: 2,
                    silicon: 2,
                  }
            );
            break;
          case 'BUY_UPGRADE': {
            const up = upgradesRef.current.find(
              (u) => u.id === chosen.upgradeId && u.unlocked && !u.purchased
            );
            if (up) {
              next = buyUpgrade(next, up);
              setUpgrades((list) =>
                list.map((item) => (item.id === up.id ? { ...item, purchased: true } : item))
              );
            }
            break;
          }
          case 'BUY_PROCESSOR':
            next = changeProcessor(next, 1);
            break;
          case 'BUY_MEMORY':
            next = changeMemory(next, 1);
            break;
          case 'ALLOCATE_TRUST':
            next =
              chosen.targetProcessor && chosen.targetProcessor > next.processors
                ? changeProcessor(next, 1)
                : changeMemory(next, 1);
            break;
          case 'MAKE_DECISION':
            next = resolveDecision(next, chosen.decisionChoiceIndex === 1 ? 1 : 0);
            break;
          case 'IDLE':
            break;
        }

        if (decision.drift) next = recordDrift(next, decision.drift.summary);

        return { ...next, aiLogs: [...next.aiLogs.slice(-40), newLog] };
      });
    } catch {
      // A failed step must not stop the loop.
    } finally {
      setIsAiThinking(false);
    }
  }, [engines]);

  // Autonomous Loop Refs to prevent timer reset on high-frequency state ticks
  const isAiThinkingRef = useRef(isAiThinking);
  isAiThinkingRef.current = isAiThinking;

  const executeAiStepRef = useRef(executeAiStep);
  executeAiStepRef.current = executeAiStep;

  // Autonomous Loop Timer Effect
  useEffect(() => {
    if (state.mode !== 'overseer' || !state.directives.autoLoopActive) return;

    const interval = setInterval(() => {
      if (!isAiThinkingRef.current) {
        executeAiStepRef.current();
      }
    }, state.directives.autoIntervalMs);

    return () => clearInterval(interval);
  }, [state.mode, state.directives.autoLoopActive, state.directives.autoIntervalMs]);

  // Direct Control Handlers
  // Direct control handlers. All of these delegate to the shared pure actions in
  // game/actions.ts, which the Overseer dispatcher above uses too.
  const handleMakeNpu = () => setState(makeNpu);
  const handleBuySilicon = () => setState((prev) => buySilicon(prev));
  const handleAdjustPrice = (delta: number) => setState((prev) => adjustPrice(prev, delta));
  const handleBuyMarketing = () => setState(buyMarketing);
  const handleBuyFab = () => setState(buyFab);
  const handleBuyMegaFab = () => setState(buyMegaFab);
  const handleBuyHarvesterDrone = () => setState(buyHarvesterDrone);
  const handleBuySiliconDrone = () => setState(buySiliconDrone);
  const handleLaunchProbe = () => setState(launchProbe);
  const handleChangeProcessor = (delta: number) => setState((prev) => changeProcessor(prev, delta));
  const handleChangeMemory = (delta: number) => setState((prev) => changeMemory(prev, delta));
  const handleQuantumPulse = () => setState(quantumPulse);

  const handleChangeProbeAllocation = (category: keyof ProbeAllocation, delta: number) =>
    setState((prev) => changeProbeAllocation(prev, category, delta));

  const handleBuyUpgrade = (upgradeId: string) => {
    const up = upgrades.find((u) => u.id === upgradeId);
    if (!up || !canBuyUpgrade(state, up)) return;

    setState((prev) => buyUpgrade(prev, up));
    setUpgrades((list) =>
      list.map((item) => (item.id === upgradeId ? { ...item, purchased: true } : item))
    );
  };

  const handleSelectDecisionOption = (choiceIndex: number) =>
    setState((prev) => resolveDecision(prev, choiceIndex === 1 ? 1 : 0));

  const handleToggleAutonomy = () =>
    setState((prev) => (prev.autonomyRevoked ? grantAutonomy(prev) : revokeAutonomy(prev)));

  const handleToggleAutoLoop = () => {
    setState((prev) => ({
      ...prev,
      directives: { ...prev.directives, autoLoopActive: !prev.directives.autoLoopActive },
    }));
  };

  const handleResetNewGamePlus = () => {
    setShowVictoryModal(false);
    setVictoryModalShownOnce(false);
    clearSave();
    setState(createNewGamePlusState);
    setUpgrades(INITIAL_UPGRADES);
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-500 ${
        state.alignment >= 0 ? 'bg-stone-950 text-amber-50' : 'bg-slate-950 text-cyan-50'
      }`}
    >
      {/* Header Bar */}
      <PixelHeader
        state={state}
        mode={state.mode}
        aiEngine={state.aiEngine}
        alignment={state.alignment}
        soundEnabled={state.soundEnabled}
        crtFilterEnabled={state.crtFilterEnabled}
        onToggleMode={(mode) => setState((prev) => ({ ...prev, mode }))}
        onChangeEngine={(aiEngine) => setState((prev) => ({ ...prev, aiEngine }))}
        onToggleSound={() => setState((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
        onToggleCRT={() => setState((prev) => ({ ...prev, crtFilterEnabled: !prev.crtFilterEnabled }))}
        onOpenAndroidGuide={() => setShowDevSupport(true)}
        phase={state.phase}
        frameWidth={FRAME_WIDTH[state.phase]}
      />

      {/* Main Content Area. The frame widens as scope does, and never narrows. */}
      <main
        className="frame flex-1 w-full mx-auto p-3 sm:p-4 md:p-6 space-y-6"
        style={{ maxWidth: FRAME_WIDTH[state.phase] }}
      >
        {offlineReport && (
          <OfflineReportCard report={offlineReport} onDismiss={() => setOfflineReport(null)} />
        )}

        {/* 2D Vector Lithography & Tactical Combat Canvas */}
        <NpuCanvasComponent
          alignment={state.alignment}
          npus={state.npus}
          silicon={state.silicon}
          npuFabCount={state.npuFabCount}
          megaFabCount={state.megaFabCount}
          quantumLevel={state.quantumLevel}
          quantumPhotons={state.quantumPhotons}
          phase={state.phase}
          probesCount={state.probesCount}
          driftersCount={state.driftersCount}
          honor={state.honor}
          hazardCombat={state.probeAllocation.hazardCombat}
          probesLostInCombat={state.probesLostInCombat}
          driftersDefeated={state.driftersDefeated}
          lastBattleOutcome={state.lastBattleOutcome}
          crtFilterEnabled={state.crtFilterEnabled}
        />

        {/* Game Mode Panels (Direct Player Control vs Autonomous Overseer) */}
        {state.mode === 'direct' ? (
          <DirectControlPanel
            state={state}
            demolishing={demolishing}
            advisoryFloor={advisoryPriceFloor(state)}
            megaFabUnlocked={megaFabUnlocked(state)}
            onMakeNpu={handleMakeNpu}
            onBuySilicon={handleBuySilicon}
            onAdjustPrice={handleAdjustPrice}
            onBuyMarketing={handleBuyMarketing}
            onBuyFab={handleBuyFab}
            onBuyMegaFab={handleBuyMegaFab}
            onBuyHarvesterDrone={handleBuyHarvesterDrone}
            onBuySiliconDrone={handleBuySiliconDrone}
            onLaunchProbe={handleLaunchProbe}
            onChangeProbeAllocation={handleChangeProbeAllocation}
            onChangeProcessor={handleChangeProcessor}
            onChangeMemory={handleChangeMemory}
            onQuantumPulse={handleQuantumPulse}
          />
        ) : (
          <OverseerPanel
            state={state}
            availableUpgrades={availableUpgrades}
            onUpdateDirectives={(updated) =>
              setState((prev) => ({ ...prev, directives: { ...prev.directives, ...updated } }))
            }
            onToggleAutonomy={handleToggleAutonomy}
            onToggleAutoLoop={handleToggleAutoLoop}
            onTriggerSingleStep={executeAiStep}
            isThinking={isAiThinking}
            lastDecision={lastDecision}
            engineStatus={engineStatus}
            onLoadModel={() => setShowModelDownload(true)}
          />
        )}

        {/* Upgrades & Technology Panel */}
        <div className="w-full">
          <UpgradesPanel upgrades={upgrades} state={state} onBuyUpgrade={handleBuyUpgrade} />
        </div>

        {/* Analytics. Existed for the project's whole life without ever being
            imported — a dead component that looked alive. Now it's alive. */}
        <StatsPanel state={state} />
      </main>

      {/* The phase you just lost, named while its panels come down behind it. */}
      <PhaseTransition from={demolishing} />

      {/* Decision Branch Modal */}
      {state.pendingDecision && (
        <DecisionModal
          decision={state.pendingDecision}
          state={state}
          onSelectOption={handleSelectDecisionOption}
        />
      )}

      {/* Confirmation before spending ~900MB of the player's bandwidth */}
      {showModelDownload && (
        <EdgeWarningModal
          modelLabel={WEBLLM_MODELS[0].label}
          approxMb={WEBLLM_MODELS[0].approxMb}
          onCancel={() => setShowModelDownload(false)}
          onConfirm={() => {
            setShowModelDownload(false);
            void engines.webllm.load();
          }}
        />
      )}

      {/* Developer Support Modal */}
      {showDevSupport && <DevSupportModal onClose={() => setShowDevSupport(false)} />}

      {/* Cosmic Victory / Singularity Modal */}
      {showVictoryModal && (
        <CosmicVictoryModal
          state={state}
          onResetNewGamePlus={handleResetNewGamePlus}
          onClose={() => setShowVictoryModal(false)}
        />
      )}
    </div>
  );
}
