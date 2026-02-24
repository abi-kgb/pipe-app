import { useState } from 'react';
import { Package, ArrowRight, ArrowUp, Circle, Filter, Droplets, GitBranch, Slash, StopCircle, Trash2, Move, RotateCcw, Scaling, Disc, Hash, Plus, Link, Square, Cylinder, Cuboid, Cone, Layers, MousePointer2, History as HistoryIcon, Clock, Copy, List } from 'lucide-react';
import { COMPONENT_DEFINITIONS, MATERIALS } from '../config/componentDefinitions';


const LIBRARY_PARTS = [
  { type: 'straight', label: 'Straight Pipe', icon: <ArrowRight size={20} />, color: '#2563eb' },
  { type: 'elbow', label: 'Elbow (90°)', icon: <Package size={20} />, color: '#94a3b8' },
  { type: 'elbow-45', label: 'Elbow (45°)', icon: <Slash size={20} />, color: '#94a3b8' },
  { type: 'vertical', label: 'Vertical Pipe', icon: <ArrowUp size={20} />, color: '#2563eb' },
  { type: 't-joint', label: 'T-Joint', icon: <GitBranch size={20} />, color: '#94a3b8' },
  { type: 'cross', label: 'Cross (4-Way)', icon: <Plus size={20} />, color: '#94a3b8' },
  { type: 'reducer', label: 'Reducer', icon: <Scaling size={20} />, color: '#94a3b8' },
  { type: 'flange', label: 'Flange', icon: <Disc size={20} />, color: '#64748b' },
  { type: 'union', label: 'Union', icon: <Hash size={20} />, color: '#94a3b8' },
  { type: 'coupling', label: 'Coupling', icon: <Link size={20} />, color: '#94a3b8' },
  { type: 'valve', label: 'Valve', icon: <Circle size={20} />, color: '#f43f5e' },
  { type: 'filter', label: 'Filter', icon: <Filter size={20} />, color: '#10b981' },
  { type: 'tank', label: 'Tank', icon: <Droplets size={20} />, color: '#2563eb' },
  { type: 'cap', label: 'End Cap', icon: <StopCircle size={20} />, color: '#757575' },
  { type: 'plug', label: 'Plug', icon: <Square size={20} />, color: '#757575' },
  { type: 'cylinder', label: 'Cylinder Solid', icon: <Cylinder size={20} />, color: '#6366f1' },
  { type: 'cube', label: 'Cube Solid', icon: <Cuboid size={20} />, color: '#8b5cf6' },
  { type: 'cone', label: 'Cone Solid', icon: <Cone size={20} />, color: '#d946ef' },
];

