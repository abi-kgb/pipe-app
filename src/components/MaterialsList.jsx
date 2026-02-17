import { useRef } from 'react';
import { X, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { calculateComponentCost } from '../utils/pricing';

export default function MaterialsList({ components, onClose }) {
    const contentRef = useRef(null);

    // Group components by type and properties
    const materials = [];
    const map = new Map();

    components.forEach(comp => {
        const cost = calculateComponentCost(comp);
        const key = `${comp.component_type}-${comp.properties?.length || 0}-${comp.properties?.radiusScale || 1}`;

        let details = '';
        if (comp.component_type === 'straight' || comp.component_type === 'vertical') {
            details = `L: ${(comp.properties?.length || 2).toFixed(1)}m, R: ${(comp.properties?.radiusScale || 1).toFixed(1)}x`;
        } else {
            details = `Size: ${(comp.properties?.radiusScale || 1).toFixed(1)}x`;
        }

        if (map.has(key)) {
            const item = map.get(key);
            item.quantity += 1;
            item.totalCost += cost;
        } else {
            const item = {
                type: comp.component_type,
                details,
                quantity: 1,
                unitCost: cost,
                totalCost: cost
            };
            map.set(key, item);
            materials.push(item);
        }
    });

    const grandTotal = materials.reduce((sum, item) => sum + item.totalCost, 0);

    const handleDownloadImage = async () => {
        if (!contentRef.current) return;

        try {
            const canvas = await html2canvas(contentRef.current, {
                backgroundColor: '#1f2937',
            });

            const link = document.createElement('a');
            link.download = 'materials-list.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Failed to capture list', err);
            alert('Failed to save image.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Bill of Materials</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6" ref={contentRef}>
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-gray-200">Component Breakdown</h3>
                            <span className="text-sm text-gray-400">{new Date().toLocaleDateString()}</span>
                        </div>

                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-700 text-gray-400 text-sm uppercase">
                                    <th className="py-3 px-2">Component</th>
                                    <th className="py-3 px-2">Specs</th>
                                    <th className="py-3 px-2 text-center">Qty</th>
                                    <th className="py-3 px-2 text-right">Unit Price</th>
                                    <th className="py-3 px-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-300">
                                {materials.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                                        <td className="py-3 px-2 capitalize">{item.type.replace('-', ' ')}</td>
                                        <td className="py-3 px-2 text-sm text-gray-400">{item.details}</td>
                                        <td className="py-3 px-2 text-center">{item.quantity}</td>
                                        <td className="py-3 px-2 text-right">₹{item.unitCost.toFixed(2)}</td>
                                        <td className="py-3 px-2 text-right font-medium">₹{item.totalCost.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-gray-600">
                                    <td colSpan={4} className="py-4 px-2 text-right font-bold text-white uppercase">Grand Total</td>
                                    <td className="py-4 px-2 text-right font-bold text-green-400 text-lg">
                                        ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>

                        <div className="mt-8 text-center text-gray-500 text-xs">
                            Generated by Aqua Pipeline 3D
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleDownloadImage}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <Download size={18} />
                        Save as Photo
                    </button>
                </div>
            </div>
        </div>
    );
}
