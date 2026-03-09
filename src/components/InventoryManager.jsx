import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, RefreshCw, AlertCircle, Package, ArrowRight, Table, Search, Filter } from 'lucide-react';

export default function InventoryManager({ isOpen, onClose, user }) {
    const [inventory, setInventory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterMaterial, setFilterMaterial] = useState('all');

    const fetchInventory = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/inventory');
            if (response.ok) {
                const data = await response.json();
                setInventory(data);
            } else {
                setError('Failed to fetch inventory');
            }
        } catch (err) {
            setError('Could not connect to server');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchInventory();
    }, [isOpen]);

    const materials = useMemo(() => {
        const m = new Set(inventory.map(i => i.material));
        return ['all', ...Array.from(m)].sort();
    }, [inventory]);

    const filteredInventory = useMemo(() => {
        return inventory.filter(item => {
            const matchesSearch = item.component_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.material.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = filterMaterial === 'all' || item.material === filterMaterial;
            return matchesSearch && matchesFilter;
        });
    }, [inventory, searchQuery, filterMaterial]);

    const handleUpdateQuantity = (id, val) => {
        setInventory(prev => prev.map(item =>
            item.id === id ? { ...item, quantity: parseFloat(val) || 0 } : item
        ));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch('http://localhost:5000/api/inventory', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: inventory })
            });

            if (response.ok) {
                alert('Inventory updated successfully!');
            } else {
                setError('Failed to update inventory');
            }
        } catch (err) {
            setError('Could not connect to server');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-500">
                            <Package size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Inventory Manager</h2>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Managing {inventory.length} Combinations in MSSQL</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Filters Row */}
                <div className="p-6 bg-slate-900/30 border-b border-slate-800 flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search components or materials..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Material:</span>
                        <select
                            value={filterMaterial}
                            onChange={(e) => setFilterMaterial(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                        >
                            {materials.map(m => (
                                <option key={m} value={m} className="capitalize">{m}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 text-right">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Showing {filteredInventory.length} items</span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-sm font-medium">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <RefreshCw size={32} className="animate-spin text-blue-500" />
                            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Syncing with MSSQL...</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden border border-slate-800 rounded-2xl bg-slate-950/50">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="sticky top-0 bg-slate-900 z-10">
                                    <tr className="border-b border-slate-800 shadow-sm">
                                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Component</th>
                                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Material</th>
                                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Current Quantity</th>
                                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Unit</th>
                                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Manual Entry</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInventory.map((item) => (
                                        <tr key={item.id} className="border-b border-slate-800/50 hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4 font-bold text-white tracking-tight capitalize group-hover:text-blue-400 transition-colors">{item.component_type.replace('-', ' ')}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded-md font-medium uppercase tracking-wider text-[9px] border border-slate-700">
                                                    {item.material}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 font-mono font-bold text-lg ${item.quantity < 5 ? 'text-amber-500' : 'text-blue-400'}`}>
                                                {item.quantity}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 font-bold uppercase text-[10px]">{item.unit === 'm' ? 'Meters' : 'Pieces'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => handleUpdateQuantity(item.id, e.target.value)}
                                                        className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-bold focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm"
                                                    />
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase">{item.unit}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredInventory.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-24 text-center">
                                                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No matching components found.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
                    <div className="flex flex-col">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Cartesian Inventory Sync v1.1
                        </p>
                        <p className="text-[9px] text-slate-600 font-medium">
                            Managing {inventory.length} Stock Points across all material types.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl border border-slate-700 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || isLoading}
                            className="px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-900/20 flex items-center gap-2 group transition-all disabled:opacity-50"
                        >
                            {isSaving ? (
                                <RefreshCw size={14} className="animate-spin" />
                            ) : (
                                <>
                                    <Save size={14} className="group-hover:scale-110 transition-transform" />
                                    Update MSSQL
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
