import { useState } from 'react';
import { Package, ArrowRight, ArrowUp, Circle, Filter, Droplets, GitBranch, Slash, StopCircle, Trash2, Move, RotateCcw, Scaling, Disc, Hash, Plus, Link, Square, Cylinder, Cuboid, Cone } from 'lucide-react';
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
  onAddComponent,
  selectedId,
  onDelete,
  transformMode,
  onSetTransformMode,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const selectedComponent = components.find((c) => c.id === selectedId);

  const updateProperty = (key, value) => {
    if (!selectedComponent) return;
    onUpdate({
      ...selectedComponent,
      properties: {
        ...selectedComponent.properties,
        [key]: value,
      },
    });
  };

  const filteredParts = LIBRARY_PARTS.filter(part =>
    part.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-full bg-[#f8fbff] border-r border-blue-100/50 flex flex-col shadow-xl z-20 overflow-hidden">
      {/* Search & Header */}
      <div className="p-6 border-b border-blue-100/30 flex-shrink-0 bg-white/40 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-blue-400/80">Engineering Panel</h2>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search parts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-blue-50/50 border border-blue-100/50 rounded-xl py-3 pl-10 pr-4 text-xs font-medium focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-blue-300"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        {selectedId && selectedComponent ? (
          <div className="space-y-6 animate-in slide-in-from-left duration-300">
            {/* ... selected component view (lines 60-224) remains same ... */}
            <div className="flex items-center gap-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 00-1 1v1a2 2 0 11-4 0v-1a1 1 0 00-1-1H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H7a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">Selected Component</p>
                <h3 className="text-sm font-bold text-slate-800 capitalize leading-none">{selectedComponent.component_type.replace(/-/g, ' ')}</h3>
              </div>
            </div>

            {/* Transform Mode Toggle */}
            <div className="flex bg-slate-50 p-1 rounded-xl gap-1">
              <button
                onClick={() => onSetTransformMode('translate')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${transformMode === 'translate' ? 'bg-white text-blue-600 shadow-sm shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Move
              </button>
              <button
                onClick={() => onSetTransformMode('rotate')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${transformMode === 'rotate' ? 'bg-white text-blue-600 shadow-sm shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Rotate
              </button>
            </div>

            {/* Physical Properties */}
            <div className="pt-4 space-y-4">
              <p className="text-blue-400 text-[10px] uppercase font-black tracking-widest text-center opacity-80">Part Specifications</p>

              {/* Length Control */}
              {['straight', 'vertical', 'tank'].includes(selectedComponent.component_type) && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase px-1">
                    <span>Length / Height</span>
                    <span className="text-blue-600 font-black">{(selectedComponent.properties?.length || 2).toFixed(2)}m</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.1"
                    value={selectedComponent.properties?.length || 2}
                    onChange={(e) => updateProperty('length', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              )}

              {/* Outside Diameter (OD) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase px-1">
                  <span>Outside Diameter (OD)</span>
                  <span className="text-blue-600 font-black">Ø {(selectedComponent.properties?.od || (0.30 * (selectedComponent.properties?.radiusScale || 1))).toFixed(2)}m</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.01"
                  value={selectedComponent.properties?.od || (0.30 * (selectedComponent.properties?.radiusScale || 1))}
                  onChange={(e) => {
                    const newOD = parseFloat(e.target.value);
                    const currentWT = selectedComponent.properties?.wallThickness || 0.02;
                    // Keep ID = OD - 2*WT
                    onUpdate({
                      ...selectedComponent,
                      properties: {
                        ...selectedComponent.properties,
                        od: newOD,
                        id: parseFloat((newOD - 2 * currentWT).toFixed(3))
                      }
                    });
                  }}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Wall Thickness (WT) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase px-1">
                  <span>Wall Thickness (WT)</span>
                  <span className="text-blue-600 font-black">{(selectedComponent.properties?.wallThickness || 0.02).toFixed(3)}m</span>
                </div>
                <input
                  type="range"
                  min="0.005"
                  max="0.1"
                  step="0.001"
                  value={selectedComponent.properties?.wallThickness || 0.02}
                  onChange={(e) => {
                    const newWT = parseFloat(e.target.value);
                    const currentOD = selectedComponent.properties?.od || 0.30;
                    // ID = OD - 2*WT
                    onUpdate({
                      ...selectedComponent,
                      properties: {
                        ...selectedComponent.properties,
                        wallThickness: newWT,
                        id: parseFloat((currentOD - 2 * newWT).toFixed(3))
                      }
                    });
                  }}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Inside Diameter (ID) */}
              <div className="space-y-1.5 pb-2 border-b border-blue-50/50">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase px-1">
                  <span>Inside Diameter (ID)</span>
                  <span className="text-slate-400 font-black">Ø {(selectedComponent.properties?.id || ((selectedComponent.properties?.od || 0.30) - 2 * (selectedComponent.properties?.wallThickness || 0.02))).toFixed(2)}m</span>
                </div>
                <div className="px-1 text-[9px] text-slate-400 italic">ID is automatically calculated</div>
              </div>

              {/* Material Selection (Box Grid) - Moved to bottom */}
              <div className="space-y-3 pt-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Material Selection</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(MATERIALS).map(m => (
                    <button
                      key={m.id}
                      onClick={() => updateProperty('material', m.id)}
                      className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 ${(selectedComponent.properties?.material || 'steel') === m.id
                        ? 'border-blue-600 bg-blue-50 shadow-lg shadow-blue-200/50'
                        : 'border-slate-100 bg-slate-50/50 hover:border-slate-300 hover:bg-white hover:shadow-md'
                        }`}
                    >
                      <div
                        className="w-5 h-5 rounded-full shadow-inner border border-white/50"
                        style={{ backgroundColor: m.color }}
                      />
                      <span className={`text-[9px] font-bold uppercase tracking-tight text-center ${(selectedComponent.properties?.material || 'steel') === m.id ? 'text-blue-700' : 'text-slate-500'
                        }`}>
                        {m.name.split(' (')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Valve Specific Controls */}
            {selectedComponent.component_type === 'valve' && (
              <div className="pt-4 space-y-3">
                <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest text-center">Valve Config</p>
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
                      className="py-2 bg-white/60 hover:bg-blue-50 text-[10px] font-bold text-slate-600 border border-blue-100 rounded-lg transition-colors hover:text-blue-700 shadow-sm"
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={onDelete}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-xl transition-all duration-300 text-[10px] font-black uppercase border border-red-100 mt-4 group shadow-sm hover:shadow-red-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Component
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-blue-400/70 uppercase tracking-widest px-1">Library</h3>
            <div className="grid grid-cols-1 gap-2">
              {filteredParts.length > 0 ? (
                filteredParts.map((part) => (
                  <button
                    key={part.type}
                    onClick={() => onAddComponent(part.type)}
                    className="group flex items-center gap-3 p-3 bg-white hover:bg-blue-600 rounded-xl transition-all duration-300 border-2 border-slate-100/80 hover:border-blue-500 shadow-md hover:shadow-xl hover:shadow-blue-200/50"
                  >
                    <div className="relative">
                      {/* Dynamic Background Glow */}
                      <div
                        className="absolute inset-0 blur-lg opacity-20 group-hover:opacity-60 transition-opacity duration-300"
                        style={{ backgroundColor: part.color }}
                      />
                      <div className="relative w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-600 group-hover:scale-110 transition-transform shadow-sm">
                        {part.icon}
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-700 group-hover:text-white transition-colors">{part.label}</p>
                      <p className="text-[9px] font-medium text-blue-400/60 group-hover:text-blue-100 transition-colors uppercase tracking-wider">Industrial Part</p>
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
        )}
      </div>
    </div>
  );
}
