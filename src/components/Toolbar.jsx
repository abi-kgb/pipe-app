import { Save, Plus, Info } from 'lucide-react';

export default function Toolbar({ designName, onRename, onSave, onNewDesign, componentCount, totalCost, onShowMaterials }) {
  return (
    <div className="h-16 bg-white/70 backdrop-blur-xl border-b border-blue-100/50 flex items-center justify-between px-6 z-10 shadow-sm">
      <div className="flex items-center gap-4 group/name">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center shadow-md">
            <div className="w-4 h-4 border-2 border-white rounded-sm rotate-45" />
          </div>
          <h1 className="text-slate-900 font-bold text-xl tracking-tight uppercase">Aqua <span className="text-blue-700 italic">Pro</span></h1>
        </div>
        <div className="h-6 w-px bg-blue-100" />
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
          className="flex items-center gap-6 px-4 py-2 bg-white/50 hover:bg-white border border-blue-100 transition-all rounded-xl mr-4 group shadow-inner"
          title="View Bill of Materials"
        >
          <div className="flex items-center gap-2">
            <span className="text-slate-900 font-bold text-lg tabular-nums">₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold group-hover:text-blue-600 transition-colors">Estimate</span>
          </div>
          <div className="h-4 w-px bg-blue-100" />
          <div className="flex items-center gap-2">
            <span className="text-slate-600 text-sm font-medium">{componentCount} items</span>
            <Info size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
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
          <span className="text-sm font-bold uppercase tracking-tight">Export PDF/IMG</span>
        </button>
      </div>
    </div>
  );
}
