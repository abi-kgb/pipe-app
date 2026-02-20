import { useRef, useState } from 'react';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import BoundingBoxGizmo from './BoundingBoxGizmo';
import { MATERIALS } from '../config/componentDefinitions';

export default function PipeComponent({
  component,
  isSelected,
  isGhost,
  onSelect,
  onUpdate,
  viewMode = 'top',
  tag = 'P-?'
}) {
  const meshRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const is2D = viewMode !== 'iso';
  const radiusScale = component.properties?.radiusScale || 1;
  const length = component.properties?.length || 2;
  const od = component.properties?.od || (0.30 * radiusScale);
  const wt = component.properties?.wallThickness || 0.02;
  const id = component.properties?.id || (od - 2 * wt);
  const radius = od / 2;

  const radiusOuter = od / 2;
  const radiusInner = Math.max(0, (od - 2 * wt) / 2);

  // Elevation calculation (Y is height in our scene)
  const elevation = component.position_y || 0;

  const labelType = component.component_type || 'straight';
  const labelText = labelType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const position = [
    component.position_x || 0,
    component.position_y || 0,
    component.position_z || 0,
  ];

  const rotation = [
    ((component.rotation_x || 0) * Math.PI) / 180,
    ((component.rotation_y || 0) * Math.PI) / 180,
    ((component.rotation_z || 0) * Math.PI) / 180,
  ];

  const materialKey = component.properties?.material || 'steel';
  const material = MATERIALS[materialKey] || MATERIALS.steel;

  const getMaterial = (type, isSelected) => {
    if (is2D && !isGhost) {
      // Schematic style
      const strokeColor = isSelected ? '#1d4ed8' : '#2563eb';
      const fillColor = isSelected ? '#dbeafe' : material.color;
      return (
        <meshStandardMaterial
          color={fillColor}
          emissive={strokeColor}
          emissiveIntensity={0.5}
          roughness={1}
          metalness={0}
        />
      );
    }

    let color = material.color;
    const isPlastic = ['pvc', 'cpvc', 'upvc', 'hdpe'].includes(materialKey);
    const isSpecialMetal = ['copper', 'brass', 'ss316'].includes(materialKey);

    let metalness = isPlastic ? 0 : (isSpecialMetal ? 0.9 : 0.6);
    let roughness = isPlastic ? 0.8 : (isSpecialMetal ? 0.1 : 0.3);

    if (isGhost) {
      return (
        <meshStandardMaterial
          color="#3b82f6"
          transparent
          opacity={0.7}
          emissive="#3b82f6"
          emissiveIntensity={0.4}
        />
      );
    }

    return (
      <meshStandardMaterial
        color={isSelected ? '#1d4ed8' : color}
        metalness={isSelected ? 0.4 : metalness}
        roughness={isSelected ? 0.2 : roughness}
        emissive={isSelected ? '#1d4ed8' : '#000000'}
        emissiveIntensity={isSelected ? 0.2 : 0}
      />
    );
  };

  // Staggering logic to prevent overlapping labels
  const idHash = component.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const staggerX = ((idHash % 5) - 2) * 0.25; // Increased lateral shift
  const staggerY = ((idHash % 3) - 1) * 0.35; // Increased vertical shift

  // Selection Handles & Dimension Labels
  const DimensionLabels = () => {
    if (viewMode === 'iso' || isGhost) return null;

    // Inverse rotation to keep labels upright in technical views
    const invRotation = [
      -((component.rotation_x || 0) * Math.PI) / 180,
      -((component.rotation_y || 0) * Math.PI) / 180,
      -((component.rotation_z || 0) * Math.PI) / 180,
    ];

    return (
      <group rotation={invRotation} position={[staggerX, staggerY, 0.1]}>
        {/* Selection Handle Dot - Appears on hover to make clicking easier */}
        {isHovered && (
          <mesh onClick={(e) => { e.stopPropagation(); onSelect(); }}>
            <sphereGeometry args={[radiusOuter * 1.5, 16, 16]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.4} />
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[radiusOuter * 0.4, 16, 16]} />
              <meshBasicMaterial color="#3b82f6" />
            </mesh>
          </mesh>
        )}

        {/* Part Tag (e.g., P-1) */}
        <group position={[-radiusOuter - 0.4, 0, 0.1]}>
          <Text
            fontSize={0.18}
            color="#1e293b"
            font="https://fonts.gstatic.com/s/roboto/v20/KFOmCnqEu92Fr1Mu4mxP.ttf"
            anchorX="right"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#ffffff"
          >
            {tag}
          </Text>
          {/* Leader Dot */}
          <mesh position={[0.1, 0, 0]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshBasicMaterial color="#3b82f6" />
          </mesh>
        </group>

        {/* Length & Elevation Label */}
        <Text
          position={[0, radiusOuter + 0.65, 0.1]}
          fontSize={0.2}
          color="#1e293b"
          font="https://fonts.gstatic.com/s/roboto/v20/KFOmCnqEu92Fr1Mu4mxP.ttf"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#ffffff"
        >
          {`L: ${length.toFixed(2)}m | EL +${elevation.toFixed(2)}`}
        </Text>

        {/* OD/ID/WT Measurements */}
        <Text
          position={[0, -(radiusOuter + 0.65), 0.1]}
          fontSize={0.12}
          color="#475569"
          font="https://fonts.gstatic.com/s/roboto/v20/KFOmCnqEu92Fr1Mu4mxP.ttf"
          anchorX="center"
          anchorY="middle"
          maxWidth={2}
          outlineWidth={0.01}
          outlineColor="#ffffff"
        >
          {`Ø${od.toFixed(2)} | Ø${id.toFixed(2)} | WT:${wt.toFixed(3)}m`}
        </Text>
      </group>
    );
  };

  const renderGeometry = () => {
    const type = component.component_type || 'straight';
    const centerlineColor = isSelected ? '#1d4ed8' : '#e2e8f0';

    switch (type) {
      case 'straight':
        return (
          <group>
            {/* Centerline (Reference Axis) */}
            <mesh>
              <cylinderGeometry args={[0.005, 0.005, length + 0.4, 8]} />
              <meshBasicMaterial color={centerlineColor} transparent opacity={0.6} />
            </mesh>

            {/* Outer Wall */}
            <mesh>
              <cylinderGeometry args={[radiusOuter, radiusOuter, length, 32, 1, true]} />
              {getMaterial('straight', isSelected)}
            </mesh>
            {/* Inner Wall */}
            <mesh scale={[1, 1, 1]}>
              <cylinderGeometry args={[radiusInner, radiusInner, length, 32, 1, true]} />
              <meshStandardMaterial color="#222" side={THREE.BackSide} />
            </mesh>
            {/* End Caps (Rings) */}
            <mesh position={[0, length / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radiusInner, radiusOuter, 32]} />
              {getMaterial('straight', isSelected)}
            </mesh>
            <mesh position={[0, -length / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radiusInner, radiusOuter, 32]} />
              {getMaterial('straight', isSelected)}
            </mesh>
            {/* Joint Symbols (Visual indicators for fitting connection) */}
            <mesh position={[0, length / 2, 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radiusOuter, radiusOuter + 0.05, 32]} />
              <meshBasicMaterial color="#94a3b8" transparent opacity={0.5} />
            </mesh>
            <mesh position={[0, -length / 2, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radiusOuter, radiusOuter + 0.05, 32]} />
              <meshBasicMaterial color="#94a3b8" transparent opacity={0.5} />
            </mesh>
          </group>
        );
      case 'elbow':
        return (
          <group>
            {/* Centerlines */}
            <mesh position={[0, 0.5 * radiusScale, 0]}>
              <cylinderGeometry args={[0.005, 0.005, 1.4 * radiusScale, 8]} />
              <meshBasicMaterial color={centerlineColor} transparent opacity={0.6} />
            </mesh>
            <mesh position={[0.5 * radiusScale, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.005, 0.005, 1.4 * radiusScale, 8]} />
              <meshBasicMaterial color={centerlineColor} transparent opacity={0.6} />
            </mesh>

            {/* Hollow Vertical Segment */}
            <mesh position={[0, 0.5 * radiusScale, 0]}>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 1 * radiusScale, 32, 1, true]} />
              {getMaterial('elbow', isSelected)}
            </mesh>
            <mesh position={[0, 0.5 * radiusScale, 0]} scale={[1, 1, 1]}>
              <cylinderGeometry args={[radiusInner, radiusInner, 1 * radiusScale, 32, 1, true]} />
              <meshStandardMaterial color="#222" side={THREE.BackSide} />
            </mesh>

            {/* Hollow Horizontal Segment */}
            <mesh position={[0.5 * radiusScale, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 1 * radiusScale, 32, 1, true]} />
              {getMaterial('elbow', isSelected)}
            </mesh>
            <mesh position={[0.5 * radiusScale, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[radiusInner, radiusInner, 1 * radiusScale, 32, 1, true]} />
              <meshStandardMaterial color="#222" side={THREE.BackSide} />
            </mesh>

            {/* Hollow Corner Sphere */}
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[radiusOuter, 32, 16]} />
              {getMaterial('elbow', isSelected)}
            </mesh>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[radiusInner, 32, 16]} />
              <meshStandardMaterial color="#222" side={THREE.BackSide} />
            </mesh>

            {/* Joint Symbols */}
            <mesh position={[0, 1 * radiusScale, 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radiusOuter, radiusOuter + 0.05, 32]} />
              <meshBasicMaterial color="#94a3b8" transparent opacity={0.5} />
            </mesh>
            <mesh position={[1 * radiusScale, 0, 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radiusOuter, radiusOuter + 0.05, 32]} />
              <meshBasicMaterial color="#94a3b8" transparent opacity={0.5} />
            </mesh>
          </group>
        );
      case 'elbow-45':
        return (
          <group>
            {/* Centerlines */}
            <mesh position={[0, 0.35 * radiusScale, 0]}>
              <cylinderGeometry args={[0.005, 0.005, 1.2 * radiusScale, 8]} />
              <meshBasicMaterial color={centerlineColor} transparent opacity={0.6} />
            </mesh>
            <mesh position={[0.25 * radiusScale, -0.1 * radiusScale, 0]} rotation={[0, 0, Math.PI / 4]}>
              <cylinderGeometry args={[0.005, 0.005, 1.2 * radiusScale, 8]} />
              <meshBasicMaterial color={centerlineColor} transparent opacity={0.6} />
            </mesh>

            {/* Hollow Vertical Segment */}
            <mesh position={[0, 0.35 * radiusScale, 0]}>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 0.7 * radiusScale, 32, 1, true]} />
              {getMaterial('elbow-45', isSelected)}
            </mesh>
            <mesh position={[0, 0.35 * radiusScale, 0]}>
              <cylinderGeometry args={[radiusInner, radiusInner, 0.7 * radiusScale, 32, 1, true]} />
              <meshStandardMaterial color="#222" side={THREE.BackSide} />
            </mesh>

            {/* Hollow Angled Segment */}
            <mesh position={[0.25 * radiusScale, -0.1 * radiusScale, 0]} rotation={[0, 0, Math.PI / 4]}>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 0.7 * radiusScale, 32, 1, true]} />
              {getMaterial('elbow-45', isSelected)}
            </mesh>
            <mesh position={[0.25 * radiusScale, -0.1 * radiusScale, 0]} rotation={[0, 0, Math.PI / 4]}>
              <cylinderGeometry args={[radiusInner, radiusInner, 0.7 * radiusScale, 32, 1, true]} />
              <meshStandardMaterial color="#222" side={THREE.BackSide} />
            </mesh>

            {/* Hollow Corner Piece */}
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[radiusOuter, 32, 16]} />
              {getMaterial('elbow-45', isSelected)}
            </mesh>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[radiusInner, 32, 16]} />
              <meshStandardMaterial color="#222" side={THREE.BackSide} />
            </mesh>

            {/* Joint Symbols */}
            <mesh position={[0, 1 * radiusScale, 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radiusOuter, radiusOuter + 0.05, 32]} />
              <meshBasicMaterial color="#94a3b8" transparent opacity={0.5} />
            </mesh>
            {/* Approximate 45 degree end position */}
            <mesh position={[0.5 * radiusScale, -0.2 * radiusScale, 0.01]} rotation={[0, 0, Math.PI / 4]}>
              <ringGeometry args={[radiusOuter, radiusOuter + 0.05, 32]} />
              <meshBasicMaterial color="#94a3b8" transparent opacity={0.5} />
            </mesh>
          </group>
        );
      case 'vertical':
        return (
          <group>
            {/* Centerline (Reference Axis) */}
            <mesh>
              <cylinderGeometry args={[0.005, 0.005, length + 0.4, 8]} />
              <meshBasicMaterial color={centerlineColor} transparent opacity={0.6} />
            </mesh>

            {/* Outer Wall */}
            <mesh>
              <cylinderGeometry args={[radiusOuter, radiusOuter, length, 32, 1, true]} />
              {getMaterial('vertical', isSelected)}
            </mesh>
            {/* Inner Wall */}
            <mesh scale={[1, 1, 1]}>
              <cylinderGeometry args={[radiusInner, radiusInner, length, 32, 1, true]} />
              <meshStandardMaterial color="#222" side={THREE.BackSide} />
            </mesh>
            {/* End Caps (Rings) */}
            <mesh position={[0, length / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radiusInner, radiusOuter, 32]} />
              {getMaterial('vertical', isSelected)}
            </mesh>
            <mesh position={[0, -length / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radiusInner, radiusOuter, 32]} />
              {getMaterial('vertical', isSelected)}
            </mesh>
          </group>
        );
      case 't-joint':
        return (
          <group>
            {/* Centerlines */}
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.005, 0.005, 1.8 * radiusScale, 8]} />
              <meshBasicMaterial color={centerlineColor} transparent opacity={0.6} />
            </mesh>
            <mesh position={[0.4 * radiusScale, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.005, 0.005, 1.2 * radiusScale, 8]} />
              <meshBasicMaterial color={centerlineColor} transparent opacity={0.6} />
            </mesh>

            {/* Main Pass-through (Vertical) */}
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 1.5 * radiusScale, 32, 1, true]} />
              {getMaterial('t-joint', isSelected)}
            </mesh>
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[radiusInner, radiusInner, 1.5 * radiusScale, 32, 1, true]} />
              <meshStandardMaterial color="#222" side={THREE.BackSide} />
            </mesh>

            {/* Side Branch (Horizontal) */}
            <mesh position={[0.375 * radiusScale, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 0.75 * radiusScale, 32, 1, true]} />
              {getMaterial('t-joint', isSelected)}
            </mesh>
            <mesh position={[0.375 * radiusScale, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[radiusInner, radiusInner, 0.75 * radiusScale, 32, 1, true]} />
              <meshStandardMaterial color="#222" side={THREE.BackSide} />
            </mesh>

            {/* Joint Symbols */}
            <mesh position={[0, 0.75 * radiusScale, 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radiusOuter, radiusOuter + 0.05, 32]} />
              <meshBasicMaterial color="#94a3b8" transparent opacity={0.5} />
            </mesh>
            <mesh position={[0, -0.75 * radiusScale, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radiusOuter, radiusOuter + 0.05, 32]} />
              <meshBasicMaterial color="#94a3b8" transparent opacity={0.5} />
            </mesh>
            <mesh position={[0.75 * radiusScale, 0, 0.01]} rotation={[0, Math.PI / 2, 0]}>
              <ringGeometry args={[radiusOuter, radiusOuter + 0.05, 32]} />
              <meshBasicMaterial color="#94a3b8" transparent opacity={0.5} />
            </mesh>
          </group>
        );
      case 'valve':
        const handleRotation = component.properties?.handleRotation || 0;
        return (
          <group>
            {/* Main Body */}
            <mesh>
              <cylinderGeometry args={[radius, radius, 1.5 * radiusScale, 16]} />
              {getMaterial('valve', isSelected)}
            </mesh>

            {/* Rotatable Handle Assembly */}
            <group rotation={[0, 0, (handleRotation * Math.PI) / 180]}>
              {/* Valve Block/Base */}
              <mesh position={[0, 0.3 * radiusScale, 0]}>
                <boxGeometry args={[0.4 * radiusScale, 0.1 * radiusScale, 0.4 * radiusScale]} />
                {is2D ? getMaterial('valve', isSelected) : <meshStandardMaterial color="#333" />}
              </mesh>
              {/* Simple Handle Lever */}
              <mesh position={[0, 0.6 * radiusScale, 0]} rotation={[0, Math.PI / 4, 0]}>
                <cylinderGeometry args={[radius * 0.33, radius * 0.33, 0.6 * radiusScale, 8]} />
                {is2D ? getMaterial('valve', isSelected) : <meshStandardMaterial color="#555" metalness={0.9} roughness={0.1} />}
              </mesh>
            </group>
          </group>
        );
      case 'filter':
        return (
          <group>
            <mesh>
              <cylinderGeometry args={[radius * 2, radius * 2, 1 * radiusScale, 16]} />
              {getMaterial('filter', isSelected)}
            </mesh>
            <mesh position={[0, 0.6 * radiusScale, 0]}>
              <cylinderGeometry args={[radius, radius, 0.2 * radiusScale, 16]} />
              {is2D ? getMaterial('filter', isSelected) : <meshStandardMaterial color="#222" />}
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
              {getMaterial('tank', isSelected)}
            </mesh>
            <mesh position={[0, tankHeight / 2 + 0.1, 0]}>
              <sphereGeometry args={[tankRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              {getMaterial('tank', isSelected)}
            </mesh>
          </group>
        );
      case 'cap':
        return (
          <group>
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[radius, radius, 0.3 * radiusScale, 16]} />
              {is2D ? getMaterial('cap', isSelected) : <meshStandardMaterial color="#757575" metalness={0.8} />}
            </mesh>
            <mesh position={[0, 0.15 * radiusScale, 0]}>
              <sphereGeometry args={[radius * 1.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              {is2D ? getMaterial('cap', isSelected) : <meshStandardMaterial color="#757575" metalness={0.8} />}
            </mesh>
          </group>
        );
      case 'reducer':
        return (
          <group>
            {/* Conical body */}
            <mesh>
              <cylinderGeometry args={[radius, radius * 0.6, 0.8 * radiusScale, 32, 1, true]} />
              {getMaterial('reducer', isSelected)}
            </mesh>
            <mesh scale={[1, 1, 1]}>
              <cylinderGeometry args={[radiusInner, radiusInner * 0.6, 0.8 * radiusScale, 32, 1, true]} />
              <meshStandardMaterial color="#222" side={THREE.BackSide} />
            </mesh>
            {/* End rings */}
            <mesh position={[0, 0.4 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radiusInner * 0.6, radius * 0.6, 32]} />
              {getMaterial('reducer', isSelected)}
            </mesh>
            <mesh position={[0, -0.4 * radiusScale, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radiusInner, radius, 32]} />
              {getMaterial('reducer', isSelected)}
            </mesh>
          </group>
        );
      case 'flange':
        return (
          <group>
            {/* Main disc */}
            <mesh>
              <cylinderGeometry args={[radius * 1.8, radius * 1.8, 0.2 * radiusScale, 32]} />
              {getMaterial('flange', isSelected)}
            </mesh>
            {/* Hub */}
            <mesh position={[0, 0.15 * radiusScale, 0]}>
              <cylinderGeometry args={[radius, radius, 0.1 * radiusScale, 32]} />
              {getMaterial('flange', isSelected)}
            </mesh>
            {/* Bolt holes (visual simplification: ring) */}
            {!is2D && (
              <mesh position={[0, 0.105 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[radius * 1.4, radius * 1.6, 32]} />
                <meshBasicMaterial color="#333" transparent opacity={0.3} />
              </mesh>
            )}
          </group>
        );
      case 'union':
        return (
          <group>
            {/* Threaded ends */}
            <mesh position={[0, 0.15 * radiusScale, 0]}>
              <cylinderGeometry args={[radius, radius, 0.3 * radiusScale, 32]} />
              {getMaterial('union', isSelected)}
            </mesh>
            <mesh position={[0, -0.15 * radiusScale, 0]}>
              <cylinderGeometry args={[radius, radius, 0.3 * radiusScale, 32]} />
              {getMaterial('union', isSelected)}
            </mesh>
            {/* Center Nut */}
            <mesh>
              <cylinderGeometry args={[radius * 1.3, radius * 1.3, 0.2 * radiusScale, 6]} />
              {is2D ? getMaterial('union', isSelected) : <meshStandardMaterial color="#475569" metalness={0.8} />}
            </mesh>
          </group>
        );
      case 'cross':
        return (
          <group>
            {/* Main Pass-through (Vertical) */}
            <mesh>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 2 * radiusScale, 32, 1, true]} />
              {getMaterial('cross', isSelected)}
            </mesh>
            <mesh scale={[1, 1, 1]}>
              <cylinderGeometry args={[radiusInner, radiusInner, 2 * radiusScale, 32, 1, true]} />
              <meshStandardMaterial color="#222" side={THREE.BackSide} />
            </mesh>
            {/* Cross Branch (Horizontal) */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 2 * radiusScale, 32, 1, true]} />
              {getMaterial('cross', isSelected)}
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[radiusInner, radiusInner, 2 * radiusScale, 32, 1, true]} />
              <meshStandardMaterial color="#222" side={THREE.BackSide} />
            </mesh>
            {/* Joint Symbols */}
            {[
              [0, 1, 0, -Math.PI / 2, 0, 0],
              [0, -1, 0, Math.PI / 2, 0, 0],
              [1, 0, 0, 0, Math.PI / 2, 0],
              [-1, 0, 0, 0, -Math.PI / 2, 0]
            ].map((p, i) => (
              <mesh key={i} position={[p[0] * radiusScale, p[1] * radiusScale, 0.01]} rotation={[p[3], p[4], p[5]]}>
                <ringGeometry args={[radiusOuter, radiusOuter + 0.05, 32]} />
                <meshBasicMaterial color="#94a3b8" transparent opacity={0.5} />
              </mesh>
            ))}
          </group>
        );
      case 'coupling':
        return (
          <group>
            {/* Main body */}
            <mesh>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 0.5 * radiusScale, 32, 1, true]} />
              {getMaterial('coupling', isSelected)}
            </mesh>
            <mesh>
              <cylinderGeometry args={[radiusInner, radiusInner, 0.5 * radiusScale, 32, 1, true]} />
              <meshStandardMaterial color="#222" side={THREE.BackSide} />
            </mesh>
            {/* Center band */}
            <mesh>
              <cylinderGeometry args={[radiusOuter + 0.02, radiusOuter + 0.02, 0.1 * radiusScale, 32]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
            <mesh position={[0, 0.25 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radiusInner, radiusOuter, 32]} />
              {getMaterial('coupling', isSelected)}
            </mesh>
            <mesh position={[0, -0.25 * radiusScale, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radiusInner, radiusOuter, 32]} />
              {getMaterial('coupling', isSelected)}
            </mesh>
          </group>
        );
      case 'plug':
        return (
          <group>
            {/* Hex head */}
            <mesh position={[0, 0.05 * radiusScale, 0]}>
              <cylinderGeometry args={[radius * 1.2, radius * 1.2, 0.1 * radiusScale, 6]} />
              {getMaterial('plug', isSelected)}
            </mesh>
            {/* Body */}
            <mesh position={[0, -0.1 * radiusScale, 0]}>
              <cylinderGeometry args={[radius, radius, 0.2 * radiusScale, 32]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
          </group>
        );
      default:
        return <cylinderGeometry args={[radius, radius, length, 16]} />;
    }
  };

  const isComplex = ['elbow', 'elbow-45', 't-joint', 'cross', 'valve', 'filter', 'tank', 'cap', 'reducer', 'flange', 'union', 'coupling', 'plug'].includes(component.component_type);

  const Label = () => {
    if (!isHovered || isGhost) return null;
    return (
      <Html distanceFactor={10} position={[0, radius + 0.3, 0]}>
        <div className="smart-label">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-blue-700 leading-none mb-1">System Part</span>
            <span className="text-xs font-bold text-slate-800">{labelText}</span>
          </div>
        </div>
      </Html>
    );
  };

  if (isComplex) {
    return (
      <group
        name={component.id}
        position={position}
        rotation={rotation}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onPointerOver={(e) => { e.stopPropagation(); setIsHovered(true); }}
        onPointerOut={() => setIsHovered(false)}
      >
        {renderGeometry()}
        <Label />
        <DimensionLabels />
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
      onPointerOver={(e) => { e.stopPropagation(); setIsHovered(true); }}
      onPointerOut={() => setIsHovered(false)}
    >
      {renderGeometry()}
      {getMaterial(component.component_type, isSelected)}
      <Label />
      <DimensionLabels />

      {isSelected && (
        <BoundingBoxGizmo
          component={component}
          onUpdate={onUpdate}
        />
      )}
    </mesh>
  );
}
