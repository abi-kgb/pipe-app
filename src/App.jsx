import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import Scene3D from './components/Scene3D';
import ComponentLibrary from './components/ComponentLibrary';
import Toolbar from './components/Toolbar';
import { calculateTotalCost } from './utils/pricing';
import MaterialsList from './components/MaterialsList';
import ResizablePane from './components/ResizablePane';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getComponentTag } from './utils/tagging';
import * as XLSX from 'xlsx';
import { calculateComponentMetrics, calculateComponentCost } from './utils/pricing';
import AuthPage from './components/AuthPage';

function App() {
  const [components, setComponents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [placingType, setPlacingType] = useState(null);
  const [placingTemplate, setPlacingTemplate] = useState(null);
  const [designName, setDesignName] = useState('Untitled Design');
  const [clipboard, setClipboard] = useState(null);
  const [showMaterials, setShowMaterials] = useState(false);
  const [transformMode, setTransformMode] = useState('translate');
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lastSaved, setLastSaved] = useState(Date.now());
  const [isSaving, setIsSaving] = useState(false);
  const [blueprintMode, setBlueprintMode] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [performanceMode, setPerformanceMode] = useState(() => {
    return localStorage.getItem('pipe3d_perf_mode') === 'true' || window.innerWidth < 800;
  });
  const sceneRef = useRef(null); // ref to Scene3D for export control
  const lastPlacementTime = useRef(0);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('pipe3d_theme') === 'dark';
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showLibrary, setShowLibrary] = useState(window.innerWidth >= 1024);
  const [user, setUser] = useState(null);

  // Track window resize for responsiveness
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setShowLibrary(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('pipe3d_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [userParts, setUserParts] = useState(() => {
    try {
      const saved = localStorage.getItem('pipe3d_user_parts');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // --- UNDO / REDO STATE ---
  const [historyStack, setHistoryStack] = useState([[]]); // Start with empty state
  const [historyIndex, setHistoryIndex] = useState(0);

  const saveToHistory = useCallback((newComps) => {
    setHistoryStack(prev => {
      const nextStack = prev.slice(0, historyIndex + 1);
      const lastState = nextStack[nextStack.length - 1];

      // Don't save if state is identical to last
      if (lastState && JSON.stringify(lastState) === JSON.stringify(newComps)) return prev;

      const updatedStack = [...nextStack, JSON.parse(JSON.stringify(newComps))];
      // Limit history to 50 steps
      const finalStack = updatedStack.length > 50 ? updatedStack.slice(1) : updatedStack;

      // Update index to match the new stack top
      setHistoryIndex(finalStack.length - 1);
      return finalStack;
    });
  }, [historyIndex]);

  // Re-sync components and save to history in one flow to avoid double re-renders
  const updateComponentsWithHistory = useCallback((newComps) => {
    setComponents(newComps);
    saveToHistory(newComps);
  }, [saveToHistory]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setComponents(JSON.parse(JSON.stringify(historyStack[prevIdx])));
      setHistoryIndex(prevIdx);
      setSelectedIds([]);
    }
  }, [historyIndex, historyStack]);

  const handleRedo = useCallback(() => {
    if (historyIndex < historyStack.length - 1) {
      const nextIdx = historyIndex + 1;
      setComponents(JSON.parse(JSON.stringify(historyStack[nextIdx])));
      setHistoryIndex(nextIdx);
      setSelectedIds([]);
    }
  }, [historyIndex, historyStack]);

  const handleSaveToHistory = useCallback(() => {
    if (components.length === 0) return;

    const newEntry = {
      id: `hist_${Date.now()}`,
      name: designName,
      components: JSON.parse(JSON.stringify(components)), // Deep clone
      timestamp: Date.now()
    };

    setHistory(prev => [newEntry, ...prev].slice(0, 100)); // Keep last 100
  }, [components, designName]);

  const handleLoadHistory = useCallback((entry) => {
    if (components.length > 0) {
      const confirm = window.confirm('Save current design to history before loading?');
      if (confirm) handleSaveToHistory();
    }
    setComponents(entry.components);
    setDesignName(entry.name);
    setSelectedIds([]);
  }, [components, handleSaveToHistory]);

  const handleDeleteHistory = useCallback((id) => {
    setHistory(prev => prev.filter(h => h.id !== id));
  }, []);

  const handleNewDesign = () => {
    if (components.length > 0) {
      // Automatically archive to history
      handleSaveToHistory();
    }

    setComponents([]);
    setSelectedIds([]);
    setDesignName('Untitled Design');
  };
  const handleCancelPlacement = useCallback(() => {
    setPlacingType(null);
    setPlacingTemplate(null);
  }, []);

  const handleSelectComponent = useCallback((id, e) => {
    // console.log('Selection event:', { id, multiMode: multiSelectMode, hasEvent: !!e });
    if (!id) {
      setSelectedIds([]);
      return;
    }

    handleCancelPlacement();
    const isMulti = multiSelectMode || (e && (e.shiftKey || e.ctrlKey || e.metaKey));

    // Smart Assembly Selection
    // Assembly Selection
    const targetComp = components.find(c => c.id === id);
    if (!targetComp) {
      setSelectedIds([]);
      return;
    }

    let idsToSelect = [id];
    if (targetComp.assemblyId) {
      idsToSelect = components
        .filter(c => c.assemblyId === targetComp.assemblyId)
        .map(c => c.id);
    }

    if (isMulti) {
      setSelectedIds(prev => {
        const alreadySelected = idsToSelect.every(i => prev.includes(i));
        if (alreadySelected) {
          return prev.filter(i => !idsToSelect.includes(i));
        } else {
          return [...new Set([...prev, ...idsToSelect])];
        }
      });
    } else {
      setSelectedIds(idsToSelect);
    }
  }, [multiSelectMode, components, handleCancelPlacement]);
  const handleBatchSelect = useCallback((ids, e) => {
    const isMulti = multiSelectMode || (e && (e.shiftKey || e.ctrlKey || e.metaKey));

    if (isMulti) {
      setSelectedIds(prev => [...new Set([...prev, ...ids])]);
    } else {
      setSelectedIds(ids);
    }
  }, [multiSelectMode]);

  // Theme persistence
  useEffect(() => {
    localStorage.setItem('pipe3d_theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('pipe3d_perf_mode', performanceMode);
  }, [performanceMode]);

  // Initial load from autosave
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pipe3d_autosave');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.components && Array.isArray(data.components)) setComponents(data.components);
        if (data.name) setDesignName(data.name);
      }
    } catch (e) {
      console.error('Failed to load autosave');
    }
  }, []);

  // Autosave when data changes
  useEffect(() => {
    setIsSaving(true);
    const data = {
      name: designName,
      components: components,
      timestamp: Date.now()
    };
    localStorage.setItem('pipe3d_autosave', JSON.stringify(data));

    const timer = setTimeout(() => {
      setIsSaving(false);
      setLastSaved(Date.now());
    }, 800);

    return () => clearTimeout(timer);
  }, [components, designName]);

  // Handle browser closure/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      const data = {
        name: designName,
        components: components,
        timestamp: Date.now()
      };
      localStorage.setItem('pipe3d_autosave', JSON.stringify(data));
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [components, designName]);

  // Sync history to localStorage
  useEffect(() => {
    localStorage.setItem('pipe3d_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('pipe3d_user_parts', JSON.stringify(userParts));
  }, [userParts]);

  const totalCost = useMemo(() => calculateTotalCost(components), [components]);


  const handleAddComponent = useCallback((type, template = null) => {
    setPlacingType(type);
    setPlacingTemplate(template);
    setSelectedIds([]);
  }, []);

  const handlePlaceComponent = useCallback((position, rotation, properties = {}) => {
    if (!placingType) return;

    // Debounce placement to prevent rapid-fire double components
    if (Date.now() - lastPlacementTime.current < 350) {
      console.warn('Pipe3D: Double-placement prevented.');
      return;
    }
    lastPlacementTime.current = Date.now();

    // ASSEMBLY MODE: If the template has multiple parts
    if (placingTemplate?.isAssembly && placingTemplate.parts) {
      const assemblyId = `ass_${Date.now()}`;

      // Calculate assembly rotation (from snap)
      const assemblyQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          (rotation[0] * Math.PI) / 180,
          (rotation[1] * Math.PI) / 180,
          (rotation[2] * Math.PI) / 180
        )
      );

      setComponents(prev => {
        const newComps = placingTemplate.parts.map(p => {
          // 1. Calculate rotated offset
          const offsetVec = new THREE.Vector3(p.offset_x || 0, p.offset_y || 0, p.offset_z || 0);
          offsetVec.applyQuaternion(assemblyQuat);

          // 2. Calculate rotated part rotation
          const partLocalRot = new THREE.Euler(
            (p.rotation_x || 0) * (Math.PI / 180),
            (p.rotation_y || 0) * (Math.PI / 180),
            (p.rotation_z || 0) * (Math.PI / 180)
          );
          const partLocalQuat = new THREE.Quaternion().setFromEuler(partLocalRot);
          const partFinalQuat = assemblyQuat.clone().multiply(partLocalQuat);
          const finalRot = new THREE.Euler().setFromQuaternion(partFinalQuat);

          return {
            ...p,
            properties: { ...p.properties }, // Shallow clone properties
            id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.random()}`,
            assemblyId,
            position_x: position[0] + offsetVec.x,
            position_y: position[1] + offsetVec.y,
            position_z: position[2] + offsetVec.z,
            rotation_x: finalRot.x * (180 / Math.PI),
            rotation_y: finalRot.y * (180 / Math.PI),
            rotation_z: finalRot.z * (180 / Math.PI),
          };
        });
        const finalComps = [...prev, ...newComps];
        saveToHistory(finalComps);
        return finalComps;
      });
      setPlacingType(null);
      setPlacingTemplate(null);
      setSelectedIds([]);
      return;
    }

    // SINGLE PART MODE
    const finalProperties = {
      ...(placingTemplate?.properties || {}),
      ...properties
    };

    const newComponent = {
      id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      component_type: placingType,
      position_x: position[0],
      position_y: position[1],
      position_z: position[2],
      rotation_x: rotation[0],
      rotation_y: rotation[1],
      rotation_z: rotation[2],
      connections: [],
      properties: finalProperties,
    };

    setComponents(prev => {
      const next = [...prev, newComponent];
      saveToHistory(next);
      return next;
    });
    // Note: We clear placingType here to return to selection mode after placement.
    setPlacingType(null);
    setPlacingTemplate(null);
    setSelectedIds([]);
  }, [placingType, placingTemplate]);


  const handleUpdateComponent = useCallback((updatedComponent) => {
    setComponents(prev => {
      const next = prev.map(comp => (comp.id === updatedComponent.id ? updatedComponent : comp));
      saveToHistory(next);
      return next;
    });
  }, [saveToHistory]);

  const handleUpdateComponents = useCallback((updatedComponents) => {
    setComponents(prev => {
      const updates = new Map(updatedComponents.map(c => [c.id, c]));
      const next = prev.map(comp => updates.has(comp.id) ? updates.get(comp.id) : comp);
      saveToHistory(next);
      return next;
    });
  }, [saveToHistory]);

  const handleDeleteComponents = useCallback((ids) => {
    setComponents(prev => {
      const next = prev.filter(comp => !ids.includes(comp.id));
      saveToHistory(next);
      return next;
    });
    setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
  }, [saveToHistory]);

  const handleUngroupComponents = useCallback((ids) => {
    if (ids.length === 0) return;
    setComponents(prev => {
      const next = prev.map(comp => {
        if (ids.includes(comp.id) && comp.assemblyId) {
          return { ...comp, assemblyId: null };
        }
        return comp;
      });
      saveToHistory(next);
      return next;
    });
  }, [saveToHistory]);

  const handleGroupComponents = useCallback((ids) => {
    if (ids.length < 2) return;
    const assemblyId = `ass_${Date.now()}`;
    setComponents(prev => {
      const next = prev.map(comp => {
        if (ids.includes(comp.id)) {
          return { ...comp, assemblyId };
        }
        return comp;
      });
      saveToHistory(next);
      return next;
    });
  }, [saveToHistory]);

  const handleDuplicateComponents = useCallback((ids) => {
    if (ids.length === 0) return;

    setComponents(prev => {
      const selectedOnes = prev.filter(c => ids.includes(c.id));
      const newClones = selectedOnes.map(original => ({
        ...original,
        properties: { ...original.properties }, // Shallow clone properties
        id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        // Offset the clone slightly so it doesn't overlap perfectly
        position_x: original.position_x + 0.5,
        position_y: original.position_y,
        position_z: original.position_z + 0.5,
      }));

      const newComponents = [...prev, ...newClones];
      saveToHistory(newComponents);
      // Select the new clones automatically
      setTimeout(() => setSelectedIds(newClones.map(c => c.id)), 0);
      return newComponents;
    });
  }, [saveToHistory]);

  const handleSaveToLibrary = useCallback((ids) => {
    if (!ids || ids.length === 0) return;

    const selectedOnes = components.filter(c => ids.includes(c.id));
    if (selectedOnes.length === 0) return;

    const name = prompt(
      ids.length > 1 ? "Name your assembly:" : "Name your custom component:",
      ids.length > 1 ? "New Assembly" : `Custom ${selectedOnes[0].component_type}`
    );
    if (!name) return;

    let newPart;

    if (ids.length > 1) {
      // ASSEMBLY CAPTURE
      // Calculate center (using the first part as origin for simplicity, or geometric mean)
      const origin = {
        x: selectedOnes[0].position_x,
        y: selectedOnes[0].position_y,
        z: selectedOnes[0].position_z,
        rot: new THREE.Euler(
          (selectedOnes[0].rotation_x || 0) * (Math.PI / 180),
          (selectedOnes[0].rotation_y || 0) * (Math.PI / 180),
          (selectedOnes[0].rotation_z || 0) * (Math.PI / 180)
        )
      };
      const originQuatInv = new THREE.Quaternion().setFromEuler(origin.rot).invert();

      const assemblyParts = selectedOnes.map(comp => {
        // Position offset
        const pos = new THREE.Vector3(comp.position_x, comp.position_y, comp.position_z);
        const offset = pos.sub(new THREE.Vector3(origin.x, origin.y, origin.z)).applyQuaternion(originQuatInv);

        // Rotation offset
        const compRot = new THREE.Euler(
          (comp.rotation_x || 0) * (Math.PI / 180),
          (comp.rotation_y || 0) * (Math.PI / 180),
          (comp.rotation_z || 0) * (Math.PI / 180)
        );
        const compQuat = new THREE.Quaternion().setFromEuler(compRot);
        const relQuat = originQuatInv.clone().multiply(compQuat);
        const relRot = new THREE.Euler().setFromQuaternion(relQuat);

        return {
          ...JSON.parse(JSON.stringify(comp)),
          offset_x: offset.x,
          offset_y: offset.y,
          offset_z: offset.z,
          rotation_x: relRot.x * (180 / Math.PI),
          rotation_y: relRot.y * (180 / Math.PI),
          rotation_z: relRot.z * (180 / Math.PI),
        };
      });

      newPart = {
        id: `user_ass_${Date.now()}`,
        label: name,
        type: 'assembly',
        isAssembly: true,
        parts: assemblyParts,
        timestamp: Date.now()
      };
    } else {
      // SINGLE PART CAPTURE
      newPart = {
        id: `user_${Date.now()}`,
        label: name,
        type: selectedOnes[0].component_type,
        properties: { ...selectedOnes[0].properties },
        timestamp: Date.now()
      };
    }

    setUserParts(prev => [newPart, ...prev]);
  }, [components]);

  const handleDeleteUserPart = useCallback((id) => {
    setUserParts(prev => prev.filter(p => p.id !== id));
  }, []);


  // Keyboard support for common engineering shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. ESC to clear selection/placement
      if (e.key === 'Escape') {
        handleCancelPlacement();
        setSelectedIds([]);
      }

      // 2. DELETE / BACKSPACE to remove selected parts
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        // Prevent deleting if user is typing in an input
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        handleDeleteComponents(selectedIds);
      }

      // 3. CTRL + D to Duplicate
      if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedIds.length > 0) {
          handleDuplicateComponents(selectedIds);
        }
      }

      // 4. CTRL + Z for Undo
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }

      // 5. CTRL + Y or CTRL + SHIFT + Z for Redo
      if (e.ctrlKey && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        handleRedo();
      }

      // 5b. U to Ungroup
      if (e.key.toLowerCase() === 'u' && selectedIds.length > 0) {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        handleUngroupComponents(selectedIds);
      }

      // 5c. G to Group
      if (e.key.toLowerCase() === 'g' && selectedIds.length > 1) {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        handleGroupComponents(selectedIds);
      }

      // 6. Transform Mode (T for Translate, R for Rotate)
      if (e.key.toLowerCase() === 't') {
        setTransformMode('translate');
      } else if (e.key.toLowerCase() === 'r') {
        setTransformMode('rotate');
      }

      // 7. Clipboard (CTRL + C, CTRL + V)
      if (e.ctrlKey && e.key.toLowerCase() === 'c' && selectedIds.length > 0) {
        const component = components.find(c => c.id === selectedIds[0]);
        if (component) {
          setClipboard(component);
          console.log('Copied to clipboard:', component);
        }
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'v' && clipboard) {
        const newComponent = {
          ...clipboard,
          id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          position_x: clipboard.position_x + 2,
          position_y: clipboard.position_y,
          position_z: clipboard.position_z,
          connections: []
        };
        setComponents(prev => {
          const next = [...prev, newComponent];
          saveToHistory(next);
          return next;
        });
        setSelectedIds([newComponent.id]);
        console.log('Pasted:', newComponent);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCancelPlacement, selectedIds, handleDeleteComponents, handleDuplicateComponents, handleUndo, handleRedo, components, clipboard, saveToHistory]);


  const handleExportExcel = useCallback(() => {
    if (components.length === 0) {
      alert('No components to export.');
      return;
    }

    const bomData = components.map((comp, idx) => {
      const metrics = calculateComponentMetrics(comp);
      const cost = calculateComponentCost(comp);
      const typeIdx = components.filter((c, i) => i < idx && c.component_type === comp.component_type).length;
      const tag = getComponentTag(comp.component_type, typeIdx);

      return {
        'Tag': tag,
        'Component': comp.component_type.replace('-', ' ').toUpperCase(),
        'Material': metrics.material,
        'OD (m)': metrics.od.toFixed(3),
        'Thick (m)': metrics.thick.toFixed(4),
        'Length (m)': metrics.length.toFixed(2),
        'Weight (kg)': metrics.weight.toFixed(2),
        'Volume (m3)': metrics.volume.toFixed(5),
        'Base Price (INR)': cost.toFixed(2),
        'GST 18% (INR)': (cost * 0.18).toFixed(2),
        'Total Price (INR)': (cost * 1.18).toFixed(2)
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(bomData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bill of Materials');

    // Auto-size columns
    const max_width = bomData.reduce((w, r) => Math.max(w, ...Object.values(r).map(v => v.toString().length)), 10);
    worksheet['!cols'] = Object.keys(bomData[0]).map(() => ({ wch: max_width + 2 }));

    const safeName = designName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    XLSX.writeFile(workbook, `${safeName}_bom.xlsx`);
    handleSaveToHistory();
  }, [components, designName, handleSaveToHistory]);

  const handleSaveDesign = async () => {
    try {
      if (components.length === 0) {
        alert('No components to export. Add some pipes first!');
        return;
      }

      setIsCapturing(true);
      // Give a brief moment for the hidden viewports to initialize (increased to 800ms for stability)
      await new Promise(r => setTimeout(r, 800));

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = pdf.internal.pageSize.getWidth();   // 297 mm
      const H = pdf.internal.pageSize.getHeight();  // 210 mm
      const dateStr = new Date().toLocaleDateString('en-GB');

      const PAGES = [
        { key: 'iso', label: '3D Isometric View' },
        { key: 'front', label: 'Front Elevation' },
        { key: 'top', label: 'Top Plan View' },
        { key: 'right', label: 'Right Elevation' },
        { key: 'left', label: 'Left Elevation' },
        { key: 'back', label: 'Back Elevation' },
        { key: 'bottom', label: 'Bottom View' },
      ];

      const drawPage = (label, imgData) => {
        // High-end Line Art Aesthetic (Pure White background with Teal accents)
        const pureWhite = [255, 255, 255];
        const tealAccent = [8, 145, 178]; // #0891b2

        pdf.setFillColor(...pureWhite);
        pdf.rect(0, 0, W, H, 'F');

        // ── Header bar ──────────────────────────────────────────────────────
        pdf.setFillColor(...pureWhite);
        pdf.rect(5, 5, W - 10, 12, 'F');
        pdf.setTextColor(...tealAccent);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text('PIPE3D PRO  —  TECHNICAL BLUEPRINT', W / 2, 12.5, { align: 'center' });

        // ── Footer bar ──────────────────────────────────────────────────────
        pdf.setFillColor(...pureWhite);
        pdf.rect(5, H - 13, W - 10, 8, 'F');
        pdf.setDrawColor(...tealAccent); pdf.setLineWidth(0.4);
        pdf.line(5, H - 13, W - 5, H - 13);

        pdf.setTextColor(...tealAccent); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5);
        pdf.text(`PROJECT: ${designName.toUpperCase()}`, 10, H - 7.5);
        pdf.setFont('helvetica', 'normal');
        pdf.text(label.toUpperCase(), W / 2, H - 7.5, { align: 'center' });
        pdf.text(`DATE: ${dateStr}  |  REV: 01-A`, W - 10, H - 7.5, { align: 'right' });

        // ── Outer border ────────────────────────────────────────────────────
        pdf.setDrawColor(...tealAccent); pdf.setLineWidth(1.2);
        pdf.rect(5, 5, W - 10, H - 10);

        // ── View image area ─────────────────────────────────────────────────
        const imgX = 8, imgY = 19;
        const imgW = W - 16, imgH = H - 34;

        if (imgData) {
          pdf.addImage(imgData, 'PNG', imgX, imgY, imgW, imgH);
        } else {
          // Fallback shaded box
          pdf.setFillColor(245, 247, 250);
          pdf.rect(imgX, imgY, imgW, imgH, 'F');
          pdf.setTextColor(160, 170, 190);
          pdf.setFont('helvetica', 'italic'); pdf.setFontSize(9);
          pdf.text(`${label} — view not available`, W / 2, H / 2, { align: 'center' });
        }

        // Thin frame around view
        pdf.setDrawColor(...tealAccent); pdf.setLineWidth(0.5);
        pdf.rect(imgX, imgY, imgW, imgH);
      };

      // ── Step 1: capture all viewports (Blueprint Style) ────────────────
      let blueprintImages = {};
      if (sceneRef.current?.captureViews) {
        console.log('Pipe3D: Capturing Blueprint views...');
        blueprintImages = await sceneRef.current.captureViews('blueprint');
      }

      // First Set: Blueprint Drawings
      PAGES.forEach(({ key, label }, i) => {
        if (i > 0) pdf.addPage('landscape');
        drawPage(label, blueprintImages[key]);
      });

      // ── Step 4: Add Parts Schedule Table Page (TEAL/WHITE THEME) ────────
      pdf.addPage('landscape');

      // White background for schedule page
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, W, H, 'F');

      // Border for Schedule Page
      pdf.setDrawColor(8, 145, 178); // Teal
      pdf.setLineWidth(1.2);
      pdf.rect(5, 5, W - 10, H - 10);

      // Header for Schedule Page
      pdf.setFillColor(8, 145, 178);
      pdf.rect(5, 5, W - 10, 12, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('PARTS SCHEDULE — FABRICATION LIST', W / 2, 12.5, { align: 'center' });

      // Build Table Data
      const typeCounts = {};
      const tableData = components.map((comp) => {
        const type = comp.component_type || 'straight';
        if (!typeCounts[type]) typeCounts[type] = 0;
        const tag = getComponentTag(type, typeCounts[type]++);

        const material = comp.properties?.material || 'pvc';
        const od = comp.properties?.od || 0.3;
        const len = comp.properties?.length || 2;

        return [
          tag,
          type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          material.toUpperCase(),
          `Ø${od.toFixed(2)}m`,
          ['straight', 'vertical', 'tank'].includes(type) ? `${len.toFixed(2)}m` : '-'
        ];
      });

      autoTable(pdf, {
        startY: 22,
        head: [['ID', 'Type', 'Material', 'Outer Diameter', 'Cut Length']],
        body: tableData,
        theme: 'plain',
        headStyles: {
          fillColor: [8, 145, 178], // Teal
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          lineWidth: 0.1,
          lineColor: [8, 145, 178]
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [8, 145, 178], // Teal
          fillColor: [255, 255, 255],
          lineWidth: 0.1,
          lineColor: [8, 145, 178]
        },
        margin: { left: 8, right: 8 },
        styles: { font: 'helvetica', cellPadding: 3 }
      });

      // Footer for Schedule Page
      pdf.setFillColor(255, 255, 255);
      pdf.rect(5, H - 13, W - 10, 8, 'F');
      pdf.setDrawColor(8, 145, 178); pdf.setLineWidth(0.4);
      pdf.line(5, H - 13, W - 5, H - 13);
      pdf.setTextColor(8, 145, 178); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5);
      pdf.text(`PROJECT: ${designName.toUpperCase()}`, 10, H - 7.5);
      pdf.text(`TOTAL COMPONENTS: ${components.length}`, W / 2, H - 7.5, { align: 'center' });
      pdf.text(`DATE: ${dateStr}  |  REV: 01-A`, W - 10, H - 7.5, { align: 'right' });

      pdf.setDrawColor(8, 145, 178); pdf.setLineWidth(1.2);
      pdf.rect(5, 5, W - 10, H - 10);

      pdf.save(`${designName.replace(/ /g, '_')}_Blueprint.pdf`);
      handleSaveToHistory();
      setIsCapturing(false);

    } catch (error) {
      console.error('Blueprint export error:', error);
      setIsCapturing(false);
      alert('Export failed: ' + error.message);
    }
  };


  if (!user) {
    return <AuthPage onLogin={setUser} />;
  }

  return (
    <div className={`h-screen flex flex-col transition-colors duration-300 ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-[#f0f9ff] text-slate-900'} selection:bg-blue-200`}>
      <Toolbar
        designName={designName}
        onRename={setDesignName}
        onSave={handleSaveDesign}
        onExportExcel={handleExportExcel}
        onNewDesign={handleNewDesign}
        componentCount={components.length}
        totalCost={totalCost}
        onShowMaterials={() => setShowMaterials(true)}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(!darkMode)}
        blueprintMode={blueprintMode}
        onToggleBlueprint={() => setBlueprintMode(!blueprintMode)}
        isMobile={isMobile}
        onToggleLibrary={() => setShowLibrary(!showLibrary)}
        showLibrary={showLibrary}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < historyStack.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        isLocked={isLocked}
        onToggleLock={() => setIsLocked(!isLocked)}
        isSaving={isSaving}
        user={user}
        onLogout={() => setUser(null)}
        performanceMode={performanceMode}
        onTogglePerformance={() => setPerformanceMode(!performanceMode)}
      />

      {showMaterials && (
        <MaterialsList
          designName={designName}
          components={components}
          onClose={() => setShowMaterials(false)}
        />
      )}

      <main className="flex-1 relative overflow-hidden bg-slate-50">
        {blueprintMode && <div className="absolute inset-0 z-[1] paper-texture pointer-events-none" />}
        <div className="absolute inset-0">
          {isMobile ? (
            <div className="w-full h-full flex flex-col relative">
              <div className="flex-1 relative">
                <Scene3D
                  ref={sceneRef}
                  components={components}
                  selectedIds={selectedIds}
                  onSelectComponent={handleSelectComponent}
                  placingType={placingType}
                  placingTemplate={placingTemplate}
                  onPlaceComponent={(pos, rot) => {
                    handlePlaceComponent(pos, rot);
                    if (isMobile) setShowLibrary(false);
                  }}
                  onCancelPlacement={handleCancelPlacement}
                  onUpdateComponent={handleUpdateComponent}
                  onUpdateMultiple={handleUpdateComponents}
                  onBatchSelect={handleBatchSelect}
                  transformMode={transformMode}
                  onSetTransformMode={setTransformMode}
                  designName={designName}
                  darkMode={darkMode}
                  blueprintMode={blueprintMode}
                  isLocked={isLocked}
                  isCapturing={isCapturing}
                  performanceMode={performanceMode}
                />
              </div>

              {/* Mobile Library Overlay */}
              {showLibrary && (
                <div
                  className="absolute inset-0 z-50 bg-black/20 backdrop-blur-sm transition-all duration-300 animate-in fade-in"
                  onClick={() => setShowLibrary(false)}
                >
                  <div
                    className="w-full max-w-sm h-full bg-white shadow-2xl animate-in slide-in-from-left duration-300"
                    onClick={e => e.stopPropagation()}
                  >
                    <ComponentLibrary
                      components={components}
                      onUpdate={handleUpdateComponent}
                      onUpdateMultiple={handleUpdateComponents}
                      onAddComponent={handleAddComponent}
                      selectedIds={selectedIds}
                      setSelectedIds={setSelectedIds}
                      onDelete={() => selectedIds.length > 0 && handleDeleteComponents(selectedIds)}
                      onUngroup={() => selectedIds.length > 0 && handleUngroupComponents(selectedIds)}
                      onGroup={() => selectedIds.length > 1 && handleGroupComponents(selectedIds)}
                      onDuplicate={() => selectedIds.length > 0 && handleDuplicateComponents(selectedIds)}
                      onSaveToLibrary={() => selectedIds.length > 0 && handleSaveToLibrary(selectedIds)}
                      userParts={userParts}
                      onDeleteUserPart={handleDeleteUserPart}
                      transformMode={transformMode}
                      onSetTransformMode={setTransformMode}
                      multiSelectMode={multiSelectMode}
                      onSetMultiSelectMode={setMultiSelectMode}
                      history={history}
                      onLoadHistory={handleLoadHistory}
                      onDeleteHistory={handleDeleteHistory}
                      onSaveToHistory={handleSaveToHistory}
                      darkMode={darkMode}
                      placingType={placingType}
                      placingTemplate={placingTemplate}
                    />
                  </div>
                </div>
              )}


            </div>
          ) : (
            <ResizablePane
              padding="p-0"
              initialSize={20}
              minSize={10}
              maxSize={40}
              first={
                <ComponentLibrary
                  components={components}
                  onUpdate={handleUpdateComponent}
                  onUpdateMultiple={handleUpdateComponents}
                  onAddComponent={handleAddComponent}
                  selectedIds={selectedIds}
                  setSelectedIds={setSelectedIds}
                  onSelectComponent={handleSelectComponent}
                  onDelete={() => selectedIds.length > 0 && handleDeleteComponents(selectedIds)}
                  onUngroup={() => selectedIds.length > 0 && handleUngroupComponents(selectedIds)}
                  onGroup={() => selectedIds.length > 1 && handleGroupComponents(selectedIds)}
                  onDuplicate={() => selectedIds.length > 0 && handleDuplicateComponents(selectedIds)}
                  onSaveToLibrary={() => selectedIds.length > 0 && handleSaveToLibrary(selectedIds)}
                  userParts={userParts}
                  onDeleteUserPart={handleDeleteUserPart}
                  transformMode={transformMode}
                  onSetTransformMode={setTransformMode}
                  multiSelectMode={multiSelectMode}
                  onSetMultiSelectMode={setMultiSelectMode}
                  history={history}
                  onLoadHistory={handleLoadHistory}
                  onDeleteHistory={handleDeleteHistory}
                  onSaveToHistory={handleSaveToHistory}
                  darkMode={darkMode}
                  placingType={placingType}
                  placingTemplate={placingTemplate}
                />
              }
              second={
                <div className="w-full h-full">
                  <Scene3D
                    ref={sceneRef}
                    components={components}
                    selectedIds={selectedIds}
                    onSelectComponent={handleSelectComponent}
                    placingType={placingType}
                    placingTemplate={placingTemplate}
                    onPlaceComponent={handlePlaceComponent}
                    onCancelPlacement={handleCancelPlacement}
                    onUpdateComponent={handleUpdateComponent}
                    onBatchSelect={handleBatchSelect}
                    onUpdateMultiple={handleUpdateComponents}
                    transformMode={transformMode}
                    onSetTransformMode={setTransformMode}
                    designName={designName}
                    darkMode={darkMode}
                    blueprintMode={blueprintMode}
                    isLocked={isLocked}
                    isCapturing={isCapturing}
                    performanceMode={performanceMode}
                  />
                </div>
              }
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
