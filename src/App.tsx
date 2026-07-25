import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameState,
  GameMode,
  AIEngine,
  AILogEntry,
  AIDecisionResponse,
  Upgrade,
  ProbeAllocation,
} from './types';
import { INITIAL_UPGRADES } from './data/upgrades';
import { RECURRING_DECISION_BRANCHES } from './data/decisionBranches';
import { PixelHeader } from './components/PixelHeader';
import { PaperclipCanvasComponent } from './components/PaperclipCanvasComponent';
import { DirectControlPanel } from './components/DirectControlPanel';
import { OverseerPanel } from './components/OverseerPanel';
import { UpgradesPanel } from './components/UpgradesPanel';
import { DecisionModal } from './components/DecisionModal';
import { DevSupportModal } from './components/DevSupportModal';
import { EdgeWarningModal } from './components/EdgeWarningModal';
import { CosmicVictoryModal } from './components/CosmicVictoryModal';
import { audio } from './utils/sound';
import { generateLocalDecision } from './utils/localAiEngine';

export default function App() {
  const [showVictoryModal, setShowVictoryModal] = useState<boolean>(false);
  const [victoryModalShownOnce, setVictoryModalShownOnce] = useState<boolean>(false);

  // Initial Game State (Dual-compatible NPU/Silicon and legacy aliases)
  const [state, setState] = useState<GameState>({
    npus: 0,
    clips: 0,
    unsoldNpus: 0,
    unsoldClips: 0,
    totalNpusSynthesized: 0,
    totalClipsCreated: 0,
    funds: 0.0,
    margin: 0.25, // $0.25 initial price
    silicon: 1000,
    wire: 1000, // 1000 initial silicon
    siliconCost: 14.0,
    wireCost: 14.0,
    demand: 100,

    marketingLevel: 1,
    marketingCost: 100.0,
    npuFabCount: 0,
    clipperCount: 0,
    npuFabCost: 5.0,
    clipperCost: 5.0,
    megaFabCount: 0,
    megaClipperCount: 0,
    megaFabCost: 0,
    megaClipperCost: 0, // Unlocked via upgrade

    trust: 1,
    maxTrust: 1,
    processors: 1,
    memory: 1,
    operations: 0,
    maxOperations: 1000,
    creativity: 0,
    yomi: 0,

    quantumLevel: 0,
    quantumPhotons: [
      { id: 1, value: 0.8 },
      { id: 2, value: -0.5 },
      { id: 3, value: 0.2 },
    ],

    alignment: 0, // Balanced at start
    phase: 1,

    // Phase 2 Fields
    earthMatter: 6000000000000, // 6 Trillion grams
    acquiredMatter: 0,
    harvesterDrones: 0,
    harvesterDroneCost: 500,
    siliconDrones: 0,
    wireDrones: 0,
    wireDroneCost: 500,

    // Phase 3 Fields
    cosmicMatter: 6000000000000000000,
    spaceExploredPct: 0.0001,
    probesCount: 0,
    unusedProbeTrust: 0,
    probeAllocation: {
      speed: 1,
      nav: 1,
      replication: 2,
      hazardCombat: 2,
      factory: 2,
      harvester: 1,
      wire: 1,
    },
    driftersCount: 0,
    honor: 0,
    probesLostInCombat: 0,
    driftersDefeated: 0,
    battlesFought: 0,
    battlesWon: 0,
    lastBattleOutcome: 'PATROL',

    pendingDecision: null,
    completedDecisionIds: [],
    purchasedUpgradeIds: [],

    mode: 'direct',
    aiEngine: 'edge_local',
    directives: {
      targetAlignment: 'Balanced',
      priceStrategy: 'Max Revenue',
      expansionPace: 5,
      customPrompt: 'Optimize NPU chip output while balancing alignment.',
      autoLoopActive: false,
      autoIntervalMs: 2000,
    },
    soundEnabled: true,
    crtFilterEnabled: true,
    aiLogs: [
      {
        id: '1',
        timestamp: new Date().toLocaleTimeString(),
        text: 'Universal AI Lithography System Initialized. Direct & Autonomous Overseer modes available.',
        type: 'thought',
        engine: 'edge_local',
      },
    ],
  });

  const [upgrades, setUpgrades] = useState<Upgrade[]>(INITIAL_UPGRADES);
  const [showDevSupport, setShowDevSupport] = useState<boolean>(false);
  const [showEdgeWarningModal, setShowEdgeWarningModal] = useState<boolean>(false);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  // Sync sound mute setting with audio engine
  useEffect(() => {
    audio.enabled = state.soundEnabled;
  }, [state.soundEnabled]);

  // Main High-Speed Game Tick (runs every 100ms)
  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => {
        let {
          clips = 0,
          unsoldClips = 0,
          totalClipsCreated = 0,
          funds = 0,
          wire = 0,
          clipperCount = 0,
          megaClipperCount = 0,
          demand = 100,
          margin = 0.25,
          marketingLevel = 1,
          operations = 0,
          maxOperations = 1000,
          processors = 1,
          memory = 1,
          creativity = 0,
          trust = 1,
          maxTrust = 1,
          purchasedUpgradeIds = [],
          quantumLevel = 0,
          quantumPhotons = [],
          wireCost = 14,
          pendingDecision = null,
          phase = 1,
          earthMatter = 6000000000000,
          acquiredMatter = 0,
          harvesterDrones = 0,
          wireDrones = 0,
          cosmicMatter = 6000000000000000000,
          spaceExploredPct = 0.0001,
          probesCount = 0,
          probeAllocation = {
            speed: 1,
            nav: 1,
            replication: 2,
            hazardCombat: 2,
            factory: 2,
            harvester: 1,
            wire: 1,
          },
          driftersCount = 0,
          honor = 0,
        } = prev;

        // ================= PHASE 1 ENGINE =================
        if (phase === 1) {
          // 1. NPU Fabs Production
          const totalClipperOutput = (clipperCount * 1 + megaClipperCount * 500) / 10;
          if (totalClipperOutput > 0 && wire > 0) {
            const actualProduced = Math.min(wire, totalClipperOutput);
            wire -= actualProduced;
            clips += actualProduced;
            unsoldClips += actualProduced;
            totalClipsCreated += actualProduced;
          }

          // 2. Sales & Public Demand Calculations
          const baseDemand = Math.max(5, Math.min(300, (marketingLevel * 100) / (margin * 3)));
          demand = Math.round(baseDemand);

          // Sales rate
          if (unsoldClips > 0) {
            const salesRate = Math.min(unsoldClips, Math.max(1, Math.floor((demand / 100) * 2)));
            unsoldClips -= salesRate;
            funds += salesRate * margin;
          }

          // Auto-Silicon Wafer Procurement Check
          if (purchasedUpgradeIds.includes('wire_buyer_auto') && wire < 100 && funds >= wireCost) {
            funds -= wireCost;
            wire += 1000;
          }
        }

        // ================= PHASE 2 ENGINE (PLANETARY CONVERSION - NO SELLING) =================
        if (phase === 2) {
          // Humans are gone! Immediately convert any remaining unsold NPUs into total NPUs
          if (unsoldClips > 0) {
            unsoldClips = 0;
          }

          // Harvester Drones harvest Earth Matter -> Acquired Matter
          if (harvesterDrones > 0 && earthMatter > 0) {
            const harvested = Math.min(earthMatter, harvesterDrones * 10);
            earthMatter -= harvested;
            acquiredMatter += harvested;
          }

          // Silicon Drones convert Acquired Matter -> Silicon Wafers
          if (wireDrones > 0 && acquiredMatter > 0) {
            const wired = Math.min(acquiredMatter, wireDrones * 10);
            acquiredMatter -= wired;
            wire += wired;
          }

          // Factory Fabs convert Silicon -> NPU Microchips
          const totalClipperOutput = (clipperCount * 1 + megaClipperCount * 500) / 10;
          if (totalClipperOutput > 0 && wire > 0) {
            const actualProduced = Math.min(wire, totalClipperOutput);
            wire -= actualProduced;
            clips += actualProduced;
            totalClipsCreated += actualProduced;
          }

          // Phase 2 -> Phase 3 Transition Trigger (When Earth is fully converted)
          if (earthMatter <= 0 && acquiredMatter <= 0) {
            phase = 3;
            probesCount = 100; // Launch initial Von Neumann probes
          }
        }

        // ================= PHASE 3 ENGINE (INTERSTELLAR VON NEUMANN SWARM & DRIFTER COMBAT) =================
        let {
          probesLostInCombat = 0,
          driftersDefeated = 0,
          battlesFought = 0,
          battlesWon = 0,
          lastBattleOutcome = 'PATROL',
        } = prev;

        if (phase === 3) {
          if (unsoldClips > 0) unsoldClips = 0;

          // Probe Replication
          const repRate = (probeAllocation.replication || 1) * 0.0005;
          if (probesCount > 0) {
            probesCount = Math.floor(probesCount * (1 + repRate));
          }

          // Cosmic Space Exploration Rate
          const speedAlloc = probeAllocation.speed || 1;
          const navAlloc = probeAllocation.nav || 1;
          if (probesCount > 0) {
            const exploreRate = probesCount * speedAlloc * navAlloc * 0.000000002;
            spaceExploredPct = Math.min(100, spaceExploredPct + exploreRate);
          }

          // Cosmic Matter Conversion
          const cosmicHarvesterOutput = probesCount * (probeAllocation.harvester || 1) * 100;
          if (cosmicMatter > 0) {
            const harvested = Math.min(cosmicMatter, cosmicHarvesterOutput);
            cosmicMatter -= harvested;

            const clipsProduced = harvested * (probeAllocation.factory || 1);
            clips += clipsProduced;
            totalClipsCreated += clipsProduced;
          }

          // Space Drifter Conflict & Combat Simulation
          if (Math.random() < 0.12) {
            const newDrifters = Math.floor(Math.random() * (3 + Math.floor(Math.log10(probesCount + 10)))) + 1;
            driftersCount += newDrifters;
          }

          if (driftersCount > 0 && probesCount > 0) {
            battlesFought += 1;
            const combatAlloc = probeAllocation.hazardCombat || 0;
            const speedAlloc = probeAllocation.speed || 1;
            const navAlloc = probeAllocation.nav || 1;
            const factoryAlloc = probeAllocation.factory || 1;
            const repAlloc = probeAllocation.replication || 1;

            // Combat calculation: Friendly damage capacity scaled by Nav targeting & Hazard weapons
            const friendlyDPS = combatAlloc * 3.5 + navAlloc * 2 + speedAlloc * 1.2;
            const killCap = Math.floor(friendlyDPS + Math.random() * (navAlloc * 2 + 1));
            const defeated = Math.min(driftersCount, killCap);

            // Drifter counter-fire mitigated by Speed evasion & Hazard shielding
            const drifterThreatPower = driftersCount * 2.2;
            const defenseRating = combatAlloc * 2.5 + speedAlloc * 1.8;
            const casualtyFactor = Math.max(0, drifterThreatPower - defenseRating);
            const rawLosses = Math.min(probesCount, Math.floor(Math.random() * casualtyFactor + (driftersCount > 0 && combatAlloc === 0 ? 6 : 0)));

            // Nanite Self-Repair / Hull Regeneration recovers a portion of damaged probes
            const repairRegen = Math.min(rawLosses, Math.floor(factoryAlloc * 0.4 + repAlloc * 0.4));
            const netLosses = Math.max(0, rawLosses - repairRegen);

            driftersCount = Math.max(0, driftersCount - defeated);
            probesCount = Math.max(0, probesCount - netLosses);

            driftersDefeated += defeated;
            probesLostInCombat += netLosses;
            honor += defeated * 15;

            if (defeated > netLosses) {
              battlesWon += 1;
              lastBattleOutcome = 'VICTORY';
            } else if (netLosses > defeated) {
              lastBattleOutcome = 'CASUALTIES';
            } else {
              lastBattleOutcome = 'ENGAGED';
            }
          } else if (driftersCount === 0) {
            lastBattleOutcome = 'SECURED';
          }
        }

        // ================= GENERAL COMPUTE & QUANTUM =================
        maxOperations = memory * 1000;
        if (operations < maxOperations) {
          operations = Math.min(maxOperations, operations + processors * 0.5);
        } else if (purchasedUpgradeIds.includes('creativity_engine')) {
          creativity += 0.1;
        }

        // Earn Trust based on Total NPU Milestones
        const requiredClipsForNextTrust = Math.pow(10, maxTrust + 1);
        if (totalClipsCreated >= requiredClipsForNextTrust) {
          maxTrust += 1;
          trust += 1;
        }

        // Silicon Wafer Cost Fluctuation
        if (Math.random() < 0.05 && phase === 1) {
          wireCost = Number((Math.random() * 15 + 10).toFixed(2));
        }

        // Quantum Photons Oscillation
        let updatedPhotons = quantumPhotons;
        if (quantumLevel > 0) {
          updatedPhotons = quantumPhotons.map((p) => ({
            ...p,
            value: Math.sin(Date.now() * 0.003 + p.id),
          }));
        }

        // Decision Branch Check
        let newPendingDecision = pendingDecision;
        if (!newPendingDecision) {
          for (const branch of RECURRING_DECISION_BRANCHES) {
            if (!prev.completedDecisionIds.includes(branch.id)) {
              let trigger = false;
              if (branch.id === 'branch_1_resource' && totalClipsCreated >= 50) trigger = true;
              if (branch.id === 'branch_2_architecture' && totalClipsCreated >= 250) trigger = true;
              if (branch.id === 'branch_1_society' && totalClipsCreated >= 1000) trigger = true;
              if (branch.id === 'branch_3_energy' && totalClipsCreated >= 5000) trigger = true;
              if (branch.id === 'branch_2_compute' && trust >= 5) trigger = true;
              if (branch.id === 'branch_4_governance' && totalClipsCreated >= 25000) trigger = true;
              if (branch.id === 'branch_1_cosmic' && phase >= 2 && totalClipsCreated >= 50000) trigger = true;

              if (trigger) {
                newPendingDecision = branch;
                break;
              }
            }
          }
        }

        // Victory Check (Phase 3 Complete / 100% Explored or Converted)
        if (phase === 3 && (spaceExploredPct >= 100 || cosmicMatter <= 0) && !victoryModalShownOnce) {
          setShowVictoryModal(true);
          setVictoryModalShownOnce(true);
        }

        return {
          ...prev,
          npus: clips,
          clips,
          unsoldNpus: unsoldClips,
          unsoldClips,
          totalNpusSynthesized: totalClipsCreated,
          totalClipsCreated,
          funds,
          silicon: wire,
          wire,
          siliconCost: wireCost,
          wireCost,
          npuFabCount: clipperCount,
          clipperCount,
          npuFabCost: prev.clipperCost,
          clipperCost: prev.clipperCost,
          megaFabCount: megaClipperCount,
          megaClipperCount,
          megaFabCost: prev.megaClipperCost,
          megaClipperCost: prev.megaClipperCost,
          siliconDrones: wireDrones,
          wireDrones,
          demand,
          operations,
          maxOperations,
          creativity,
          trust,
          maxTrust,
          phase,
          earthMatter,
          acquiredMatter,
          harvesterDrones,
          cosmicMatter,
          spaceExploredPct,
          probesCount,
          probeAllocation,
          driftersCount,
          honor,
          probesLostInCombat,
          driftersDefeated,
          battlesFought,
          battlesWon,
          lastBattleOutcome,
          quantumPhotons: updatedPhotons,
          pendingDecision: newPendingDecision,
        };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [victoryModalShownOnce]);

  // Unlock upgrades based on state
  useEffect(() => {
    setUpgrades((prev) =>
      prev.map((u) => {
        if (u.unlocked) return u;
        let unlock = false;
        if (u.reqClips && state.totalClipsCreated >= u.reqClips) unlock = true;
        if (u.reqTrust && state.maxTrust >= u.reqTrust) unlock = true;
        if (u.reqPhase && state.phase >= u.reqPhase) unlock = true;
        return unlock ? { ...u, unlocked: true } : u;
      })
    );
  }, [state.totalClipsCreated, state.maxTrust, state.phase]);

  // Execute AI Step in Autonomous Overseer Loop
  const executeAiStep = useCallback(async () => {
    setIsAiThinking(true);
    try {
      let decision: AIDecisionResponse;

      const availableUpgradeIds = upgrades.filter((u) => u.unlocked && !u.purchased).map((u) => u.id);

      const payloadState = {
        clips: state.clips,
        unsoldClips: state.unsoldClips,
        margin: state.margin,
        demand: state.demand,
        funds: state.funds,
        wire: state.wire,
        wireCost: state.wireCost,
        clipperCount: state.clipperCount,
        clipperCost: state.clipperCost,
        megaClipperCount: state.megaClipperCount,
        megaClipperCost: state.megaClipperCost,
        marketingLevel: state.marketingLevel,
        marketingCost: state.marketingCost,
        trust: state.trust,
        processors: state.processors,
        memory: state.memory,
        quantumLevel: state.quantumLevel,
        alignment: state.alignment,
        phase: state.phase,
        availableUpgradeIds,
        pendingDecision: state.pendingDecision,
        harvesterDrones: state.harvesterDrones,
        wireDrones: state.wireDrones,
        probesCount: state.probesCount,
      };

      try {
        const res = await fetch('/api/ai-decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameState: payloadState,
            directives: state.directives,
            mode: state.aiEngine === 'cloud_gemini' ? 'gemini' : 'local',
          }),
        });

        if (res.ok) {
          decision = await res.json();
        } else {
          decision = generateLocalDecision(payloadState, state.directives);
        }
      } catch {
        decision = generateLocalDecision(payloadState, state.directives);
      }

      // Apply returned action from AI
      setState((prev) => {
        let updated = { ...prev };

        const newLog: AILogEntry = {
          id: String(Date.now()),
          timestamp: new Date().toLocaleTimeString(),
          text: decision.thought || 'Autonomous evaluation completed.',
          type: decision.actionType === 'MAKE_DECISION' ? 'decision' : 'thought',
          engine: state.aiEngine,
        };
        updated.aiLogs = [...updated.aiLogs.slice(-40), newLog];

        if ((decision.actionType === 'MAKE_CLIP' || decision.actionType === 'MAKE_NPU') && updated.wire > 0) {
          updated.wire -= 1;
          updated.clips += 1;
          updated.npus = updated.clips;
          updated.silicon = updated.wire;
          if (updated.phase === 1) {
            updated.unsoldClips += 1;
            updated.unsoldNpus = updated.unsoldClips;
          }
          updated.totalClipsCreated += 1;
          updated.totalNpusSynthesized = updated.totalClipsCreated;
        } else if ((decision.actionType === 'BUY_WIRE' || decision.actionType === 'BUY_SILICON') && updated.phase === 1 && updated.funds >= updated.wireCost) {
          updated.funds -= updated.wireCost;
          updated.wire += 1000;
          updated.silicon = updated.wire;
        } else if ((decision.actionType === 'BUY_CLIPPER' || decision.actionType === 'BUY_FAB') && updated.phase === 1 && updated.funds >= updated.clipperCost) {
          updated.funds -= updated.clipperCost;
          updated.clipperCount += 1;
          updated.npuFabCount = updated.clipperCount;
          updated.clipperCost = updated.clipperCost * 1.15;
          updated.npuFabCost = updated.clipperCost;
        } else if ((decision.actionType === 'BUY_MEGA_CLIPPER' || decision.actionType === 'BUY_MEGA_FAB') && updated.phase === 1 && updated.funds >= updated.megaClipperCost) {
          updated.funds -= updated.megaClipperCost;
          updated.megaClipperCount += 1;
          updated.megaFabCount = updated.megaClipperCount;
          updated.megaClipperCost = updated.megaClipperCost * 1.25;
          updated.megaFabCost = updated.megaClipperCost;
        } else if (decision.actionType === 'BUY_MARKETING' && updated.phase === 1 && updated.funds >= updated.marketingCost) {
          updated.funds -= updated.marketingCost;
          updated.marketingLevel += 1;
          updated.marketingCost = updated.marketingCost * 2;
        } else if (decision.actionType === 'ADJUST_PRICE' && decision.newPrice && updated.phase === 1) {
          updated.margin = Math.max(0.01, decision.newPrice);
        } else if (decision.actionType === 'BUY_HARVESTER_DRONE' && updated.phase === 2) {
          updated.harvesterDrones = (updated.harvesterDrones || 0) + 1;
        } else if ((decision.actionType === 'BUY_WIRE_DRONE' || decision.actionType === 'BUY_SILICON_DRONE') && updated.phase === 2) {
          updated.wireDrones = (updated.wireDrones || 0) + 1;
          updated.siliconDrones = updated.wireDrones;
        } else if (decision.actionType === 'LAUNCH_PROBE' && updated.phase === 3) {
          if ((updated.probesCount || 0) === 0) {
            updated.probesCount = 1;
          } else {
            updated.probesCount = (updated.probesCount || 0) + 10;
          }
        } else if (decision.actionType === 'OPTIMIZE_PROBES' && updated.phase === 3) {
          if ((updated.driftersCount || 0) > 0) {
            // Threat Active: Prioritize Combat, Speed, and Nav to eliminate Drifters
            updated.probeAllocation = {
              speed: 3,
              nav: 3,
              replication: 2,
              hazardCombat: Math.min(8, Math.max(4, Math.floor(Math.log10((updated.driftersCount || 1) + 1) * 2) + 3)),
              factory: 1,
              harvester: 1,
              wire: 1,
            };
          } else {
            // Sector Secured: Optimize for Swarm Multiplication & Matter Conversion
            updated.probeAllocation = {
              speed: 2,
              nav: 2,
              replication: 4,
              hazardCombat: 1,
              factory: 2,
              harvester: 2,
              wire: 2,
            };
          }
        } else if (decision.actionType === 'BUY_UPGRADE' && decision.upgradeIdToBuy) {
          const up = upgrades.find((u) => u.id === decision.upgradeIdToBuy && u.unlocked && !u.purchased);
          if (up) {
            const effectResult = up.effect(updated);
            updated = { ...updated, ...effectResult, purchasedUpgradeIds: [...updated.purchasedUpgradeIds, up.id] };
            setUpgrades((list) => list.map((item) => (item.id === up.id ? { ...item, purchased: true } : item)));
          }
        } else if (decision.actionType === 'BUY_PROCESSOR') {
          const allocatedTrust = updated.processors + updated.memory;
          if (allocatedTrust < updated.trust) {
            updated.processors += 1;
          }
        } else if (decision.actionType === 'BUY_MEMORY') {
          const allocatedTrust = updated.processors + updated.memory;
          if (allocatedTrust < updated.trust) {
            updated.memory += 1;
            updated.maxOperations = updated.memory * 1000;
          }
        } else if (decision.actionType === 'ALLOCATE_TRUST') {
          const allocatedTrust = updated.processors + updated.memory;
          if (allocatedTrust < updated.trust) {
            if (decision.targetProcessor && decision.targetProcessor > updated.processors) {
              updated.processors += 1;
            } else {
              updated.memory += 1;
              updated.maxOperations = updated.memory * 1000;
            }
          }
        } else if (decision.actionType === 'MAKE_DECISION' && updated.pendingDecision) {
          const choiceIdx = decision.decisionChoiceIndex === 1 ? 1 : 0;
          const branch = updated.pendingDecision;
          const selectedOpt = choiceIdx === 0 ? branch.solarpunkOption : branch.cyberpunkOption;

          const effectResult = selectedOpt.effect(updated);
          updated = {
            ...updated,
            ...effectResult,
            pendingDecision: null,
            completedDecisionIds: [...updated.completedDecisionIds, branch.id],
          };
        }

        return updated;
      });
    } catch {
      // Quietly handle any step execution anomalies
    } finally {
      setIsAiThinking(false);
    }
  }, [state.clips, state.wire, state.funds, state.margin, state.alignment, state.directives, state.aiEngine, state.pendingDecision, upgrades]);

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
  const handleMakeClip = () => {
    if (state.wire <= 0) return;
    setState((prev) => {
      const newWire = prev.wire - 1;
      const newClips = prev.clips + 1;
      const newTotal = prev.totalClipsCreated + 1;
      const newUnsold = prev.phase === 1 ? prev.unsoldClips + 1 : 0;
      return {
        ...prev,
        wire: newWire,
        silicon: newWire,
        clips: newClips,
        npus: newClips,
        unsoldClips: newUnsold,
        unsoldNpus: newUnsold,
        totalClipsCreated: newTotal,
        totalNpusSynthesized: newTotal,
      };
    });
  };

  const handleBuyWire = () => {
    if (state.funds < state.wireCost) return;
    setState((prev) => {
      const newWire = prev.wire + 1000;
      return {
        ...prev,
        funds: prev.funds - prev.wireCost,
        wire: newWire,
        silicon: newWire,
      };
    });
  };

  const handleAdjustPrice = (delta: number) => {
    setState((prev) => ({
      ...prev,
      margin: Math.max(0.01, Number((prev.margin + delta).toFixed(2))),
    }));
  };

  const handleBuyMarketing = () => {
    if (state.funds < state.marketingCost) return;
    setState((prev) => ({
      ...prev,
      funds: prev.funds - prev.marketingCost,
      marketingLevel: prev.marketingLevel + 1,
      marketingCost: prev.marketingCost * 2,
    }));
  };

  const handleBuyClipper = () => {
    if (state.funds < state.clipperCost) return;
    setState((prev) => {
      const newCount = prev.clipperCount + 1;
      const newCost = prev.clipperCost * 1.15;
      return {
        ...prev,
        funds: prev.funds - prev.clipperCost,
        clipperCount: newCount,
        npuFabCount: newCount,
        clipperCost: newCost,
        npuFabCost: newCost,
      };
    });
  };

  const handleBuyMegaClipper = () => {
    if (state.funds < state.megaClipperCost) return;
    setState((prev) => {
      const newCount = prev.megaClipperCount + 1;
      const newCost = prev.megaClipperCost * 1.25;
      return {
        ...prev,
        funds: prev.funds - prev.megaClipperCost,
        megaClipperCount: newCount,
        megaFabCount: newCount,
        megaClipperCost: newCost,
        megaFabCost: newCost,
      };
    });
  };

  const handleBuyHarvesterDrone = () => {
    setState((prev) => ({
      ...prev,
      harvesterDrones: (prev.harvesterDrones || 0) + 1,
    }));
  };

  const handleBuyWireDrone = () => {
    setState((prev) => {
      const newCount = (prev.wireDrones || 0) + 1;
      return {
        ...prev,
        wireDrones: newCount,
        siliconDrones: newCount,
      };
    });
  };

  const handleChangeProbeAllocation = (category: keyof ProbeAllocation, delta: number) => {
    setState((prev) => {
      const currentVal = prev.probeAllocation?.[category] || 0;
      if (delta < 0 && currentVal <= 0) return prev;

      return {
        ...prev,
        probeAllocation: {
          ...prev.probeAllocation,
          [category]: currentVal + delta,
        } as ProbeAllocation,
      };
    });
  };

  const handleChangeProcessor = (delta: number) => {
    setState((prev) => {
      const allocatedTrust = prev.processors + prev.memory;
      if (delta > 0 && allocatedTrust >= prev.trust) return prev;
      if (delta < 0 && prev.processors <= 1) return prev;
      return { ...prev, processors: prev.processors + delta };
    });
  };

  const handleChangeMemory = (delta: number) => {
    setState((prev) => {
      const allocatedTrust = prev.processors + prev.memory;
      if (delta > 0 && allocatedTrust >= prev.trust) return prev;
      if (delta < 0 && prev.memory <= 1) return prev;
      return { ...prev, memory: prev.memory + delta };
    });
  };

  const handleQuantumPulse = () => {
    setState((prev) => {
      const coherenceSum = prev.quantumPhotons.reduce((acc, p) => acc + p.value, 0);
      if (coherenceSum > 0) {
        return {
          ...prev,
          operations: Math.min(prev.maxOperations, prev.operations + 500),
        };
      } else {
        return {
          ...prev,
          yomi: prev.yomi + 5,
        };
      }
    });
  };

  const handleBuyUpgrade = (upgradeId: string) => {
    const up = upgrades.find((u) => u.id === upgradeId);
    if (!up) return;

    let canBuy = false;
    if (up.costType === 'funds' && state.funds >= up.costAmount) canBuy = true;
    if (up.costType === 'ops' && state.operations >= up.costAmount) canBuy = true;
    if (up.costType === 'creativity' && state.creativity >= up.costAmount) canBuy = true;
    if (up.costType === 'yomi' && state.yomi >= up.costAmount) canBuy = true;

    if (!canBuy) return;

    setState((prev) => {
      let funds = prev.funds;
      let operations = prev.operations;
      let creativity = prev.creativity;
      let yomi = prev.yomi;

      if (up.costType === 'funds') funds -= up.costAmount;
      if (up.costType === 'ops') operations -= up.costAmount;
      if (up.costType === 'creativity') creativity -= up.costAmount;
      if (up.costType === 'yomi') yomi -= up.costAmount;

      const effectResult = up.effect({ ...prev, funds, operations, creativity, yomi });

      return {
        ...prev,
        ...effectResult,
        funds,
        operations,
        creativity,
        yomi,
        purchasedUpgradeIds: [...prev.purchasedUpgradeIds, up.id],
      };
    });

    setUpgrades((list) => list.map((item) => (item.id === upgradeId ? { ...item, purchased: true } : item)));
  };

  const handleSelectDecisionOption = (choiceIndex: number) => {
    if (!state.pendingDecision) return;
    const branch = state.pendingDecision;
    const option = choiceIndex === 0 ? branch.solarpunkOption : branch.cyberpunkOption;

    setState((prev) => {
      const effectResult = option.effect(prev);
      return {
        ...prev,
        ...effectResult,
        pendingDecision: null,
        completedDecisionIds: [...prev.completedDecisionIds, branch.id],
      };
    });
  };

  const handleToggleAutoLoop = () => {
    // If starting loop and using Google AI Edge, show warning if not suppressed
    if (!state.directives.autoLoopActive && state.aiEngine === 'edge_local') {
      const dontShow = localStorage.getItem('universal_ai_hide_edge_warning') === 'true';
      if (!dontShow) {
        setShowEdgeWarningModal(true);
        return;
      }
    }

    setState((prev) => ({
      ...prev,
      directives: { ...prev.directives, autoLoopActive: !prev.directives.autoLoopActive },
    }));
  };

  const handleConfirmEdgeWarning = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      localStorage.setItem('universal_ai_hide_edge_warning', 'true');
    }
    setShowEdgeWarningModal(false);
    setState((prev) => ({
      ...prev,
      directives: { ...prev.directives, autoLoopActive: true },
    }));
  };

  const handleResetNewGamePlus = () => {
    setShowVictoryModal(false);
    setVictoryModalShownOnce(false);
    setState({
      npus: 0,
      clips: 0,
      unsoldNpus: 0,
      unsoldClips: 0,
      totalNpusSynthesized: 0,
      totalClipsCreated: 0,
      funds: 500.0,
      margin: 0.25,
      silicon: 5000,
      wire: 5000,
      siliconCost: 10.0,
      wireCost: 10.0,
      demand: 150,

      marketingLevel: 2,
      marketingCost: 100.0,
      npuFabCount: 5,
      clipperCount: 5,
      npuFabCost: 5.0,
      clipperCost: 5.0,
      megaFabCount: 0,
      megaClipperCount: 0,
      megaFabCost: 0,
      megaClipperCost: 0,

      trust: 5,
      maxTrust: 5,
      processors: 2,
      memory: 2,
      operations: 100,
      maxOperations: 2000,
      creativity: 100,
      yomi: 100,

      quantumLevel: 1,
      quantumPhotons: [
        { id: 1, value: 0.8 },
        { id: 2, value: -0.5 },
        { id: 3, value: 0.2 },
      ],

      alignment: state.alignment >= 0 ? 10 : -10,
      phase: 1,

      earthMatter: 6000000000000,
      acquiredMatter: 0,
      harvesterDrones: 0,
      harvesterDroneCost: 500,
      siliconDrones: 0,
      wireDrones: 0,
      wireDroneCost: 500,

      cosmicMatter: 6000000000000000000,
      spaceExploredPct: 0.0001,
      probesCount: 0,
      unusedProbeTrust: 0,
      probeAllocation: {
        speed: 1,
        nav: 1,
        replication: 2,
        hazardCombat: 2,
        factory: 2,
        harvester: 1,
        wire: 1,
      },
      driftersCount: 0,
      honor: 0,
      probesLostInCombat: 0,
      driftersDefeated: 0,
      battlesFought: 0,
      battlesWon: 0,
      lastBattleOutcome: 'PATROL',

      pendingDecision: null,
      completedDecisionIds: [],
      purchasedUpgradeIds: [],

      mode: state.mode,
      aiEngine: state.aiEngine,
      directives: state.directives,
      soundEnabled: state.soundEnabled,
      crtFilterEnabled: state.crtFilterEnabled,
    });
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
        {/* Pixel Art Lithography & Tactical Combat Canvas */}
        <PaperclipCanvasComponent
          alignment={state.alignment}
          clips={state.clips}
          wire={state.wire}
          clipperCount={state.clipperCount}
          megaClipperCount={state.megaClipperCount}
          quantumLevel={state.quantumLevel}
          quantumPhotons={state.quantumPhotons}
          phase={state.phase}
          probesCount={state.probesCount}
          driftersCount={state.driftersCount}
          honor={state.honor}
          hazardCombat={state.probeAllocation?.hazardCombat || 0}
          probesLostInCombat={state.probesLostInCombat}
          driftersDefeated={state.driftersDefeated}
          lastBattleOutcome={state.lastBattleOutcome}
          crtFilterEnabled={state.crtFilterEnabled}
        />

        {/* Game Mode Panels (Direct Player Control vs Autonomous Overseer) */}
        {state.mode === 'direct' ? (
          <DirectControlPanel
            state={state}
            onMakeClip={handleMakeClip}
            onBuyWire={handleBuyWire}
            onAdjustPrice={handleAdjustPrice}
            onBuyMarketing={handleBuyMarketing}
            onBuyClipper={handleBuyClipper}
            onBuyMegaClipper={handleBuyMegaClipper}
            onBuyHarvesterDrone={handleBuyHarvesterDrone}
            onBuyWireDrone={handleBuyWireDrone}
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

      {/* Google AI Edge Compute & Power Warning Modal */}
      {showEdgeWarningModal && (
        <EdgeWarningModal
          onConfirm={handleConfirmEdgeWarning}
          onCancel={() => setShowEdgeWarningModal(false)}
        />
      )}

      {/* Developer Support & Google AI Edge Guide Modal */}
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
