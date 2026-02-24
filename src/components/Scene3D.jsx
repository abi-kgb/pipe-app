import React, { useState, useRef, Suspense, Component, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { jsPDF } from 'jspdf';
import { getComponentTag } from '../utils/tagging';
import { Html } from '@react-three/drei';
import { RotateCcw } from 'lucide-react';
import {
  Grid,
  TransformControls,
  CameraControls,
  PerspectiveCamera,
  OrthographicCamera,
  GizmoHelper,
  GizmoViewport,
  Text,
  Environment,
  ContactShadows
} from '@react-three/drei';
import PipeComponent from './PipeComponent';
import { findSnapPoint } from '../utils/snapping';
import * as THREE from 'three';
import ResizablePane from './ResizablePane';

const VIEW_CONFIGS = {
  iso: { label: '3D Isometric', labelColor: 'bg-slate-900', labelTextColor: 'text-white', camera: 'perspective', defaultPos: [30, 30, 30], defaultFov: 50 },
  front: { label: 'Front Elevation', labelColor: 'bg-blue-600/10', labelTextColor: 'text-blue-600', camera: 'ortho', defaultZoom: 60, defaultPos: [0, 0, 100], defaultUp: [0, 1, 0] },
  top: { label: 'Top Plan View', labelColor: 'bg-slate-900/5', labelTextColor: 'text-slate-500', camera: 'ortho', defaultZoom: 40, defaultPos: [0, 100, 0], defaultUp: [0, 0, -1] },
  right: { label: 'Right Elevation', labelColor: 'bg-blue-600/10', labelTextColor: 'text-blue-600', camera: 'ortho', defaultZoom: 60, defaultPos: [100, 0, 0], defaultUp: [0, 1, 0] },
  left: { label: 'Left Elevation', labelColor: 'bg-blue-600/10', labelTextColor: 'text-blue-600', camera: 'ortho', defaultZoom: 60, defaultPos: [-100, 0, 0], defaultUp: [0, 1, 0] },
  back: { label: 'Back Elevation', labelColor: 'bg-blue-600/10', labelTextColor: 'text-blue-600', camera: 'ortho', defaultZoom: 60, defaultPos: [0, 0, -100], defaultUp: [0, 1, 0] },
  bottom: { label: 'Bottom View', labelColor: 'bg-slate-900/5', labelTextColor: 'text-slate-500', camera: 'ortho', defaultZoom: 40, defaultPos: [0, -100, 0], defaultUp: [0, 0, 1] }
};

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
  selectedIds,
  onSelectComponent,
  onUpdateComponent,
  onUpdateMultiple,
  placingType,
  onPlaceComponent,
  transformMode,
  viewMode,
  darkMode,
  onBatchSelect,
  isCapture = false,
  placingTemplate,
  isDragging,
  isTransforming,
  suppressLabels = false,
}) => {
  const bgColor = isCapture ? '#ffffff' : (darkMode ? '#0f172a' : '#ffffff');
  const gridCellColor = darkMode ? '#1e293b' : '#e2e8f0';
  const gridSectionColor = darkMode ? '#334155' : '#cbd5e1';

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <ambientLight intensity={darkMode ? 0.8 : 1.2} />
      <pointLight position={[10, 10, 10]} intensity={darkMode ? 0.8 : 1.2} />
      <spotLight position={[-10, 20, 10]} angle={0.15} penumbra={1} intensity={darkMode ? 1.0 : 1.5} castShadow />

      {/* Realistic Environment Refelctions */}
      <Environment preset="city" />

      {/* Grounding Contact Shadows */}
      {!isCapture && (
        <ContactShadows
          position={[0, -0.01, 0]}
          opacity={0.4}
          scale={50}
          blur={2}
          far={10}
          resolution={256}
          color={darkMode ? "#000000" : "#334155"}
        />
      )}

      {/* Click Plane REMOVED to prevent cross-viewport selection clearing */}

      {!isCapture && (
        <>
          <Grid
            args={[100, 100]}
            cellSize={1}
            cellThickness={0.5}
            cellColor={gridCellColor}
            sectionSize={5}
            sectionThickness={1}
            sectionColor={gridSectionColor}
            fadeDistance={50}
            infiniteGrid
          />


        </>
      )}

      {/* Components Layer - Interactivity disabled during placement so hitboxes don't block clicks */}
      <group pointerEvents={placingType ? 'none' : 'auto'}>
        {(() => {
          const typeCounts = {};
          return components.map((comp) => {
            const type = comp.component_type || 'straight';
            const idx = (typeCounts[type] || 0);
            typeCounts[type] = idx + 1;
            const tag = getComponentTag(type, idx);

            return (
              <PipeComponent
                key={comp.id}
                component={comp}
                isSelected={selectedIds.includes(comp.id)}
                onSelect={(e) => onSelectComponent(comp.id, e)}
                onUpdate={onUpdateComponent}
                viewMode={viewMode}
                darkMode={darkMode}
                tag={tag}
                isCapture={isCapture}
                suppressLabels={suppressLabels}
              />
            );
          });
        })()}
      </group>

      {placingType && (
        <PlacementGhost
          placingType={placingType}
          placingTemplate={placingTemplate}
          components={components}
          onPlace={onPlaceComponent}
          viewMode={viewMode}
          darkMode={darkMode}
        />
      )}

      {selectedIds.length > 0 && !isCapture && (
        <EditorControls
          selectedIds={selectedIds}
          components={components}
          onUpdateMultiple={onUpdateMultiple}
          transformMode={transformMode}
          isTransforming={isTransforming}
        />
      )}

      {/* Marquee Selection Logic */}
      {!isCapture && !placingType && (
        <SelectionManager
          components={components}
          onBatchSelect={onBatchSelect}
          isDragging={isDragging}
        />
      )}
    </>
  );
};

