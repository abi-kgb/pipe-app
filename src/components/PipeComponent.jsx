import { useRef, useState, memo } from 'react';
import { Html, Text, Edges } from '@react-three/drei';
import * as THREE from 'three';
import BoundingBoxGizmo from './BoundingBoxGizmo';
import { MATERIALS } from '../config/componentDefinitions';

function PipeComponent({
  component,
  isSelected,
  onSelect,
  onUpdate,
  isGhost = false,
  viewMode = 'top',
  tag = '',
  darkMode = false,
  isCapture = false,
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

  const materialKey = component.properties?.material || 'pvc';
  const material = MATERIALS[materialKey] || MATERIALS.pvc;

  const SOLID_COLORS = {
    cylinder: '#6366f1',
    cube: '#8b5cf6',
    cone: '#d946ef'
  };

  const getMaterial = (type, isSelected) => {
    if (isCapture) {
      return (
        <>
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.1}
            roughness={1}
            metalness={0}
          />
          <Edges
            threshold={15}
            color="#00ced1" // Catchy Teal/Cyan
            lineWidth={2}
          />
        </>
      );
    }

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

    // Determine base color
    let baseColor = material.color;
    if (SOLID_COLORS[type] && materialKey === 'steel') {
      baseColor = SOLID_COLORS[type];
    }

    if (is2D) {
      const strokeColor = isSelected ? '#1d4ed8' : '#2563eb';
      const fillColor = isSelected ? '#dbeafe' : baseColor;
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

    const isPlastic = ['pvc', 'cpvc', 'upvc', 'hdpe'].includes(materialKey);
    const isSpecialMetal = ['copper', 'brass', 'ss316'].includes(materialKey);
    let metalness = isPlastic ? 0 : (isSpecialMetal ? 0.9 : 0.6);
    let roughness = isPlastic ? 0.8 : (isSpecialMetal ? 0.1 : 0.3);

    return (
      <meshStandardMaterial
        color={isSelected ? '#1d4ed8' : baseColor}
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

    // Smarter stagger for Blueprint (Capture) mode to prevent overlapping
    const captureStaggerX = ((idHash % 7) - 3) * 0.8;
    const captureStaggerY = ((idHash % 4) + 1.2);

    const finalStaggerX = isCapture ? captureStaggerX : staggerX;
    const finalStaggerY = isCapture ? captureStaggerY : (radiusOuter + 0.45);

    return (
      <group rotation={invRotation} position={[0, 0, 0.1]}>
        {/* Selection Handle Dot - Appears on hover to make clicking easier */}
        {isHovered && !isCapture && (
          <mesh onClick={(e) => { e.stopPropagation(); onSelect(e); }}>
            <sphereGeometry args={[radiusOuter * 1.5, 16, 16]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.4} />
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[radiusOuter * 0.4, 16, 16]} />
              <meshBasicMaterial color="#3b82f6" />
            </mesh>
          </mesh>
        )}

        {/* Label and Tag Container */}
        <group position={[finalStaggerX, finalStaggerY, 0.2]}>
          {/* Tag Bubble Background */}
          <mesh position={[0, 0, -0.05]}>
            <circleGeometry args={[isCapture ? 0.35 : 0.25, 32]} />
            <meshBasicMaterial color="white" />
          </mesh>
          <mesh position={[0, 0, -0.06]}>
            <circleGeometry args={[isCapture ? 0.38 : 0.28, 32]} />
            <meshBasicMaterial color={isCapture ? "#008b8b" : "#1d4ed8"} />
          </mesh>

          <Text
            fontSize={isCapture ? 0.35 : 0.25}
            color={isCapture ? "#ffffff" : "#1d4ed8"} // White text on dark teal bubble for blueprint
            font="https://fonts.gstatic.com/s/roboto/v20/KFOmCnqEu92Fr1Mu4mxP.ttf"
            anchorX="center"
            anchorY="middle"
            fontWeight="900"
          >
            {tag}
          </Text>

          {/* Leader Line to Pipe (Professional Offset Line) */}
          <mesh
            position={[-finalStaggerX / 2, -finalStaggerY / 2, -0.1]}
            rotation={[0, 0, Math.atan2(-finalStaggerY, -finalStaggerX) + Math.PI / 2]}
          >
            <boxGeometry args={[0.02, Math.sqrt(finalStaggerX * finalStaggerX + finalStaggerY * finalStaggerY) - 0.4, 0.01]} />
            <meshBasicMaterial color={isCapture ? "#008b8b" : "white"} transparent opacity={isCapture ? 1 : 0.6} />
          </mesh>

          {/* Leader Dot at component center */}
          <mesh position={[-finalStaggerX, -finalStaggerY, -0.1]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color={isCapture ? "#008b8b" : "white"} />
          </mesh>
        </group>

        {/* Detailed Info - Visible on hover only (NOT in capture/blueprint) */}
        {isHovered && !isCapture && !isGhost && (
          <group position={[0, -(radiusOuter + 0.8), 0.1]}>
            {/* Length & Elevation Label */}
            <Text
              position={[0, 0, 0]}
              fontSize={0.2}
              color={darkMode ? '#cbd5e1' : '#1e293b'}
              font="https://fonts.gstatic.com/s/roboto/v20/KFOmCnqEu92Fr1Mu4mxP.ttf"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.02}
              outlineColor={darkMode ? '#0f172a' : '#ffffff'}
            >
              {`L: ${length.toFixed(2)}m | EL +${elevation.toFixed(2)}`}
            </Text>

            {/* OD/ID/WT Measurements */}
            <Text
              position={[0, -0.25, 0]}
              fontSize={0.12}
              color={darkMode ? '#94a3b8' : '#475569'}
              font="https://fonts.gstatic.com/s/roboto/v20/KFOmCnqEu92Fr1Mu4mxP.ttf"
              anchorX="center"
              anchorY="middle"
              maxWidth={2.5}
              outlineWidth={0.01}
              outlineColor={darkMode ? '#0f172a' : '#ffffff'}
            >
              {`Ø${od.toFixed(2)} | Ø${id.toFixed(2)} | WT:${wt.toFixed(3)}m`}
            </Text>
          </group>
        )}
      </group>
    );
  };

  const Hitbox = ({ type, radius, length, radiusScale }) => {
    // A simplified, slightly larger version of the geometry for easier clicking
    const hitboxRadius = Math.max(radius * 1.5, 0.25);
    const hitboxLength = length + 0.4;

    if (type === 'straight' || type === 'vertical') {
      return (
        <mesh>
          <cylinderGeometry args={[hitboxRadius, hitboxRadius, hitboxLength, 8]} />
          <meshBasicMaterial color="red" transparent opacity={0} />
        </mesh>
      );
    }
    if (type === 'elbow' || type === 'elbow-45' || type === 't-joint' || type === 'cross') {
      return (
        <mesh>
          <sphereGeometry args={[hitboxRadius * 1.8, 8, 8]} />
          <meshBasicMaterial color="red" transparent opacity={0} />
        </mesh>
      );
    }
    return null;
  };

  const renderGeometry = () => {
    const type = component.component_type || 'straight';
    const highlightColor = isHovered ? '#60a5fa' : (isSelected ? '#1d4ed8' : '#e2e8f0');

    // Ghost color logic
    let ghostColor = '#3b82f6';
    if (isGhost) {
      if (component._isValid) ghostColor = '#10b981'; // Green for valid
      else ghostColor = '#f43f5e'; // Red for invalid
    }

    const material = isGhost ? (
      <meshStandardMaterial color={ghostColor} transparent opacity={0.6} emissive={ghostColor} emissiveIntensity={0.5} />
    ) : getMaterial(type, isSelected);

    switch (type) {
      case 'straight':
      case 'vertical':
        return (
          <group>
            <Hitbox type={type} radius={radiusOuter} length={length} />
            <mesh>
              <cylinderGeometry args={[0.012, 0.012, length + 0.4, 8]} />
              <meshBasicMaterial color={highlightColor} transparent opacity={isSelected ? 0.8 : 0.4} />
            </mesh>
            {!isCapture && (
              <mesh>
                <cylinderGeometry args={[radiusOuter, radiusOuter, length, 32, 1, true]} />
                {material}
              </mesh>
            )}
            {!isGhost && !isCapture && (
              <>
                <mesh scale={[1, 1, 1]}>
                  <cylinderGeometry args={[radiusInner, radiusInner, length, 32, 1, true]} />
                  <meshStandardMaterial color="#222" side={THREE.BackSide} />
                </mesh>
                <mesh position={[0, length / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                  {material}
                </mesh>
                <mesh position={[0, -length / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                  {material}
                </mesh>
              </>
            )}
            {isCapture && (
              <mesh>
                <cylinderGeometry args={[radiusOuter, radiusOuter, length, 32]} />
                {material}
              </mesh>
            )}
          </group>
        );
      case 'elbow':
        return (
          <group>
            <Hitbox type={type} radius={radiusOuter} radiusScale={radiusScale} />
            <mesh position={[0, 0.5 * radiusScale, 0]}>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 1 * radiusScale, 32, 1, true]} />
              {material}
            </mesh>
            <mesh position={[0.5 * radiusScale, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 1 * radiusScale, 32, 1, true]} />
              {material}
            </mesh>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[radiusOuter, 32, 16]} />
              {material}
            </mesh>
          </group>
        );
      case 't-joint':
        return (
          <group>
            <Hitbox type={type} radius={radiusOuter} radiusScale={radiusScale} />
            <mesh>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 1.5 * radiusScale, 32, 1, true]} />
              {material}
            </mesh>
            <mesh position={[0.375 * radiusScale, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 0.75 * radiusScale, 32, 1, true]} />
              {material}
            </mesh>
            <mesh>
              <sphereGeometry args={[radiusOuter, 16, 16]} />
              {material}
            </mesh>
          </group>
        );
      case 'elbow-45':
        return (
          <group>
            <Hitbox type={type} radius={radiusOuter} radiusScale={radiusScale} />
            <mesh position={[0, 0.35 * radiusScale, 0]}>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 0.7 * radiusScale, 32, 1, true]} />
              {material}
            </mesh>
            <mesh position={[0.25 * radiusScale, -0.1 * radiusScale, 0]} rotation={[0, 0, Math.PI / 4]}>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 0.7 * radiusScale, 32, 1, true]} />
              {material}
            </mesh>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[radiusOuter, 32, 16]} />
              {material}
            </mesh>
          </group>
        );
      case 'valve':
        return (
          <group>
            <Hitbox type={type} radius={radiusOuter} radiusScale={radiusScale} />
            <mesh>
              <cylinderGeometry args={[radius, radius, 1.5 * radiusScale, 16]} />
              {material}
            </mesh>
            <mesh position={[0, 0.3 * radiusScale, 0]}>
              <boxGeometry args={[0.4 * radiusScale, 0.1 * radiusScale, 0.4 * radiusScale]} />
              <meshStandardMaterial color="#333" />
            </mesh>
          </group>
        );
      case 'filter':
        return (
          <group>
            <mesh>
              <cylinderGeometry args={[radius * 2, radius * 2, 1 * radiusScale, 16]} />
              {material}
            </mesh>
            <mesh position={[0, 0.6 * radiusScale, 0]}>
              <cylinderGeometry args={[radius, radius, 0.2 * radiusScale, 16]} />
              <meshStandardMaterial color="#222" />
            </mesh>
          </group>
        );
      case 'tank':
        return (
          <group>
            <mesh>
              <cylinderGeometry args={[radiusScale, radiusScale, length, 32]} />
              {material}
            </mesh>
            <mesh position={[0, length / 2 + 0.1, 0]}>
              <sphereGeometry args={[radiusScale, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              {material}
            </mesh>
          </group>
        );
      case 'cap':
        return (
          <group>
            <mesh>
              <cylinderGeometry args={[radius, radius, 0.3 * radiusScale, 16]} />
              {material}
            </mesh>
          </group>
        );
      case 'cross':
        return (
          <group>
            <Hitbox type={type} radius={radiusOuter} radiusScale={radiusScale} />
            <mesh>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 2 * radiusScale, 32, 1, true]} />
              {material}
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 2 * radiusScale, 32, 1, true]} />
              {material}
            </mesh>
          </group>
        );
      case 'reducer':
        return (
          <group>
            <mesh>
              <cylinderGeometry args={[radiusOuter * 0.7, radiusOuter, 0.8 * radiusScale, 32]} />
              {material}
            </mesh>
          </group>
        );
      case 'flange':
        return (
          <group>
            <mesh position={[0, -0.05, 0]}>
              <cylinderGeometry args={[radiusOuter * 1.5, radiusOuter * 1.5, 0.1, 32]} />
              {material}
            </mesh>
            <mesh position={[0, 0.05, 0]}>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 0.1, 32]} />
              {material}
            </mesh>
          </group>
        );
      case 'union':
      case 'coupling':
        return (
          <group>
            <mesh>
              <cylinderGeometry args={[radiusOuter * 1.2, radiusOuter * 1.2, 0.5 * radiusScale, 32]} />
              {material}
            </mesh>
            <mesh>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 0.6 * radiusScale, 32]} />
              {material}
            </mesh>
          </group>
        );
      case 'plug':
        return (
          <group>
            <mesh position={[0, -0.05, 0]}>
              <cylinderGeometry args={[radiusOuter * 1.1, radiusOuter * 1.1, 0.1, 16]} />
              {material}
            </mesh>
            <mesh position={[0, 0.05, 0]}>
              <boxGeometry args={[radiusOuter, 0.15, radiusOuter]} />
              {material}
            </mesh>
          </group>
        );
      case 'cube':
        return (
          <group>
            <mesh>
              <boxGeometry args={[radiusOuter * 2, radiusOuter * 2, radiusOuter * 2]} />
              {material}
            </mesh>
          </group>
        );
      case 'cone':
        return (
          <group>
            <mesh>
              <coneGeometry args={[radiusOuter, radiusOuter * 2, 32]} />
              {material}
            </mesh>
          </group>
        );
      case 'cylinder':
        return (
          <group>
            <mesh>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 1, 32]} />
              {material}
            </mesh>
          </group>
        );
      default:
        return (
          <group>
            <mesh>
              <cylinderGeometry args={[radiusOuter, radiusOuter, length || 1, 16]} />
              {material}
            </mesh>
          </group>
        );
    }
  };

  const isComplex = true; // Use group-based rendering for all for consistency

  const Label = () => {
    if (!isHovered || isGhost) return null;
    return (
      <Html distanceFactor={10} position={[0, radius + 0.3, 0]}>
        <div className="smart-label pointer-events-none">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-blue-700 leading-none mb-1">System Part</span>
            <span className="text-xs font-bold text-slate-800">{labelText}</span>
          </div>
        </div>
      </Html>
    );
  };

  return (
    <group
      name={component.id}
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        if (!isGhost) onSelect(e);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setIsHovered(true);
      }}
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

const MemorizedPipeComponent = memo(PipeComponent);
export default MemorizedPipeComponent;
