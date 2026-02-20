import React, { useState, useRef, Suspense, Component, useEffect, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { RotateCcw } from 'lucide-react';
import {
  Grid,
  TransformControls,
  CameraControls,
  PerspectiveCamera,
  OrthographicCamera
} from '@react-three/drei';
import PipeComponent from './PipeComponent';
import { findSnapPoint } from '../utils/snapping';
import * as THREE from 'three';
import ResizablePane from './ResizablePane';

// ---------------------------------------------------------
// COMPONENT: SceneErrorBoundary
// ---------------------------------------------------------
class SceneErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("3D Viewport Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 p-4 text-center border-2 border-dashed border-slate-100 rounded-3xl m-2">
          <svg className="w-8 h-8 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-[10px] font-black uppercase tracking-widest">{this.state.error?.message || "Internal rendering error"}</span>
          <button onClick={() => window.location.reload()} className="mt-2 text-[8px] font-black underline uppercase text-blue-500">Restart View</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------
// COMPONENT: SharedSceneElements
// ---------------------------------------------------------
const SharedSceneElements = ({
  components,
  selectedId,
  onSelectComponent,
  onUpdateComponent,
  placingType,
  onPlaceComponent,
  transformMode,
  viewMode
}) => {
  return (
    <>
      <color attach="background" args={['#ffffff']} />
      <ambientLight intensity={1.5} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      <spotLight position={[-10, 20, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />

      {/* Click Plane for background technical clicks */}
      {(viewMode === 'front' || viewMode === 'top') && (
        <mesh
          rotation={viewMode === 'front' ? [0, 0, 0] : [-Math.PI / 2, 0, 0]}
          position={[0, 0, viewMode === 'front' ? -0.05 : -0.01]}
          onClick={(e) => {
            if (e.delta < 2) onSelectComponent(null);
          }}
        >
          <planeGeometry args={[2000, 2000]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      <Grid
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#e2e8f0"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#cbd5e1"
        fadeDistance={50}
        infiniteGrid
      />

      {components.map((comp) => (
        <PipeComponent
          key={comp.id}
          component={comp}
          isSelected={comp.id === selectedId}
          onSelect={() => !placingType && onSelectComponent(comp.id)}
          onUpdate={onUpdateComponent}
          viewMode={viewMode}
          tag={comp._tag}
        />
      ))}

      {placingType && (
        <PlacementGhost
          placingType={placingType}
          components={components}
          onPlace={onPlaceComponent}
          viewMode={viewMode}
        />
      )}

      {selectedId && (
        <EditorControls
          selectedId={selectedId}
          components={components}
          onUpdateComponent={onUpdateComponent}
          transformMode={transformMode}
        />
      )}
    </>
  );
};

// ... (PlacementGhost and EditorControls remain the same)
const PlacementGhost = ({ placingType, components, onPlace, viewMode }) => {
  const { raycaster, pointer, camera } = useThree();
  const [snap, setSnap] = useState(null);

  useFrame(() => {
    raycaster.setFromCamera(pointer, camera);
    const result = findSnapPoint(raycaster, components, placingType, viewMode);
    setSnap(result);
  });

  const handleGlobalClick = (e) => {
    e.stopPropagation();
    if (snap && snap.isValid) {
      onPlace(
        [snap.position.x, snap.position.y, snap.position.z],
        [snap.rotation.x * (180 / Math.PI), snap.rotation.y * (180 / Math.PI), snap.rotation.z * (180 / Math.PI)]
      );
    }
  };

  if (!snap) return null;

  const ghostComponent = {
    id: 'ghost',
    component_type: placingType,
    position_x: snap.position.x,
    position_y: snap.position.y,
    position_z: snap.position.z,
    rotation_x: snap.rotation.x * (180 / Math.PI),
    rotation_y: snap.rotation.y * (180 / Math.PI),
    rotation_z: snap.rotation.z * (180 / Math.PI),
    connections: [],
    properties: {},
  };

  return (
    <group>
      <mesh
        position={snap.position}
        onClick={handleGlobalClick}
        rotation={viewMode === 'front' ? [0, 0, 0] : [-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <PipeComponent
        component={ghostComponent}
        isSelected={false}
        isGhost={true}
        onSelect={() => { }}
        onUpdate={() => { }}
        viewMode={viewMode}
      />
      <mesh position={snap.position}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color={snap.isValid ? '#10b981' : '#f43f5e'} transparent opacity={0.8} />
      </mesh>
    </group>
  );
};

const EditorControls = ({ selectedId, components, onUpdateComponent, transformMode }) => {
  const { scene } = useThree();
  const selectedObject = scene.getObjectByName(selectedId);
  if (!selectedObject) return null;
  return (
    <TransformControls
      object={selectedObject}
      mode={transformMode}
      size={0.6}
      onMouseUp={(e) => {
        const object = e.target.object;
        if (object) {
          const comp = components.find(c => c.id === selectedId);
          if (comp) {
            onUpdateComponent({
              ...comp,
              position_x: object.position.x,
              position_y: object.position.y,
              position_z: object.position.z,
              rotation_x: object.rotation.x * (180 / Math.PI),
              rotation_y: object.rotation.y * (180 / Math.PI),
              rotation_z: object.rotation.z * (180 / Math.PI),
            });
          }
        }
      }}
    />
  );
};

// ---------------------------------------------------------
// COMPONENT: ViewportLabel (Draggable Handle)
// ---------------------------------------------------------
function ViewportLabel({ text, color = 'bg-slate-900/5', textColor = 'text-slate-500', onDragStart, viewId }) {
  return (
    <div
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart && onDragStart(e, viewId)}
      data-html2canvas-ignore="true"
      className={`absolute top-4 left-4 z-20 px-3 py-1 ${color} backdrop-blur-md rounded-lg text-[9px] font-black uppercase tracking-widest ${textColor} border border-white/50 shadow-sm transition-transform ${onDragStart ? 'cursor-grab active:cursor-grabbing hover:scale-105' : 'pointer-events-none'} select-none`}
    >
      <div className="flex items-center gap-2">
        <span>{text}</span>
        {onDragStart && (
          <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// COMPONENT: StableResetButton (External to Canvas)
// ---------------------------------------------------------
function StableResetButton({ onReset }) {
  return (
    <div className="absolute top-3 right-3 z-30 pointer-events-auto" data-html2canvas-ignore="true">
      <button
        onClick={(e) => { e.stopPropagation(); onReset(); }}
        className="bg-white hover:bg-blue-50 text-slate-500 hover:text-blue-600 p-2 rounded-lg shadow-md border border-slate-200 transition-all active:scale-95 flex items-center gap-2 group"
        title="Reset View Camera"
      >
        <RotateCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
        <span className="text-[10px] font-black uppercase hidden group-hover:inline-block">Reset</span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------
// COMPONENT: ViewportCameraControls
// ---------------------------------------------------------
const ViewportCameraControls = ({ viewMode, setResetHandler, selectedId, components }) => {
  const prevSelectedId = useRef(null);
  const controlsRef = useRef();

  const handleReset = useCallback(() => {
    if (controlsRef.current) {
      if (viewMode === 'front') {
        controlsRef.current.setLookAt(0, 0, 100, 0, 0, 0, true);
        controlsRef.current.zoomTo(15, true);
      } else if (viewMode === 'top') {
        controlsRef.current.setLookAt(0, 100, 0, 0, 0, 0, true);
        controlsRef.current.zoomTo(15, true);
      } else {
        controlsRef.current.setLookAt(30, 30, 30, 0, 0, 0, true);
      }
    }
  }, [viewMode]);

  // Sync camera when selection changes
  useEffect(() => {
    // Only jump if the selection actually CHANGED, not if a selected item is being moved
    if (selectedId && selectedId !== prevSelectedId.current && components && controlsRef.current) {
      const selectedComp = components.find(c => c.id === selectedId);
      if (selectedComp) {
        const tx = selectedComp.position_x || 0;
        const ty = selectedComp.position_y || 0;
        const tz = selectedComp.position_z || 0;

        // In 2D views, moving the target effectively centers the object
        if (viewMode === 'top') {
          controlsRef.current.setLookAt(tx, 100, tz, tx, ty, tz, true);
        } else if (viewMode === 'front') {
          controlsRef.current.setLookAt(tx, ty, 100, tx, ty, tz, true);
        } else {
          controlsRef.current.moveTo(tx, ty, tz, true);
        }
      }
    }
    prevSelectedId.current = selectedId;
  }, [selectedId, components, viewMode]);

  useEffect(() => {
    setResetHandler(() => handleReset);
  }, [handleReset, setResetHandler]);

  return (
    <>
      <CameraControls
        ref={controlsRef}
        makeDefault
        dollyToCursor
        dollyMode="zoom"
        mouseButtons={viewMode !== 'iso' ? { left: 2, middle: 0, right: 0, wheel: 16 } : { left: 1, middle: 0, right: 2, wheel: 16 }}
        enableRotate={viewMode === 'iso'}
        minZoom={0.01}
        maxZoom={100}
      />
    </>
  );
};


// ---------------------------------------------------------
// COMPONENT: TitleBlock
// ---------------------------------------------------------
function TitleBlock({ designName }) {
  const date = new Date().toLocaleDateString('en-GB');
  return (
    <div className="absolute bottom-6 right-6 bg-white/60 backdrop-blur-md border-2 border-slate-900 p-4 w-72 shadow-xl z-20 font-mono text-[9px] uppercase tracking-tighter hover:bg-white/90 transition-colors pointer-events-none select-none">
      <div className="grid grid-cols-2 border-b-2 border-slate-900 mb-2 pb-2">
        <div className="border-r-2 border-slate-900 pr-2">
          <div className="text-slate-400 mb-1">Project</div>
          <div className="font-black text-slate-900 truncate">{designName || 'Untitled'}</div>
        </div>
        <div className="pl-2">
          <div className="text-slate-400 mb-1">Company</div>
          <div className="font-black text-blue-700 italic">ClearPath Eng.</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="border-r-2 border-slate-900 pr-1">
          <div className="text-slate-400">Date</div>
          <div className="font-black text-slate-900">{date}</div>
        </div>
        <div className="border-r-2 border-slate-900 pr-1">
          <div className="text-slate-400">Rev</div>
          <div className="font-black text-slate-900">01-A</div>
        </div>
        <div className="pl-1">
          <div className="text-slate-400">Scale</div>
          <div className="font-black text-slate-900">1:50</div>
        </div>
      </div>
      <div className="mt-3 pt-2 border-t-2 border-slate-900 text-center font-black text-slate-700 bg-slate-50 py-1">
        ENGINEERING BLUEPRINT • NOT FOR DESIGN ONLY
      </div>
    </div>
  );
}

const VIEW_CONFIGS = {
  front: { label: 'Technical Front View', labelColor: 'bg-blue-600/10', labelTextColor: 'text-blue-600', camera: 'ortho', defaultZoom: 60, defaultPos: [0, 0, 100], defaultUp: [0, 1, 0] },
  top: { label: 'Top Schematic', labelColor: 'bg-slate-900/5', labelTextColor: 'text-slate-500', camera: 'ortho', defaultZoom: 40, defaultPos: [0, 100, 0], defaultUp: [0, 0, -1] },
  iso: { label: '3D Isometric', labelColor: 'bg-slate-900', labelTextColor: 'text-white', camera: 'perspective', defaultPos: [30, 30, 30], defaultFov: 50 }
};

export default function Scene3D({
  components, selectedId, onSelectComponent, placingType, onPlaceComponent, onCancelPlacement, onUpdateComponent, transformMode, designName
}) {
  const [viewLayout, setViewLayout] = useState(['iso', 'front', 'top']);
  const resetHandlers = useRef({});

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    const draggedViewId = e.dataTransfer.getData('text/plain');
    const draggedIndex = viewLayout.indexOf(draggedViewId);
    if (draggedIndex === -1 || draggedIndex === targetIndex) return;
    const newLayout = [...viewLayout];
    [newLayout[targetIndex], newLayout[draggedIndex]] = [newLayout[draggedIndex], newLayout[targetIndex]];
    setViewLayout(newLayout);
  };

  const getTag = (comp) => {
    const type = comp.component_type || 'straight';
    const sameTypeComps = components.filter(c => c.component_type === type);
    const index = sameTypeComps.findIndex(c => c.id === comp.id) + 1;
    let prefix = 'P-';
    if (['elbow', 'elbow-45', 't-joint', 'cap'].includes(type)) prefix = 'FT-';
    else if (type === 'valve') prefix = 'V-';
    else if (type === 'filter') prefix = 'FL-';
    else if (type === 'tank') prefix = 'T-';
    return `${prefix}${index}`;
  };

  const renderViewport = (index, wrapperClass) => {
    const viewId = viewLayout[index];
    const config = VIEW_CONFIGS[viewId];
    return (
      <div
        id={`viewport-canvas-${viewId}`}
        className={`${wrapperClass} bg-white rounded-3xl border border-slate-200 relative overflow-hidden shadow-sm hover:border-blue-200 transition-colors group/viewport`}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
        onDrop={(e) => handleDrop(e, index)}
      >
        <ViewportLabel text={config.label} color={config.labelColor} textColor={config.labelTextColor} onDragStart={(e) => e.dataTransfer.setData('text/plain', viewId)} viewId={viewId} />
        <StableResetButton onReset={() => resetHandlers.current[viewId]?.()} />
        {index === 0 && <TitleBlock designName={designName} />}
        <SceneErrorBoundary key={viewId}>
          <Canvas gl={{ antialias: true, preserveDrawingBuffer: true }} shadows onPointerMissed={() => onSelectComponent(null)}>
            {config.camera === 'ortho' ? (
              <OrthographicCamera makeDefault position={config.defaultPos} zoom={config.defaultZoom} up={config.defaultUp || [0, 1, 0]} />
            ) : (
              <PerspectiveCamera makeDefault position={config.defaultPos} fov={config.defaultFov} />
            )}
            <ViewportCameraControls
              viewMode={viewId}
              setResetHandler={(handler) => { resetHandlers.current[viewId] = handler; }}
              selectedId={selectedId}
              components={components}
            />
            <SharedSceneElements components={components.map(c => ({ ...c, _tag: getTag(c) }))} selectedId={selectedId} onSelectComponent={onSelectComponent} onUpdateComponent={onUpdateComponent} placingType={placingType} onPlaceComponent={onPlaceComponent} transformMode={transformMode} viewMode={viewId} />
          </Canvas>
        </SceneErrorBoundary>
        <div className="absolute inset-0 bg-blue-500/0 group-hover/viewport:bg-blue-500/[0.02] transition-colors pointer-events-none" />
      </div>
    );
  };

  return (
    <div id="multi-view-container" className="w-full h-full bg-slate-50">
      <ResizablePane
        first={renderViewport(0, "w-full h-full")}
        second={
          <ResizablePane
            vertical
            initialSize={50}
            first={renderViewport(1, "w-full h-full")}
            second={renderViewport(2, "w-full h-full border-blue-100")}
          />
        }
      />
    </div>
  );
}
