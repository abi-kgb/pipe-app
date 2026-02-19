import { useState, useCallback, useEffect } from 'react';
import Scene3D from './components/Scene3D';
import ComponentLibrary from './components/ComponentLibrary';
import Toolbar from './components/Toolbar';
import { calculateTotalCost } from './utils/pricing';
import MaterialsList from './components/MaterialsList';
import html2canvas from 'html2canvas';

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
      const container = document.getElementById('multi-view-container');
      if (!container) {
        alert('Could not find multi-view container to capture.');
        return;
      }

      const canvas = await html2canvas(container, {
        backgroundColor: '#f8fafc',
        scale: 2, // High resolution
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `${designName || 'design'}_all_views.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert('All views saved as high-res image!');

    } catch (error) {
      console.error('Error saving image:', error);
      alert('Failed to save multi-view image.');
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

      <div className="flex-1 flex overflow-hidden">
        <ComponentLibrary
          components={components}
          onUpdate={handleUpdateComponent}
          onAddComponent={handleAddComponent}
          selectedId={selectedId}
          onDelete={() => selectedId && handleDeleteComponent(selectedId)}
          transformMode={transformMode}
          onSetTransformMode={setTransformMode}
        />

        <div className="flex-1">
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
      </div>
    </div>
  );
}

export default App;
