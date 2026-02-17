import { Package, ArrowRight, ArrowUp, Circle, Filter, Droplets, GitBranch, Slash, StopCircle, Trash2 } from 'lucide-react';

const componentDefinitions = [
  { type: 'straight', label: 'Straight Pipe', icon: <ArrowRight size={20} />, color: '#2196f3' },
  { type: 'elbow', label: 'Elbow (90°)', icon: <Package size={20} />, color: '#2196f3' },
  { type: 'elbow-45', label: 'Elbow (45°)', icon: <Slash size={20} />, color: '#2196f3' },
  { type: 'vertical', label: 'Vertical Pipe', icon: <ArrowUp size={20} />, color: '#2196f3' },
  { type: 't-joint', label: 'T-Joint', icon: <GitBranch size={20} />, color: '#ff9800' },
  { type: 'valve', label: 'Valve', icon: <Circle size={20} />, color: '#f44336' },
  { type: 'filter', label: 'Filter', icon: <Filter size={20} />, color: '#4caf50' },
  { type: 'tank', label: 'Tank', icon: <Droplets size={20} />, color: '#03a9f4' },
  { type: 'cap', label: 'Cap', icon: <StopCircle size={20} />, color: '#757575' },
];

export default function ComponentLibrary({ onAddComponent, selectedId, onDelete }) {
  return (
    <div className="w-64 bg-gray-900 border-r border-gray-700 p-4 flex flex-col">
      <h2 className="text-white font-semibold mb-4 text-lg">Component Library</h2>

      {selectedId && (
        <button
          onClick={onDelete}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
        >
          <Trash2 size={20} />
          Delete Selected
        </button>
      )}

      <div className="space-y-2 overflow-y-auto flex-1">
        {componentDefinitions.map(({ type, label, icon, color }) => (
          <button
            key={type}
            onClick={() => onAddComponent(type)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-left group"
          >
            <div style={{ color }} className="flex-shrink-0">
              {icon}
            </div>
            <span className="text-gray-200 text-sm group-hover:text-white">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
