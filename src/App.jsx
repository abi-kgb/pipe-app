import { useState, useCallback, useEffect } from 'react';
import Scene3D from './components/Scene3D';
import ComponentLibrary from './components/ComponentLibrary';
import Toolbar from './components/Toolbar';
import { calculateTotalCost } from './utils/pricing';
import MaterialsList from './components/MaterialsList';
import html2canvas from 'html2canvas';
import ResizablePane from './components/ResizablePane';
import { jsPDF } from 'jspdf';

function App() {
  const [components, setComponents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [placingType, setPlacingType] = useState(null);
  const [designName, setDesignName] = useState('Untitled Design');
  const [clipboard, setClipboard] = useState(null);
  const [showMaterials, setShowMaterials] = useState(false);
  const [transformMode, setTransformMode] = useState('translate');

  const totalCost = calculateTotalCost(components);


  const handleAddComponent = useCallback((type) => {
    setPlacingType(type);
    setSelectedId(null);
  }, []);

  const handlePlaceComponent = useCallback((position, rotation, properties = {}) => {
    if (!placingType) return;

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
      properties,
    };

    setComponents(prev => [...prev, newComponent]);
    setPlacingType(null);
    setSelectedId(newComponent.id);
  }, [placingType]);

  const handleCancelPlacement = useCallback(() => {
    setPlacingType(null);
  }, []);

  const handleUpdateComponent = useCallback((updatedComponent) => {
    setComponents(prev =>
      prev.map(comp => (comp.id === updatedComponent.id ? updatedComponent : comp))
    );
  }, []);

  const handleDeleteComponent = useCallback((id) => {
    setComponents(prev => prev.filter(comp => comp.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  }, [selectedId]);



  const handleSaveDesign = async () => {
    try {
      const views = [
        { id: 'viewport-canvas-iso', name: 'Perspective ISO View' },
        { id: 'viewport-canvas-top', name: 'Plan View (Top)' },
        { id: 'viewport-canvas-front', name: 'Elevation View (Front/Side)' }
      ];

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < views.length; i++) {
        const view = views[i];
        const container = document.getElementById(view.id);

        if (!container) continue;

        if (i > 0) pdf.addPage('landscape', 'mm', 'a4');

        // Capture high-res view
        const canvas = await html2canvas(container, {
          backgroundColor: '#f8fafc',
          scale: 2,
          useCORS: true,
          logging: false,
          ignoreElements: (el) => el.hasAttribute('data-html2canvas-ignore')
        });

        const imgData = canvas.toDataURL('image/png');

        // Engineering Border
        pdf.setDrawColor(30, 58, 138);
        pdf.setLineWidth(1.5);
        pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);

        // Header Title Block
        pdf.setFillColor(30, 58, 138);
        pdf.rect(5, 5, pageWidth - 10, 15, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text('CLEARPATH ENGINEERING TECHNICAL BLUEPRINT', pageWidth / 2, 14, { align: 'center' });

        // View Content - Smart Scaling
        const maxContentWidth = pageWidth - 40;
        const maxContentHeight = pageHeight - 65; // Leave room for header/footer

        let imgWidth = maxContentWidth;
        let imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (imgHeight > maxContentHeight) {
          imgHeight = maxContentHeight;
          imgWidth = (canvas.width * imgHeight) / canvas.height;
        }

        const xPos = (pageWidth - imgWidth) / 2;
        const yPos = 35; // Position below header

        pdf.addImage(imgData, 'PNG', xPos, yPos, imgWidth, imgHeight);

        // Bottom Info Block
        pdf.setFillColor(241, 245, 249);
        pdf.rect(5, pageHeight - 20, pageWidth - 10, 15, 'F');
        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(10);
        pdf.text(`PROJECT: ${designName.toUpperCase()}`, 15, pageHeight - 10);
        pdf.text(`DRAWING: ${view.name.toUpperCase()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        pdf.text(`DATE: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - 45, pageHeight - 10);
      }

      pdf.save(`${designName.replace(/ /g, '_')}_Technical_Dossier.pdf`);
      alert('Technical Blueprint Dossier saved successfully!');

    } catch (error) {
      console.error('Error saving blueprint:', error);
      alert('Failed to generate technical PDF.');
    }
  };

  const handleNewDesign = () => {
    if (components.length > 0) {
      const confirm = window.confirm('Clear current design?');
      if (!confirm) return;
    }

    setComponents([]);
    setSelectedId(null);
    setDesignName('Untitled Design');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input (like the rename field)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        handleDeleteComponent(selectedId);
      }

      if (e.key === 'Escape') {
        handleCancelPlacement();
        setSelectedId(null);
      }

      if (e.key.toLowerCase() === 't') {
        setTransformMode('translate');
      } else if (e.key.toLowerCase() === 'r') {
        setTransformMode('rotate');
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedId) {
        const component = components.find(c => c.id === selectedId);
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
        setSelectedId(newComponent.id);
        console.log('Pasted:', newComponent);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, handleCancelPlacement, handleDeleteComponent, components, clipboard]);

  return (
    <div className="h-screen flex flex-col bg-[#f0f9ff] text-slate-900 selection:bg-blue-200">
      <Toolbar
        designName={designName}
        onRename={setDesignName}
        onSave={handleSaveDesign}
        onNewDesign={handleNewDesign}
        componentCount={components.length}
        totalCost={totalCost}
        onShowMaterials={() => setShowMaterials(true)}
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
          padding="p-0"
          initialSize={20}
          minSize={10}
          maxSize={40}
          first={
            <ComponentLibrary
              components={components}
              onUpdate={handleUpdateComponent}
              onAddComponent={handleAddComponent}
              selectedId={selectedId}
              onDelete={() => selectedId && handleDeleteComponent(selectedId)}
              transformMode={transformMode}
              onSetTransformMode={setTransformMode}
            />
          }
          second={
            <div className="w-full h-full">
              <Scene3D
                components={components}
                selectedId={selectedId}
                onSelectComponent={setSelectedId}
                placingType={placingType}
                onPlaceComponent={handlePlaceComponent}
                onCancelPlacement={handleCancelPlacement}
                onUpdateComponent={handleUpdateComponent}
                transformMode={transformMode}
                onSetTransformMode={setTransformMode}
                designName={designName}
              />
            </div>
          }
        />
      </div>
    </div>
  );
}

export default App;
