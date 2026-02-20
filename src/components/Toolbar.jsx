import { Save, Plus, Info } from 'lucide-react';
import { formatIndianNumber } from '../utils/pricing';
import logo from '../assets/logo.png';

export default function Toolbar({ designName, onRename, onSave, onNewDesign, componentCount, totalCost, onShowMaterials }) {
  return (
    <div className="h-24 bg-white/70 backdrop-blur-xl border-b border-blue-100/50 flex items-center justify-between px-6 z-10 shadow-sm">
      <div className="flex items-center gap-4 group/name">
        <div className="flex items-center">
          <div className="flex items-center justify-center">
            <img src={logo} alt="Pipe3D PRO Branding" className="h-24 w-auto object-contain scale-150 translate-x-2" />
          </div>
        </div>
        <div className="h-10 w-px bg-blue-100" />
        <div className="relative flex items-center">
          <input
            type="text"
            value={designName}
            onChange={(e) => onRename(e.target.value)}
            className="bg-transparent text-slate-900 text-xs font-semibold uppercase tracking-widest px-2 py-1 rounded border border-transparent hover:border-blue-100 focus:border-blue-300 focus:bg-white/50 focus:outline-none transition-all w-48"
            placeholder="Project Name..."
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onShowMaterials}
          className="flex items-center gap-4 px-4 py-2.5 bg-blue-50/50 hover:bg-blue-600 rounded-xl transition-all duration-300 border border-blue-100/50 hover:border-blue-500 group shadow-sm hover:shadow-lg hover:shadow-blue-200/50"
          title="View Bill of Materials"
        >
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[10px] self-center">₹</span>
            <span className="text-slate-900 font-bold text-lg font-mono tracking-tight group-hover:text-white transition-colors">{formatIndianNumber(totalCost)}</span>
            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold group-hover:text-blue-200 transition-colors">Estimate</span>
          </div>
          <div className="h-4 w-px bg-blue-100 group-hover:bg-blue-400/30" />
          <div className="flex items-center gap-2">
            <span className="text-slate-600 text-sm font-medium group-hover:text-white transition-colors">{componentCount} items</span>
            <Info size={14} className="text-slate-400 group-hover:text-blue-100 transition-colors" />
          </div>
        </button>

        <button
          onClick={onNewDesign}
          className="flex items-center gap-2 px-4 py-2 bg-white/80 hover:bg-white text-slate-700 rounded-xl border border-blue-100 transition-all active:scale-95 shadow-sm"
        >
          <Plus size={18} className="text-slate-400" />
          <span className="text-sm font-semibold">New</span>
        </button>

        <button
          onClick={onSave}
          className="flex items-center gap-2 px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow-md shadow-blue-900/10 transition-all active:scale-95 border border-blue-600"
        >
          <Save size={18} />
          <span className="text-sm font-bold uppercase tracking-tight">Blueprint (PDF)</span>
        </button>
      </div>
    </div>
  );
}