export default function ComponentLibrary({
  components,
  onUpdate,
  onUpdateMultiple,
  onAddComponent,
  selectedIds,
  setSelectedIds,
  onDelete,
  transformMode,
  onSetTransformMode,
  multiSelectMode,
  onSetMultiSelectMode,
  history,
  onLoadHistory,
  onDeleteHistory,
  onSaveToHistory,
  darkMode,
  placingType,
  onDuplicate,
  onSaveToLibrary,
  userParts = [],
  onDeleteUserPart,
  onSelectComponent,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('library'); // 'library' or 'history'
  const selectedComponents = components.filter((c) => selectedIds.includes(c.id));
  const isMultiSelect = selectedIds.length > 1;

  const updateProperty = (key, value) => {
    if (selectedIds.length === 0) return;

    if (selectedIds.length === 1) {
      const selectedComponent = selectedComponents[0];
      onUpdate({
        ...selectedComponent,
        properties: {
          ...selectedComponent.properties,
          [key]: value,
        },
      });
    } else {
      const updated = selectedComponents.map(comp => ({
        ...comp,
        properties: {
          ...comp.properties,
          [key]: value
        }
      }));
      onUpdateMultiple(updated);
    }
  };

  const selectByMaterial = (materialId) => {
    const ids = components
      .filter(c => (c.properties?.material || 'pvc') === materialId)
      .map(c => c.id);
    setSelectedIds(ids);
  };

  const toggleToSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const filteredParts = LIBRARY_PARTS.filter(part =>
    part.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`w-full h-full border-r flex flex-col shadow-xl z-20 overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-[#f8fbff] border-blue-100/50'}`}>
      {/* Search & Header */}
      <div className={`p-6 border-b transition-colors ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-blue-100/30 bg-white/40 backdrop-blur-sm'}`}>
        <h2 className={`text-sm font-black uppercase tracking-widest mb-6 transition-colors ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Engineering Panel</h2>

        {/* 2x2 Navigation Grid */}
        <div className="grid grid-cols-2 gap-1.5 lg:gap-2 mb-6">
          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center justify-center gap-1.5 lg:gap-2 py-2.5 lg:py-3 rounded-xl text-[9px] lg:text-[10px] font-black uppercase transition-all tracking-widest border-2 ${activeTab === 'library'
              ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200'
              : (darkMode ? 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-600 hover:text-slate-300' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-100 hover:text-blue-600')
              }`}
          >
            <Package size={isMultiSelect ? 14 : 16} />
            Library
          </button>

          <button
            onClick={() => setActiveTab('my-parts')}
            className={`flex items-center justify-center gap-1.5 lg:gap-2 py-2.5 lg:py-3 rounded-xl text-[9px] lg:text-[10px] font-black uppercase transition-all tracking-widest border-2 ${activeTab === 'my-parts'
              ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200'
              : (darkMode ? 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-600 hover:text-slate-300' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-100 hover:text-blue-600')
              }`}
          >
            <Layers size={isMultiSelect ? 14 : 16} />
            My Parts
          </button>



          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center justify-center gap-1.5 lg:gap-2 py-2.5 lg:py-3 rounded-xl text-[9px] lg:text-[10px] font-black uppercase transition-all tracking-widest border-2 ${activeTab === 'history'
              ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200'
              : (darkMode ? 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-600 hover:text-slate-300' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-100 hover:text-blue-600')
              }`}
          >
            <HistoryIcon size={isMultiSelect ? 14 : 16} />
            History
          </button>
          <button
            onClick={() => onSetMultiSelectMode(!multiSelectMode)}
            className={`flex items-center justify-center gap-1.5 lg:gap-2 py-2.5 lg:py-3 rounded-xl text-[9px] lg:text-[10px] font-black uppercase transition-all tracking-widest border-2 ${multiSelectMode
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100'
              : (darkMode ? 'bg-slate-800 text-slate-500 border-slate-700 hover:border-emerald-900 hover:text-emerald-400' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-100 hover:text-blue-600')
              }`}
          >
            <MousePointer2 size={isMultiSelect ? 14 : 16} />
            Selection
          </button>
        </div>


        {/* Search Bar */}
        <div className="relative mb-6">
          <input
            type="text"
            placeholder="Search all engineering parts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full border rounded-xl py-3 pl-10 pr-4 text-xs font-medium focus:ring-2 focus:ring-blue-500 transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600' : 'bg-blue-50/50 border-blue-100/50 text-slate-900 placeholder:text-blue-300 shadow-inner'}`}
          />
          <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <h3 className={`text-[10px] font-black uppercase tracking-widest px-1 transition-colors ${darkMode ? 'text-slate-500' : 'text-blue-400/80'} flex justify-between items-center`}>
          <span>Component Library</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedIds(components.map(c => c.id))}
              className="text-[8px] hover:text-blue-500 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-[8px] hover:text-red-500 transition-colors"
            >
              Clear
            </button>
          </div>
        </h3>
      </div>

      <div className={`flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 ${darkMode ? 'dark-scrollbar' : ''}`}>
        {selectedIds.length > 0 ? (
          <div className="space-y-6 animate-in slide-in-from-left duration-300">
            <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-blue-50/50 border-blue-100/50'}`}>
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                {isMultiSelect ? <Layers className="w-6 h-6" /> : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 00-1 1v1a2 2 0 11-4 0v-1a1 1 0 00-1-1H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H7a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                  </svg>
                )}
              </div>
              <div>
                <p className={`text-[10px] font-black uppercase tracking-tighter transition-colors ${darkMode ? 'text-blue-500' : 'text-blue-400'}`}>
                  {isMultiSelect ? `${selectedIds.length} Parts Selected` : 'Selected Component'}
                </p>
                <h3 className={`text-sm font-bold capitalize leading-none transition-colors ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  {isMultiSelect ? 'Batch Editing Mode' : selectedComponents[0].component_type.replace(/-/g, ' ')}
                </h3>
              </div>
            </div>

            {/* Transform Mode Toggle */}
            <div className={`flex p-1 rounded-xl gap-1 transition-colors ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <button
                onClick={() => onSetTransformMode('translate')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${transformMode === 'translate' ? (darkMode ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm shadow-slate-200') : (darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}`}
              >
                Move
              </button>
              <button
                onClick={() => onSetTransformMode('rotate')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${transformMode === 'rotate' ? (darkMode ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm shadow-slate-200') : (darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}`}
              >
                Rotate
              </button>
            </div>

            {/* Physical Properties */}
            <div className="pt-4 space-y-4">
              <p className={`text-[10px] uppercase font-black tracking-widest text-center opacity-80 transition-colors ${darkMode ? 'text-slate-500' : 'text-blue-400'}`}>Part Specifications</p>

              {/* Length Control */}
              {selectedComponents.some(c => ['straight', 'vertical', 'tank'].includes(c.component_type)) && (
                <div className="space-y-1.5">
                  <div className={`flex justify-between items-center text-[10px] font-bold uppercase px-1 transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span>Length / Height</span>
                    <div className="flex items-center gap-0.5">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={selectedComponents[0].properties?.length || 2}
                        onChange={(e) => updateProperty('length', parseFloat(e.target.value) || 0)}
                        className={`w-16 bg-transparent text-right font-black text-blue-600 focus:outline-none focus:bg-blue-500/10 rounded px-1 transition-all ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-blue-50'}`}
                      />
                      <span className="text-blue-600 font-black">M</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.1"
                    value={selectedComponents[0].properties?.length || 2}
                    onChange={(e) => updateProperty('length', parseFloat(e.target.value))}
                    className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-600 transition-colors ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}
                  />
                </div>
              )}

              {/* Outside Diameter (OD) */}
              <div className="space-y-1.5">
                <div className={`flex justify-between items-center text-[10px] font-bold uppercase px-1 transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>Outside Diameter (OD)</span>
                  <div className="flex items-center gap-0.5">
                    <span className="text-blue-600 font-black">Ø</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={selectedComponents[0].properties?.od || (0.30 * (selectedComponents[0].properties?.radiusScale || 1))}
                      onChange={(e) => {
                        const newOD = parseFloat(e.target.value) || 0;
                        const currentWT = selectedComponents[0].properties?.wallThickness || 0.02;
                        if (isMultiSelect) {
                          const updated = selectedComponents.map(comp => ({
                            ...comp,
                            properties: { ...comp.properties, od: newOD, id: parseFloat((newOD - 2 * (comp.properties?.wallThickness || 0.02)).toFixed(3)) }
                          }));
                          onUpdateMultiple(updated);
                        } else {
                          onUpdate({
                            ...selectedComponents[0],
                            properties: { ...selectedComponents[0].properties, od: newOD, id: parseFloat((newOD - 2 * currentWT).toFixed(3)) }
                          });
                        }
                      }}
                      className={`w-16 bg-transparent text-right font-black text-blue-600 focus:outline-none focus:bg-blue-500/10 rounded px-1 transition-all ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-blue-50'}`}
                    />
                    <span className="text-blue-600 font-black">M</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.01"
                  value={selectedComponents[0].properties?.od || (0.30 * (selectedComponents[0].properties?.radiusScale || 1))}
                  onChange={(e) => {
                    const newOD = parseFloat(e.target.value);
                    if (isMultiSelect) {
                      const updated = selectedComponents.map(comp => {
                        const currentWT = comp.properties?.wallThickness || 0.02;
                        return {
                          ...comp,
                          properties: {
                            ...comp.properties,
                            od: newOD,
                            id: parseFloat((newOD - 2 * currentWT).toFixed(3))
                          }
                        };
                      });
                      onUpdateMultiple(updated);
                    } else {
                      const currentWT = selectedComponents[0].properties?.wallThickness || 0.02;
                      onUpdate({
                        ...selectedComponents[0],
                        properties: {
                          ...selectedComponents[0].properties,
                          od: newOD,
                          id: parseFloat((newOD - 2 * currentWT).toFixed(3))
                        }
                      });
                    }
                  }}
                  className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-600 transition-colors ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}
                />
              </div>

              {/* Wall Thickness (WT) */}
              <div className="space-y-1.5">
                <div className={`flex justify-between items-center text-[10px] font-bold uppercase px-1 transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>Wall Thickness (WT)</span>
                  <div className="flex items-center gap-0.5">
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={selectedComponents[0].properties?.wallThickness || 0.01}
                      onChange={(e) => {
                        const newWT = parseFloat(e.target.value) || 0;
                        const currentOD = selectedComponents[0].properties?.od || 0.30;
                        if (isMultiSelect) {
                          const updated = selectedComponents.map(comp => ({
                            ...comp,
                            properties: { ...comp.properties, wallThickness: newWT, id: parseFloat(((comp.properties?.od || 0.30) - 2 * newWT).toFixed(3)) }
                          }));
                          onUpdateMultiple(updated);
                        } else {
                          onUpdate({
                            ...selectedComponents[0],
                            properties: { ...selectedComponents[0].properties, wallThickness: newWT, id: parseFloat((currentOD - 2 * newWT).toFixed(3)) }
                          });
                        }
                      }}
                      className={`w-16 bg-transparent text-right font-black text-blue-600 focus:outline-none focus:bg-blue-500/10 rounded px-1 transition-all ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-blue-50'}`}
                    />
                    <span className="text-blue-600 font-black">M</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.005"
                  max="0.1"
                  step="0.001"
                  value={selectedComponents[0].properties?.wallThickness || 0.01}
                  onChange={(e) => {
                    const newWT = parseFloat(e.target.value);
                    if (isMultiSelect) {
                      const updated = selectedComponents.map(comp => {
                        const currentOD = comp.properties?.od || 0.30;
                        return {
                          ...comp,
                          properties: {
                            ...comp.properties,
                            wallThickness: newWT,
                            id: parseFloat((currentOD - 2 * newWT).toFixed(3))
                          }
                        };
                      });
                      onUpdateMultiple(updated);
                    } else {
                      const currentOD = selectedComponents[0].properties?.od || 0.30;
                      onUpdate({
                        ...selectedComponents[0],
                        properties: {
                          ...selectedComponents[0].properties,
                          wallThickness: newWT,
                          id: parseFloat((currentOD - 2 * newWT).toFixed(3))
                        }
                      });
                    }
                  }}
                  className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-600 transition-colors ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}
                />
              </div>

              {/* Inside Diameter (ID) */}
              <div className={`space-y-1.5 pb-2 border-b transition-colors ${darkMode ? 'border-slate-800' : 'border-blue-50/50'}`}>
                <div className={`flex justify-between text-[10px] font-bold uppercase px-1 transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>Inside Diameter (ID)</span>
                  <span className={`font-black transition-colors ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Ø {(selectedComponents[0].properties?.id || ((selectedComponents[0].properties?.od || 0.30) - 2 * (selectedComponents[0].properties?.wallThickness || 0.01))).toFixed(2)}m</span>
                </div>
                <div className={`px-1 text-[9px] italic transition-colors ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>ID is automatically calculated</div>
              </div>

              {/* Material Selection (Box Grid) */}
              <div className="space-y-3 pt-2">
                <label className={`text-[10px] font-black uppercase tracking-widest px-1 transition-colors ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Material Selection</label>
                <div className={`flex p-1.5 rounded-xl gap-2 overflow-x-auto no-scrollbar transition-colors ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  {Object.values(MATERIALS).map((mat) => (
                    <div key={mat.id} className="relative group/mat flex-shrink-0">
                      <button
                        onClick={() => updateProperty('material', mat.id)}
                        className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-all border-2 ${selectedComponents.every(c => (c.properties?.material || 'pvc') === mat.id) ? 'border-blue-500 shadow-md ring-2 ring-blue-100' : (darkMode ? 'border-transparent hover:border-slate-600' : 'border-transparent hover:border-slate-300')}`}
                        title={mat.name}
                      >
                        <div className="w-6 h-6 rounded-full shadow-inner border border-black/5" style={{ backgroundColor: mat.color }} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          selectByMaterial(mat.id);
                        }}
                        className={`absolute -top-1 -right-1 w-5 h-5 shadow-xl border rounded-full flex items-center justify-center text-blue-500 hover:bg-blue-600 hover:text-white transition-all transform scale-0 group-hover/mat:scale-100 ${darkMode ? 'bg-slate-900 border-slate-700 shadow-slate-950' : 'bg-white border-slate-100'}`}
                        title={`Select all ${mat.name} parts`}
                      >
                        <Plus size={10} strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Valve Specific Controls */}
              {!isMultiSelect && selectedComponents[0].component_type === 'valve' && (
                <div className="pt-4 space-y-3">
                  <p className={`text-[10px] uppercase font-black tracking-widest text-center transition-colors ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Valve Config</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Top', angle: 0 },
                      { label: 'Right', angle: 90 },
                      { label: 'Bottom', angle: 180 },
                      { label: 'Left', angle: 270 }
                    ].map((pos) => (
                      <button
                        key={pos.label}
                        onClick={() => updateProperty('handleRotation', pos.angle)}
                        className={`py-2 text-[10px] font-bold rounded-lg transition-colors shadow-sm border ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white' : 'bg-white/60 hover:bg-blue-50 text-slate-600 border-blue-100 hover:text-blue-700'}`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={onDuplicate}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all duration-300 text-[10px] font-black uppercase border group shadow-sm ${darkMode ? 'bg-blue-950/20 hover:bg-blue-600 text-blue-400 hover:text-white border-blue-900/30 hover:shadow-blue-900/50' : 'bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border-blue-100 hover:shadow-blue-200'}`}
                >
                  <Copy size={16} />
                  Duplicate
                </button>
                <button
                  onClick={onDelete}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all duration-300 text-[10px] font-black uppercase border group shadow-sm ${darkMode ? 'bg-red-950/20 hover:bg-red-600 text-red-500 hover:text-white border-red-900/30 hover:shadow-red-900/50' : 'bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border-red-100 hover:shadow-red-200'}`}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>

              <button
                onClick={onSaveToLibrary}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all duration-300 text-[10px] font-black uppercase border mt-2 group shadow-sm ${darkMode ? 'bg-emerald-950/20 hover:bg-emerald-600 text-emerald-500 hover:text-white border-emerald-900/30 hover:shadow-emerald-900/50' : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border-emerald-100 hover:shadow-emerald-200'}`}
              >
                <Layers size={16} />
                {isMultiSelect ? 'Save Assembly to My Parts' : 'Add to My Parts Library'}
              </button>
            </div>
          </div>
        ) : activeTab === 'my-parts' ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className={`text-[10px] font-black uppercase tracking-widest px-1 transition-colors ${darkMode ? 'text-slate-500' : 'text-blue-400/70'}`}>My Custom Parts</h3>
            <div className="grid grid-cols-1 gap-2">
              {userParts.length > 0 ? (
                userParts.map((part) => (
                  <div key={part.id} className="relative group/user">
                    <button
                      onClick={() => onAddComponent(part.type, part)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 border-2 shadow-sm hover:shadow-md ${placingType === part.type && part.id === part.id
                        ? (darkMode ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-200')
                        : (darkMode ? 'bg-slate-800 border-slate-700 hover:bg-emerald-700 hover:border-emerald-500' : 'bg-white border-slate-100/80 hover:bg-emerald-50 hover:border-emerald-200')
                        }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-slate-900 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                        <Package size={16} />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className={`text-[11px] font-bold truncate ${darkMode ? 'text-white' : 'text-slate-700'}`}>{part.label}</p>
                        <p className={`text-[8px] font-medium uppercase tracking-wider opacity-60 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{part.type}</p>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteUserPart(part.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 opacity-0 group-hover/user:opacity-100 hover:text-red-500 transition-all text-slate-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 border-2 border-dashed rounded-3xl border-slate-200">
                  <Package size={32} className="mx-auto mb-3 text-slate-200" />
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No custom parts yet</p>
                  <p className="text-[8px] font-bold text-slate-400 mt-1 px-4">Select a part and click "Add to My Parts"</p>
                </div>
              )}
            </div>
          </div>

        ) : activeTab === 'library' ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-200">
            <div className="grid grid-cols-1 gap-2">
              {filteredParts.length > 0 ? (
                filteredParts.map((part) => (
                  <button
                    key={part.type}
                    onClick={() => onAddComponent(part.type)}
                    className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-300 border-2 shadow-md hover:shadow-xl ${placingType === part.type
                      ? (darkMode ? 'bg-blue-600 border-blue-400 text-white' : 'bg-blue-600 border-blue-500 text-white shadow-blue-200')
                      : (darkMode ? 'bg-slate-800 border-slate-700 hover:bg-blue-700 hover:border-blue-500 hover:shadow-blue-900/50' : 'bg-white border-slate-100/80 hover:bg-blue-600 hover:border-blue-500 hover:shadow-blue-200/50')
                      }`}
                  >
                    <div className="relative">
                      <div
                        className="absolute inset-0 blur-lg opacity-20 group-hover:opacity-60 transition-opacity duration-300"
                        style={{ backgroundColor: part.color }}
                      />
                      <div className={`relative w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm ${placingType === part.type ? 'bg-white/20 text-white' : (darkMode ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-600')}`}>
                        {part.icon}
                      </div>
                    </div>
                    <div className="text-left">
                      <p className={`text-xs font-bold transition-colors ${placingType === part.type || darkMode ? 'text-white' : 'text-slate-700'} group-hover:text-white`}>{part.label}</p>
                      <p className={`text-[9px] font-medium uppercase tracking-wider transition-colors ${placingType === part.type ? 'text-blue-100' : (darkMode ? 'text-slate-500' : 'text-blue-400/60')} group-hover:text-blue-100`}>Industrial Part</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No matching parts found</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-1">
              <h3 className={`text-[10px] font-black uppercase tracking-widest transition-colors ${darkMode ? 'text-slate-500' : 'text-blue-400/70'}`}>Design History</h3>
              <button
                onClick={onSaveToHistory}
                className="text-[9px] font-bold text-blue-600 hover:text-blue-800 uppercase flex items-center gap-1"
              >
                <Plus size={10} />
                Save Current
              </button>
            </div>
            <div className="space-y-2">
              {history.length > 0 ? (
                history.map((entry) => (
                  <div
                    key={entry.id}
                    className={`group p-3 rounded-xl border-2 transition-all duration-300 shadow-sm hover:shadow-md ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-white border-slate-100 hover:border-blue-200'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-slate-900 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                          <Clock size={16} />
                        </div>
                        <div>
                          <p className={`text-[10px] font-black truncate max-w-[120px] uppercase transition-colors ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                            {entry.name || 'Untitled'}
                          </p>
                          <p className={`text-[8px] font-bold transition-colors ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {new Date(entry.timestamp).toLocaleDateString()} at {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteHistory(entry.id)}
                        className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'text-slate-600 hover:text-red-400 hover:bg-red-950/30' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
                        title="Delete from history"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <button
                      onClick={() => onLoadHistory(entry)}
                      className={`w-full py-2 rounded-lg text-[9px] font-black uppercase transition-all tracking-widest border ${darkMode ? 'bg-slate-900 hover:bg-blue-600 text-blue-400 hover:text-white border-slate-700 hover:border-blue-500' : 'bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border-blue-100'}`}
                    >
                      Open & Modify
                    </button>
                  </div>
                ))
              ) : (
                <div className={`text-center py-10 border-2 border-dashed rounded-2xl transition-colors ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/50 border-slate-100'}`}>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No history yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div >
  );
}
