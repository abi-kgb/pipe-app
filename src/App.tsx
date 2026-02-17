import { useState, useCallback, useEffect } from 'react';
import Scene3D from './components/Scene3D';
import ComponentLibrary from './components/ComponentLibrary';
import Toolbar from './components/Toolbar';
import { PipelineComponent, ComponentType } from './types/pipeline';
import { calculateTotalCost } from './utils/pricing';
import MaterialsList from './components/MaterialsList';

function App() {
  const [components, setComponents] = useState<PipelineComponent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placingType, setPlacingType] = useState<ComponentType | null>(null);
  const [designName, setDesignName] = useState('Untitled Design');
  const [clipboard, setClipboard] = useState<PipelineComponent | null>(null);
  const [showMaterials, setShowMaterials] = useState(false);

  const totalCost = calculateTotalCost(components);


  const handleAddComponent = useCallback((type: ComponentType) => {
    setPlacingType(type);
    setSelectedId(null);
  }, []);

  const handlePlaceComponent = useCallback((position: [number, number, number], rotation: [number, number, number], properties: Record<string, unknown> = {}) => {
    if (!placingType) return;

    const newComponent: PipelineComponent = {
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

  const handleUpdateComponent = useCallback((updatedComponent: PipelineComponent) => {
    setComponents(prev =>
      prev.map(comp => (comp.id === updatedComponent.id ? updatedComponent : comp))
    );
  }, []);

  const handleDeleteComponent = useCallback((id: string) => {
    setComponents(prev => prev.filter(comp => comp.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  }, [selectedId]);



  // ...

  const handleSaveDesign = () => {
    try {
      // Find the canvas element
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        alert('Could not find 3D view to capture.');
        return;
      }

      // Convert canvas to image
      const imgData = canvas.toDataURL('image/png');

      // Download as Image
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `${designName || 'design'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert('Design saved as Image!');

    } catch (error) {
      console.error('Error saving image:', error);
      alert('Failed to save image.');
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

  // Keyboard Shortcuts (Delete, Copy, Paste, Cancel)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        handleDeleteComponent(selectedId);
      }

      // Cancel
      if (e.key === 'Escape') {
        handleCancelPlacement();
        setSelectedId(null);
      }

      // Copy (Ctrl+C)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedId) {
        const component = components.find(c => c.id === selectedId);
        if (component) {
          setClipboard(component);
          console.log('Copied to clipboard:', component);
        }
      }

      // Paste (Ctrl+V)
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && clipboard) {
        const newComponent: PipelineComponent = {
          ...clipboard,
          id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          position_x: clipboard.position_x + 2, // Offset so it's visible
          position_y: clipboard.position_y,
          position_z: clipboard.position_z,
          connections: [] // Don't copy connections
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
    <div className="h-screen flex flex-col bg-gray-950">
      <Toolbar
        designName={designName}
        onSave={handleSaveDesign}
        onNewDesign={handleNewDesign}
        componentCount={components.length}
        totalCost={totalCost}
        onShowMaterials={() => setShowMaterials(true)}
      />

      {showMaterials && (
        <MaterialsList
          components={components}
          onClose={() => setShowMaterials(false)}
        />
      )}

      <div className="flex-1 flex overflow-hidden">
        <ComponentLibrary
          onAddComponent={handleAddComponent}
          selectedId={selectedId}
          onDelete={() => selectedId && handleDeleteComponent(selectedId)}
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
          />
        </div>
      </div>
    </div>
  );
}

export default App;
