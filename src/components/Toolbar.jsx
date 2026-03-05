import { useState, useRef } from 'react';
import { Save, Plus, Info, Sun, Moon, List, Undo, Redo, Lock, Unlock, ChevronDown, FileText, Table, MousePointer2, CheckCircle2, RotateCw, Zap, Plug } from 'lucide-react';
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
  isMobile,
  onToggleLibrary,
  showLibrary,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isLocked,
  onToggleLock,
  onExportExcel,
  isSaving,
  user,
  onLogout,
  blueprintMode,
  onToggleBlueprint,
  performanceMode,
  onTogglePerformance,
  connectionMode,
  onToggleConnection
}) {
  return (
    <div className={`transition-colors duration-300 backdrop-blur-xl border-b flex items-center justify-between px-4 lg:px-6 z-40 shadow-sm ${isMobile ? 'h-20 lg:h-24' : 'h-24'} ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/70 border-blue-100/50'}`}>
      <div className="flex items-center gap-3 lg:gap-4 group/name">
        <div className="flex items-center gap-2">
          {isMobile && (
            <button
              onClick={onToggleLibrary}
              className={`p-2 rounded-xl border transition-all active:scale-95 ${showLibrary ? 'bg-blue-600 border-blue-500 text-white' : (darkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-blue-100 text-slate-400')}`}
              title="Toggle Library"
            >
              <Plus size={18} className={showLibrary ? 'rotate-45 transition-transform' : 'transition-transform'} />
            </button>
          )}
          <div className="flex items-center justify-center bg-blue-700 text-white font-black px-2.5 lg:px-3 py-1 rounded-lg text-base lg:text-lg tracking-tighter shadow-lg shadow-blue-500/20 italic">
            P3D
          </div>
          <div className="flex flex-col hidden sm:flex">
            <span className={`font-black text-base lg:text-xl leading-none tracking-tight transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Pipe3D <span className="text-blue-600 italic">PRO</span></span>
            {!isMobile && <span className={`text-[8px] font-bold tracking-[0.3em] ml-0.5 uppercase transition-colors ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Engineering Excellence</span>}
          </div>
        </div>
        {!isMobile && (
          <>
            <div className={`h-10 w-px transition-colors ${darkMode ? 'bg-slate-800' : 'bg-blue-100'}`} />
            <div className="relative flex items-center gap-3">
              <input
                type="text"
                value={designName}
                onChange={(e) => onRename(e.target.value)}
                className={`bg-transparent text-xs font-semibold uppercase tracking-widest px-2 py-1 rounded border border-transparent transition-all w-48 focus:outline-none ${darkMode ? 'text-white hover:border-slate-700 focus:border-blue-500 focus:bg-slate-800/50' : 'text-slate-900 hover:border-blue-100 focus:border-blue-300 focus:bg-white/50'}`}
                placeholder="Project Name..."
              />
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all duration-500 ${isSaving
                ? 'text-blue-500 bg-blue-500/10'
                : (darkMode ? 'text-slate-500 bg-slate-800/50' : 'text-slate-400 bg-slate-100')
                }`}>
                {isSaving ? (
                  <>
                    <RotateCw size={10} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={10} className="text-emerald-500" />
                    <span>Saved</span>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 lg:gap-3">
        {!isMobile && (
          <>
            <button
              onClick={onTogglePerformance}
              className={`p-2.5 rounded-xl border transition-all active:scale-95 shadow-sm ${performanceMode ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-500/20' : (darkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-white border-blue-100 text-slate-400 hover:bg-blue-50')}`}
              title={performanceMode ? "Disable High Performance Mode (Show All Visuals)" : "Enable High Performance Mode (Faster on slow PCs)"}
            >
              <Zap size={18} className={performanceMode ? 'animate-pulse' : ''} />
            </button>

            <button
              onClick={onToggleTheme}
              className={`p-2.5 rounded-xl border transition-all active:scale-95 shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700' : 'bg-white border-blue-100 text-slate-400 hover:text-blue-50/50'}`}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={() => onToggleBlueprint()}
              className={`p-2.5 rounded-xl border transition-all active:scale-95 shadow-sm ${blueprintMode ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : (darkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-white border-blue-100 text-slate-400 hover:text-blue-50/50')}`}
              title={blueprintMode ? "Back to Workspace" : "Blueprint Mode"}
            >
              <RotateCw size={18} className={blueprintMode ? 'rotate-45 transition-transform' : 'transition-transform'} />
            </button>
          </>
        )}



        <button
          onClick={onShowMaterials}
          className={`flex items-center gap-2 lg:gap-4 px-3 lg:px-4 py-2 lg:py-2.5 transition-all duration-300 border group shadow-sm hover:shadow-lg rounded-xl ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-blue-50/50 border-blue-100/50 hover:bg-blue-600 hover:border-blue-500'}`}
          title="View Bill of Materials"
        >
          <div className="flex items-center gap-1.5 lg:gap-2">
            {!isMobile && <span className={`text-[10px] self-center transition-colors ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>₹</span>}
            <span className={`font-bold text-sm lg:text-lg font-mono tracking-tight transition-colors group-hover:text-white ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatIndianNumber(totalCost)}</span>
            {!isMobile && <span className={`text-[10px] uppercase tracking-wider font-bold transition-colors group-hover:text-blue-200 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Estimate</span>}
          </div>
          {!isMobile && (
            <>
              <div className={`h-4 w-px transition-colors ${darkMode ? 'bg-slate-700' : 'bg-blue-100'} group-hover:bg-blue-400/30`} />
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium transition-colors group-hover:text-white ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{componentCount} items</span>
                <Info size={14} className={`transition-colors group-hover:text-blue-100 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
              </div>
            </>
          )}
        </button>

        <div className="flex items-center gap-1 border-x px-2 mx-1 border-blue-100/30">
          <button
            onClick={onToggleLock}
            className={`p-2 rounded-lg transition-all active:scale-95 ${isLocked
              ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
              : (darkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:bg-blue-50')
              }`}
            title={isLocked ? "Unlock View" : "Lock View"}
          >
            {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
          </button>
          <button
            onClick={onToggleConnection}
            className={`p-2 rounded-lg transition-all active:scale-95 ${connectionMode
              ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
              : (darkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:bg-blue-50')
              } ${blueprintMode ? 'opacity-20 cursor-not-allowed' : ''}`}
            title={connectionMode ? "Cancel Connection" : "Socket-to-Socket Connection"}
            disabled={blueprintMode}
          >
            <div className="flex items-center gap-1.5">
              <Plug size={18} className={connectionMode ? "rotate-90 transition-transform text-white" : "transition-transform"} />
              {connectionMode && <span className="text-[9px] font-black uppercase tracking-tight text-white animate-pulse">Mode Active</span>}
            </div>
          </button>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-2 rounded-lg transition-all active:scale-95 ${canUndo
              ? (darkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:bg-blue-50')
              : 'opacity-20 cursor-not-allowed'
              }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo size={18} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-2 rounded-lg transition-all active:scale-95 ${canRedo
              ? (darkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:bg-blue-50')
              : 'opacity-20 cursor-not-allowed'
              }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo size={18} />
          </button>
        </div>

        <button
          onClick={onNewDesign}
          className={`flex items-center gap-2 px-3 lg:px-4 py-2 lg:py-2 rounded-xl border transition-all active:scale-95 shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700' : 'bg-white/80 hover:bg-white text-slate-700 border-blue-100'}`}
        >
          <Plus size={18} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
          <span className="text-sm font-semibold hidden sm:inline">New</span>
        </button>

        {!isMobile && (
          <button
            onClick={onLogout}
            className={`flex items-center gap-2 px-3 lg:px-4 py-2 lg:py-2 rounded-xl border transition-all active:scale-95 shadow-sm group/logout ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-500/50' : 'bg-white/80 hover:bg-rose-50 text-slate-600 border-blue-100 hover:text-rose-600 hover:border-rose-200'}`}
            title="Logout"
          >
            <Lock size={16} className="group-hover/logout:scale-110 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-tight">Exit</span>
          </button>
        )}

        <button
          onClick={onSave}
          className="flex items-center gap-2 px-5 lg:px-6 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow-md shadow-blue-900/10 transition-all active:scale-95 border border-blue-600 group/blueprint"
          disabled={isSaving}
        >
          <FileText size={18} className="group-hover:scale-110 transition-transform" />
          <span className="text-[10px] lg:text-xs font-black uppercase tracking-tight">Blueprint</span>
        </button>
      </div>
    </div>
  );
}
