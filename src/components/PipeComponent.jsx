import { useRef, useState, memo, useMemo } from 'react';
import { Html, Text, Edges, Billboard, Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { MATERIALS } from '../config/componentDefinitions';

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
  blueprintMode = false,
  performanceMode = false,
}) {
  const meshRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const isBlueprint = isCapture || blueprintMode;
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
      if (component._isValid) ghostColor = '#10b981';
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
        envMapIntensity={(isCapture || performanceMode) ? 0 : (isPlastic ? 0.5 : 1.5)}
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
          {/* ── End-Cap Accent Frames ── clearly show where each pipe starts/ends */}
          {!isGhost && !isBlueprint && endBars.map((bar, i) => (
            <group key={i}>
              <mesh position={[bar.pos[0], len / 2, bar.pos[2]]}>
                <boxGeometry args={bar.size} />
                {endMat}
              </mesh>
              <mesh position={[bar.pos[0], -len / 2, bar.pos[2]]}>
                <boxGeometry args={bar.size} />
                {endMat}
              </mesh>
            </group>
          ))}
        </group>
      );
    };

    if (isSquare && (type === 'straight' || type === 'vertical')) {
      return (
        <group>
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
          <group>
            <Hitbox type={type} radius={radiusOuter} length={length} />
            {/* Center Axis - Clean length to avoid grid intersection */}
            {!isBlueprint && !performanceMode && !isGhost && (
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
            {!isGhost && !isBlueprint && !performanceMode && (
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
                <mesh position={[0, length / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                  {material}
                </mesh>
                <mesh position={[0, -length / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                  {material}
                </mesh>
                {/* ── End-Cap Accent Rings ── clearly show where each pipe starts/ends */}
                <mesh position={[0, length / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[radiusOuter, Math.max(0.004, radiusOuter * 0.05), 8, 32]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
                </mesh>
                <mesh position={[0, -length / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[radiusOuter, Math.max(0.004, radiusOuter * 0.05), 8, 32]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
                </mesh>
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
                <mesh position={[0, 1 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                  {material}
                </mesh>
                <mesh position={[1 * radiusScale, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                  <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                  {material}
                </mesh>
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
                <mesh position={[0, 0.7 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                  {material}
                </mesh>
                <mesh position={[0.495 * radiusScale, 0.495 * radiusScale, 0]} rotation={[0, 0, -Math.PI / 4]}>
                  <group rotation={[0, Math.PI / 2, 0]}>
                    <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                    {material}
                  </group>
                </mesh>
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
                <mesh position={[0, 0.75 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                  {material}
                </mesh>
                <mesh position={[0, -0.75 * radiusScale, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                  {material}
                </mesh>
                <mesh position={[0.75 * radiusScale, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                  <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                  {material}
                </mesh>
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
                <mesh position={[0, 1 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                  {material}
                </mesh>
                <mesh position={[0, -1 * radiusScale, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                  {material}
                </mesh>
                <mesh position={[1 * radiusScale, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                  <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                  {material}
                </mesh>
                <mesh position={[-1 * radiusScale, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                  <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                  {material}
                </mesh>
              </>
            )}
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
          <group>
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
        return (
          <group>
            <mesh position={[0, -0.05, 0]}>
              <cylinderGeometry args={[radiusOuter * 1.5, radiusOuter * 1.5, 0.1, 32, 1, true]} />
              {material}
            </mesh>
            <mesh position={[0, 0.05, 0]}>
              <cylinderGeometry args={[radiusOuter, radiusOuter, 0.1, 32, 1, true]} />
              {material}
            </mesh>
            {!isGhost && !isBlueprint && (
              <>
                {/* Inner surfaces */}
                <mesh position={[0, -0.05, 0]}>
                  <cylinderGeometry args={[radiusInner, radiusInner, 0.1, 32, 1, true]} />
                  <meshStandardMaterial color="#222" side={THREE.BackSide} />
                </mesh>
                <mesh position={[0, 0.05, 0]}>
                  <cylinderGeometry args={[radiusInner, radiusInner, 0.1, 32, 1, true]} />
                  <meshStandardMaterial color="#222" side={THREE.BackSide} />
                </mesh>
                {/* Ring caps */}
                <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                  {material}
                </mesh>
                <mesh position={[0, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[radiusInner, radiusOuter * 1.5, 32]} />
                  {material}
                </mesh>
                <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[radiusOuter, radiusOuter * 1.5, 32]} />
                  {material}
                </mesh>
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
                <mesh position={[0, 0.25 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[radiusOuter, radiusOuter * 1.2, 32]} />
                  {material}
                </mesh>
                <mesh position={[0, -0.25 * radiusScale, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[radiusOuter, radiusOuter * 1.2, 32]} />
                  {material}
                </mesh>
                {/* Main pipe caps */}
                <mesh position={[0, innerLen / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                  {material}
                </mesh>
                <mesh position={[0, -innerLen / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[radiusInner, radiusOuter, 32]} />
                  {material}
                </mesh>
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

  // --- STAGGERING / LABELS ---
  const staggerX = ((idHash % 5) - 2) * 0.25;
  const staggerY = ((idHash % 3) - 1) * 0.35;

  const DimensionLabels = () => {
    if (isCapture && !['iso', 'front'].includes(viewMode)) return null;
    if ((viewMode === 'iso' && !isCapture) || isGhost) return null;

    const invRotation = [
      -((component.rotation_x || 0) * Math.PI) / 180,
      -((component.rotation_y || 0) * Math.PI) / 180,
      -((component.rotation_z || 0) * Math.PI) / 180,
    ];

    // --- ULTRA-MINIMALIST "ON TOP" LAYOUT ---
    const finalStaggerX = 0;
    const finalStaggerY = radiusOuter + 0.4; // Hovering strictly above center

    const isClashing = component._isClashing;
    const labelColor = isClashing ? "#ef4444" : (isCapture ? "#1e293b" : "#1d4ed8");

    // Simplified numeric ID only
    const displayTag = tag.replace(/[^0-9]/g, '') || tag;

    return (
      <group rotation={invRotation} position={[0, 0, 0.1]}>
        <group position={[0, radiusOuter + 0.4, 0.5]}>
          <Billboard follow={true}>
            <Text
              fontSize={isCapture ? 0.4 : 0.28}
              color={labelColor}
              font="https://fonts.gstatic.com/s/roboto/v20/KFOmCnqEu92Fr1Mu4mxP.ttf"
              anchorX="center"
              anchorY="middle"
              fontWeight="900"
            >
              {[displayTag, isClashing ? '!' : ''].join('')}
            </Text>
          </Billboard>
        </group>

        {/* Clash Highlight on Geometry */}
        {isClashing && isCapture && (
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[radiusOuter * 1.6, 16, 16]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.08} />
          </mesh>
        )}

        {isHovered && !isCapture && !isGhost && (
          <group position={[0, -(radiusOuter + 0.8), 0.1]}>
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
              {`OD:${od.toFixed(2)} | ID:${idValue.toFixed(2)} | WT:${wt.toFixed(3)}m`}
            </Text>
          </group>
        )}
      </group>
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
      {isHovered && !isGhost && !performanceMode && (
        <Html distanceFactor={10} position={[0, radius + 0.3, 0]}>
          <div className="bg-white/90 backdrop-blur px-2 py-1 rounded shadow text-[10px] font-bold text-slate-800 pointer-events-none whitespace-nowrap">
            {labelText} (L: {length.toFixed(1)}m)
          </div>
        </Html>
      )}
      <DimensionLabels />
    </group>
  );
}

const MemorizedPipeComponent = memo(PipeComponent);
export default MemorizedPipeComponent;
