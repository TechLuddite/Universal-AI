import React from 'react';
import { Heart, ExternalLink, Coffee, X, Code, Cpu, CheckCircle2, Building2 } from 'lucide-react';

interface DevSupportModalProps {
  onClose: () => void;
}

export const DevSupportModal: React.FC<DevSupportModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-mono">
      <div className="bg-slate-950 border-2 border-amber-500 rounded-xl p-5 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-amber-900/40 space-y-5 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-500/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-amber-950 border border-amber-500 text-amber-300">
              <Heart className="w-5 h-5 text-rose-400 fill-rose-500/20" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                Developer Support & Tribute
              </h2>
              <p className="text-xs text-amber-300">
                In Honor of Universal Paperclips & Creative Web Game Design
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tribute Message */}
        <div className="space-y-3 bg-black/60 p-4 rounded-lg border border-slate-800 text-xs sm:text-sm leading-relaxed text-slate-300">
          <p>
            <strong className="text-amber-300 font-bold">Universal AI: Solarpunk vs. Cyberpunk</strong> is built as a complete labor of love. Inspired by Nick Bostrom's{' '}
            <a
              href="https://en.wikipedia.org/wiki/Instrumental_convergence#Paperclip_maximizer"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline font-semibold inline-flex items-center gap-0.5"
            >
              original thought experiment <ExternalLink className="w-3 h-3" />
            </a>{' '}
            and Frank Lantz's web masterpiece{' '}
            <a
              href="https://www.decisionproblem.com/paperclips/"
              target="_blank"
              rel="noreferrer"
              className="text-amber-300 hover:text-amber-200 underline font-semibold inline-flex items-center gap-0.5"
            >
              Universal Paperclips <ExternalLink className="w-3 h-3" />
            </a>
            , a game that has brought endless wonder to players around the globe without barrier or paywall.
          </p>
          <p>
            We believe software art should remain freely accessible to everyone forever.
          </p>
        </div>

        {/* Special Shout-Out: Halo MSP & Tech 2U */}
        <div className="space-y-3 bg-gradient-to-r from-cyan-950/60 via-blue-950/40 to-slate-950 p-4 rounded-lg border border-cyan-500/50 shadow-md">
          <h3 className="text-xs uppercase font-bold text-cyan-300 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-cyan-400" />
            Special Shout-Out: Halo MSP & Tech 2U
          </h3>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            Huge shout-out to <strong className="text-cyan-300 font-bold">Halo MSP</strong> (
            <a
              href="https://halomsp.com"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:text-cyan-200 underline font-semibold inline-flex items-center gap-0.5"
            >
              halomsp.com <ExternalLink className="w-3 h-3" />
            </a>
            )—helping businesses navigate safe and sensible AI and software implementations!
          </p>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            And to their parent company, <strong className="text-amber-300 font-bold">Tech 2U</strong> (
            <a
              href="https://tech2u.com"
              target="_blank"
              rel="noreferrer"
              className="text-amber-300 hover:text-amber-200 underline font-semibold inline-flex items-center gap-0.5"
            >
              tech2u.com <ExternalLink className="w-3 h-3" />
            </a>
            ), ready to assist with any business or personal IT need with expert, reliable support.
          </p>
        </div>

        {/* Developer Support & Donation Links */}
        <div className="space-y-3 bg-gradient-to-r from-amber-950/40 to-purple-950/40 p-4 rounded-lg border border-amber-700/50">
          <h3 className="text-xs uppercase font-bold text-amber-300 flex items-center gap-1.5">
            <Coffee className="w-4 h-4 text-amber-400" />
            Support Developer Projects & Open Source
          </h3>
          <p className="text-xs text-slate-300 leading-snug">
            If this game sparked curiosity or made your day brighter, consider supporting our ongoing creative projects like <strong className="text-emerald-300">Cropalot</strong> and open-source game development:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <a
              href="https://www.paypal.com/donate/?hosted_button_id=JLAGXTV4FX96S"
              target="_blank"
              rel="noreferrer"
              className="p-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Heart className="w-4 h-4 fill-slate-950" />
              Developer Support & Donations
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href="https://cropalot.ai.studio/"
              target="_blank"
              rel="noreferrer"
              className="p-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all"
            >
              <Code className="w-4 h-4" />
              Cropalot Web App
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* What the two Overseer engines actually are */}
        <div className="space-y-3 bg-black/60 p-4 rounded-lg border border-slate-800">
          <h3 className="text-xs uppercase font-bold text-cyan-300 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-cyan-400" />
            What is the Overseer actually running?
          </h3>
          <ul className="text-xs text-slate-300 space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Utility Engine (default).</strong> A deterministic
                scorer, not a neural network. It ranks every legal action against your directives
                and shows you the scores. Instant, works in every browser, and makes{' '}
                <em>no network requests at all</em>.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">WebLLM (opt-in).</strong> Llama 3.2 1B, quantized to
                4-bit, running on your GPU via WebGPU and WebAssembly. Weights download once
                (~900MB) from HuggingFace and are cached; after that it works offline. Your game
                state is fed to a model on your own machine and never leaves it. Requires Chrome or
                Edge 113+.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">If WebLLM can't answer, it says so.</strong> No
                WebGPU, model not loaded, or a malformed response, and the Utility Engine decides
                that step — with the log and the deliberation panel both marked as a fallback. You
                will always know which engine actually made a decision.
              </div>
            </li>
          </ul>
          <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-800">
            There is no backend. No analytics, no telemetry, no accounts. Don't take our word for
            it — open DevTools, play a normal game, and watch the Network tab stay empty.
          </p>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="py-2.5 px-5 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-colors"
          >
            Return to Manufacturing
          </button>
        </div>
      </div>
    </div>
  );
};
