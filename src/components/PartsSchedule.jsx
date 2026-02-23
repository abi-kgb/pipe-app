import { Table, LayoutList, DollarSign } from 'lucide-react';
import { getComponentTag } from '../utils/tagging';
import { calculateComponentCost, formatIndianNumber } from '../utils/pricing';

export default function PartsSchedule({ components, selectedIds = [], onSelectComponent, darkMode }) {
    if (!components || components.length === 0) return (
        <div className={`h-full flex flex-col items-center justify-center p-8 text-center ${darkMode ? 'text-slate-600' : 'text-slate-300'}`}>
            <LayoutList size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-bold uppercase tracking-widest">No components added yet</p>
        </div>
    );

    // Track counts per type for sequential tagging
    const typeCounts = {};

    return (
        <div className={`flex flex-col h-full ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
            <div className={`p-3 border-b flex items-center justify-between ${darkMode ? 'border-slate-800' : 'border-blue-100/50'}`}>
                <div className="flex items-center gap-2">
                    <LayoutList size={16} className="text-blue-500" />
                    <h2 className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-white' : 'text-slate-800'}`}>Engineering BOM</h2>
                </div>
                <div className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-blue-50 text-blue-400'}`}>
                    {components.length} ITEMS
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-0">
                <table className="w-full text-left border-collapse">
                    <thead className={`sticky top-0 z-10 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                        <tr className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            <th className="p-2 pl-4 border-b border-blue-100/10">Tag</th>
                            <th className="p-2 border-b border-blue-100/10">Details</th>
                            <th className="p-2 border-b border-blue-100/10 text-right pr-4">Cost (₹)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-50/10">
                        {components.map((comp, idx) => {
                            const type = comp.component_type || 'straight';
                            const label = type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                            const material = comp.properties?.material || 'pvc';
                            const od = comp.properties?.od || 0.3;
                            const len = comp.properties?.length || 2;
                            const isSelected = selectedIds.includes(comp.id);
                            const cost = calculateComponentCost(comp);

                            // Get the sequential index for this type
                            if (!typeCounts[type]) typeCounts[type] = 0;
                            const typeIdx = typeCounts[type]++;
                            const tag = getComponentTag(type, typeIdx);

                            return (
                                <tr
                                    key={comp.id}
                                    onClick={() => onSelectComponent && onSelectComponent(comp.id)}
                                    className={`group cursor-pointer transition-colors ${isSelected
                                        ? (darkMode ? 'bg-blue-900/40 border-l-2 border-blue-500' : 'bg-blue-50 border-l-2 border-blue-600')
                                        : (darkMode ? 'hover:bg-slate-800/50 border-l-2 border-transparent' : 'hover:bg-blue-50/50 border-l-2 border-transparent')
                                        }`}
                                >
                                    <td className={`p-2 pl-4 font-mono font-black text-[10px] ${isSelected ? 'text-blue-500' : (darkMode ? 'text-slate-500' : 'text-blue-400')}`}>
                                        {tag}
                                    </td>
                                    <td className="p-2">
                                        <div className="flex flex-col">
                                            <span className={`text-[10px] font-bold ${isSelected ? 'text-blue-600' : (darkMode ? 'text-slate-200' : 'text-slate-800')}`}>{label}</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-[8px] uppercase font-bold ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{material}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                <span className={`text-[8px] font-mono ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Ø{od.toFixed(2)}</span>
                                                {['straight', 'vertical', 'tank'].includes(type) && (
                                                    <span className="text-[8px] text-blue-500 font-bold">L:{len.toFixed(2)}</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-2 text-right pr-4 tabular-nums">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-[10px] font-black ${isSelected ? 'text-blue-600' : (darkMode ? 'text-slate-300' : 'text-slate-700')}`}>
                                                {formatIndianNumber(cost)}
                                            </span>
                                            <span className="text-[7px] text-slate-400 uppercase tracking-tighter">Est. GST Inc.</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className={`p-2 border-t flex justify-between items-center ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-blue-50'}`}>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-2">Live Inventory Update</span>
                <span className={`text-[9px] font-mono font-black pr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    ₹{formatIndianNumber(components.reduce((sum, c) => sum + calculateComponentCost(c), 0))}
                </span>
            </div>
        </div>
    );
}
