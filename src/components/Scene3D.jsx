import { useState } from 'react';
import { useThree, useFrame, Canvas } from '@react-three/fiber';
import { CameraControls, Grid, TransformControls } from '@react-three/drei';
import PipeComponent from './PipeComponent';
import { findSnapPoint } from '../utils/snapping';
import * as THREE from 'three';

const PlacementGhost = ({
  placingType,
  components,
  onPlace,
}) => {
  const { raycaster, pointer, camera } = useThree();
  const [snap, setSnap] = useState(null);

  useFrame(() => {
    raycaster.setFromCamera(pointer, camera);
    const result = findSnapPoint(raycaster, components, placingType);
    setSnap(result);
  });

  const handleClick = (e) => {
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
      <PipeComponent
        component={ghostComponent}
        isSelected={false}
        onSelect={() => handleClick({ stopPropagation: () => { } })}
        onUpdate={() => { }}
      />
      <mesh position={snap.position} onClick={handleClick}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color={snap.isValid ? '#4caf50' : '#f44336'} transparent opacity={0.7} />
      </mesh>
    </group>
  );
};

const EditorControls = ({
  selectedId,
  components,
  onUpdateComponent
}) => {
  const { scene } = useThree();
  const selectedObject = selectedId ? scene.getObjectByName(selectedId) : undefined;

  if (!selectedId || !selectedObject) return null;

  return (
    <TransformControls
      object={selectedObject}
      mode="translate"
      size={0.4}
      onMouseUp={(e) => {
        const object = e.target.object;
        if (object) {
          const component = components.find(c => c.id === selectedId);
          if (component) {
            onUpdateComponent({
              ...component,
              position_x: object.position.x,
              position_y: object.position.y,
              position_z: object.position.z,
            });
          }
        }
      }}
    />
  );
};

export default function Scene3D({
  components,
  selectedId,
  onSelectComponent,
  placingType,
  onPlaceComponent,
  onCancelPlacement,
  onUpdateComponent,
}) {
  return (
    <Canvas
      gl={{ preserveDrawingBuffer: true }}
      camera={{ position: [10, 10, 10], fov: 50 }}
      style={{ background: '#1a1a2e', cursor: placingType ? 'crosshair' : 'default' }}
      onPointerMissed={(e) => {
        if (e.type === 'click' && placingType) {
          // Optional: handle click on empty space
        } else if (e.type === 'click') {
          onSelectComponent(null);
        } else if (e.type === 'contextmenu') {
          onCancelPlacement();
        }
      }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        onClick={(e) => {
          if (!placingType) {
            onSelectComponent(null);
          }
        }}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <Grid
        args={[50, 50]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#3a3a5a"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#4a4a7a"
        fadeDistance={100}
        fadeStrength={1}
        position={[0, -0.01, 0]}
      />

      {components.map((component) => (
        <PipeComponent
          key={component.id}
          component={component}
          isSelected={component.id === selectedId}
          onSelect={() => !placingType && onSelectComponent(component.id)}
          onUpdate={onUpdateComponent}
        />
      ))}

      {placingType && (
        <PlacementGhost
          placingType={placingType}
          components={components}
          onPlace={onPlaceComponent}
        />
      )}

      <EditorControls
        selectedId={selectedId}
        components={components}
        onUpdateComponent={onUpdateComponent}
      />

      <CameraControls
        makeDefault
        minDistance={0.1}
        maxDistance={2000}
        dollyToCursor={true}
      />
    </Canvas>
  );
}
