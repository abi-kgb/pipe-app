import { useRef } from 'react';
import BoundingBoxGizmo from './BoundingBoxGizmo';

export default function PipeComponent({ component, isSelected, onSelect, onUpdate }) {
  const meshRef = useRef(null);

  const length = component.properties?.length || 2;
  const radiusScale = component.properties?.radiusScale || 1;
  const radius = 0.15 * radiusScale;

  const position = [
    component.position_x,
    component.position_y,
    component.position_z,
  ];

  const rotation = [
    (component.rotation_x * Math.PI) / 180,
    (component.rotation_y * Math.PI) / 180,
    (component.rotation_z * Math.PI) / 180,
  ];

  const renderGeometry = () => {
    switch (component.component_type) {
      case 'straight':
        return (
          <cylinderGeometry args={[radius, radius, length, 16]} />
        );
      case 'elbow':
        return (
          <group>
            <mesh position={[0, 0.5 * radiusScale, 0]}>
              <cylinderGeometry args={[radius, radius, 1 * radiusScale, 16]} />
              <meshStandardMaterial color={isSelected ? '#4a9eff' : '#2196f3'} />
            </mesh>
            <mesh position={[0.5 * radiusScale, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[radius, radius, 1 * radiusScale, 16]} />
              <meshStandardMaterial color={isSelected ? '#4a9eff' : '#2196f3'} />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[radius * 1.33, 16, 16]} />
              <meshStandardMaterial color={isSelected ? '#4a9eff' : '#2196f3'} />
            </mesh>
          </group>
        );
      case 'elbow-45':
        return (
          <group>
            <mesh position={[0, 0.35 * radiusScale, 0]}>
              <cylinderGeometry args={[radius, radius, 0.7 * radiusScale, 16]} />
              <meshStandardMaterial color={isSelected ? '#4a9eff' : '#2196f3'} />
            </mesh>
            <mesh position={[0.25 * radiusScale, -0.1 * radiusScale, 0]} rotation={[0, 0, Math.PI / 4]}>
              <cylinderGeometry args={[radius, radius, 0.7 * radiusScale, 16]} />
              <meshStandardMaterial color={isSelected ? '#4a9eff' : '#2196f3'} />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[radius * 1.33, 16, 16]} />
              <meshStandardMaterial color={isSelected ? '#4a9eff' : '#2196f3'} />
            </mesh>
          </group>
        );
      case 'vertical':
        return (
          <cylinderGeometry args={[radius, radius, 3, 16]} />
        );
      case 't-joint':
        return (
          <group>
            <mesh position={[0, 0.375 * radiusScale, 0]}>
              <cylinderGeometry args={[radius, radius, 0.75 * radiusScale, 16]} />
              <meshStandardMaterial color={isSelected ? '#ffa726' : '#ff9800'} />
            </mesh>
            <mesh position={[0, -0.375 * radiusScale, 0]}>
              <cylinderGeometry args={[radius, radius, 0.75 * radiusScale, 16]} />
              <meshStandardMaterial color={isSelected ? '#ffa726' : '#ff9800'} />
            </mesh>
            <mesh position={[0.375 * radiusScale, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[radius, radius, 0.75 * radiusScale, 16]} />
              <meshStandardMaterial color={isSelected ? '#ffa726' : '#ff9800'} />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[radius * 1.46, 16, 16]} />
              <meshStandardMaterial color={isSelected ? '#ffa726' : '#ff9800'} />
            </mesh>
          </group>
        );
      case 'valve':
        return (
          <group>
            <mesh>
              <cylinderGeometry args={[radius, radius, 1.5 * radiusScale, 16]} />
              <meshStandardMaterial color={isSelected ? '#ff6b6b' : '#f44336'} />
            </mesh>
            <mesh position={[0, 0.3 * radiusScale, 0]}>
              <boxGeometry args={[0.4 * radiusScale, 0.1 * radiusScale, 0.4 * radiusScale]} />
              <meshStandardMaterial color={isSelected ? '#ff8787' : '#ff5252'} />
            </mesh>
            <mesh position={[0, 0.6 * radiusScale, 0]} rotation={[0, Math.PI / 4, 0]}>
              <cylinderGeometry args={[radius * 0.33, radius * 0.33, 0.6 * radiusScale, 8]} />
              <meshStandardMaterial color="#333" />
            </mesh>
          </group>
        );
      case 'filter':
        return (
          <group>
            <mesh>
              <cylinderGeometry args={[radius * 2, radius * 2, 1 * radiusScale, 16]} />
              <meshStandardMaterial color={isSelected ? '#66bb6a' : '#4caf50'} />
            </mesh>
            <mesh position={[0, 0.6 * radiusScale, 0]}>
              <cylinderGeometry args={[radius, radius, 0.2 * radiusScale, 16]} />
              <meshStandardMaterial color="#333" />
            </mesh>
          </group>
        );
      case 'tank':
        const tankHeight = length;
        const tankRadius = 1 * radiusScale;
        return (
          <group>
            <mesh>
              <cylinderGeometry args={[tankRadius, tankRadius, tankHeight, 32]} />
              <meshStandardMaterial color={isSelected ? '#5ac8fa' : '#03a9f4'} metalness={0.3} roughness={0.4} />
            </mesh>
            <mesh position={[0, tankHeight / 2 + 0.1, 0]}>
              <sphereGeometry args={[tankRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={isSelected ? '#5ac8fa' : '#03a9f4'} metalness={0.3} roughness={0.4} />
            </mesh>
          </group>
        );
      case 'cap':
        return (
          <group>
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[radius, radius, 0.3 * radiusScale, 16]} />
              <meshStandardMaterial color={isSelected ? '#9e9e9e' : '#757575'} />
            </mesh>
            <mesh position={[0, 0.15 * radiusScale, 0]}>
              <sphereGeometry args={[radius * 1.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={isSelected ? '#9e9e9e' : '#757575'} />
            </mesh>
          </group>
        );
      default:
        return <cylinderGeometry args={[radius, radius, length, 16]} />;
    }
  };

  if (component.component_type === 'elbow' || component.component_type === 'elbow-45' || component.component_type === 't-joint' || component.component_type === 'valve' || component.component_type === 'filter' || component.component_type === 'tank' || component.component_type === 'cap') {
    return (
      <group name={component.id} position={position} rotation={rotation} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        {renderGeometry()}
        {isSelected && (
          <BoundingBoxGizmo
            component={component}
            onUpdate={onUpdate}
          />
        )}
      </group>
    );
  }

  return (
    <mesh
      name={component.id}
      ref={meshRef}
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {renderGeometry()}
      <meshStandardMaterial
        color={isSelected ? '#4a9eff' : '#2196f3'}
        metalness={0.3}
        roughness={0.4}
      />

      {isSelected && (
        <BoundingBoxGizmo
          component={component}
          onUpdate={onUpdate}
        />
      )}
    </mesh>
  );
}