const SelectionManager = ({ components, onBatchSelect, isDragging }) => {
  const { camera, size, pointer, gl } = useThree();
  const [start, setStart] = useState(null);
  const [current, setCurrent] = useState(null);
  const startPointer = useRef(null);

  useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    const handleDown = (e) => {
      // Only trigger on left click
      if (e.button !== 0) return;

      // Ensure we're clicking the actual canvas or its children (not external UI)
      if (e.target !== canvas && !canvas.contains(e.target)) return;

      // Reset dragging state just in case it got stuck
      isDragging.current = false;

      // Store current normalized pointer position
      startPointer.current = { x: pointer.x, y: pointer.y };
    };

    const handleMove = (e) => {
      if (!startPointer.current) return;

      // Calculate distance in normalized coordinates to determine if dragging
      const dx = pointer.x - startPointer.current.x;
      const dy = pointer.y - startPointer.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Threshold: approx 8 pixels in normalized space (depends on size, but 0.01 is usually safe)
      if (!isDragging.current && dist > 0.01) {
        isDragging.current = true;
      }

      if (isDragging.current) {
        setStart(startPointer.current);
        setCurrent({ x: pointer.x, y: pointer.y });
      }
    };

    const handleUp = (e) => {
      const wasDragging = isDragging.current;
      isDragging.current = false;

      if (wasDragging && startPointer.current) {
        const finalStart = startPointer.current;
        const finalEnd = { x: pointer.x, y: pointer.y };

        const bounds = {
          left: Math.min(finalStart.x, finalEnd.x),
          right: Math.max(finalStart.x, finalEnd.x),
          top: Math.max(finalStart.y, finalEnd.y), // Y is inverted in NDC
          bottom: Math.min(finalStart.y, finalEnd.y)
        };

        const batch = [];
        components.forEach(comp => {
          const pos = new THREE.Vector3(comp.position_x, comp.position_y, comp.position_z);
          pos.project(camera); // Projects to NDC (-1 to 1)

          if (pos.x >= bounds.left && pos.x <= bounds.right &&
            pos.y >= bounds.bottom && pos.y <= bounds.top) {
            batch.push(comp.id);
          }
        });

        if (onBatchSelect) onBatchSelect(batch, e);
      }

      setStart(null);
      setCurrent(null);
      startPointer.current = null;
    };

    canvas.addEventListener('pointerdown', handleDown);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);

    return () => {
      canvas.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [camera, size, pointer, gl, components, onBatchSelect]);

  if (!start || !current) return null;

  const left = ((Math.min(start.x, current.x) + 1) / 2) * 100;
  const top = ((1 - Math.max(start.y, current.y)) / 2) * 100;
  const width = (Math.abs(current.x - start.x) / 2) * 100;
  const height = (Math.abs(current.y - start.y) / 2) * 100;

  return (
    <Html fullscreen style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: `${left}%`,
          top: `${top}%`,
          width: `${width}%`,
          height: `${height}%`,
          border: '1.5px dashed #3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '2px',
          pointerEvents: 'none',
          zIndex: 1000
        }}
      />
      {width > 20 && height > 20 && (
        <div style={{
          position: 'absolute',
          left: left + width / 2,
          top: top - 25,
          transform: 'translateX(-50%)',
          backgroundColor: '#3b82f6',
          color: 'white',
          padding: '2px 8px',
          borderRadius: '99px',
          fontSize: '10px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap'
        }}>
          Release to select
        </div>
      )}
    </Html>
  );
};

