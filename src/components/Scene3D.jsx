import React, { useState, useRef, Suspense, Component } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
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

      {/* Click Plane for background technical clicks - Active in Front and Top Views for deselection */}
      {(viewMode === 'front' || viewMode === 'top') && (
        <mesh
          rotation={viewMode === 'front' ? [0, 0, 0] : [-Math.PI / 2, 0, 0]}
          position={[0, 0, viewMode === 'front' ? -0.05 : -0.01]}
          onClick={(e) => {
            // Deselect if clicking empty space
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
          // Allow selection in ALL viewports
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

      {/* Editor Controls (Handles) active in ALL viewports for synchronized transformation */}
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

// ---------------------------------------------------------
// COMPONENT: PlacementGhost
// ---------------------------------------------------------
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
      {/* Ghost Plane: Large capture area that follows the mouse - Active in all views for placement */}
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

      {/* Interaction Dot: Smaller and specific color only if placeable here */}
      <mesh position={snap.position}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color={snap.isValid ? '#10b981' : '#f43f5e'} transparent opacity={0.8} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------
// COMPONENT: EditorControls
// ---------------------------------------------------------
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

function ViewportLabel({ text, color = 'bg-slate-900/5', textColor = 'text-slate-500' }) {
  return (
    <div className={`absolute top-4 left-4 z-20 px-3 py-1 ${color} backdrop-blur-md rounded-lg text-[9px] font-black uppercase tracking-widest ${textColor} border border-white/50 shadow-sm pointer-events-none`}>
      {text}
    </div>
  );
}

// ---------------------------------------------------------
// COMPONENT: TitleBlock
// ---------------------------------------------------------
function TitleBlock({ designName }) {
  const date = new Date().toLocaleDateString('en-GB');
  return (
    <div className="absolute bottom-6 right-6 bg-white/60 backdrop-blur-md border-2 border-slate-900 p-4 w-72 shadow-xl z-20 font-mono text-[9px] uppercase tracking-tighter hover:bg-white/90 transition-colors cursor-help">
      <div className="grid grid-cols-2 border-b-2 border-slate-900 mb-2 pb-2">
        <div className="border-r-2 border-slate-900 pr-2">
          <div className="text-slate-400 mb-1">Project</div>
          <div className="font-black text-slate-900 truncate">{designName || 'Untitled'}</div>
        </div>
        <div className="pl-2">
          <div className="text-slate-400 mb-1">Company</div>
          <div className="font-black text-blue-700 italic">Aqua Pro Eng.</div>
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

// ---------------------------------------------------------
// MAIN EXPORT: Scene3D
// ---------------------------------------------------------
export default function Scene3D({
  components,
  selectedId,
  onSelectComponent,
  placingType,
  onPlaceComponent,
  onCancelPlacement,
  onUpdateComponent,
  transformMode,
  designName
}) {
  // Generate Tags (P1, FT1, etc)
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

  return (
    <div id="multi-view-container" className="w-full h-full flex bg-slate-50 p-3 gap-3 overflow-hidden box-border">
      {/* Viewport 1: FRONT (Interactive Center) */}
      <div className="flex-[2] h-full bg-white rounded-3xl border border-slate-200 relative overflow-hidden shadow-sm hover:border-blue-200 transition-colors">
        <ViewportLabel text="Technical Front View" color="bg-blue-600/10" textColor="text-blue-600" />
        <TitleBlock designName={designName} />
        <SceneErrorBoundary>
          <Canvas gl={{ antialias: true, preserveDrawingBuffer: true }} shadows onPointerMissed={() => onSelectComponent(null)}>
            <OrthographicCamera makeDefault position={[0, 0, 100]} zoom={60} />
            <CameraControls
              makeDefault
              dollyToCursor
              mouseButtons={{ left: 2, middle: 0, right: 0, wheel: 8 }}
              enableRotate={false}
            />
            <SharedSceneElements
              components={components.map(c => ({ ...c, _tag: getTag(c) }))}
              selectedId={selectedId}
              onSelectComponent={onSelectComponent}
              onUpdateComponent={onUpdateComponent}
              placingType={placingType}
              onPlaceComponent={onPlaceComponent}
              transformMode={transformMode}
              viewMode="front"
            />
          </Canvas>
        </SceneErrorBoundary>
      </div>

      {/* Side Stack */}
      <div className="flex-1 flex flex-col gap-3 h-full">
        {/* Top View */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 relative overflow-hidden shadow-sm hover:border-blue-200 transition-colors">
          <ViewportLabel text="Top Schematic" />
          <SceneErrorBoundary>
            <Canvas gl={{ antialias: true, preserveDrawingBuffer: true }} shadows onPointerMissed={() => onSelectComponent(null)}>
              <OrthographicCamera makeDefault position={[0, 100, 0]} zoom={40} up={[0, 0, -1]} />
              <CameraControls
                makeDefault
                dollyToCursor
                mouseButtons={{ left: 2, middle: 0, right: 0, wheel: 8 }}
                enableRotate={false}
              />
              <SharedSceneElements
                components={components.map(c => ({ ...c, _tag: getTag(c) }))}
                selectedId={selectedId}
                onSelectComponent={onSelectComponent}
                onUpdateComponent={onUpdateComponent}
                placingType={placingType}
                onPlaceComponent={onPlaceComponent}
                transformMode={transformMode}
                viewMode="top"
              />
            </Canvas>
          </SceneErrorBoundary>
        </div>

        {/* 3D View */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 relative overflow-hidden shadow-sm hover:border-blue-400 transition-colors border-blue-100">
          <ViewportLabel text="3D Isometric" color="bg-slate-900" textColor="text-white" />
          <SceneErrorBoundary>
            <Canvas gl={{ antialias: true, preserveDrawingBuffer: true }} shadows onPointerMissed={() => onSelectComponent(null)}>
              <PerspectiveCamera makeDefault position={[30, 30, 30]} fov={50} />
              <CameraControls makeDefault dollyToCursor />
              <SharedSceneElements
                components={components.map(c => ({ ...c, _tag: getTag(c) }))}
                selectedId={selectedId}
                onSelectComponent={onSelectComponent}
                onUpdateComponent={onUpdateComponent}
                placingType={placingType}
                onPlaceComponent={onPlaceComponent}
                transformMode={transformMode}
                viewMode="iso"
              />
            </Canvas>
          </SceneErrorBoundary>
        </div>
      </div>
    </div>
  );
}
