import { useRef, useState, memo, useMemo } from 'react';
import { Billboard, Text, Edges, Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { MATERIALS, COMPONENT_DEFINITIONS } from '../config/componentDefinitions';

const SOLID_COLORS = {
  cylinder: '#6366f1',
  cube: '#8b5cf6',
  cone: '#d946ef'
};

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
  connectionMode = false,
  selectedSockets = [],
  onSocketClick,
}) {
  const meshRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const isBlueprint = isCapture;
  const is2D = viewMode !== 'iso';
  const radiusScale = component.properties?.radiusScale ?? 1;
  const length = component.properties?.length ?? 2;
  const od = component.properties?.od ?? (0.30 * radiusScale);
  const wt = component.properties?.wallThickness ?? 0.02;
  const idValue = component.properties?.id ?? (od - 2 * wt);
  const radius = od / 2;
  const radiusOuter = od / 2;
  const radiusInner = Math.max(0, (od - 2 * wt) / 2);

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
  const matConfig = MATERIALS[materialKey] || MATERIALS.pvc;

  // --- MATERIAL CREATION ---
  const getMaterial = (type, isSelected) => {
    if (isBlueprint) {
      return (
        <>
          <meshBasicMaterial color="#ffffff" transparent={false} opacity={1} depthWrite={true} />
          <Outlines thickness={0.012} color="#0891b2" />
          <Edges threshold={25} color="#0891b2" lineWidth={0.6} />
        </>
      );
    }

    if (isGhost) {
      let ghostColor = '#3b82f6';
      if (component._isIntersecting) ghostColor = '#f43f5e';
      else if (component._isValid) ghostColor = '#10b981';
      else if (component._isValid === false) ghostColor = '#f43f5e';

      return (
        <meshStandardMaterial
          color={ghostColor}
          transparent
          opacity={0.6}
          emissive={ghostColor}
          emissiveIntensity={0.5}
        />
      );
    }

    let baseColor = matConfig.color;
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
    let metalness = isPlastic ? 0.05 : (isSpecialMetal ? 1.0 : 0.8);
    let roughness = isPlastic ? 0.4 : (isSpecialMetal ? 0.05 : 0.2);

    return (
      <meshStandardMaterial
        color={isSelected ? '#1d4ed8' : baseColor}
        metalness={isSelected ? 0.4 : metalness}
        roughness={isSelected ? 0.2 : roughness}
        emissive={isSelected ? '#1d4ed8' : '#000000'}
        emissiveIntensity={isSelected ? 0.2 : 0}
        envMapIntensity={isCapture ? 0 : (isPlastic ? 0.5 : 1.5)}
      />
    );
  };

  const idHash = useMemo(() => component.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0), [component.id]);

  const Hitbox = ({ type, radius, length, radiusScale }) => {
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
    if (type === 'industrial-tank') {
      return (
        <mesh>
          <cylinderGeometry args={[hitboxRadius * 1.2, hitboxRadius * 1.2, hitboxLength * 1.5, 8]} />
          <meshBasicMaterial color="red" transparent opacity={0} />
        </mesh>
      );
    }
    if (type === 'wall') {
      return (
        <mesh>
          <boxGeometry args={[od * 1.02, length * 1.02, wt * 1.5]} />
          <meshBasicMaterial color="red" transparent opacity={0} />
        </mesh>
      );
    }
    return null;
  };

  const isSquare = component.properties?.profile === 'square';
  // For square pipes: side = od, inner side = od - 2*wt
  const sqOuter = od;
  const sqInner = Math.max(0.01, od - 2 * wt);

  const renderGeometry = () => {
    const type = component.component_type || 'straight';
    const highlightColor = isHovered ? '#60a5fa' : (isSelected ? '#1d4ed8' : '#e2e8f0');
    const material = getMaterial(type, isSelected);

    // ---- SQUARE PROFILE GEOMETRY (Hollow 4-Wall SHS) ----
    // Helper: renders a square hollow section arm along Y axis with the given length
    const SqArm = ({ len, sx = sqOuter, mat = material }) => {
      const hw = sx / 2;  // half outer width
      const hiw = Math.max(0.005, sx - 2 * wt) / 2; // half inner width
      const wallT = wt;
      const edgeR = Math.max(0.004, sx * 0.06); // end ring bar thickness
      const endMat = <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />;
      // Positions for the 4 corner edge bars of the end frame
      const endBars = [
        { pos: [0, 0, hw], size: [sx + edgeR * 2, edgeR, edgeR] },
        { pos: [0, 0, -hw], size: [sx + edgeR * 2, edgeR, edgeR] },
        { pos: [hw, 0, 0], size: [edgeR, edgeR, sx - edgeR * 2] },
        { pos: [-hw, 0, 0], size: [edgeR, edgeR, sx - edgeR * 2] },
      ];
      return (
        <group>
          {/* Front wall (Z+) */}
          <mesh position={[0, 0, hw - wallT / 2]}>
            <boxGeometry args={[sx, len, wallT]} />
            {mat}
          </mesh>
          {/* Back wall (Z-) */}
          <mesh position={[0, 0, -(hw - wallT / 2)]}>
            <boxGeometry args={[sx, len, wallT]} />
            {mat}
          </mesh>
          {/* Left wall (X-) */}
          <mesh position={[-(hw - wallT / 2), 0, 0]}>
            <boxGeometry args={[wallT, len, sx - 2 * wallT]} />
            {mat}
          </mesh>
          {/* Right wall (X+) */}
          <mesh position={[hw - wallT / 2, 0, 0]}>
            <boxGeometry args={[wallT, len, sx - 2 * wallT]} />
            {mat}
          </mesh>
          {/* Dark inner bore visible from ends */}
          {!isGhost && !isBlueprint && (
            <mesh>
              <boxGeometry args={[hiw * 2, len + 0.01, hiw * 2]} />
              <meshStandardMaterial color="#111" side={THREE.BackSide} />
            </mesh>
          )}
        </group>
      );
    };

    if (isSquare && (type === 'straight' || type === 'vertical')) {
      return (
        <group position={[0, length / 2, 0]}>
          <Hitbox type={type} radius={radiusOuter} length={length} />
          <SqArm len={length} />
        </group>
      );
    }

    if (isSquare && type === 'elbow') {
      const arm = 1 * radiusScale;
      return (
        <group>
          <Hitbox type={type} radius={radiusOuter} radiusScale={radiusScale} />
          {/* Vertical arm */}
          <group position={[0, arm / 2, 0]}>
            <SqArm len={arm} />
          </group>
          {/* Horizontal arm (rotated 90° so it goes along X) */}
          <group position={[arm / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <SqArm len={arm} />
          </group>
          {/* Corner fill block */}
          <mesh>
            <boxGeometry args={[sqOuter, sqOuter, sqOuter]} />
            {material}
          </mesh>
          {!isGhost && !isBlueprint && (
            <mesh>
              <boxGeometry args={[sqInner, sqOuter + 0.01, sqInner]} />
              <meshStandardMaterial color="#111" side={THREE.BackSide} />
            </mesh>
          )}
        </group>
      );
    }

    if (isSquare && type === 't-joint') {
      const mainLen = 1.5 * radiusScale;
      const branchLen = 0.75 * radiusScale;
      return (
        <group>
          <Hitbox type={type} radius={radiusOuter} radiusScale={radiusScale} />
          {/* Main vertical arm */}
          <SqArm len={mainLen} />
          {/* Branch arm (along X) */}
          <group position={[branchLen / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <SqArm len={branchLen} />
          </group>
        </group>
      );
    }

    if (isSquare && type === 'cross') {
      const arm = 2 * radiusScale;
      return (
        <group>
          <Hitbox type={type} radius={radiusOuter} radiusScale={radiusScale} />
          {/* Vertical arms */}
          <SqArm len={arm} />
          {/* Horizontal arms (along X) */}
          <group rotation={[0, 0, Math.PI / 2]}>
            <SqArm len={arm} />
          </group>
        </group>
      );
    }

    if (isSquare && type === 'coupling') {
      const coupLen = 0.5 * radiusScale;
      const coupOuter = sqOuter * 1.2;
      return (
        <group>
          {/* Outer collar */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[coupOuter, coupLen, coupOuter]} />
            {material}
          </mesh>
          {/* Inner hollow bore */}
          <SqArm len={coupLen} />
        </group>
      );
    }

    if (isSquare && type === 'reducer') {
      const h = 0.8 * radiusScale;
      const topS = sqOuter * 0.7;
      return (
        <group>
          {/* Top (smaller) arm */}
          <group position={[0, h * 0.25, 0]}>
            <SqArm len={h * 0.5} sx={topS} />
          </group>
          {/* Bottom (larger) arm */}
          <group position={[0, -h * 0.25, 0]}>
            <SqArm len={h * 0.5} />
          </group>
        </group>
      );
    }



    switch (type) {
      case 'straight':
      case 'vertical':
        return (
          <group position={[0, length / 2, 0]}>
            <Hitbox type={type} radius={radiusOuter} length={length} />
            {/* Center Axis - Clean length to avoid grid intersection */}
            {!isBlueprint && !isGhost && (
              <mesh>
                <cylinderGeometry args={[0.012, 0.012, length, 8]} />
                <meshBasicMaterial color={highlightColor} transparent opacity={isSelected ? 0.8 : 0.4} />
              </mesh>
            )}
            {/* Main Pipe Body - Open Ended for Hollow Look */}
            <mesh>
              <cylinderGeometry args={[radiusOuter, radiusOuter, length, 32, 1, true]} />
              {material}
              {!isGhost && !isBlueprint && (
                <Edges
                  threshold={15}
                  color="#cbd5e1"
                  opacity={0.3}
                  transparent
                />
              )}
            </mesh>
            {/* Visual Center Point */}
            {!isGhost && !isBlueprint && (
              <mesh>
                <sphereGeometry args={[radiusOuter * 0.15, 16, 16]} />
                <meshBasicMaterial color="#60a5fa" transparent opacity={0.4} depthTest={false} />
              </mesh>
            )}
            {/* Hollow Interior + Ring Caps */}
            {!isGhost && !isBlueprint && (
              <>
                <mesh>
                  <cylinderGeometry args={[radiusInner, radiusInner, length, 32, 1, true]} />
                  <meshStandardMaterial color="#222" side={THREE.BackSide} />
                </mesh>
                {/* Cap 1 (Socket 0) */}
                {!(component.connections || []).some(c => c.localSocketIdx === 0) && (
                  <mesh position={[0, length / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                    {material}
                  </mesh>
                )}
                {/* Cap 2 (Socket 1) */}
                {!(component.connections || []).some(c => c.localSocketIdx === 1) && (
                  <mesh position={[0, -length / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                    {material}
                  </mesh>
                )}
              </>
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
            <mesh>
              <sphereGeometry args={[radiusOuter, 32, 16]} />
              {material}
            </mesh>
            {!isGhost && !isBlueprint && (
              <>
                <mesh position={[0, 0.5 * radiusScale, 0]}>
                  <cylinderGeometry args={[radiusInner, radiusInner, 1 * radiusScale, 32, 1, true]} />
                  <meshStandardMaterial color="#222" side={THREE.BackSide} />
                </mesh>
                <mesh position={[0.5 * radiusScale, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[radiusInner, radiusInner, 1 * radiusScale, 32, 1, true]} />
                  <meshStandardMaterial color="#222" side={THREE.BackSide} />
                </mesh>
                {/* Cap 1 (Socket 1 - vertical) */}
                {!(component.connections || []).some(c => c.localSocketIdx === 1) && (
                  <mesh position={[0, 1 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                    {material}
                  </mesh>
                )}
                {/* Cap 2 (Socket 0 - horizontal) */}
                {!(component.connections || []).some(c => c.localSocketIdx === 0) && (
                  <mesh position={[1 * radiusScale, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                    {material}
                  </mesh>
                )}
              </>
            )}
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
            <mesh position={[0.247 * radiusScale, 0.247 * radiusScale, 0]} rotation={[0, 0, -Math.PI / 4]}>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 0.7 * radiusScale, 32, 1, true]} />
              {material}
            </mesh>
            <mesh>
              <sphereGeometry args={[radiusOuter, 32, 16]} />
              {material}
            </mesh>
            {!isGhost && !isBlueprint && (
              <>
                <mesh position={[0, 0.35 * radiusScale, 0]}>
                  <cylinderGeometry args={[radiusInner, radiusInner, 0.7 * radiusScale, 32, 1, true]} />
                  <meshStandardMaterial color="#222" side={THREE.BackSide} />
                </mesh>
                <mesh position={[0.247 * radiusScale, 0.247 * radiusScale, 0]} rotation={[0, 0, -Math.PI / 4]}>
                  <cylinderGeometry args={[radiusInner, radiusInner, 0.7 * radiusScale, 32, 1, true]} />
                  <meshStandardMaterial color="#222" side={THREE.BackSide} />
                </mesh>
                {/* Cap 1 (Socket 0 - vertical) */}
                {!(component.connections || []).some(c => c.localSocketIdx === 0) && (
                  <mesh position={[0, 0.7 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                    {material}
                  </mesh>
                )}
                {/* Cap 2 (Socket 1 - 45deg) */}
                {!(component.connections || []).some(c => c.localSocketIdx === 1) && (
                  <mesh position={[0.495 * radiusScale, 0.495 * radiusScale, 0]} rotation={[0, 0, -Math.PI / 4]}>
                    <group rotation={[0, Math.PI / 2, 0]}>
                      <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                      {material}
                    </group>
                  </mesh>
                )}
              </>
            )}
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
            {!isGhost && !isBlueprint && (
              <>
                <mesh>
                  <cylinderGeometry args={[radiusInner, radiusInner, 1.5 * radiusScale, 32, 1, true]} />
                  <meshStandardMaterial color="#222" side={THREE.BackSide} />
                </mesh>
                <mesh position={[0.375 * radiusScale, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[radiusInner, radiusInner, 0.75 * radiusScale, 32, 1, true]} />
                  <meshStandardMaterial color="#222" side={THREE.BackSide} />
                </mesh>
                {/* Cap 1 (Socket 0 - Top) */}
                {!(component.connections || []).some(c => c.localSocketIdx === 0) && (
                  <mesh position={[0, 0.75 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                    {material}
                  </mesh>
                )}
                {/* Cap 2 (Socket 1 - Bottom) */}
                {!(component.connections || []).some(c => c.localSocketIdx === 1) && (
                  <mesh position={[0, -0.75 * radiusScale, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                    {material}
                  </mesh>
                )}
                {/* Cap 3 (Socket 2 - Branch) */}
                {!(component.connections || []).some(c => c.localSocketIdx === 2) && (
                  <mesh position={[0.75 * radiusScale, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                    {material}
                  </mesh>
                )}
              </>
            )}
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
            {!isGhost && !isBlueprint && (
              <>
                <mesh>
                  <cylinderGeometry args={[radiusInner, radiusInner, 2 * radiusScale, 32, 1, true]} />
                  <meshStandardMaterial color="#222" side={THREE.BackSide} />
                </mesh>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[radiusInner, radiusInner, 2 * radiusScale, 32, 1, true]} />
                  <meshStandardMaterial color="#222" side={THREE.BackSide} />
                </mesh>
                {/* Cap 1 (Socket 2 - Top) */}
                {!(component.connections || []).some(c => c.localSocketIdx === 2) && (
                  <mesh position={[0, 1 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                    {material}
                  </mesh>
                )}
                {/* Cap 2 (Socket 3 - Bottom) */}
                {!(component.connections || []).some(c => c.localSocketIdx === 3) && (
                  <mesh position={[0, -1 * radiusScale, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                    {material}
                  </mesh>
                )}
                {/* Cap 3 (Socket 0 - Right) */}
                {!(component.connections || []).some(c => c.localSocketIdx === 0) && (
                  <mesh position={[1 * radiusScale, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                    {material}
                  </mesh>
                )}
                {/* Cap 4 (Socket 1 - Left) */}
                {!(component.connections || []).some(c => c.localSocketIdx === 1) && (
                  <mesh position={[-1 * radiusScale, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                    <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                    {material}
                  </mesh>
                )}
              </>
            )}
          </group>
        );
      case 'valve':
        const valveLen = 1.5 * radiusScale;
        const bodyRadius = radiusOuter * 1.4;
        const neckRadius = radiusOuter * 0.4;
        const handleLen = 2.0 * radiusScale;

        return (
          <group>
            <Hitbox type={type} radius={bodyRadius} length={valveLen} />

            {/* 1. Main Central Body (Hexagonal-ish or chunky cylinder) */}
            <mesh>
              <cylinderGeometry args={[bodyRadius, bodyRadius, 0.6 * radiusScale, 6]} />
              {material}
              {!isGhost && !isBlueprint && <Edges threshold={20} color="#cbd5e1" opacity={0.4} transparent />}
            </mesh>

            {/* 2. End Connectors (Matching Pipe OD) */}
            <mesh position={[0, 0.55 * radiusScale, 0]}>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 0.4 * radiusScale, 32, 1, true]} />
              {material}
            </mesh>
            <mesh position={[0, -0.55 * radiusScale, 0]}>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 0.4 * radiusScale, 32, 1, true]} />
              {material}
            </mesh>

            {/* 3. Handle Stem (Neck) */}
            <mesh position={[0, 0, bodyRadius * 0.8]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[neckRadius, neckRadius, 0.3 * radiusScale, 16]} />
              <meshStandardMaterial color="#78716c" metalness={0.8} roughness={0.2} />
            </mesh>

            {/* 4. Lever Handle (Realistic Blue Handle) */}
            <group position={[0, 0, bodyRadius * 0.8 + 0.15 * radiusScale]} rotation={[Math.PI / 2, 0, 0]}>
              {/* Handle Base / Nut */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[neckRadius * 1.2, neckRadius * 1.2, 0.1 * radiusScale, 6]} />
                <meshStandardMaterial color="#444" metalness={0.9} roughness={0.1} />
              </mesh>
              {/* The long Blue Lever */}
              <mesh position={[handleLen / 2 - 0.2 * radiusScale, 0, 0]}>
                <boxGeometry args={[handleLen, 0.08 * radiusScale, 0.2 * radiusScale]} />
                <meshStandardMaterial color="#2563eb" metalness={0.3} roughness={0.4} />
              </mesh>
              {/* Curved end of handle */}
              <mesh position={[handleLen - 0.2 * radiusScale, 0, 0]}>
                <sphereGeometry args={[0.1 * radiusScale, 16, 16]} scale={[1, 0.4, 1]} />
                <meshStandardMaterial color="#2563eb" />
              </mesh>
            </group>

            {/* 5. Hollow Interior Logic (Visual Holes) */}
            {!isGhost && !isBlueprint && (
              <>
                <mesh>
                  <cylinderGeometry args={[radiusInner, radiusInner, valveLen, 32, 1, true]} />
                  <meshStandardMaterial color="#222" side={THREE.BackSide} />
                </mesh>
                {/* Cap 1 (Socket 0 - Top) */}
                {!(component.connections || []).some(c => c.localSocketIdx === 0) && (
                  <mesh position={[0, 0.75 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                    {material}
                  </mesh>
                )}
                {/* Cap 2 (Socket 1 - Bottom) */}
                {!(component.connections || []).some(c => c.localSocketIdx === 1) && (
                  <mesh position={[0, -0.75 * radiusScale, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                    {material}
                  </mesh>
                )}
              </>
            )}
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
        const tankHeight = length;
        const tankRadius = 1 * radiusScale;
        return (
          <group position={[0, tankHeight / 2, 0]}>
            <mesh>
              <cylinderGeometry args={[tankRadius, tankRadius, tankHeight, 32]} />
              {material}
            </mesh>
            <mesh position={[0, tankHeight / 2 + 0.1, 0]}>
              <sphereGeometry args={[tankRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              {material}
            </mesh>
          </group>
        );
      case 'industrial-tank':
        // Dynamic scaling based on the user-defined OD and Length
        // Default values from componentDefinitions.js: defaultOD: 2.2, defaultWT: 0.08
        // Total default height (body + cone) ~ 4.0
        // +0.5m VISUAL padding — appearance only, snapping uses +0.3 independently
        const tankOD = (od || 2.2) + 0.5;
        const tankLength = length || 4.0;
        const vScale = tankLength / 4.0;
        const hScale = tankOD / 2.2;

        // Split height between body (75%) and cone (25%)
        const iTankRadius = tankOD / 2;
        const iBodyHeight = tankLength * 0.75;
        const iConeHeight = tankLength * 0.25;

        const iTankColor = "#fbbf24"; // Industrial Yellow
        const iLegColor = darkMode ? "#334155" : "#475569";

        return (
          <group position={[0, iConeHeight, 0]}>
            {/* Hitbox covering the entire height - Offset to match shifted origin */}
            <group position={[0, (tankLength / 2) - iConeHeight, 0]}>
              <Hitbox type={type} radius={iTankRadius} length={tankLength} />
            </group>

            {/* Main Body (Height relative to legs/cone) */}
            <mesh position={[0, (iBodyHeight / 2), 0]}>
              <cylinderGeometry args={[iTankRadius, iTankRadius, iBodyHeight, 32]} />
              <meshStandardMaterial color={iTankColor} metalness={0.4} roughness={0.3} />
            </mesh>

            {/* Domed Top Cap */}
            <mesh position={[0, iBodyHeight, 0]}>
              <sphereGeometry args={[iTankRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={iTankColor} metalness={0.4} roughness={0.3} />
            </mesh>


            {/* Conical Bottom */}
            <mesh position={[0, 0, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[iTankRadius, iConeHeight, 32]} />
              <meshStandardMaterial color={iTankColor} metalness={0.4} roughness={0.3} />
            </mesh>



            {/* Support Legs (Height based on cone height) */}
            {[45, 135, 225, 315].map(angle => {
              const rad = angle * Math.PI / 180;
              const legDist = iTankRadius * 0.85;
              const legHeight = iConeHeight + (iBodyHeight * 0.5);
              return (
                <mesh
                  key={angle}
                  position={[
                    Math.cos(rad) * legDist,
                    -(iBodyHeight / 2) + (iConeHeight / 2) - (legHeight / 2) + (iConeHeight),
                    Math.sin(rad) * legDist
                  ]}
                >
                  <boxGeometry args={[tankOD * 0.05, legHeight, tankOD * 0.05]} />
                  <meshStandardMaterial color={iLegColor} />
                </mesh>
              );
            })}
          </group>
        );
      case 'cap':
        return (
          <group>
            <mesh>
              <cylinderGeometry args={[radius, radius, 0.3 * radiusScale, 16]} />
              {material}
            </mesh>
            <mesh position={[0, 0.15 * radiusScale, 0]}>
              <sphereGeometry args={[radius * 1.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              {material}
            </mesh>
          </group>
        );
      case 'reducer':
        const rTop = radiusOuter * 0.7;
        const rBottom = radiusOuter;
        const h = 0.8 * radiusScale;
        const rTopInner = radiusInner * 0.7;
        const rBottomInner = radiusInner;
        return (
          <group>
            <mesh>
              <cylinderGeometry args={[rTop, rBottom, h, 32, 1, true]} />
              {material}
            </mesh>
            {!isGhost && !isBlueprint && (
              <>
                <mesh>
                  <cylinderGeometry args={[rTopInner, rBottomInner, h, 32, 1, true]} />
                  <meshStandardMaterial color="#222" side={THREE.BackSide} />
                </mesh>
                <mesh position={[0, h / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[rTopInner, rTop, 32]} />
                  {material}
                </mesh>
                <mesh position={[0, -h / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[rBottomInner, rBottom, 32]} />
                  {material}
                </mesh>
              </>
            )}
          </group>
        );
      case 'flange':
        const flangeR = radiusOuter * 1.5;
        const flangeH = 0.2 * radiusScale; // Total height matches socket positions
        return (
          <group>
            <Hitbox type={type} radius={flangeR} length={flangeH} />

            {/* Lower Large Disk (y: -0.1 to 0) scaled */}
            <mesh position={[0, -0.05 * radiusScale, 0]}>
              <cylinderGeometry args={[flangeR, flangeR, 0.1 * radiusScale, 32, 1, true]} />
              {material}
              {!isGhost && !isBlueprint && <Edges threshold={15} color="#cbd5e1" opacity={0.3} transparent />}
            </mesh>
            {/* Upper Small Neck (y: 0 to 0.1) scaled */}
            <mesh position={[0, 0.05 * radiusScale, 0]}>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 0.1 * radiusScale, 32, 1, true]} />
              {material}
              {!isGhost && !isBlueprint && <Edges threshold={15} color="#cbd5e1" opacity={0.3} transparent />}
            </mesh>

            {!isGhost && !isBlueprint && (
              <>
                {/* Internal bore surfaces (dark) */}
                <mesh position={[0, 0, 0]}>
                  <cylinderGeometry args={[radiusInner, radiusInner, 0.2 * radiusScale, 32, 1, true]} />
                  <meshStandardMaterial color="#222" side={THREE.DoubleSide} />
                </mesh>

                {/* Ring Caps for solid look - using DoubleSide to prevent 'white' see-through gaps */}
                {/* 1. Bottom face (pointing down at y=-0.1, Socket 1) */}
                {!(component.connections || []).some(c => c.localSocketIdx === 1) && (
                  <mesh position={[0, -0.1 * radiusScale, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[radiusInner, flangeR, 32]} />
                    <meshStandardMaterial
                      color={isSelected ? '#1d4ed8' : matConfig.color}
                      metalness={isSelected ? 0.4 : 0.6}
                      roughness={isSelected ? 0.2 : 0.4}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                )}
                {/* 2. Middle 'Step' face (pointing up at y=0) - ALWAYS SHOW THIS AS IT IS STRUCTURAL */}
                <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[radiusOuter, flangeR, 32]} />
                  <meshStandardMaterial
                    color={isSelected ? '#1d4ed8' : matConfig.color}
                    metalness={isSelected ? 0.4 : 0.6}
                    roughness={isSelected ? 0.2 : 0.4}
                    side={THREE.DoubleSide}
                  />
                </mesh>
                {/* 3. Top face (pointing up at y=0.1, Socket 0) */}
                {!(component.connections || []).some(c => c.localSocketIdx === 0) && (
                  <mesh position={[0, 0.1 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                    <meshStandardMaterial
                      color={isSelected ? '#1d4ed8' : matConfig.color}
                      metalness={isSelected ? 0.4 : 0.6}
                      roughness={isSelected ? 0.2 : 0.4}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                )}
              </>
            )}
          </group>
        );
      case 'union':
      case 'coupling':
        const innerLen = 0.6 * radiusScale;
        return (
          <group>
            <mesh>
              <cylinderGeometry args={[radiusOuter * 1.2, radiusOuter * 1.2, 0.5 * radiusScale, 32, 1, true]} />
              {material}
            </mesh>
            <mesh>
              <cylinderGeometry args={[radiusOuter, radiusOuter, innerLen, 32, 1, true]} />
              {material}
            </mesh>
            {!isGhost && !isBlueprint && (
              <>
                <mesh>
                  <cylinderGeometry args={[radiusInner, radiusInner, innerLen, 32, 1, true]} />
                  <meshStandardMaterial color="#222" side={THREE.BackSide} />
                </mesh>
                {/* Outer ring caps */}
                <mesh position={[0, 0.3 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[radiusOuter, radiusOuter * 1.2, 32]} />
                  {material}
                </mesh>
                <mesh position={[0, -0.3 * radiusScale, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[radiusOuter, radiusOuter * 1.2, 32]} />
                  {material}
                </mesh>
                {/* Main pipe caps */}
                {!(component.connections || []).some(c => c.localSocketIdx === 0) && (
                  <mesh position={[0, innerLen / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                    {material}
                  </mesh>
                )}
                {!(component.connections || []).some(c => c.localSocketIdx === 1) && (
                  <mesh position={[0, -innerLen / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                    {material}
                  </mesh>
                )}
              </>
            )}
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
      case 'water-tap':
        return (
          <group rotation={[Math.PI / 2, 0, 0]}>
            {/* Wall Plate (Large Conical Base) */}
            <mesh position={[0, 0, -0.35]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[radiusOuter * 2.8, radiusOuter * 1.4, 0.15, 32]} />
              {material}
            </mesh>
            {/* Main Stem */}
            <mesh position={[0, 0, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[radiusOuter * 1.1, radiusOuter * 1.2, 0.4, 32]} />
              {material}
            </mesh>
            {/* Rounded Valve Body */}
            <mesh>
              <sphereGeometry args={[radiusOuter * 1.3, 24, 16]} />
              {material}
            </mesh>
            {/* Spout Neck (Integrated) */}
            <mesh position={[0, -0.3 * radiusOuter, 0.5 * radiusOuter]} rotation={[Math.PI / 3.5, 0, 0]}>
              <cylinderGeometry args={[radiusOuter * 1.1, radiusOuter * 0.9, 0.8 * radiusOuter, 24]} />
              {material}
            </mesh>
            {/* Downward Nozzle */}
            <mesh position={[0, -0.9 * radiusOuter, 0.8 * radiusOuter]}>
              <cylinderGeometry args={[radiusOuter * 1.0, radiusOuter * 0.8, 0.7 * radiusOuter, 16]} />
              {material}
            </mesh>
            {/* Handle Stem */}
            <mesh position={[0, 0.8 * radiusOuter, 0]}>
              <cylinderGeometry args={[radiusOuter * 0.4, radiusOuter * 0.4, 0.8 * radiusOuter, 12]} />
              {material}
            </mesh>
            {/* T-Handle Crossbar */}
            <group position={[0, 1.3 * radiusOuter, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[radiusOuter * 0.25, radiusOuter * 0.25, 1.6 * radiusOuter, 12]} />
                <meshStandardMaterial color="#333" />
              </mesh>
              {/* Large Tapered Handle Ends */}
              <mesh position={[0.8 * radiusOuter, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <coneGeometry args={[radiusOuter * 0.45, 0.35, 16]} />
                <meshStandardMaterial color="#333" />
              </mesh>
              <mesh position={[-0.8 * radiusOuter, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <coneGeometry args={[radiusOuter * 0.45, 0.35, 16]} />
                <meshStandardMaterial color="#333" />
              </mesh>
            </group>
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
      case 'wall':
        // od = Width, length = Height, wt = Thickness
        return (
          <group>
            <Hitbox type={type} od={od} length={length} wt={wt} />
            <mesh>
              <boxGeometry args={[od, length, wt]} />
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

  // --- STAGGERING / LABELS REMOVED ---

  const currentDef = COMPONENT_DEFINITIONS[component.component_type || 'straight'];

  return (
    <group
      name={component.id}
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        // CONNECTION MODE PROTECTION:
        // Do not allow selection clicks to fire if we are trying to connect sockets.
        if (connectionMode) return;
        if (!isGhost) onSelect(e);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setIsHovered(true);
      }}
      onPointerOut={() => setIsHovered(false)}
    >
      <group pointerEvents={connectionMode ? 'none' : 'auto'}>
        {renderGeometry()}
      </group>

      {/* Selection Borders/Outlines */}
      {isSelected && !isBlueprint && (
        <Outlines thickness={0.015} color={darkMode ? "#fbbf24" : "#2563eb"} />
      )}

      {/* Socket Markers for Connection Mode */}
      {connectionMode && !isGhost && currentDef && (
        <group>
          {(currentDef.sockets || []).map((socket, idx) => {
            // Re-use dynamic position logic
            const sPos = socket.position.clone();
            if (component.component_type === 'straight' || component.component_type === 'vertical') {
              sPos.y = (length / 2) * (socket.position.y > 0 ? 1 : -1);
            } else {
              sPos.multiplyScalar(radiusScale);
            }
            const isThisSelected = selectedSockets.some(s => s.componentId === component.id && s.socketIndex === idx);

            // Offset marker slightly outward along socket direction
            // so it protrudes past the component surface and is visible
            // with depthTest=true (won't bleed through other objects)
            const outsetDist = isThisSelected ? 0.26 : 0.20;
            sPos.addScaledVector(socket.direction, outsetDist);

            // Visibility strategy:
            // - Hovered or selected component: large bright marker, always on top (depthTest=false)
            // - Other components: tiny faint marker, properly occluded by geometry (depthTest=true)
            const isActiveComponent = isHovered || selectedSockets.some(s => s.componentId === component.id);
            const markerRadius = isThisSelected ? 0.26 : isActiveComponent ? 0.17 : 0.08;
            const markerOpacity = isThisSelected ? 1.0 : isActiveComponent ? 0.90 : 0.15;
            const markerDepth = !isActiveComponent; // true=occluded for background components
            const markerOrder = isActiveComponent ? 999 : 0;
            const markerEmissive = isThisSelected ? 5 : isActiveComponent ? 2.5 : 0.5;

            return (
              <mesh
                key={idx}
                position={sPos}
                renderOrder={markerOrder}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onSocketClick(component.id, idx);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  document.body.style.cursor = 'pointer';
                  setIsHovered(true);
                }}
                onPointerOut={() => {
                  document.body.style.cursor = 'auto';
                  setIsHovered(false);
                }}
              >
                <sphereGeometry args={[markerRadius, 16, 16]} />
                <meshStandardMaterial
                  color={isThisSelected ? "#00ff88" : "#ff0055"}
                  transparent
                  opacity={markerOpacity}
                  emissive={isThisSelected ? "#00ff88" : "#ff0055"}
                  emissiveIntensity={markerEmissive}
                  depthTest={markerDepth}
                />
              </mesh>
            );
          })}
        </group>
      )}

      {/* Connection Indicator Labels */}
      {connectionMode && selectedSockets.some(s => s.componentId === component.id) && (
        <Billboard>
          <Text
            position={[0, radius + 0.5, 0]}
            fontSize={0.2}
            color="#10b981"
            outlineColor="#000"
            outlineWidth={0.02}
          >
            SELECTED
          </Text>
        </Billboard>
      )}

      {/* Labels removed per user request */}
    </group>
  );
}

const MemorizedPipeComponent = memo(PipeComponent);
export default MemorizedPipeComponent;
