import { Trash2, RotateCw } from 'lucide-react';

export default function InspectorPanel({ component, onUpdateComponent, onDeleteComponent }) {
    if (!component) {
        return (
            <div className="w-80 bg-gray-900 border-l border-gray-700 p-6">
                <h2 className="text-white font-semibold mb-4 text-lg">Inspector</h2>
                <p className="text-gray-400 text-sm">Select a component to view details</p>
            </div>
        );
    }

    const handlePositionChange = (axis, value) => {
        onUpdateComponent({
            ...component,
            [`position_${axis}`]: value,
        });
    };

    const handleRotationChange = (axis, value) => {
        onUpdateComponent({
            ...component,
            [`rotation_${axis}`]: value,
        });
    };

    const handleSnap = (axis) => {
        const snappedValue = Math.round(component[`position_${axis}`]);
        handlePositionChange(axis, snappedValue);
    };

    return (
        <div className="w-80 bg-gray-900 border-l border-gray-700 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-semibold text-lg">Inspector</h2>
                <button
                    onClick={() => onDeleteComponent(component.id)}
                    className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    title="Delete component"
                >
                    <Trash2 size={16} className="text-white" />
                </button>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="text-gray-400 text-xs uppercase tracking-wider block mb-2">Component Type</label>
                    <p className="text-white font-medium capitalize">{component.component_type.replace('_', ' ')}</p>
                </div>

                <div>
                    <label className="text-gray-400 text-xs uppercase tracking-wider block mb-3">Position</label>
                    <div className="space-y-3">
                        {['x', 'y', 'z'].map((axis) => (
                            <div key={axis} className="flex items-center gap-2">
                                <label className="text-white text-sm w-6 uppercase">{axis}</label>
                                <input
                                    type="number"
                                    value={component[`position_${axis}`].toFixed(2)}
                                    onChange={(e) => handlePositionChange(axis, parseFloat(e.target.value) || 0)}
                                    step="0.1"
                                    className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={() => handleSnap(axis)}
                                    className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                                    title="Snap to grid"
                                >
                                    <RotateCw size={14} className="text-gray-400" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-gray-400 text-xs uppercase tracking-wider block mb-3">Rotation (degrees)</label>
                    <div className="space-y-3">
                        {['x', 'y', 'z'].map((axis) => (
                            <div key={axis} className="flex items-center gap-2">
                                <label className="text-white text-sm w-6 uppercase">{axis}</label>
                                <input
                                    type="number"
                                    value={component[`rotation_${axis}`]}
                                    onChange={(e) => handleRotationChange(axis, parseFloat(e.target.value) || 0)}
                                    step="15"
                                    className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-gray-500 text-sm w-8">°</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-800">
                    <label className="text-gray-400 text-xs uppercase tracking-wider block mb-2">Component ID</label>
                    <p className="text-gray-500 text-xs font-mono break-all">{component.id}</p>
                </div>
            </div>
        </div>
    );
}
