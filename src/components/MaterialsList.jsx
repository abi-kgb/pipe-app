import { useRef } from 'react';
import { X, Download, FileText, Weight } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculateComponentCost, calculateComponentWeight, calculateComponentMetrics, formatIndianNumber } from '../utils/pricing';

export default function MaterialsList({ designName = 'Untitled Project', components, onClose }) {
    const contentRef = useRef(null);
    const safeName = designName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    const formatCurrency = (amount) => {
        return `₹ ${formatIndianNumber(amount)}`;
    };

    // Grouping logic with Tag ranges
    const map = new Map();
    components.forEach((comp, idx) => {
        const cost = calculateComponentCost ? calculateComponentCost(comp) : calculateComponentWeight(comp) * 2;
        const metrics = calculateComponentMetrics(comp);

        const type = comp.component_type || 'straight';

        // Generate a tag consistent with Scene3D
        const sameTypePrev = components.slice(0, idx).filter(c => c.component_type === type).length;
        let prefix = 'P-';
        if (['elbow', 'elbow-45', 't-joint', 'cross', 'reducer', 'flange', 'union', 'coupling', 'plug', 'cap'].includes(type)) prefix = 'FT-';
        else if (type === 'valve') prefix = 'V-';
        else if (type === 'filter') prefix = 'FL-';
        else if (type === 'tank') prefix = 'T-';
        const tag = `${prefix}${sameTypePrev + 1}`;

        const key = `${type}-${metrics.length}-${metrics.od}-${metrics.material}`;

        if (map.has(key)) {
            const item = map.get(key);
            item.quantity += 1;
            item.baseCost += cost;
            item.totalWeight += metrics.weight;
            item.tags.push(tag);
        } else {
            map.set(key, {
                type,
                metrics,
                quantity: 1,
                unitBaseCost: cost,
                baseCost: cost,
                totalWeight: metrics.weight,
                tags: [tag]
            });
        }
    });

    const materials = Array.from(map.values()).map(item => {
        const gst = item.baseCost * 0.18;
        const total = item.baseCost + gst;
        return { ...item, gst, totalCost: total };
    });
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


    const handleDownloadPDF = () => {
        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageWidth = doc.internal.pageSize.getWidth();

            // --- Header ---
            doc.setFillColor(30, 58, 138);
            doc.rect(0, 0, pageWidth, 28, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text('ENGINEERING BILL OF MATERIALS', pageWidth / 2, 12, { align: 'center' });
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Project: ${designName}`, pageWidth / 2, 20, { align: 'center' });
            doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}   |   Total Weight: ${totalWeight.toFixed(2)} kg   |   Est. Cost (inc. GST): ₹${grandTotal.toFixed(2)}`, pageWidth / 2, 25, { align: 'center' });

            // --- BOM Table ---
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Bill of Materials & Metrics', 14, 38);

            autoTable(doc, {
                startY: 42,
                head: [['Tag', 'Component', 'Material', 'OD (m)', 'Thk (m)', 'Len (m)', 'Vol (m³)', 'Wt (kg)', 'Qty', 'Unit Base', 'Base Price', 'GST (18%)', 'Total']],
                body: materials.map(item => [
                    item.tags.length > 1 ? `${item.tags[0]}...${item.tags[item.tags.length - 1]}` : item.tags[0],
                    item.type.replace('-', ' ').toUpperCase(),
                    item.metrics.material,
                    item.metrics.od.toFixed(3),
                    item.metrics.thick.toFixed(4),
                    item.metrics.length.toFixed(2),
                    item.metrics.volume.toFixed(5),
                    item.metrics.weight.toFixed(2),
                    item.quantity,
                    `₹${item.unitBaseCost.toFixed(2)}`,
                    `₹${item.baseCost.toFixed(2)}`,
                    `₹${item.gst.toFixed(2)}`,
                    `₹${item.totalCost.toFixed(2)}`
                ]),
                foot: [['', '', '', '', '', '', '', '', '', '', '', 'TOTAL:', `₹${grandTotal.toFixed(2)}`]],
                headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [239, 246, 255] },
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: { 0: { fontStyle: 'bold', textColor: [37, 99, 235] }, 12: { fontStyle: 'bold', halign: 'right' } }
            });

            // --- Cut List Table ---
            if (cutList.length > 0) {
                const cutListY = doc.lastAutoTable.finalY + 12;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text('Workshop Cut List (Pipes Only)', 14, cutListY);

                autoTable(doc, {
                    startY: cutListY + 4,
                    head: [['ID Tag', 'Material', 'OD (m)', 'Cut Length (m)']],
                    body: cutList.map(item => [item.tag, item.material, item.od.toFixed(3), item.length.toFixed(3)]),
                    headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    styles: { fontSize: 8, cellPadding: 3 },
                    columnStyles: { 0: { fontStyle: 'bold' }, 3: { halign: 'right', fontStyle: 'bold', textColor: [37, 99, 235] } }
                });
            }

            // --- Footer ---
            const finalY = doc.internal.pageSize.getHeight() - 10;
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(150, 150, 150);
            doc.text('PIPE3D PRO • BLUEPRINT • NOT FOR DESIGN ONLY', pageWidth / 2, finalY, { align: 'center' });

            doc.save(`${safeName}_bom.pdf`);
        } catch (err) {
            console.error('PDF export failed:', err);
            alert('PDF export failed. Please try again.');
        }
    };

    return (
        <div className="fixed inset-0 bg-blue-900/10 backdrop-blur-md z-[100] flex items-center justify-center p-4">
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
                                    <th className="py-4 px-2 text-center">Material</th>
                                    <th className="py-4 px-2 text-center">OD (m)</th>
                                    <th className="py-4 px-2 text-center">Thk (m)</th>
                                    <th className="py-4 px-2 text-center">Len (m)</th>
                                    <th className="py-4 px-2 text-center">Vol (m³)</th>
                                    <th className="py-4 px-2 text-center">Wt (kg)</th>
                                    <th className="py-4 px-3 text-center">Qty</th>
                                    <th className="py-4 px-2 text-right">Base Price</th>
                                    <th className="py-4 px-2 text-right">GST (18%)</th>
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
                                        <td className="py-4 px-2 text-[10px] text-slate-500 text-center font-mono uppercase">{item.metrics.material}</td>

                                        <td className="py-4 px-2 text-[10px] text-slate-400 text-center font-mono">{item.metrics.od.toFixed(3)}</td>
                                        <td className="py-4 px-2 text-[10px] text-slate-400 text-center font-mono">{item.metrics.thick.toFixed(4)}</td>
                                        <td className="py-4 px-2 text-[10px] text-slate-400 text-center font-mono">{item.metrics.length.toFixed(2)}</td>
                                        <td className="py-4 px-2 text-[10px] text-slate-400 text-center font-mono">{item.metrics.volume.toFixed(5)}</td>

                                        <td className="py-4 px-2 text-[10px] text-blue-600 text-center font-mono font-bold">{item.metrics.weight.toFixed(2)}</td>

                                        <td className="py-4 px-3 text-center tabular-nums font-bold">{item.quantity}</td>
                                        <td className="py-4 px-2 text-right font-medium text-slate-600">
                                            <div className="flex justify-end items-center gap-1.5">
                                                <span className="text-slate-400 text-[10px] font-bold">₹</span>
                                                <span className="font-mono text-sm tracking-tight text-slate-700">{formatIndianNumber(item.baseCost)}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-2 text-right font-medium text-slate-500">
                                            <div className="flex justify-end items-center gap-1">
                                                <span className="text-slate-300 text-[9px] font-bold">₹</span>
                                                <span className="font-mono text-[11px] tracking-tight">{formatIndianNumber(item.gst)}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-2 text-right font-black text-slate-900">
                                            <div className="flex justify-end items-center gap-1.5">
                                                <span className="text-blue-500 text-[10px] font-bold">₹</span>
                                                <span className="font-mono text-sm tracking-tight">{formatIndianNumber(item.totalCost)}</span>
                                            </div>
                                        </td>
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
                        System Generated • Pipe3D PRO • Standard Blueprint
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
