import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { findSnapPoint, findSnapForTransform, checkIntersection, calculateManualConnection } from './utils/snapping.jsx';
import Scene3D from './components/Scene3D';
import ComponentLibrary from './components/ComponentLibrary';
import Toolbar from './components/Toolbar';
import { calculateTotalCost } from './utils/pricing.jsx';
import MaterialsList from './components/MaterialsList';
import ResizablePane from './components/ResizablePane';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getComponentTag } from './utils/tagging.jsx';
import * as XLSX from 'xlsx';
import { calculateComponentMetrics, calculateComponentCost } from './utils/pricing.jsx';
import AuthPage from './components/AuthPage';
import { COMPONENT_DEFINITIONS } from './config/componentDefinitions.jsx';
import InventoryManager from './components/InventoryManager';

function App() {
  useEffect(() => {
    const handleGlobalClick = (e) => {
      try {
        console.log(`[Global/Click] target:${e?.target?.tagName}.${e?.target?.className}, x:${e?.clientX}, y:${e?.clientY}`);
      } catch (err) {}
    };
    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, []);

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
  const [isCapturing, setIsCapturing] = useState(false);
  const [connectionMode, setConnectionMode] = useState(false);
  const [selectedSockets, setSelectedSockets] = useState([]); // [{ componentId, socketIndex }]
  const [snapPivot, setSnapPivot] = useState(null); // { id: string, worldPos: Vector3, socketIndex: number, isAssembly: boolean }
  const sceneRef = useRef(null); // ref to Scene3D for export control
  const lastPlacementTime = useRef(0);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('pipe3d_theme') === 'dark';
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showLibrary, setShowLibrary] = useState(window.innerWidth >= 1024);
  const [user, setUser] = useState(null);
  const [showInventory, setShowInventory] = useState(false);

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
  const [history, setHistory] = useState([]);

  // Fetch history from DB on mount
  useEffect(() => {
    fetch('http://localhost:5000/api/projects')
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(err => console.error('Failed to fetch projects from DB:', err));
  }, []);
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

  // Helper: decrement inventory for a list of components in one batch request
  const decrementInventoryBatch = useCallback((comps) => {
    if (!comps || comps.length === 0) return;
    const items = comps.map(comp => ({
      component_type: comp.component_type,
      material: comp.properties?.material || 'pvc',
      amount: (comp.component_type === 'straight' || comp.component_type === 'vertical')
        ? (comp.properties?.length || 2)
        : 1
    }));
    fetch('http://localhost:5000/api/inventory/use-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    }).catch(err => console.error('Inventory Batch Update Failed:', err));
  }, []);


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

  const handleSaveToHistory = useCallback(async () => {
    if (components.length === 0) return;

    try {
      // 1. Capture quick WebGL snapshot
      const canvas = document.querySelector('canvas');
      const image_data = canvas ? canvas.toDataURL('image/jpeg', 0.25) : '';

      // 2. Build BOM summary
      const rawBom = components.map(c => ({ type: c.component_type, material: c.properties?.material || 'pvc' }));
      const typeCounts = {};
      rawBom.forEach(item => {
        const key = `${item.type}_${item.material}`;
        typeCounts[key] = (typeCounts[key] || 0) + 1;
      });
      
      const payload = {
        user_id: user?.id || null,
        name: designName || 'Untitled Design',
        components_json: JSON.stringify(components),
        bom_json: JSON.stringify(typeCounts),
        image_data
      };

      const res = await fetch('http://localhost:5000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        // Optimistically update list
        setHistory(prev => [{
          id: data.id,
          name: designName,
          created_at: new Date().toISOString(),
          image_data
        }, ...prev]);
      }
    } catch (err) {
      console.error('Failed to save project to DB:', err);
    }
  }, [components, designName, user]);

  const handleLoadHistory = useCallback(async (entry) => {
    if (components.length > 0) {
      const confirm = window.confirm('Save current design to database before loading?');
      if (confirm) await handleSaveToHistory();
    }
    
    try {
      const res = await fetch(`http://localhost:5000/api/projects/${entry.id}`);
      if (!res.ok) throw new Error('Project not found');
      const data = await res.json();
      
      if (data.components_json) {
        setComponents(JSON.parse(data.components_json));
        setDesignName(data.name);
        setSelectedIds([]);
      }
    } catch (err) {
      console.error('Failed to load project details from DB:', err);
      alert('Could not load project from database.');
    }
  }, [components, handleSaveToHistory]);

  const handleDeleteHistory = useCallback(async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHistory(prev => prev.filter(h => h.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete history item', err);
    }
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
    // If we are in connection mode, we don't want to change selection.
    // We only want to handle socket clicks.
    if (connectionMode) return;

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
    if (targetComp.assemblyId && !connectionMode) {
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
  }, [multiSelectMode, components, handleCancelPlacement, connectionMode]);
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

  // userParts syncing still active


  useEffect(() => {
    localStorage.setItem('pipe3d_user_parts', JSON.stringify(userParts));
  }, [userParts]);

  const totalCost = useMemo(() => calculateTotalCost(components), [components]);


  const handleAddComponent = useCallback((type, template = null) => {
    setPlacingType(type);
    setPlacingTemplate(template);
    setSelectedIds([]);
  }, []);

  const handlePlaceComponent = useCallback((position, rotation, properties = {}, targetId = null, targetSocketIdx = null, placingSocketIdx = null) => {
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

      // Pre-calculate assembly parts for both state update and inventory decrement
      const assemblyParts = placingTemplate.parts.map(p => {
        const offsetVec = new THREE.Vector3(p.offset_x || 0, p.offset_y || 0, p.offset_z || 0);
        offsetVec.applyQuaternion(assemblyQuat);

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
          properties: { ...p.properties },
          id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.random()}`,
          assemblyId,
          position_x: position[0] + offsetVec.x,
          position_y: position[1] + offsetVec.y,
          position_z: position[2] + offsetVec.z,
          rotation_x: finalRot.x * (180 / Math.PI),
          rotation_y: finalRot.y * (180 / Math.PI),
          rotation_z: finalRot.z * (180 / Math.PI),
          connections: []
        };
      });

      setComponents(prev => {
        const finalComps = [...prev, ...assemblyParts];
        saveToHistory(finalComps);
        return finalComps;
      });

      setPlacingType(null);
      setPlacingTemplate(null);
      setSelectedIds([]);

      // --- MSSQL INVENTORY DECREMENT (ASSEMBLY) ---
      decrementInventoryBatch(assemblyParts);

      return;
    }

    // SINGLE PART MODE
    const finalProperties = {
      ...(placingTemplate?.properties || {}),
      ...properties
    };

    // Check for intersection one last time before placing
    const isIntersecting = checkIntersection(
      new THREE.Vector3(...position),
      new THREE.Euler(rotation[0] * (Math.PI / 180), rotation[1] * (Math.PI / 180), rotation[2] * (Math.PI / 180)),
      placingType,
      finalProperties,
      components,
      targetId
    );

    if (isIntersecting) {
      console.warn('Pipe3D: Placement blocked due to intersection.');
      // Optional: Trigger a UI toast/shake if available. 
      // For now, blocking it is the safest "fix".
      return;
    }

    const componentId = `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newComponent = {
      id: componentId,
      component_type: placingType,
      position_x: position[0],
      position_y: position[1],
      position_z: position[2],
      rotation_x: rotation[0],
      rotation_y: rotation[1],
      rotation_z: rotation[2],
      connections: targetId ? [{ targetId, targetSocketIdx, localSocketIdx: placingSocketIdx }] : [],
      properties: finalProperties,
    };

    setComponents(prev => {
      let next = [...prev, newComponent];

      // Also update the target component if we snapped to one
      if (targetId) {
        next = next.map(c => {
          if (c.id === targetId) {
            return {
              ...c,
              connections: [...(c.connections || []), { targetId: componentId, targetSocketIdx: placingSocketIdx, localSocketIdx: targetSocketIdx }]
            };
          }
          return c;
        });
      }

      saveToHistory(next);
      return next;
    });

    // --- MSSQL INVENTORY DECREMENT ---
    decrementInventoryBatch([{ component_type: placingType, properties: finalProperties }]);

    // Note: We clear placingType here to return to selection mode after placement.
    setPlacingType(null);
    setPlacingTemplate(null);
    setSelectedIds([]);
  }, [placingType, placingTemplate, components, saveToHistory]);


  const handleUpdateComponent = useCallback((updatedComp) => {
    setComponents(prev => {
      // PIVOT-AWARE ROTATION COMPENSATION
      let compToUse = updatedComp;
      if (snapPivot && updatedComp.id === snapPivot.id && transformMode === 'rotate') {
        const oldComp = prev.find(c => c.id === updatedComp.id);
        if (oldComp) {
          const def = COMPONENT_DEFINITIONS[oldComp.component_type];
          if (def && def.sockets[snapPivot.socketIndex]) {
            let socketLocalPos = def.sockets[snapPivot.socketIndex].position.clone();
            if (oldComp.component_type === 'industrial-tank') {
              const hScale = ((oldComp.properties?.od || 2.2) + 0.5) / 2.2;
              const vScale = (oldComp.properties?.length || 4.0) / 4.0;
              const iConeH = (oldComp.properties?.length || 4.0) * 0.25;
              socketLocalPos.x *= hScale;
              socketLocalPos.z *= hScale;
              socketLocalPos.y = (socketLocalPos.y * vScale) + iConeH;
            } else if (oldComp.component_type === 'straight' || oldComp.component_type === 'vertical') {
              socketLocalPos.y = (socketLocalPos.y + 1) * ((oldComp.properties?.length || 2.0) / 2);
            } else if (oldComp.component_type === 'tank') {
              const tHeight = oldComp.properties?.length || 2.0;
              socketLocalPos.y = (socketLocalPos.y * (tHeight / 2)) + (tHeight / 2);
              socketLocalPos.x *= (oldComp.properties?.radiusScale || 1);
              socketLocalPos.z *= (oldComp.properties?.radiusScale || 1);
            } else {
              socketLocalPos.multiplyScalar(oldComp.properties?.radiusScale || 1);
            }

            // Calculate where the socket WOULD BE with the new rotation
            const newQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(
              updatedComp.rotation_x * (Math.PI / 180),
              updatedComp.rotation_y * (Math.PI / 180),
              updatedComp.rotation_z * (Math.PI / 180)
            ));
            const newSocketWorldOffset = socketLocalPos.clone().applyQuaternion(newQuat);

            // New position = pivotWorldPos - newSocketWorldOffset
            const newPos = snapPivot.worldPos.clone().sub(newSocketWorldOffset);

            compToUse = {
              ...updatedComp,
              position_x: newPos.x,
              position_y: newPos.y,
              position_z: newPos.z
            };
          }
        }
      } else if (snapPivot && updatedComp.id === snapPivot.id && transformMode === 'translate') {
        // Clear pivot if they manually move it away
        setSnapPivot(null);
      }

      const next = prev.map(comp => (comp.id === compToUse.id ? compToUse : comp));
      saveToHistory(next);
      return next;
    });
  }, [saveToHistory, snapPivot, transformMode]);

  const handleUpdateComponents = useCallback((updatedComponents) => {
    setComponents(prev => {
      let finalUpdates = updatedComponents;

      // ASSEMBLY PIVOT COMPENSATION
      if (snapPivot && transformMode === 'rotate') {
        const leadUpdate = updatedComponents.find(u => u.id === snapPivot.id);
        if (leadUpdate) {
          const oldLead = prev.find(c => c.id === leadUpdate.id);
          if (oldLead) {
            const def = COMPONENT_DEFINITIONS[oldLead.component_type];
            if (def && def.sockets[snapPivot.socketIndex]) {
              let socketLocalPos = def.sockets[snapPivot.socketIndex].position.clone();
              if (oldLead.component_type === 'industrial-tank') {
                const hScale = ((oldLead.properties?.od || 2.2) + 0.5) / 2.2;
                const vScale = (oldLead.properties?.length || 4.0) / 4.0;
                const iConeH = (oldLead.properties?.length || 4.0) * 0.25;
                socketLocalPos.x *= hScale;
                socketLocalPos.z *= hScale;
                socketLocalPos.y = (socketLocalPos.y * vScale) + iConeH;
              } else if (oldLead.component_type === 'straight' || oldLead.component_type === 'vertical') {
                socketLocalPos.y = (socketLocalPos.y + 1) * ((oldLead.properties?.length || 2.0) / 2);
              } else if (oldLead.component_type === 'tank') {
                const tHeight = oldLead.properties?.length || 2.0;
                socketLocalPos.y = (socketLocalPos.y * (tHeight / 2)) + (tHeight / 2);
                socketLocalPos.x *= (oldLead.properties?.radiusScale || 1);
                socketLocalPos.z *= (oldLead.properties?.radiusScale || 1);
              } else {
                socketLocalPos.multiplyScalar(oldLead.properties?.radiusScale || 1);
              }

              const newQuatTarget = new THREE.Quaternion().setFromEuler(new THREE.Euler(
                leadUpdate.rotation_x * (Math.PI / 180),
                leadUpdate.rotation_y * (Math.PI / 180),
                leadUpdate.rotation_z * (Math.PI / 180)
              ));
              const oldQuatTarget = new THREE.Quaternion().setFromEuler(new THREE.Euler(
                oldLead.rotation_x * (Math.PI / 180),
                oldLead.rotation_y * (Math.PI / 180),
                oldLead.rotation_z * (Math.PI / 180)
              ));

              const relRotation = new THREE.Quaternion().multiplyQuaternions(newQuatTarget, oldQuatTarget.clone().invert());
              const pivotWorld = snapPivot.worldPos;

              finalUpdates = updatedComponents.map(c => {
                const oldC = prev.find(pc => pc.id === c.id);
                if (!oldC) return c;

                const oldPosC = new THREE.Vector3(oldC.position_x, oldC.position_y, oldC.position_z);
                const relPos = oldPosC.clone().sub(pivotWorld);
                relPos.applyQuaternion(relRotation);
                const newPosC = pivotWorld.clone().add(relPos);

                return {
                  ...c,
                  position_x: newPosC.x,
                  position_y: newPosC.y,
                  position_z: newPosC.z
                };
              });
            }
          }
        }
      } else if (snapPivot && transformMode === 'translate') {
        const leadUpdate = updatedComponents.find(u => u.id === snapPivot.id);
        if (leadUpdate) setSnapPivot(null);
      }

      const updatesMap = new Map(finalUpdates.map(c => [c.id, c]));
      let next = prev.map(comp => updatesMap.has(comp.id) ? updatesMap.get(comp.id) : comp);

      // --- CONNECTION CLEANUP ON MOVE/ROTATE ---
      // If a component in finalUpdates was moved, clear its connections and its partners
      const movedIds = finalUpdates.map(u => u.id);
      next = next.map(comp => {
        // 1. If this component itself was moved, clear its own connections
        if (movedIds.includes(comp.id)) {
          return { ...comp, connections: [] };
        }
        // 2. If this component was connected to something that moved, clear those specific connections
        if (comp.connections && comp.connections.length > 0) {
          const validConnections = comp.connections.filter(conn => !movedIds.includes(conn.targetId));
          if (validConnections.length !== comp.connections.length) {
            return { ...comp, connections: validConnections };
          }
        }
        return comp;
      });

      saveToHistory(next);
      return next;
    });
  }, [saveToHistory, snapPivot, transformMode]);

  const handleDeleteComponents = useCallback((ids) => {
    setComponents(prev => {
      // 1. Remove the components themselves
      let next = prev.filter(comp => !ids.includes(comp.id));

      // 2. Clean up connections in remaining components
      next = next.map(comp => {
        if (comp.connections && comp.connections.length > 0) {
          const remainingConnections = comp.connections.filter(conn => !ids.includes(conn.targetId));
          if (remainingConnections.length !== comp.connections.length) {
            return { ...comp, connections: remainingConnections };
          }
        }
        return comp;
      });

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
    const assemblyId = `ass_${Date.now()} `;
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

  const handleSocketClick = useCallback((componentId, socketIndex) => {
    console.log('Socket Clicked:', { componentId, socketIndex });
    setSelectedSockets(prev => {
      const next = [...prev, { componentId, socketIndex }];

      if (next.length === 2) {
        // PERFORM CONNECTION
        const [target, source] = next;

        if (target.componentId === source.componentId) {
          alert("Cannot connect a component to itself!");
          return [];
        }

        setComponents(currentComponents => {
          const compA = currentComponents.find(c => c.id === target.componentId);
          const compB = currentComponents.find(c => c.id === source.componentId);

          if (!compA || !compB) return currentComponents;

          const result = calculateManualConnection(compA, target.socketIndex, compB, source.socketIndex);

          if (result) {
            // --- ASSEMBLY SNAP LOGIC ---
            // If the source component (compB) is part of an assembly, 
            // the entire assembly should move and rotate as a single unit.

            const assemblyId = compB.assemblyId;

            // 1. Calculate the relative transform (Matrix4) for the relocation
            const oldMatrixB = new THREE.Matrix4().compose(
              new THREE.Vector3(compB.position_x, compB.position_y, compB.position_z),
              new THREE.Quaternion().setFromEuler(new THREE.Euler(
                (compB.rotation_x || 0) * (Math.PI / 180),
                (compB.rotation_y || 0) * (Math.PI / 180),
                (compB.rotation_z || 0) * (Math.PI / 180)
              )),
              new THREE.Vector3(1, 1, 1)
            );

            const newMatrixB = new THREE.Matrix4().compose(
              result.position,
              new THREE.Quaternion().setFromEuler(result.rotation),
              new THREE.Vector3(1, 1, 1)
            );

            const relTransform = new THREE.Matrix4().multiplyMatrices(newMatrixB, oldMatrixB.invert());

            const updatedComponents = currentComponents.map(c => {
              // Apply transform if it's the source or part of the same assembly
              const shouldMove = (c.id === source.componentId) || (assemblyId && c.assemblyId === assemblyId);

              if (shouldMove) {
                const oldMatrixC = new THREE.Matrix4().compose(
                  new THREE.Vector3(c.position_x, c.position_y, c.position_z),
                  new THREE.Quaternion().setFromEuler(new THREE.Euler(
                    (c.rotation_x || 0) * (Math.PI / 180),
                    (c.rotation_y || 0) * (Math.PI / 180),
                    (c.rotation_z || 0) * (Math.PI / 180)
                  )),
                  new THREE.Vector3(1, 1, 1)
                );

                const newMatrixC = new THREE.Matrix4().multiplyMatrices(relTransform, oldMatrixC);

                const finalPos = new THREE.Vector3();
                const finalQuat = new THREE.Quaternion();
                const finalScale = new THREE.Vector3();
                newMatrixC.decompose(finalPos, finalQuat, finalScale);
                const finalRot = new THREE.Euler().setFromQuaternion(finalQuat);

                return {
                  ...c,
                  position_x: finalPos.x,
                  position_y: finalPos.y,
                  position_z: finalPos.z,
                  rotation_x: finalRot.x * (180 / Math.PI),
                  rotation_y: finalRot.y * (180 / Math.PI),
                  rotation_z: finalRot.z * (180 / Math.PI),
                  // Record connection in source (or assembly members) for visual holes
                  connections: (c.id === source.componentId)
                    ? [...(c.connections || []), { targetId: target.componentId, targetSocketIdx: target.socketIndex, localSocketIdx: source.socketIndex }]
                    : (c.connections || [])
                };
              }

              // Record connection in target for visual holes
              if (c.id === target.componentId) {
                return {
                  ...c,
                  connections: [...(c.connections || []), { targetId: source.componentId, targetSocketIdx: source.socketIndex, localSocketIdx: target.socketIndex }]
                };
              }

              return c;
            });

            saveToHistory(updatedComponents);

            // 2. Set Snap Pivot for the source (so subsequent rotations pivot around this point)
            setSnapPivot({
              id: source.componentId,
              worldPos: result.socketWorldPos,
              socketIndex: source.socketIndex,
              isAssembly: !!assemblyId,
              assemblyId: assemblyId
            });

            return updatedComponents;
          }
          return currentComponents;
        });

        setConnectionMode(false);
        return [];
      }
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
        id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)} `,
        connections: [], // Clones start without connections
        // Offset the clone slightly so it doesn't overlap perfectly
        position_x: original.position_x + 0.5,
        position_y: original.position_y,
        position_z: original.position_z + 0.5,
      }));

      // --- MSSQL INVENTORY DECREMENT (DUPLICATE) ---
      decrementInventoryBatch(newClones);

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
      ids.length > 1 ? "New Assembly" : `Custom ${selectedOnes[0].component_type} `
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
        id: `user_ass_${Date.now()} `,
        label: name,
        type: 'assembly',
        isAssembly: true,
        parts: assemblyParts,
        timestamp: Date.now()
      };
    } else {
      // SINGLE PART CAPTURE
      newPart = {
        id: `user_${Date.now()} `,
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
      if (!e || typeof e.key !== 'string') return;
      const key = e.key.toLowerCase();
      // 1. ESC to clear selection/placement
      if (key === 'escape') {
        handleCancelPlacement();
        setSelectedIds([]);
      }

      // 2. DELETE / BACKSPACE to remove selected parts
      if ((key === 'delete' || key === 'backspace') && selectedIds.length > 0) {
        // Prevent deleting if user is typing in an input
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        handleDeleteComponents(selectedIds);
      }

      // 3. CTRL + D to Duplicate
      if (e.ctrlKey && key === 'd') {
        e.preventDefault();
        if (selectedIds.length > 0) {
          handleDuplicateComponents(selectedIds);
        }
      }

      // 4. CTRL + Z for Undo
      if (e.ctrlKey && key === 'z') {
        e.preventDefault();
        handleUndo();
      }

      // 5. CTRL + Y or CTRL + SHIFT + Z for Redo
      if (e.ctrlKey && (key === 'y' || (e.shiftKey && key === 'z'))) {
        e.preventDefault();
        handleRedo();
      }

      // 5b. U to Ungroup
      if (key === 'u' && selectedIds.length > 0) {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        handleUngroupComponents(selectedIds);
      }

      // 5c. G to Group
      if (key === 'g' && selectedIds.length > 1) {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        handleGroupComponents(selectedIds);
      }

      // 6. Transform Mode (T for Translate, R for Rotate)
      if (key === 't') {
        setTransformMode('translate');
      } else if (key === 'r') {
        setTransformMode('rotate');
      }

      // 7. CTRL + C to Copy
      if (e.ctrlKey && key === 'c' && selectedIds.length > 0) {
        const component = components.find(c => c.id === selectedIds[0]);
        if (component) {
          setClipboard(component);
        }
      }

      // 8. CTRL + V to Paste
      if (e.ctrlKey && key === 'v' && clipboard) {
        const newComponent = {
          ...clipboard,
          id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          position_x: (clipboard.position_x || 0) + 2,
          position_y: clipboard.position_y || 0,
          position_z: clipboard.position_z || 0,
          connections: []
        };
        
        // --- MSSQL INVENTORY DECREMENT (PASTE) ---
        decrementInventoryBatch([newComponent]);

        setComponents(prev => {
          const next = [...prev, newComponent];
          saveToHistory(next);
          return next;
        });
        setSelectedIds([newComponent.id]);
      }

      // 9. ARROW KEYS to nudge selected parts (Plan Movement)
      const moveKeys = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'pageup', 'pagedown', 'w', 's', 'a', 'd'];
      if (moveKeys.includes(key) && selectedIds.length > 0 && !isLocked) {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

        e.preventDefault();

        let step = 0.5; // Default nudge half meter
        if (e.shiftKey) step = 2.0; // Large step
        if (e.ctrlKey) step = 0.05; // Precision step

        let dx = 0, dy = 0, dz = 0;
        // Standard 3D Editor mapping:
        // X-axis: Left/Right
        if (key === 'arrowleft' || key === 'a') dx = -step;
        if (key === 'arrowright' || key === 'd') dx = step;

        // Z-axis: Forward/Backward (Ground plane)
        if (key === 'arrowup' || key === 'w') dz = -step;
        if (key === 'arrowdown' || key === 's') dz = step;

        // Y-axis: Elevation (Up/Down)
        if (key === 'pageup') dy = step;
        if (key === 'pagedown') dy = -step;

        const updated = components
          .filter(c => selectedIds.includes(c.id))
          .map(c => ({
            ...c,
            position_x: (c.position_x || 0) + dx,
            position_y: (c.position_y || 0) + dy,
            position_z: (c.position_z || 0) + dz,
          }));

        handleUpdateComponents(updated);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCancelPlacement, selectedIds, handleDeleteComponents, handleDuplicateComponents, handleUndo, handleRedo, components, clipboard, saveToHistory, isLocked, handleUpdateComponents]);


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

    const safeName = (designName || 'Untitled').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    XLSX.writeFile(workbook, `${safeName} _bom.xlsx`);
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
        pdf.text(`PROJECT: ${designName.toUpperCase()} `, 10, H - 7.5);
        pdf.setFont('helvetica', 'normal');
        pdf.text(label.toUpperCase(), W / 2, H - 7.5, { align: 'center' });
        pdf.text(`DATE: ${dateStr}  | REV: 01 - A`, W - 10, H - 7.5, { align: 'right' });

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

      // ── Step 1: capture all viewports ────────────────
      let blueprintImages = {};
      if (sceneRef.current?.captureViews) {
        console.log('Pipe3D: Capturing views...');
        blueprintImages = await sceneRef.current.captureViews();
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
          `Ø${od.toFixed(2)} m`,
          ['straight', 'vertical', 'tank'].includes(type) ? `${len.toFixed(2)} m` : '-'
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
      pdf.text(`PROJECT: ${designName.toUpperCase()} `, 10, H - 7.5);
      pdf.text(`TOTAL COMPONENTS: ${components.length} `, W / 2, H - 7.5, { align: 'center' });
      pdf.text(`DATE: ${dateStr}  | REV: 01 - A`, W - 10, H - 7.5, { align: 'right' });

      pdf.setDrawColor(8, 145, 178); pdf.setLineWidth(1.2);
      pdf.rect(5, 5, W - 10, H - 10);

      pdf.save(`${designName.replace(/ /g, '_')} _Blueprint.pdf`);
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
    <div className={`h-screen flex flex-col transition-colors duration-300 ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-[#f0f9ff] text-slate-900'} selection:bg-blue-200 ${connectionMode ? 'cursor-crosshair' : ''}`}>
      <Toolbar
        designName={designName}
        onRename={setDesignName}
        onSave={handleSaveDesign}
        onExportExcel={handleExportExcel}
        onNewDesign={handleNewDesign}
        componentCount={components.length}
        totalCost={totalCost}
        onShowMaterials={() => setShowMaterials(true)}
        onShowInventory={() => setShowInventory(true)}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(!darkMode)}
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
        connectionMode={connectionMode}
        onToggleConnection={() => {
          setConnectionMode(!connectionMode);
          setSelectedSockets([]);
          setSnapPivot(null);
        }}
      />

      {showMaterials && (
        <MaterialsList
          designName={designName}
          components={components}
          onClose={() => setShowMaterials(false)}
        />
      )}

      {showInventory && (
        <InventoryManager
          isOpen={showInventory}
          onClose={() => setShowInventory(false)}
          user={user}
        />
      )}

      <main className="flex-1 relative overflow-hidden bg-slate-50">
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
                  onPlaceComponent={(pos, rot, props, tId, tsIdx, psIdx) => {
                    handlePlaceComponent(pos, rot, props, tId, tsIdx, psIdx);
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
                  isLocked={isLocked}
                  isCapturing={isCapturing}
                  connectionMode={connectionMode}
                  selectedSockets={selectedSockets}
                  onSocketClick={handleSocketClick}
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
                    onClick={e => e.stopPropagation()} // Keep onClick for the library div to prevent closing when interacting with library content
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
                    isLocked={isLocked}
                    isCapturing={isCapturing}
                    connectionMode={connectionMode}
                    selectedSockets={selectedSockets}
                    onSocketClick={handleSocketClick}
                    snapPivot={snapPivot}
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