// ... (PlacementGhost and EditorControls remain the same)
const PlacementGhost = ({ placingType, placingTemplate, components, onPlace, viewMode, darkMode }) => {
  const { raycaster, pointer, camera } = useThree();
  const [snap, setSnap] = useState(null);
  const pointerDownPos = useRef({ x: 0, y: 0 });

  useFrame(() => {
    raycaster.setFromCamera(pointer, camera);
    const result = findSnapPoint(raycaster, components, placingType, viewMode, placingTemplate);
    setSnap(result);
  });

  const handlePointerDown = (e) => {
    // We captured the screen pos, but don't stop propagation 
    // so CameraControls can still handle rotation/pan
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e) => {
    // e.stopPropagation(); // REMOVED: Don't block background controls
    // Only place if it's a clean click, not a significant drag
    const dist = Math.sqrt(
      Math.pow(e.clientX - pointerDownPos.current.x, 2) +
      Math.pow(e.clientY - pointerDownPos.current.y, 2)
    );
    // Increased threshold from 5 to 10 for better sensitivity on trackpads/tablets
    if (dist > 10) return;

    if (snap && snap.isValid) {
      // Small local protection to prevent double-firing while App is processing
      if (e.target._isPlacing) return;
      e.target._isPlacing = true;
      setTimeout(() => { if (e.target) e.target._isPlacing = false; }, 400);

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
    properties: placingTemplate?.properties || {}, // Use template properties for ghost rendering
    _isGhost: true,
    _isValid: snap.isValid,
    _isSnapped: snap.isSnappedToSocket
  };

  return (
    <group
      position={[snap.position.x, snap.position.y, snap.position.z]}
      rotation={[snap.rotation.x, snap.rotation.y, snap.rotation.z]}
    >
      {placingTemplate?.isAssembly && placingTemplate.parts ? (
        placingTemplate.parts.map((p, i) => {
          // Calculate rotated preview for each part
          const assemblyQuat = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(snap.rotation.x, snap.rotation.y, snap.rotation.z)
          );

          // 1. Position
          const offsetVec = new THREE.Vector3(p.offset_x || 0, p.offset_y || 0, p.offset_z || 0);
          offsetVec.applyQuaternion(assemblyQuat);

          // 2. Rotation
          const partLocalRot = new THREE.Euler(
            (p.rotation_x || 0) * (Math.PI / 180),
            (p.rotation_y || 0) * (Math.PI / 180),
            (p.rotation_z || 0) * (Math.PI / 180)
          );
          const partLocalQuat = new THREE.Quaternion().setFromEuler(partLocalRot);
          const partFinalQuat = assemblyQuat.clone().multiply(partLocalQuat);
          const finalRot = new THREE.Euler().setFromQuaternion(partFinalQuat);

          return (
            <PipeComponent
              key={`ghost_ass_${i}`}
              component={{
                ...p,
                id: `ghost_part_${i}`,
                position_x: offsetVec.x,
                position_y: offsetVec.y,
                position_z: offsetVec.z,
                rotation_x: finalRot.x * (180 / Math.PI),
                rotation_y: finalRot.y * (180 / Math.PI),
                rotation_z: finalRot.z * (180 / Math.PI),
                _isGhost: true,
                _isValid: snap.isValid
              }}
              isSelected={false}
              isGhost={true}
              onSelect={() => { }}
              onUpdate={() => { }}
              viewMode={viewMode}
              darkMode={darkMode}
            />
          );
        })
      ) : (
        <PipeComponent
          component={{
            ...ghostComponent,
            position_x: 0,
            position_y: 0,
            position_z: 0,
            rotation_x: 0,
            rotation_y: 0,
            rotation_z: 0,
          }}
          isSelected={false}
          isGhost={true}
          onSelect={() => { }}
          onUpdate={() => { }}
          viewMode={viewMode}
          darkMode={darkMode}
        />
      )}
      {/* Snap point indicator (The "Bubble") */}
      <group
        position={[0, 0, 0]}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {/* Visual Indicator */}
        <mesh>
          <sphereGeometry args={[snap.isSnappedToSocket ? 0.35 : 0.15, 16, 16]} />
          <meshBasicMaterial
            color={snap.isSnappedToSocket ? '#10b981' : (snap.isValid ? '#06b6d4' : '#f43f5e')}
            transparent
            opacity={snap.isSnappedToSocket ? 0.9 : 0.4}
            depthTest={false} // Always on top
          />
        </mesh>

        {/* Secondary ring for high visibility during snapping */}
        {snap.isSnappedToSocket && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.4, 0.5, 32]} />
            <meshBasicMaterial color="#10b981" transparent opacity={0.6} depthTest={false} />
          </mesh>
        )}

        {/* Invisible Click Hitbox - Makes the bubble easy to click */}
        <mesh visible={false}>
          <sphereGeometry args={[0.8, 16, 16]} />
          <meshBasicMaterial color="red" transparent opacity={0.1} />
        </mesh>
      </group>
    </group>
  );
};

