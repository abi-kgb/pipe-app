import { Save, Plus, Info, Sun, Moon, List } from 'lucide-react';
import { formatIndianNumber } from '../utils/pricing';

export default function Toolbar({
  designName,
  onRename,
  onSave,
  onNewDesign,
  componentCount,
  totalCost,
  onShowMaterials,
  darkMode,
  onToggleTheme,
  showSchedule,
  onToggleSchedule
}) {
  return (
    <div className={`h-24 transition-colors duration-300 backdrop-blur-xl border-b flex items-center justify-between px-6 z-10 shadow-sm ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/70 border-blue-100/50'}`}>
      <div className="flex items-center gap-4 group/name">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center bg-blue-700 text-white font-black px-3 py-1 rounded-lg text-lg tracking-tighter shadow-lg shadow-blue-500/20 italic">
            P3D
          </div>
          <div className="flex flex-col">
            <span className={`font-black text-xl leading-none tracking-tight transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Pipe3D <span className="text-blue-600 italic">PRO</span></span>
            <span className={`text-[8px] font-bold tracking-[0.3em] ml-0.5 uppercase transition-colors ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Engineering Excellence</span>
          </div>
        </div>
        <div className={`h-10 w-px transition-colors ${darkMode ? 'bg-slate-800' : 'bg-blue-100'}`} />
        <div className="relative flex items-center">
          <input
            type="text"
            value={designName}
            onChange={(e) => onRename(e.target.value)}
            className={`bg-transparent text-xs font-semibold uppercase tracking-widest px-2 py-1 rounded border border-transparent transition-all w-48 focus:outline-none ${darkMode ? 'text-white hover:border-slate-700 focus:border-blue-500 focus:bg-slate-800/50' : 'text-slate-900 hover:border-blue-100 focus:border-blue-300 focus:bg-white/50'}`}
            placeholder="Project Name..."
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onToggleTheme}
          className={`p-2.5 rounded-xl border transition-all active:scale-95 shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700' : 'bg-white border-blue-100 text-slate-400 hover:text-blue-500 hover:bg-blue-50/50'}`}
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          onClick={onToggleSchedule}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all active:scale-95 shadow-sm ${showSchedule ? 'bg-blue-600 border-blue-500 text-white' : (darkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-white border-blue-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50/50')}`}
          title="Toggle Parts Schedule"
        >
          <List size={18} />
          <span className="text-xs font-bold uppercase tracking-tight">Schedule</span>
        </button>

        <button
          onClick={onShowMaterials}
          className={`flex items-center gap-4 px-4 py-2.5 transition-all duration-300 border group shadow-sm hover:shadow-lg rounded-xl ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-blue-50/50 border-blue-100/50 hover:bg-blue-600 hover:border-blue-500'}`}
          title="View Bill of Materials"
        >
          <div className="flex items-center gap-2">
            <span className={`text-[10px] self-center transition-colors ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>₹</span>
            <span className={`font-bold text-lg font-mono tracking-tight transition-colors group-hover:text-white ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatIndianNumber(totalCost)}</span>
            <span className={`text-[10px] uppercase tracking-wider font-bold transition-colors group-hover:text-blue-200 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Estimate</span>
          </div>
          <div className={`h-4 w-px transition-colors ${darkMode ? 'bg-slate-700' : 'bg-blue-100'} group-hover:bg-blue-400/30`} />
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium transition-colors group-hover:text-white ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{componentCount} items</span>
            <Info size={14} className={`transition-colors group-hover:text-blue-100 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
          </div>
        </button>

        <button
          onClick={onNewDesign}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all active:scale-95 shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700' : 'bg-white/80 hover:bg-white text-slate-700 border-blue-100'}`}
        >
          <Plus size={18} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
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
