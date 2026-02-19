import { useRef } from 'react';
import { X, Download, FileText, Weight } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculateComponentCost, calculateComponentWeight } from '../utils/pricing';

export default function MaterialsList({ designName = 'Untitled Project', components, onClose }) {
    const contentRef = useRef(null);
    const safeName = designName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    // Grouping logic with Tag ranges
    const map = new Map();
    components.forEach((comp, idx) => {
        const cost = calculateComponentCost ? calculateComponentCost(comp) : calculateComponentWeight(comp) * 2;
        const weight = calculateComponentWeight(comp);
        const material = comp.properties?.material || 'steel';
        const length = comp.properties?.length || 2;
        const type = comp.component_type || 'straight';

        // Generate a tag consistent with Scene3D
        const sameTypePrev = components.slice(0, idx).filter(c => c.component_type === type).length;
        let prefix = 'P-';
        if (['elbow', 'elbow-45', 't-joint', 'cap'].includes(type)) prefix = 'FT-';
        else if (type === 'valve') prefix = 'V-';
        else if (type === 'filter') prefix = 'FL-';
        else if (type === 'tank') prefix = 'T-';
        const tag = `${prefix}${sameTypePrev + 1}`;

        const key = `${type}-${length}-${comp.properties?.radiusScale || 1}-${material}`;

        if (map.has(key)) {
            const item = map.get(key);
            item.quantity += 1;
            item.totalCost += cost;
            item.totalWeight += weight;
            item.tags.push(tag);
        } else {
            map.set(key, {
                type,
                details: `${material.toUpperCase()}: L:${length.toFixed(1)}m, R:${(comp.properties?.radiusScale || 1).toFixed(1)}x`,
                material,
                quantity: 1,
                unitCost: cost,
                unitWeight: weight,
                totalCost: cost,
                totalWeight: weight,
                tags: [tag]
            });
        }
    });

    const materials = Array.from(map.values());
    const grandTotal = materials.reduce((sum, item) => sum + item.totalCost, 0);
    const totalWeight = materials.reduce((sum, item) => sum + item.totalWeight, 0);

    // Individual Cut List (Pipes only)
    const cutList = components
        .filter(c => c.component_type === 'straight' || c.component_type === 'vertical')
        .map((c, idx) => {
            const sameTypePrev = components.slice(0, idx).filter(comp => comp.component_type === c.component_type).length;
            return {
                tag: `${c.component_type === 'straight' ? 'P' : 'VP'}-${sameTypePrev + 1}`,
                material: (c.properties?.material || 'steel').toUpperCase(),
                length: c.properties?.length || 2,
                od: c.properties?.od || 0.3
            };
        });

    const handleDownloadImage = async () => {
        // ... (existing logic)
    };

    const handleDownloadPDF = () => {
        // ... (existing logic)
    };

    return (
        <div className="fixed inset-0 bg-blue-900/10 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white/90 border border-blue-100 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden">
                <div className="p-5 border-b border-blue-50 flex items-center justify-between bg-blue-50/30">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-6 bg-blue-700 rounded-full" />
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Engineering Bill of Materials</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-blue-50 rounded-lg">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6 bg-white/50" ref={contentRef}>
                    <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm mb-6">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">{designName}</h3>
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-xs font-mono text-slate-400 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">{new Date().toLocaleDateString()}</span>
                                <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase">
                                    <Weight size={12} />
                                    St. Wt: {totalWeight.toFixed(2)} kg
                                </div>
                            </div>
                        </div>

                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-blue-100 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                                    <th className="py-4 px-2">Tag</th>
                                    <th className="py-4 px-2">Component</th>
                                    <th className="py-4 px-2 text-center">Specs</th>
                                    <th className="py-4 px-3 text-center">Qty</th>
                                    <th className="py-4 px-2 text-right">Total Price</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-600">
                                {materials.map((item, idx) => (
                                    <tr key={idx} className="border-b border-blue-50 hover:bg-blue-50/20 transition-colors group">
                                        <td className="py-4 px-2 font-mono text-[10px] text-blue-600 font-bold">
                                            {item.tags.length > 1 ? `${item.tags[0]}...${item.tags[item.tags.length - 1]}` : item.tags[0]}
                                        </td>
                                        <td className="py-4 px-2 capitalize font-bold text-slate-800 group-hover:text-blue-700">{item.type.replace('-', ' ')}</td>
                                        <td className="py-4 px-2 text-[10px] text-slate-400 text-center font-mono">{item.details}</td>
                                        <td className="py-4 px-3 text-center tabular-nums font-bold">{item.quantity}</td>
                                        <td className="py-4 px-2 text-right font-black text-slate-900 tabular-nums">₹{item.totalCost.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* NEW SECTION: Engineering Cut List */}
                    {cutList.length > 0 && (
                        <div className="bg-slate-50 p-6 rounded-xl border-2 border-dashed border-slate-200">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <div className="w-4 h-px bg-slate-300" />
                                Workshop Cut List (Pipes Only)
                            </h4>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[9px] uppercase font-bold text-slate-400 border-b border-slate-200">
                                        <th className="pb-2">ID Tag</th>
                                        <th className="pb-2">Material</th>
                                        <th className="pb-2 text-center">OD (m)</th>
                                        <th className="pb-2 text-right">Cut Length (m)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cutList.map((item, idx) => (
                                        <tr key={idx} className="border-b border-white hover:bg-white/50 transition-colors">
                                            <td className="py-2 font-black text-xs text-slate-700">{item.tag}</td>
                                            <td className="py-2 text-[10px] uppercase">{item.material}</td>
                                            <td className="py-2 text-center tabular-nums text-[10px]">{item.od.toFixed(2)}</td>
                                            <td className="py-2 text-right font-black tabular-nums text-blue-700 text-sm">{item.length.toFixed(3)}m</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="mt-12 text-center text-slate-400 text-[10px] uppercase font-black tracking-[0.2em]">
                        System Generated • Aqua Pro Engine • Engineering Standard Blueprint
                    </div>
                </div>

                <div className="p-4 border-t border-blue-50 flex justify-end gap-3 bg-blue-50/10">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-slate-400 hover:text-slate-600 font-bold text-sm uppercase tracking-tight transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDownloadImage}
                        className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-blue-50 text-slate-600 border border-blue-100 rounded-xl transition-all font-bold text-sm uppercase tracking-tight active:scale-95"
                        title="Download as PNG"
                    >
                        <Download size={18} />
                        PNG
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl transition-all font-black text-sm uppercase tracking-tight shadow-lg shadow-blue-900/10 active:scale-95"
                    >
                        <FileText size={18} />
                        Download PDF
                    </button>
                </div>
            </div>
        </div>
    );
}
