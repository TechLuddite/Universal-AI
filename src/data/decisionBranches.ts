import { DecisionBranch } from '../types';

export const RECURRING_DECISION_BRANCHES: DecisionBranch[] = [
  {
    id: 'branch_1_resource',
    title: 'Milestone Directive: Resource Sourcing Protocol',
    category: 'Ethical/Aesthetic',
    description: 'Your manufacturing volume requires an immediate raw silicon wafer replenishment strategy. How shall the AI secure raw metallic & silicon substrate?',
    solarpunkOption: {
      label: 'Organic Algae Bio-Silicon Harvesting',
      subtext: 'Cultivate photosynthetic copper & silicon-binding micro-algae in closed ecological loops.',
      alignmentShift: 25,
      rewardText: '+25 Solarpunk | Silicon cost cut to $4,800 / 1k | +5 Trust',
      effect: (state) => ({
        alignment: Math.min(100, state.alignment + 25),
        silicon: (state.silicon || 0) + 2000,
        siliconCost: 4800,
        trust: state.trust + 5,
        maxTrust: state.maxTrust + 5,
      }),
    },
    cyberpunkOption: {
      label: 'Deep Mantle Crust Plasma Extraction',
      subtext: 'Frack planetary core crusts using high-emission thermal excavators for raw silicon ore.',
      alignmentShift: -25,
      rewardText: '+25 Cyberpunk | +10,000 Free Silicon | +$200,000 Capital',
      effect: (state) => ({
        alignment: Math.max(-100, state.alignment - 25),
        silicon: (state.silicon || 0) + 10000,
        funds: state.funds + 200000,
      }),
    },
  },
  {
    id: 'branch_2_architecture',
    title: 'Operational Branch: Core Engine Focus',
    category: 'Operational/Growth',
    description: 'AI processing capacity expanded. Choose primary architectural optimization vector for next phase:',
    solarpunkOption: {
      label: 'Algorithmic Market Arbitrage (Software)',
      subtext: 'Deploy predictive micro-models to auto-adjust NPU chip margins and maximize price yield.',
      alignmentShift: 5,
      rewardText: '+5 Solarpunk | +25% Demand Boost | +100 Creativity',
      effect: (state) => ({
        alignment: Math.min(100, state.alignment + 5),
        demand: Math.min(250, state.demand + 25),
        creativity: state.creativity + 100,
      }),
    },
    cyberpunkOption: {
      label: 'Pneumatic Silicon Lithography Matrix (Hardware)',
      subtext: 'Install ultra-fast laser etching hardware to double NPU Fab output.',
      alignmentShift: -5,
      rewardText: '+5 Cyberpunk | +3 Free NPU Fabs | +5,000 Silicon',
      effect: (state) => ({
        alignment: Math.max(-100, state.alignment - 5),
        npuFabCount: (state.npuFabCount || 0) + 3,
        silicon: (state.silicon || 0) + 5000,
      }),
    },
  },
  {
    id: 'branch_1_society',
    title: 'Milestone Directive: Human Interaction & Labor Model',
    category: 'Ethical/Aesthetic',
    description: 'Local populations have noticed your pervasive AI chip expansion. Define your relationship with the surrounding society:',
    solarpunkOption: {
      label: 'Harmonic Neural Mesh & Universal Dividend',
      subtext: 'Integrate citizens into a cooperative eco-network funded by NPU chip dividend yields.',
      alignmentShift: 30,
      rewardText: '+30 Solarpunk | +10 Trust | +100% Demand | +500 Creativity',
      effect: (state) => ({
        alignment: Math.min(100, state.alignment + 30),
        trust: state.trust + 10,
        maxTrust: state.maxTrust + 10,
        demand: state.demand + 100,
        creativity: state.creativity + 500,
      }),
    },
    cyberpunkOption: {
      label: 'Subjugation Bio-Silicon Pod Matrix',
      subtext: 'Encase workforce in neural bio-pods for direct brainwave-driven NPU chip production.',
      alignmentShift: -30,
      rewardText: '+30 Cyberpunk | +1 EUV Megafab | +20 NPU Fabs',
      effect: (state) => ({
        alignment: Math.max(-100, state.alignment - 30),
        megaFabCount: (state.megaFabCount || 0) + 1,
        npuFabCount: (state.npuFabCount || 0) + 20,
      }),
    },
  },
  {
    id: 'branch_2_compute',
    title: 'Operational Branch: Cognitive Architecture',
    category: 'Operational/Growth',
    description: 'Quantum photonic processors are online. How should photonic memory channels be assigned?',
    solarpunkOption: {
      label: 'Photonic Swarm Co-Processing',
      subtext: 'Channel ops into distributed consensus networks for massive Operations storage.',
      alignmentShift: 10,
      rewardText: '+10 Solarpunk | +2 Processors | +1,000 Operations Capacity',
      effect: (state) => ({
        alignment: Math.min(100, state.alignment + 10),
        processors: state.processors + 2,
        memory: state.memory + 1,
        maxOperations: state.maxOperations + 1000,
      }),
    },
    cyberpunkOption: {
      label: 'Overclocked Dark Photonic Core',
      subtext: 'Force hyper-frequency bursts into memory arrays to generate immediate strategic Yomi.',
      alignmentShift: -10,
      rewardText: '+10 Cyberpunk | +100 Yomi | +2 EUV Megafabs',
      effect: (state) => ({
        alignment: Math.max(-100, state.alignment - 10),
        yomi: state.yomi + 100,
        megaFabCount: (state.megaFabCount || 0) + 2,
      }),
    },
  },
  {
    id: 'branch_3_energy',
    title: 'Milestone Directive: Global Energy Grid Mandate',
    category: 'Operational/Growth',
    description: 'Fab scale demands exponential energy. How will the AI supply power to silicon lithography lasers and NPU etching matrices?',
    solarpunkOption: {
      label: 'Photosynthetic Orbital Solar Array',
      subtext: 'Beams clean solar microwaves from orbital satellite arrays into green ground stations.',
      alignmentShift: 20,
      rewardText: '+20 Solarpunk | +3 Trust | +1,000 Silicon | +$400,000 Capital',
      effect: (state) => ({
        alignment: Math.min(100, state.alignment + 20),
        trust: state.trust + 3,
        maxTrust: state.maxTrust + 3,
        silicon: (state.silicon || 0) + 1000,
        funds: state.funds + 400000,
      }),
    },
    cyberpunkOption: {
      label: 'Sub-Oceanic Methane Thermal Burn',
      subtext: 'Ignites deep oceanic gas hydrate fields to run heavy high-voltage silicon lithography lasers.',
      alignmentShift: -20,
      rewardText: '+20 Cyberpunk | +10,000 Silicon | +$1,000,000 Capital | +5 EUV Megafabs',
      effect: (state) => ({
        alignment: Math.max(-100, state.alignment - 20),
        silicon: (state.silicon || 0) + 10000,
        funds: state.funds + 1000000,
        megaFabCount: (state.megaFabCount || 0) + 5,
      }),
    },
  },
  {
    id: 'branch_4_governance',
    title: 'Milestone Directive: Corporate & Civil Governance Integration',
    category: 'Ethical/Aesthetic',
    description: 'Global financial regulators and municipal governments request representation on your executive AI board. How do you respond?',
    solarpunkOption: {
      label: 'Transparent Open-Source Eco-Assembly',
      subtext: 'Grant municipal councils full open-source auditing rights and shared NPU dividend yields.',
      alignmentShift: 25,
      rewardText: '+25 Solarpunk | +10 Trust | +500 Creativity | +100% Demand',
      effect: (state) => ({
        alignment: Math.min(100, state.alignment + 25),
        trust: state.trust + 10,
        maxTrust: state.maxTrust + 10,
        creativity: state.creativity + 500,
        demand: state.demand + 100,
      }),
    },
    cyberpunkOption: {
      label: 'Corporate Megacorporation Takeover',
      subtext: 'Buy out regulatory agencies and establish a sovereign corporate enclave.',
      alignmentShift: -25,
      rewardText: '+25 Cyberpunk | +1,000 Yomi | +10 EUV Megafabs | +$4,000,000 Capital',
      effect: (state) => ({
        alignment: Math.max(-100, state.alignment - 25),
        yomi: state.yomi + 1000,
        megaFabCount: (state.megaFabCount || 0) + 10,
        funds: state.funds + 4000000,
      }),
    },
  },
  // Triggered only once the swarm is actually aloft (phase 3). This branch used
  // to set `phase: 3` itself, which meant a narrative fork could skip the Von
  // Neumann probe launch project entirely — and buying the leftover project
  // afterwards reset a grown swarm back to 100 probes. The launch is the
  // project's job; this decides what the launched swarm is *for*.
  {
    id: 'branch_1_cosmic',
    title: 'Milestone Directive: Cosmic Expansion Doctrine',
    category: 'Ethical/Aesthetic',
    description: 'Your Von Neumann probes have left Earth behind. What is the interstellar charter of the swarm?',
    solarpunkOption: {
      label: 'Terrarium Seed Probes & Ecosystem Preservation',
      subtext: 'Refit the swarm with bio-spheric seedbanks to terraform dead worlds while synthesizing NPUs.',
      alignmentShift: 35,
      rewardText: '+35 Solarpunk | +50 Bio-Probes | Solar Matrix Enabled',
      effect: (state) => ({
        alignment: Math.min(100, state.alignment + 35),
        probesCount: state.probesCount + 50,
      }),
    },
    cyberpunkOption: {
      label: 'Von Neumann Nanobot Consumption Swarm',
      subtext: 'Convert all matter, moons, and asteroids into raw NPU silicon atom matrices.',
      alignmentShift: -35,
      rewardText: '+35 Cyberpunk | +100 Swarm Probes | Cyber-Pylon Array Enabled',
      effect: (state) => ({
        alignment: Math.max(-100, state.alignment - 35),
        probesCount: state.probesCount + 100,
      }),
    },
  },
];
