import { useState, useCallback, useEffect, useRef } from 'react';
import Scene3D from './components/Scene3D';
import ComponentLibrary from './components/ComponentLibrary';
import Toolbar from './components/Toolbar';
import { calculateTotalCost } from './utils/pricing';
import MaterialsList from './components/MaterialsList';
import PartsSchedule from './components/PartsSchedule';
import ResizablePane from './components/ResizablePane';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getComponentTag } from './utils/tagging';

function App() {
  const [components, setComponents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [placingType, setPlacingType] = useState(null);
  const [designName, setDesignName] = useState('Untitled Design');
  const [clipboard, setClipboard] = useState(null);
  const [showMaterials, setShowMaterials] = useState(false);
  const [transformMode, setTransformMode] = useState('translate');
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const sceneRef = useRef(null); // ref to Scene3D for export control
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('pipe3d_theme') === 'dark';
  });
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
  // Track if we are placing a specific user-saved part template
  const [placingTemplate, setPlacingTemplate] = useState(null);

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
        if (data.components) setComponents(data.components);
        if (data.name) setDesignName(data.name);
      }
    } catch (e) {
      console.error('Failed to load autosave');
    }
  }, []);

  // Autosave when data changes
  useEffect(() => {
    const data = {
      name: designName,
      components: components,
      timestamp: Date.now()
    };
    localStorage.setItem('pipe3d_autosave', JSON.stringify(data));
  }, [components, designName]);

  // Sync history to localStorage
  useEffect(() => {
    localStorage.setItem('pipe3d_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('pipe3d_user_parts', JSON.stringify(userParts));
  }, [userParts]);

  const totalCost = calculateTotalCost(components);


  const handleAddComponent = useCallback((type, template = null) => {
    setPlacingType(type);
    setPlacingTemplate(template);
    setSelectedIds([]);
  }, []);

  const handlePlaceComponent = useCallback((position, rotation, properties = {}) => {
    if (!placingType) return;

    // ASSEMBLY MODE: If the template has multiple parts
    if (placingTemplate?.isAssembly && placingTemplate.parts) {
      const assemblyId = `ass_${Date.now()}`;
      setComponents(prev => {
        const newComps = placingTemplate.parts.map(p => {
          // Relative to target position
          return {
            ...JSON.parse(JSON.stringify(p)),
            id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.random()}`,
            assemblyId, // Link them together
            position_x: position[0] + (p.offset_x || 0),
            position_y: position[1] + (p.offset_y || 0),
            position_z: position[2] + (p.offset_z || 0),
            // We keep the original rotation of the assembly parts for now
            // Future: Adjust rotation based on overall assembly rotation
          };
        });
        return [...prev, ...newComps];
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

    setComponents(prev => [...prev, newComponent]);
    // Note: We clear placingType here to return to selection mode after placement.
    setPlacingType(null);
    setPlacingTemplate(null);
    setSelectedIds([]);
  }, [placingType, placingTemplate]);

  const handleCancelPlacement = useCallback(() => {
    setPlacingType(null);
  }, []);

  const handleUpdateComponent = useCallback((updatedComponent) => {
    setComponents(prev =>
      prev.map(comp => (comp.id === updatedComponent.id ? updatedComponent : comp))
    );
  }, []);

  const handleUpdateComponents = useCallback((updatedComponents) => {
    setComponents(prev => {
      const updates = new Map(updatedComponents.map(c => [c.id, c]));
      return prev.map(comp => updates.has(comp.id) ? updates.get(comp.id) : comp);
    });
  }, []);

  const handleDeleteComponents = useCallback((ids) => {
    setComponents(prev => prev.filter(comp => !ids.includes(comp.id)));
    setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
  }, []);

  const handleDuplicateComponents = useCallback((ids) => {
    if (ids.length === 0) return;

    setComponents(prev => {
      const selectedOnes = prev.filter(c => ids.includes(c.id));
      const newClones = selectedOnes.map(original => ({
        ...JSON.parse(JSON.stringify(original)), // Deep clone
        id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        // Offset the clone slightly so it doesn't overlap perfectly
        position_x: original.position_x + 0.5,
        position_y: original.position_y,
        position_z: original.position_z + 0.5,
      }));

      const newComponents = [...prev, ...newClones];
      // Select the new clones automatically
      setTimeout(() => setSelectedIds(newClones.map(c => c.id)), 0);
      return newComponents;
    });
  }, []);

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
        z: selectedOnes[0].position_z
      };

      const assemblyParts = selectedOnes.map(comp => ({
        ...JSON.parse(JSON.stringify(comp)),
        offset_x: comp.position_x - origin.x,
        offset_y: comp.position_y - origin.y,
        offset_z: comp.position_z - origin.z,
      }));

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
      const comp = selectedOnes[0];
      newPart = {
        id: `user_${Date.now()}`,
        label: name,
        type: comp.component_type,
        properties: JSON.parse(JSON.stringify(comp.properties || {})),
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
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCancelPlacement, selectedIds, handleDeleteComponents, handleDuplicateComponents]);



  const handleSaveDesign = async () => {
    try {
      if (components.length === 0) {
        alert('No components to export. Add some pipes first!');
        return;
      }

      // ── Step 1: capture all viewports ──────────────────────────────────
      let images = {};
      if (sceneRef.current?.captureViews) {
        images = await sceneRef.current.captureViews();
      }

      console.log('Pipe3D: Received images from captureViews:', Object.keys(images));

      if (Object.keys(images).length === 0) {
        console.error('Pipe3D: No images were captured. Blueprint drawing might be blank.');
      }

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = pdf.internal.pageSize.getWidth();   // 297 mm
      const H = pdf.internal.pageSize.getHeight();  // 210 mm
      const dateStr = new Date().toLocaleDateString('en-GB');

      const PAGES = [
        { key: 'iso', label: '3D Isometric View', isBlue: true },
        { key: 'front', label: 'Front Elevation', isBlue: true },
        { key: 'top', label: 'Top Plan View', isBlue: true },
        { key: 'right', label: 'Right Elevation', isBlue: true },
        { key: 'left', label: 'Left Elevation', isBlue: true },
        { key: 'back', label: 'Back Elevation', isBlue: true },
        { key: 'bottom', label: 'Bottom View', isBlue: true },
      ];

      const drawPage = (label, imgData, isBlue = false) => {
        // Classic Blueprint Background (Deep Blue) or White
        const pageBg = isBlue ? [30, 64, 175] : [255, 255, 255]; // #1e40af
        pdf.setFillColor(...pageBg);
        pdf.rect(0, 0, W, H, 'F');

        // ── Header bar ──────────────────────────────────────────────────────
        const headerBg = isBlue ? [255, 255, 255] : [30, 58, 138];
        const headerText = isBlue ? [30, 64, 175] : [255, 255, 255];

        pdf.setFillColor(...headerBg);
        pdf.rect(5, 5, W - 10, 12, 'F');
        pdf.setTextColor(...headerText);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text('PIPE3D PRO  —  TECHNICAL BLUEPRINT', W / 2, 12.5, { align: 'center' });

        // ── Footer bar ──────────────────────────────────────────────────────
        const footerBg = isBlue ? [30, 58, 175] : [241, 245, 249];
        const footerText = isBlue ? [255, 255, 255] : [30, 41, 59];
        const footerBorder = isBlue ? [255, 255, 255] : [30, 58, 138];

        pdf.setFillColor(...footerBg);
        pdf.rect(5, H - 13, W - 10, 8, 'F');
        pdf.setDrawColor(...footerBorder); pdf.setLineWidth(0.4);
        pdf.line(5, H - 13, W - 5, H - 13);

        pdf.setTextColor(...footerText); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5);
        pdf.text(`PROJECT: ${designName.toUpperCase()}`, 10, H - 7.5);
        pdf.setFont('helvetica', 'normal');
        pdf.text(label.toUpperCase(), W / 2, H - 7.5, { align: 'center' });
        pdf.text(`DATE: ${dateStr}  |  REV: 01-A`, W - 10, H - 7.5, { align: 'right' });

        // ── Outer border ────────────────────────────────────────────────────
        pdf.setDrawColor(...footerBorder); pdf.setLineWidth(1.2);
        pdf.rect(5, 5, W - 10, H - 10);

        // ── View image area ─────────────────────────────────────────────────
        const imgX = 8, imgY = 19;
        const imgW = W - 16, imgH = H - 34;

        if (imgData) {
          pdf.addImage(imgData, 'PNG', imgX, imgY, imgW, imgH);
        } else {
          // Fallback shaded box
          pdf.setFillColor(isBlue ? 40 : 245, isBlue ? 70 : 247, isBlue ? 180 : 250);
          pdf.rect(imgX, imgY, imgW, imgH, 'F');
          pdf.setTextColor(isBlue ? 200 : 160, isBlue ? 220 : 170, isBlue ? 255 : 190);
          pdf.setFont('helvetica', 'italic'); pdf.setFontSize(9);
          pdf.text(`${label} — view not available`, W / 2, H / 2, { align: 'center' });
        }

        // Thin frame around view
        pdf.setDrawColor(...footerBorder); pdf.setLineWidth(0.5);
        pdf.rect(imgX, imgY, imgW, imgH);
      };

      // ── Render each page ─────────────────────────────────────────────────
      PAGES.forEach(({ key, label, isBlue }, i) => {
        if (i > 0) pdf.addPage('landscape');
        drawPage(label, images[key], isBlue);
      });

      // ── Step 4: Add Parts Schedule Table Page ────────────────────────────
      pdf.addPage('landscape');

      // Header for Schedule Page
      pdf.setFillColor(30, 58, 138);
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
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 138], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        margin: { left: 8, right: 8 },
        styles: { font: 'helvetica', cellPadding: 3 }
      });

      // Footer for Schedule Page
      pdf.setFillColor(241, 245, 249);
      pdf.rect(5, H - 13, W - 10, 8, 'F');
      pdf.setDrawColor(30, 58, 138); pdf.setLineWidth(0.4);
      pdf.line(5, H - 13, W - 5, H - 13);
      pdf.setTextColor(30, 41, 59); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5);
      pdf.text(`PROJECT: ${designName.toUpperCase()}`, 10, H - 7.5);
      pdf.text(`TOTAL COMPONENTS: ${components.length}`, W / 2, H - 7.5, { align: 'center' });
      pdf.text(`DATE: ${dateStr}  |  REV: 01-A`, W - 10, H - 7.5, { align: 'right' });

      pdf.setDrawColor(30, 58, 138); pdf.setLineWidth(1.2);
      pdf.rect(5, 5, W - 10, H - 10);

      pdf.save(`${designName.replace(/ /g, '_')}_Blueprint.pdf`);
      handleSaveToHistory();

    } catch (error) {
      console.error('Blueprint export error:', error);
      alert('Export failed: ' + error.message);
    }
  };



  const handleSaveToHistory = useCallback(() => {
    if (components.length === 0) return;

    const newEntry = {
      id: `hist_${Date.now()}`,
      name: designName,
      components: JSON.parse(JSON.stringify(components)), // Deep clone
      timestamp: Date.now()
    };

    setHistory(prev => [newEntry, ...prev].slice(0, 20)); // Keep last 20
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
      const confirm = window.confirm('Archive current design to history and start new?');
      if (confirm) {
        handleSaveToHistory();
      } else {
        const clear = window.confirm('Clear without archiving?');
        if (!clear) return;
      }
    }

    setComponents([]);
    setSelectedIds([]);
    setDesignName('Untitled Design');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input (like the rename field)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        handleDeleteComponents(selectedIds);
      }

      if (e.key === 'Escape') {
        handleCancelPlacement();
        setSelectedIds([]);
      }

      if (e.key.toLowerCase() === 't') {
        setTransformMode('translate');
      } else if (e.key.toLowerCase() === 'r') {
        setTransformMode('rotate');
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedIds.length > 0) {
        // Copy the first selected for now, or all if we support multi-paste later
        const component = components.find(c => c.id === selectedIds[0]);
        if (component) {
          setClipboard(component);
          console.log('Copied to clipboard:', component);
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && clipboard) {
        const newComponent = {
          ...clipboard,
          id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          position_x: clipboard.position_x + 2,
          position_y: clipboard.position_y,
          position_z: clipboard.position_z,
          connections: []
        };
        setComponents(prev => [...prev, newComponent]);
        setSelectedIds([newComponent.id]);
        console.log('Pasted:', newComponent);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, handleCancelPlacement, handleDeleteComponents, components, clipboard]);

  return (
    <div className={`h-screen flex flex-col transition-colors duration-300 ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-[#f0f9ff] text-slate-900'} selection:bg-blue-200`}>
      <Toolbar
        designName={designName}
        onRename={setDesignName}
        onSave={handleSaveDesign}
        onNewDesign={handleNewDesign}
        componentCount={components.length}
        totalCost={totalCost}
        onShowMaterials={() => setShowMaterials(true)}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(!darkMode)}
        showSchedule={showSchedule}
        onToggleSchedule={() => setShowSchedule(!showSchedule)}
      />

      {showMaterials && (
        <MaterialsList
          designName={designName}
          components={components}
          onClose={() => setShowMaterials(false)}
        />
      )}

      <div className="flex-1 overflow-hidden">
        <ResizablePane
          vertical={true}
          initialSize={showSchedule ? 70 : 100}
          minSize={20}
          maxSize={90}
          padding="p-0"
          first={
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
                  onDelete={() => selectedIds.length > 0 && handleDeleteComponents(selectedIds)}
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
                />
              }
              second={
                <div className="w-full h-full">
                  <Scene3D
                    ref={sceneRef}
                    components={components}
                    selectedIds={selectedIds}
                    onSelectComponent={(id, e) => {
                      if (!id) {
                        setSelectedIds([]);
                      } else {
                        handleCancelPlacement();
                        const isMulti = multiSelectMode || (e && (e.shiftKey || e.ctrlKey || e.metaKey));

                        // Smart Assembly Selection
                        const targetComp = components.find(c => c.id === id);
                        let idsToSelect = [id];
                        if (targetComp?.assemblyId) {
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
                      }
                    }}
                    placingType={placingType}
                    placingTemplate={placingTemplate}
                    onPlaceComponent={handlePlaceComponent}
                    onCancelPlacement={handleCancelPlacement}
                    onUpdateComponent={handleUpdateComponent}
                    onUpdateMultiple={handleUpdateComponents}
                    transformMode={transformMode}
                    onSetTransformMode={setTransformMode}
                    designName={designName}
                    darkMode={darkMode}
                  />
                </div>
              }
            />
          }
          second={
            showSchedule ? (
              <div className="w-full h-full p-2 bg-slate-100 overflow-hidden">
                <div className="w-full h-full rounded-2xl shadow-xl overflow-hidden border border-blue-100">
                  <PartsSchedule components={components} darkMode={darkMode} />
                </div>
              </div>
            ) : null
          }
        />
      </div>
    </div>
  );
}

export default App;
