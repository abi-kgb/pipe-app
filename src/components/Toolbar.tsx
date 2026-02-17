import { Save, Plus, Info } from 'lucide-react';

interface ToolbarProps {
  designName: string;
  onSave: () => void;
  onNewDesign: () => void;
  componentCount: number;
  totalCost: number;
  onShowMaterials: () => void;
}


export default function Toolbar({ designName, onSave, onNewDesign, componentCount, totalCost, onShowMaterials }: ToolbarProps) {
  return (
    <div className="h-16 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-white font-bold text-xl">Aqua Pipeline 3D</h1>
        <div className="h-6 w-px bg-gray-700" />
        <span className="text-gray-400 text-sm">{designName}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onShowMaterials}
          className="flex items-center gap-6 px-4 py-2 bg-gray-800 hover:bg-gray-700 transition-colors rounded-lg mr-4 group"
          title="View Bill of Materials"
        >
          <div className="flex items-center gap-2">
            <span className="text-green-400 font-bold text-lg">₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold group-hover:text-gray-300 transition-colors">Total Cost</span>
          </div>
          <div className="h-4 w-px bg-gray-600" />
          <div className="flex items-center gap-2">
            <Info size={16} className="text-blue-400" />
            <span className="text-gray-300 text-sm">{componentCount} items</span>
          </div>
        </button>

        <button
          onClick={onNewDesign}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          <span className="text-sm">New</span>
        </button>

        <button
          onClick={onSave}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Save size={18} />
          <span className="text-sm">Save</span>
        </button>
      </div>
    </div>
  );
}