const EditorControls = ({ selectedIds, components, onUpdateMultiple, transformMode, isTransforming }) => {
  const { scene } = useThree();
  const pivotRef = useRef();
  const [isReady, setIsReady] = useState(false);

  // 1. Calculate the center of all selected objects to position the pivot
  useEffect(() => {
    if (!pivotRef.current || selectedIds.length === 0) return;

    const selectedObjects = selectedIds
      .map(id => scene.getObjectByName(id))
      .filter(obj => obj != null);

    if (selectedObjects.length === 0) return;

    // Reset pivot transform before calculating new center
    pivotRef.current.position.set(0, 0, 0);
    pivotRef.current.rotation.set(0, 0, 0);
    pivotRef.current.scale.set(1, 1, 1);
    pivotRef.current.updateMatrixWorld();

    const box = new THREE.Box3();
    selectedObjects.forEach(obj => {
      box.expandByObject(obj);
    });

    const center = new THREE.Vector3();
    box.getCenter(center);

    pivotRef.current.position.copy(center);
    pivotRef.current.updateMatrixWorld();

    // Force a re-render to ensure TransformControls sees the ref
    setIsReady(true);
  }, [selectedIds, scene]);

  const [currentAngle, setCurrentAngle] = useState(0);

  if (selectedIds.length === 0) return null;

  return (
    <>
      <group ref={pivotRef} />
      {isReady && pivotRef.current && (
        <TransformControls
          object={pivotRef.current}
          mode={transformMode}
          size={0.6}
          rotationSnap={Math.PI / 12} // 15 degrees
          onMouseDown={() => {
            isTransforming.current = true;
            const pivot = pivotRef.current;
            if (!pivot) return;

            selectedIds.forEach(id => {
              const obj = scene.getObjectByName(id);
              if (obj) {
                obj.updateMatrixWorld();
                pivot.attach(obj);
              }
            });
          }}
          onChange={() => {
            if (transformMode === 'rotate' && pivotRef.current) {
              const rot = pivotRef.current.rotation;
              // Show the absolute largest rotation value across all axes
              const maxRot = Math.max(
                Math.abs(rot.x),
                Math.abs(rot.y),
                Math.abs(rot.z)
              );
              setCurrentAngle(Math.round((maxRot * 180) / Math.PI));
            }
          }}
          onMouseUp={() => {
            const pivot = pivotRef.current;
            if (!pivot) return;

            const updates = [];
            // Use pivot.children to find all attached objects, or iterate selectedIds
            // Iterate in a clone of the children array since scene.attach removes them from pivot during iteration
            const children = [...pivot.children];

            children.forEach(obj => {
              const id = obj.name;
              const comp = components.find(c => c.id === id);
              if (comp) {
                // Return to scene before reading world position
                scene.attach(obj);
                obj.updateMatrixWorld();

                updates.push({
                  ...comp,
                  position_x: obj.position.x,
                  position_y: obj.position.y,
                  position_z: obj.position.z,
                  rotation_x: obj.rotation.x * (180 / Math.PI),
                  rotation_y: obj.rotation.y * (180 / Math.PI),
                  rotation_z: obj.rotation.z * (180 / Math.PI),
                });
              } else {
                // If it's not a component we track, still move it back to scene but don't add to updates
                scene.attach(obj);
              }
            });

            // If some selectedIds were NOT children of pivot for some reason, re-attach them just in case
            selectedIds.forEach(id => {
              const obj = scene.getObjectByName(id);
              if (obj && obj.parent === pivot) {
                scene.attach(obj);
              }
            });

            if (updates.length > 0) {
              onUpdateMultiple(updates);
            }
            setCurrentAngle(0);

            // Critical: Keep isTransforming true for a bit to swallow the click leakage
            // This prevents the "selection shift" to the component under the mouse
            setTimeout(() => {
              isTransforming.current = false;
            }, 150);
          }}
        />
      )}
      {transformMode === 'rotate' && pivotRef.current && (
        <Html
          position={[pivotRef.current.position.x, pivotRef.current.position.y + 1.2, pivotRef.current.position.z]}
          center
          zIndexRange={[2000, 3000]}
        >
          <div className="bg-blue-600/95 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[13px] font-black shadow-2xl border-2 border-white/30 whitespace-nowrap animate-in zoom-in duration-150">
            {currentAngle}°
          </div>
        </Html>
      )}
    </>
  );
};

