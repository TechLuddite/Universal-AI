import React from 'react';
import { Upgrade, GameState } from '../types';
import { audio } from '../utils/sound';
import {
  alignmentBand,
  alignmentRequirementLabel,
  meetsAlignmentRequirement,
  upgradeCost,
} from '../game/alignment';
import { canAffordUpgrade } from '../game/actions';
import { Sparkles, Lock, Zap, Scale } from 'lucide-react';

interface UpgradesPanelProps {
  upgrades: Upgrade[];
  state: GameState;
  onBuyUpgrade: (id: string) => void;
}

export const UpgradesPanel: React.FC<UpgradesPanelProps> = ({
  upgrades,
  state,
  onBuyUpgrade,
}) => {
  const isSolar = state.alignment >= 0;
  const band = alignmentBand(state.alignment);

  const unpurchased = upgrades.filter((u) => u.unlocked && !u.purchased);
  const purchasedUpgrades = upgrades.filter((u) => u.purchased);

  // Band-gated upgrades you can't currently reach are shown rather than hidden.
  // The fork is only a choice if you can see what's on the other side of it.
  const availableUpgrades = unpurchased.filter((u) => meetsAlignmentRequirement(state, u));
  const gatedUpgrades = unpurchased.filter((u) => !meetsAlignmentRequirement(state, u));

  /**
   * Both the sticker price and what it actually costs *you*. Alignment moves
   * every tagged upgrade's price by up to 40%, and a panel that quoted the
   * sticker while the ledger charged something else would be exactly the sort
   * of quiet disagreement this codebase has been burned by before.
   */
  const price = (u: Upgrade) => {
    const cost = upgradeCost(state, u);
    return { cost, delta: cost - u.costAmount };
  };

  /** Which side's flavour to show. In the middle you get both, and see the fork. */
  const flavour = (u: Upgrade): { label: string; text: string }[] => {
    const { flavorSolarpunk: solar, flavorCyberpunk: cyber } = u;

    if (band === 'Solarpunk' || band === 'Cyberpunk') {
      const text = band === 'Solarpunk' ? solar ?? cyber : cyber ?? solar;
      return text ? [{ label: '', text }] : [];
    }

    const both: { label: string; text: string }[] = [];
    if (solar) both.push({ label: 'Solarpunk', text: solar });
    if (cyber) both.push({ label: 'Cyberpunk', text: cyber });
    return both;
  };

  const card = (u: Upgrade, locked: boolean) => {
    const { cost, delta } = price(u);
    const affordable = !locked && canAffordUpgrade(state, u);
    const isSolarUpgrade = u.alignmentImpact > 0;
    const isCyberUpgrade = u.alignmentImpact < 0;
    const requirement = alignmentRequirementLabel(u);

    return (
      <div
        key={u.id}
        className={`p-3 rounded-lg border flex flex-col justify-between gap-3 transition-all ${
          locked
            ? 'bg-black/50 border-slate-800 border-dashed opacity-60'
            : affordable
            ? isSolarUpgrade
              ? 'bg-emerald-950/40 border-emerald-600/60 hover:border-emerald-400'
              : isCyberUpgrade
              ? 'bg-rose-950/40 border-rose-600/60 hover:border-rose-400'
              : 'bg-slate-900/80 border-cyan-600/60 hover:border-cyan-400'
            : 'bg-slate-950/60 border-slate-800 opacity-70'
        }`}
      >
        <div>
          <div className="flex justify-between items-start gap-2 mb-1">
            <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1">{u.name}</h4>
            {u.alignmentImpact !== 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded border font-bold shrink-0 ${
                  isSolarUpgrade
                    ? 'bg-emerald-900/80 border-emerald-500 text-emerald-300'
                    : 'bg-rose-900/80 border-rose-500 text-rose-300'
                }`}
              >
                {isSolarUpgrade
                  ? `+${u.alignmentImpact} Solarpunk`
                  : `${u.alignmentImpact} Cyberpunk`}
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-300 leading-snug mb-2">{u.description}</p>

          {requirement && (
            <div
              className={`text-[10px] font-bold mb-2 px-1.5 py-1 rounded border ${
                locked
                  ? 'border-slate-700 bg-black/60 text-slate-400'
                  : 'border-amber-600/60 bg-amber-950/40 text-amber-300'
              }`}
            >
              {locked ? requirement : `Band-exclusive · ${requirement}`}
            </div>
          )}

          {flavour(u).map(({ label, text }) => (
            <div
              key={label || 'flavour'}
              className="text-[10px] text-amber-200/80 italic bg-black/40 p-1.5 rounded border border-amber-900/40 mb-1"
            >
              {label && <span className="not-italic font-bold text-amber-400/90">{label}: </span>}
              {text}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs gap-2">
          <span className="font-bold text-amber-300 flex flex-col">
            <span>
              Cost: {cost.toLocaleString()} {u.costType.toUpperCase()}
            </span>
            {delta !== 0 && (
              <span
                className={`text-[10px] font-normal flex items-center gap-1 ${
                  delta < 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                <Scale className="w-3 h-3" />
                {delta < 0 ? '' : '+'}
                {Math.round((delta / u.costAmount) * 100)}% · {band.toLowerCase()} pricing
              </span>
            )}
          </span>

          <button
            onClick={() => {
              audio.playUpgradeSound();
              onBuyUpgrade(u.id);
            }}
            disabled={!affordable}
            className={`py-1.5 px-3 rounded border font-bold text-xs uppercase flex items-center gap-1 transition-all shrink-0 ${
              affordable
                ? 'bg-amber-600 hover:bg-amber-500 border-amber-300 text-stone-950 shadow'
                : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {affordable ? (
              <>
                <Zap className="w-3 h-3" />
                Purchase
              </>
            ) : (
              <>
                <Lock className="w-3 h-3" />
                Locked
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`p-4 rounded-xl border-2 font-mono transition-all space-y-4 ${
        isSolar ? 'bg-stone-900/90 border-amber-600/50' : 'bg-slate-950/90 border-cyan-600/50'
      }`}
    >
      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
        <h3 className="text-sm font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Technology Upgrades &amp; Projects ({availableUpgrades.length} Available)
        </h3>
        <span className="text-xs text-slate-400">Purchased: {purchasedUpgrades.length}</span>
      </div>

      {availableUpgrades.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-500 italic border border-dashed border-slate-800 rounded-lg">
          No projects available. Synthesize NPU chips, accumulate trust, or unlock new phases to
          discover technology upgrades.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availableUpgrades.map((u) => card(u, false))}
        </div>
      )}

      {gatedUpgrades.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-400">
            <Lock className="w-3.5 h-3.5" />
            Requires a commitment you haven&apos;t made ({gatedUpgrades.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {gatedUpgrades.map((u) => card(u, true))}
          </div>
        </div>
      )}
    </div>
  );
};
