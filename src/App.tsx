import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameState, AILogEntry, Upgrade, ProbeAllocation } from './types';
import { INITIAL_UPGRADES } from './data/upgrades';
import { PixelHeader } from './components/PixelHeader';
import { NpuCanvasComponent } from './components/NpuCanvasComponent';
import { DirectControlPanel } from './components/DirectControlPanel';
import { OverseerPanel } from './components/OverseerPanel';
import { UpgradesPanel } from './components/UpgradesPanel';
import { DecisionModal } from './components/DecisionModal';
import { DevSupportModal } from './components/DevSupportModal';
import { CosmicVictoryModal } from './components/CosmicVictoryModal';
import { audio } from './utils/sound';
import { createInitialState, createNewGamePlusState } from './game/state';
import { UtilityOverseer } from './game/overseer/utility';
import { WebLlmOverseer } from './game/overseer/webllm';
import { OverseerDecision, EngineStatus } from './game/overseer/types';
import { save, load, clearSave } from './game/save';
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
  canAffordUpgrade,
  buyUpgrade,
  resolveDecision,
} from './game/actions';

export default function App() {
  const [showVictoryModal, setShowVictoryModal] = useState<boolean>(false);
  const [victoryModalShownOnce, setVictoryModalShownOnce] = useState<boolean>(false);

  const [state, setState] = useState<GameState>(createInitialState);

  const [upgrades, setUpgrades] = useState<Upgrade[]>(INITIAL_UPGRADES);
  const [showDevSupport, setShowDevSupport] = useState<boolean>(false);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [offlineReport, setOfflineReport] = useState<string | null>(null);

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

    if (restored.offlineNpus > 1) {
      const minutes = Math.round(restored.offlineMs / 60000);
      setOfflineReport(
        `Welcome back. ${Math.floor(restored.offlineNpus).toLocaleString()} NPUs were ` +
          `synthesized over ${minutes.toLocaleString()} minutes while you were away.`
      );
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
      });

      setLastDecision(decision);

      setState((prev) => {
        let next = prev;
        const { chosen } = decision;

        const newLog: AILogEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toLocaleTimeString(),
          text: decision.thought,
          type: chosen.action === 'MAKE_DECISION' ? 'decision' : 'thought',
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
    if (!up || !canAffordUpgrade(state, up)) return;

    setState((prev) => buyUpgrade(prev, up));
    setUpgrades((list) =>
      list.map((item) => (item.id === upgradeId ? { ...item, purchased: true } : item))
    );
  };

  const handleSelectDecisionOption = (choiceIndex: number) =>
    setState((prev) => resolveDecision(prev, choiceIndex === 1 ? 1 : 0));

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
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 space-y-6">
        {offlineReport && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg border-2 border-emerald-600/60 bg-emerald-950/40 font-mono text-xs text-emerald-200">
            <span>{offlineReport}</span>
            <button
              onClick={() => setOfflineReport(null)}
              className="px-2 py-1 rounded border border-emerald-600/60 hover:bg-emerald-900/60 uppercase tracking-wider text-[11px] shrink-0"
            >
              Dismiss
            </button>
          </div>
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
            onUpdateDirectives={(updated) =>
              setState((prev) => ({ ...prev, directives: { ...prev.directives, ...updated } }))
            }
            onToggleAutoLoop={handleToggleAutoLoop}
            onTriggerSingleStep={executeAiStep}
            isThinking={isAiThinking}
            lastDecision={lastDecision}
            engineStatus={engineStatus}
            onLoadModel={() => engines.webllm.load()}
          />
        )}

        {/* Upgrades & Technology Panel */}
        <div className="w-full">
          <UpgradesPanel upgrades={upgrades} state={state} onBuyUpgrade={handleBuyUpgrade} />
        </div>
      </main>

      {/* Decision Branch Modal */}
      {state.pendingDecision && (
        <DecisionModal
          decision={state.pendingDecision}
          state={state}
          onSelectOption={handleSelectDecisionOption}
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