// ---------------------------------------------------------
// COMPONENT: ViewportLabel (Draggable Handle)
// ---------------------------------------------------------
function ViewportLabel({ text, color = 'bg-slate-900/5', textColor = 'text-slate-500', onDragStart, viewId, darkMode }) {
  const dynamicColor = darkMode ? 'bg-slate-800/80 border-slate-700 text-slate-400' : `${color} border-white/50 ${textColor}`;
  return (
    <div
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart && onDragStart(e, viewId)}
      data-html2canvas-ignore="true"
      className={`absolute top-4 left-4 z-20 px-3 py-1 ${dynamicColor} backdrop-blur-md rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm transition-transform ${onDragStart ? 'cursor-grab active:cursor-grabbing hover:scale-105' : 'pointer-events-none'} select-none`}
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
function StableResetButton({ onReset, darkMode }) {
  return (
    <div className="absolute top-3 right-3 z-30 pointer-events-auto" data-html2canvas-ignore="true">
      <button
        onClick={(e) => { e.stopPropagation(); onReset(); }}
        className={`p-2 rounded-lg shadow-md border transition-all active:scale-95 flex items-center gap-2 group ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-blue-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50'}`}
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
const ViewportCameraControls = ({ viewMode, setResetHandler, selectedIds, components, isLocked }) => {
  const prevSelectedId = useRef(null);
  const controlsRef = useRef();

  const handleReset = useCallback((fitToComponents = false, animate = true) => {
    if (!controlsRef.current) return;

    if (fitToComponents && components && components.length > 0) {
      // ── Step 1: Calculate "True" Bounding Box ──────────────────────
      // Instead of just centers, we look at the start/end points of every component
      const box = new THREE.Box3();

      components.forEach((c) => {
        const pos = new THREE.Vector3(c.position_x || 0, c.position_y || 0, c.position_z || 0);
        const type = c.component_type || 'straight';
        const length = c.properties?.length || 2;
        const radius = (c.properties?.od || 0.3) / 2;

        // Add component center to the box
        box.expandByPoint(pos);

        // For pipes, add the end points as well for more accurate framing
        if (type === 'straight' || type === 'vertical') {
          const rotX = (c.rotation_x || 0) * (Math.PI / 180);
          const rotY = (c.rotation_y || 0) * (Math.PI / 180);
          const rotZ = (c.rotation_z || 0) * (Math.PI / 180);

          const direction = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(rotX, rotY, rotZ));
          const endPoint = pos.clone().add(direction.multiplyScalar(length));
          box.expandByPoint(endPoint);
        }

        // Pad the box slightly by the radius to prevent clipping the sides of pipes
        box.expandByScalar(radius);
      });

      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);

      const maxDim = Math.max(size.x, size.y, size.z);
      const fitRadius = Math.max(maxDim * 0.7, 5); // Minimum framing radius

      const config = VIEW_CONFIGS[viewMode];
      if (config && config.camera === 'ortho') {
        // Universal framing for all 6 orthographic views
        const camPos = new THREE.Vector3().fromArray(config.defaultPos).normalize().multiplyScalar(fitRadius * 3);
        controlsRef.current.setLookAt(
          center.x + camPos.x, center.y + camPos.y, center.z + camPos.z,
          center.x, center.y, center.z,
          animate
        );
        controlsRef.current.zoomTo(550 / (fitRadius * 2), animate);
      } else {
        // ISO view
        controlsRef.current.setLookAt(
          center.x + fitRadius * 1.5, center.y + fitRadius * 1.5, center.z + fitRadius * 1.5,
          center.x, center.y, center.z, animate
        );
      }
    } else {
      const config = VIEW_CONFIGS[viewMode];
      if (config) {
        if (config.camera === 'ortho') {
          const camPos = new THREE.Vector3().fromArray(config.defaultPos);
          controlsRef.current.setLookAt(camPos.x, camPos.y, camPos.z, 0, 0, 0, animate);
          controlsRef.current.zoomTo(config.defaultZoom || 15, animate);
        } else {
          controlsRef.current.setLookAt(30, 30, 30, 0, 0, 0, animate);
        }
      }
    }
  }, [viewMode, components]);

  // Sync camera when selection changes
  useEffect(() => {
    const selectedId = selectedIds[0];
    // Guard: Prevent auto-jump if the camera is LOCKED
    if (isLocked) {
      prevSelectedId.current = selectedId;
      return;
    }

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
  }, [selectedIds, components, viewMode]);

  useEffect(() => {
    setResetHandler(handleReset);  // store handleReset directly so fn(true) calls handleReset(true)
  }, [handleReset, setResetHandler]);

  const mouseButtons = isLocked
    ? { left: 0, middle: 0, right: 0, wheel: 0 }
    : (viewMode !== 'iso' ? { left: 2, middle: 0, right: 0, wheel: 16 } : { left: 1, middle: 0, right: 2, wheel: 16 });

  return (
    <>
      <CameraControls
        ref={controlsRef}
        makeDefault
        dollyToCursor
        dollyMode="zoom"
        mouseButtons={mouseButtons}
        enableRotate={!isLocked && viewMode === 'iso'}
        enabled={!isLocked}
        minZoom={0.01}
        maxZoom={100}
      />
    </>
  );
};


// ---------------------------------------------------------
// COMPONENT: TitleBlock
// ---------------------------------------------------------


const Scene3D = forwardRef(function Scene3D({
  components, selectedIds, onSelectComponent, onBatchSelect, placingType, placingTemplate, onPlaceComponent, onCancelPlacement, onUpdateComponent, onUpdateMultiple, transformMode, designName, darkMode, isLocked, suppressLabels = false
}, ref) {
  const [viewLayout, setViewLayout] = useState(['iso', 'front', 'top']);
  const resetHandlers = useRef({});

  // Expose resetAllViews() and captureViews() to parent (for PDF export)
  useImperativeHandle(ref, () => ({
    resetAllViews: () => {
      Object.values(resetHandlers.current).forEach(fn => fn?.(true));
    },
    captureViews: () => new Promise((resolve) => {
      // 1. Snap all cameras instantly to frame content (animate=false → no wait needed)
      Object.keys(VIEW_CONFIGS).forEach(viewId => {
        resetHandlers.current[viewId]?.(true, false);
      });

      // 2. Wait longer for Three.js to re-render the 7 hidden canvases
      // We use a combination of timeouts and rAF to be absolutely sure
      setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const images = {};
            console.log('Pipe3D: Starting view capture...');
            Object.keys(VIEW_CONFIGS).forEach(viewId => {
              const captureWrapper = document.getElementById(`capture-canvas-${viewId}`);
              const visibleWrapper = document.getElementById(`viewport-canvas-${viewId}`);
              const wrapper = captureWrapper || visibleWrapper;

              if (!wrapper) {
                console.warn(`Pipe3D: No wrapper found for ${viewId}`);
                return;
              }
              const canvas = wrapper.querySelector('canvas');
              if (!canvas) {
                console.warn(`Pipe3D: No canvas found for ${viewId}`);
                return;
              }

              try {
                // Ensure the canvas actually has content (alpha might be 0 if not rendered)
                const data = canvas.toDataURL('image/png');
                if (data.length < 1000) { // Tiny data URL usually means blank
                  console.warn(`Pipe3D: Canvas for ${viewId} appears blank (length: ${data.length})`);
                }
                images[viewId] = data;
                console.log(`Pipe3D: Captured ${viewId} (${data.length} bytes)`);
              } catch (e) {
                console.error(`Pipe3D: Error capturing ${viewId}:`, e);
              }
            });
            resolve(images);
          });
        });
      }, 500); // 500ms delay to ensure high-res contexts are ready
    }),
  }));

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
        <ViewportLabel text={config.label} color={config.labelColor} textColor={config.labelTextColor} onDragStart={(e) => e.dataTransfer.setData('text/plain', viewId)} viewId={viewId} darkMode={darkMode} />
        <StableResetButton onReset={() => resetHandlers.current[viewId]?.()} darkMode={darkMode} />

        {/* Multi-Select Indicator */}
        {index === 0 && (selectedIds.length > 1) && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-emerald-500/20 flex items-center gap-2 animate-in zoom-in duration-300">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Batch Selection Active ({selectedIds.length} parts)
          </div>
        )}

        <SceneErrorBoundary key={viewId}>
          <ViewportContent
            viewId={viewId}
            config={config}
            components={components}
            selectedIds={selectedIds}
            onSelectComponent={onSelectComponent}
            onBatchSelect={onBatchSelect}
            onUpdateComponent={onUpdateComponent}
            onUpdateMultiple={onUpdateMultiple}
            placingType={placingType}
            onPlaceComponent={onPlaceComponent}
            transformMode={transformMode}
            darkMode={darkMode}
            isCapture={false}
            setResetHandler={(handler) => { resetHandlers.current[viewId] = handler; }}
            placingTemplate={placingTemplate}
            isLocked={isLocked}
            suppressLabels={suppressLabels}
          />
        </SceneErrorBoundary>
        <div className="absolute inset-0 bg-blue-500/0 group-hover/viewport:bg-blue-500/[0.02] transition-colors pointer-events-none" />
      </div>
    );
  };

  return (
    <div id="multi-view-container" className={`w-full h-full transition-colors duration-300 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
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

      {/* Hidden container for PDF capture of all technical views at high resolution */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: -100,
          opacity: 0.01,
          pointerEvents: 'none',
          width: '1600px',
          height: '1200px',
          overflow: 'hidden'
        }}
        data-html2canvas-ignore="true"
      >
        {Object.keys(VIEW_CONFIGS).map(viewId => (
          <div key={`capture-${viewId}`} id={`capture-canvas-${viewId}`} style={{ width: '1600px', height: '1200px', backgroundColor: 'white' }}>
            <SceneErrorBoundary key={`capture-err-${viewId}`}>
              <ViewportContent
                viewId={viewId}
                config={VIEW_CONFIGS[viewId]}
                components={components}
                selectedIds={selectedIds}
                onSelectComponent={() => { }}
                onUpdateComponent={() => { }}
                onUpdateMultiple={() => { }}
                placingType={null}
                onPlaceComponent={() => { }}
                transformMode={transformMode}
                darkMode={false} // Blueprints are always light themed
                isCapture={true}
                setResetHandler={(handler) => { resetHandlers.current[viewId] = handler; }}
                isLocked={false} // Hidden capture views are never locked
              />
            </SceneErrorBoundary>
          </div>
        ))}
      </div>
    </div>
  );
});

// ---------------------------------------------------------
// COMPONENT: ViewportContent (Extracted for reuse)
// ---------------------------------------------------------
const ViewportContent = ({
  viewId,
  config,
  components,
  selectedIds,
  onSelectComponent,
  onBatchSelect,
  onUpdateComponent,
  onUpdateMultiple,
  placingType,
  onPlaceComponent,
  transformMode,
  darkMode,
  isCapture = false,
  setResetHandler,
  placingTemplate,
  isLocked,
  suppressLabels = false,
}) => {
  const isDragging = useRef(false);
  const isTransforming = useRef(false);

  const getTagInternal = (comp) => {
    const type = comp.component_type || 'straight';
    const sameTypeComps = components.filter(c => c.component_type === type);
    const index = sameTypeComps.findIndex(c => c.id === comp.id);
    return getComponentTag(type, index);
  };

  return (
    <Canvas
      gl={{ antialias: true, preserveDrawingBuffer: true, alpha: true }}
      shadows
      onPointerMissed={(e) => {
        // Only clear if it was a clean click (not a drag) and not transforming
        if (e.button === 0 && !isDragging.current && !isTransforming.current) {
          onSelectComponent(null);
        }
      }}
    >
      {config.camera === 'ortho' ? (
        <OrthographicCamera makeDefault position={config.defaultPos} zoom={config.defaultZoom} up={config.defaultUp || [0, 1, 0]} />
      ) : (
        <PerspectiveCamera makeDefault position={config.defaultPos} fov={config.defaultFov} />
      )}
      <ViewportCameraControls
        viewMode={viewId}
        setResetHandler={setResetHandler}
        selectedIds={selectedIds}
        components={components}
        isLocked={isLocked}
      />
      {!isCapture && (
        <GizmoHelper alignment="bottom-left" margin={[80, 80]}>
          <GizmoViewport labelColor="white" axisColors={['#f43f5e', '#10b981', '#3b82f6']} />
        </GizmoHelper>
      )}
      <SharedSceneElements
        components={components.map(c => ({ ...c, _tag: getTagInternal(c) }))}
        selectedIds={selectedIds}
        onSelectComponent={(id, e) => {
          // Guard: stop selection if we just finished transforming or are dragging
          if (!isTransforming.current && !isDragging.current) {
            onSelectComponent(id, e);
          }
        }}
        onBatchSelect={onBatchSelect}
        onUpdateComponent={onUpdateComponent}
        onUpdateMultiple={onUpdateMultiple}
        placingType={placingType}
        onPlaceComponent={onPlaceComponent}
        transformMode={transformMode}
        viewMode={viewId}
        darkMode={darkMode}
        isCapture={isCapture}
        placingTemplate={placingTemplate}
        isDragging={isDragging}
        isTransforming={isTransforming}
        suppressLabels={suppressLabels}
      />
    </Canvas>
  );
};

export default Scene3D;
