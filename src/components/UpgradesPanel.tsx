import React from 'react';
import { Upgrade, GameState } from '../types';
import { audio } from '../utils/sound';
import { Sparkles, Check, Lock, Zap, Award } from 'lucide-react';

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

  // Filter upgrades that are unlocked and not yet purchased
  const availableUpgrades = upgrades.filter((u) => u.unlocked && !u.purchased);
  const purchasedUpgrades = upgrades.filter((u) => u.purchased);

  const canAfford = (u: Upgrade): boolean => {
    if (u.costType === 'funds') return state.funds >= u.costAmount;
    if (u.costType === 'ops') return state.operations >= u.costAmount;
    if (u.costType === 'creativity') return state.creativity >= u.costAmount;
    if (u.costType === 'yomi') return state.yomi >= u.costAmount;
    return false;
  };

  return (
    <div className={`p-4 rounded-xl border-2 font-mono transition-all space-y-4 ${
      isSolar
        ? 'bg-stone-900/90 border-amber-600/50'
        : 'bg-slate-950/90 border-cyan-600/50'
    }`}>
      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
        <h3 className="text-sm font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Technology Upgrades & Projects ({availableUpgrades.length} Available)
        </h3>
        <span className="text-xs text-slate-400">
          Purchased: {purchasedUpgrades.length}
        </span>
      </div>

      {availableUpgrades.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-500 italic border border-dashed border-slate-800 rounded-lg">
          No projects available. Produce clips, accumulate trust, or unlock new phases to discover upgrades.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availableUpgrades.map((u) => {
            const affordable = canAfford(u);
            const isSolarUpgrade = u.alignmentImpact > 0;
            const isCyberUpgrade = u.alignmentImpact < 0;

            return (
              <div
                key={u.id}
                className={`p-3 rounded-lg border flex flex-col justify-between gap-3 transition-all ${
                  affordable
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
                    <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1">
                      {u.name}
                    </h4>
                    {u.alignmentImpact !== 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${
                        isSolarUpgrade
                          ? 'bg-emerald-900/80 border-emerald-500 text-emerald-300'
                          : 'bg-rose-900/80 border-rose-500 text-rose-300'
                      }`}>
                        {isSolarUpgrade ? `+${u.alignmentImpact} Solarpunk` : `${u.alignmentImpact} Cyberpunk`}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug mb-2">
                    {u.description}
                  </p>

                  {(u.flavorSolarpunk || u.flavorCyberpunk) && (
                    <div className="text-[10px] text-amber-200/80 italic bg-black/40 p-1.5 rounded border border-amber-900/40">
                      {isSolar ? u.flavorSolarpunk || u.flavorCyberpunk : u.flavorCyberpunk || u.flavorSolarpunk}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <span className="font-bold text-amber-300">
                    Cost: {u.costAmount.toLocaleString()} {u.costType.toUpperCase()}
                  </span>

                  <button
                    onClick={() => {
                      audio.playUpgradeSound();
                      onBuyUpgrade(u.id);
                    }}
                    disabled={!affordable}
                    className={`py-1.5 px-3 rounded border font-bold text-xs uppercase flex items-center gap-1 transition-all ${
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
          })}
        </div>
      )}
    </div>
  );
};
