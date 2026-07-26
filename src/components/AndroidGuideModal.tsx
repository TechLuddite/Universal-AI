import React from 'react';
import { Smartphone, Download, Cpu, X, Check, Code, ShieldCheck } from 'lucide-react';

interface AndroidGuideModalProps {
  onClose: () => void;
}

export const AndroidGuideModal: React.FC<AndroidGuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-mono">
      <div className="bg-slate-950 border-2 border-purple-500 rounded-xl p-5 sm:p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl shadow-purple-900/40 space-y-5 text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-purple-500/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-purple-950 border border-purple-500 text-purple-300">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                Paid Android APK & Google AI Edge Deployment
              </h2>
              <p className="text-xs text-purple-300">
                Packaging Universal AI for Google Play & Local Edge Model Inferencing
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

        {/* Section 1: Android Build Packaging */}
        <div className="space-y-3 bg-black/60 p-4 rounded-lg border border-slate-800">
          <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
            <Code className="w-4 h-4 text-amber-400" />
            1. Compile Web App into Native Android APK (Capacitor)
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            This Vite React codebase is pre-structured for Capacitor native wrapper compilation:
          </p>
          <div className="bg-slate-900 p-3 rounded text-xs font-mono border border-slate-800 text-cyan-300 space-y-1">
            <div>npm install @capacitor/core @capacitor/cli @capacitor/android</div>
            <div>npx cap init "Universal AI" "com.universalai.app"</div>
            <div>npm run build</div>
            <div>npx cap add android</div>
            <div>npx cap open android</div>
          </div>
        </div>

        {/* Section 2: Google AI Edge Integration */}
        <div className="space-y-3 bg-black/60 p-4 rounded-lg border border-slate-800">
          <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            2. Google AI Edge Gallery & On-Device Model Inferencing
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            In **Overseer Mode**, you selected **Google AI Edge (In-Browser / On-Device)**. On mobile devices, this runs zero-latency local client-side evaluation:
          </p>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside pl-2">
            <li>
              <strong className="text-emerald-300">On-Device Gemini Nano / AI Edge SDK:</strong> Uses LiteRT (TensorFlow Lite) or WebLLM directly in the Android WebView for complete offline privacy.
            </li>
            <li>
              <strong className="text-amber-300">Free Cloud Fallback:</strong> Automatic, zero-compute fallback to free local rules or Cloud Gemini 3.6 Flash if the phone GPU is busy or battery saving is on.
            </li>
          </ul>
        </div>

        {/* Section 3: Play Store Monetization & Pricing */}
        <div className="space-y-3 bg-black/60 p-4 rounded-lg border border-slate-800">
          <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            3. Google Play Console Paid App Settings
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            When publishing to Google Play as a paid app ($1.99 or $2.99 USD):
          </p>
          <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside pl-2">
            <li>Zero micro-transactions required — premium paid single purchase.</li>
            <li>Fully playable offline in Direct or Local Edge AI mode.</li>
            <li>Cloud Gemini API keys proxy safely through server endpoints without exposing keys.</li>
          </ul>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="py-2 px-4 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Got It! Return to Game
          </button>
        </div>
      </div>
    </div>
  );
};
