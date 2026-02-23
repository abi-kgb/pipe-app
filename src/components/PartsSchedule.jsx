import { Table, LayoutList } from 'lucide-react';
import { getComponentTag } from '../utils/tagging';

export default function PartsSchedule({ components, darkMode }) {
    if (!components || components.length === 0) return null;

    // Track counts per type for sequential tagging
    const typeCounts = {};

    return (
        <div className={`flex flex-col h-full ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
            <div className={`p-4 border-b flex items-center gap-2 ${darkMode ? 'border-slate-800' : 'border-blue-100/50'}`}>
                <LayoutList size={18} className="text-blue-500" />
                <h2 className={`text-xs font-black uppercase tracking-widest ${darkMode ? 'text-white' : 'text-slate-800'}`}>Parts Schedule</h2>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-0">
                <table className="w-full text-left border-collapse">
                    <thead className={`sticky top-0 z-10 ${darkMode ? 'bg-slate-800' : 'bg-blue-50'}`}>
                        <tr className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-blue-400'}`}>
                            <th className="p-3 border-b border-blue-100/20">ID</th>
                            <th className="p-3 border-b border-blue-100/20">Type</th>
                            <th className="p-3 border-b border-blue-100/20 text-center">Material</th>
                            <th className="p-3 border-b border-blue-100/20 text-right">Size (m)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-50/50">
                        {components.map((comp, idx) => {
                            const type = comp.component_type || 'straight';
                            const label = type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                            const material = comp.properties?.material || 'pvc';
                            const od = comp.properties?.od || 0.3;
                            const len = comp.properties?.length || 2;

                            // Get the sequential index for this type
                            if (!typeCounts[type]) typeCounts[type] = 0;
                            const typeIdx = typeCounts[type]++;
                            const tag = getComponentTag(type, typeIdx);

                            return (
                                <tr key={comp.id} className={`group hover:bg-blue-500/5 transition-colors ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                    <td className="p-3 font-mono font-black text-[10px] text-blue-500">{tag}</td>
                                    <td className="p-3">
                                        <div className="flex flex-col">
                                            <span className={`text-[11px] font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{label}</span>
                                            <span className="text-[9px] uppercase opacity-50">Industrial</span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                            {material}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right tabular-nums">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                Ø{od.toFixed(2)}
                                            </span>
                                            {['straight', 'vertical', 'tank'].includes(type) && (
                                                <span className="text-[9px] text-blue-500 font-medium">L: {len.toFixed(2)}m</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className={`p-3 border-t text-[9px] font-bold uppercase tracking-wider text-center ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-50 border-blue-50 text-slate-400'}`}>
                Showing {components.length} components
            </div>
        </div>
    );
}
