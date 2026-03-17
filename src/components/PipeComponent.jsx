import { useRef, useState, memo, useMemo } from 'react';
import { Billboard, Text, Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { MATERIALS, COMPONENT_DEFINITIONS } from '../config/componentDefinitions.jsx';

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
  const [isHovered, setIsHovered] = useState(false);
  const WALL_THICKNESS = 0.03; // ~10% of standard 0.3OD

  const def = COMPONENT_DEFINITIONS[component.component_type || 'straight'];

  const radiusScale = component.properties?.radiusScale ?? 1;
  const length = component.properties?.length ?? 2;
  const od = component.properties?.od ?? (0.30 * radiusScale);
  const radiusOuter = od / 2;

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

  const matConfig = MATERIALS[component.properties?.material || 'pvc'] || MATERIALS.pvc;
  const type = (component.component_type || 'straight').toLowerCase();

  // LOGGING: verify which type is actually being rendered
  if (isGhost) {
    console.log(`[PipeComponent/Ghost] Rendering as type: ${type}`);
  }

  const matProps = {
    color: isSelected ? '#1d4ed8' : (isHovered ? '#60a5fa' : matConfig.color),
    transparent: isGhost,
    opacity: isGhost ? 0.6 : 1,
    side: THREE.DoubleSide, // Allow seeing the inside of hollow pipes
  };

  const HollowCylinder = ({ radius, height, position, rotation, openEnded = true }) => {
    const innerRadius = radius - WALL_THICKNESS;
    return (
      <group position={position} rotation={rotation}>
        {/* Outer Wall */}
        <mesh>
          <cylinderGeometry args={[radius, radius, height, 24, 1, openEnded]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
        {/* Inner Wall */}
        {!isGhost && (
          <mesh>
            <cylinderGeometry args={[innerRadius, innerRadius, height, 24, 1, openEnded]} />
            <meshStandardMaterial {...matProps} side={THREE.BackSide} />
          </mesh>
        )}
      </group>
    );
  };

  const HollowSphere = ({ radius }) => {
    const innerRadius = radius - WALL_THICKNESS;
    return (
      <group>
        <mesh>
          <sphereGeometry args={[radius, 24, 24]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
        {!isGhost && (
          <mesh>
            <sphereGeometry args={[innerRadius, 24, 24]} />
            <meshStandardMaterial {...matProps} side={THREE.BackSide} />
          </mesh>
        )}
      </group>
    );
  };

  const HollowTaperedCylinder = ({ radiusTop, radiusBottom, height, position, rotation }) => {
    const innerTop = radiusTop - WALL_THICKNESS;
    const innerBottom = radiusBottom - WALL_THICKNESS;
    return (
      <group position={position} rotation={rotation}>
        <mesh>
          <cylinderGeometry args={[radiusTop, radiusBottom, height, 24, 1, true]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
        {!isGhost && (
          <mesh>
            <cylinderGeometry args={[innerTop, innerBottom, height, 24, 1, true]} />
            <meshStandardMaterial {...matProps} side={THREE.BackSide} />
          </mesh>
        )}
      </group>
    );
  };

  const ConnectionRim = ({ radius, position, rotation }) => {
    return (
      <mesh position={position} rotation={rotation}>
        <ringGeometry args={[radius - WALL_THICKNESS + 0.001, radius - 0.001, 24]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
    );
  };

  const renderGeometry = () => {
    // ELBOW 90
    if (type === 'elbow') {
      return (
        <group>
          <HollowCylinder radius={radiusOuter} height={1 * radiusScale} position={[0, 0.5 * radiusScale, 0]} />
          <HollowCylinder radius={radiusOuter} height={1 * radiusScale} position={[0.5 * radiusScale, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
          <HollowSphere radius={radiusOuter} />
          {/* Rims */}
          <ConnectionRim radius={radiusOuter} position={[0, 1 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]} />
          <ConnectionRim radius={radiusOuter} position={[1 * radiusScale, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        </group>
      );
    }

    // ELBOW 45
    if (type === 'elbow-45') {
       return (
        <group>
          <HollowCylinder radius={radiusOuter} height={0.7 * radiusScale} position={[0, 0.35 * radiusScale, 0]} />
          <HollowCylinder radius={radiusOuter} height={0.7 * radiusScale} position={[0.25 * radiusScale, 0.25 * radiusScale, 0]} rotation={[0, 0, -Math.PI / 4]} />
          <HollowSphere radius={radiusOuter} />
          {/* Rims */}
          <ConnectionRim radius={radiusOuter} position={[0, 0.7 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]} />
          <ConnectionRim radius={radiusOuter} position={[0.5 * radiusScale, 0.5 * radiusScale, 0]} rotation={[0, 0, -Math.PI / 4]} />
        </group>
      );
    }
    
    // T-JOINT
    if (type === 't-joint') {
      return (
        <group>
          <HollowCylinder radius={radiusOuter} height={1.5 * radiusScale} />
          <HollowCylinder radius={radiusOuter} height={0.75 * radiusScale} position={[0.375 * radiusScale, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
          <HollowSphere radius={radiusOuter} />
          {/* Rims */}
          <ConnectionRim radius={radiusOuter} position={[0, 0.75 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]} />
          <ConnectionRim radius={radiusOuter} position={[0, -0.75 * radiusScale, 0]} rotation={[Math.PI / 2, 0, 0]} />
          <ConnectionRim radius={radiusOuter} position={[0.75 * radiusScale, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        </group>
      );
    }

    // CROSS
    if (type === 'cross') {
      return (
        <group>
          <HollowCylinder radius={radiusOuter} height={2 * radiusScale} />
          <HollowCylinder radius={radiusOuter} height={2 * radiusScale} rotation={[0, 0, Math.PI / 2]} />
          <HollowSphere radius={radiusOuter} />
          {/* Rims */}
          <ConnectionRim radius={radiusOuter} position={[0, 1 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]} />
          <ConnectionRim radius={radiusOuter} position={[0, -1 * radiusScale, 0]} rotation={[Math.PI / 2, 0, 0]} />
          <ConnectionRim radius={radiusOuter} position={[1 * radiusScale, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
          <ConnectionRim radius={radiusOuter} position={[-1 * radiusScale, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
        </group>
      );
    }

    // VALVE
    if (type === 'valve') {
      const handleRot = (component.properties?.handleRotation || 0) * (Math.PI / 180);
      return (
        <group>
          <HollowCylinder radius={radiusOuter} height={1.5 * radiusScale} />
          {/* Valve Body */}
          <HollowSphere radius={radiusOuter * 1.4} />
          {/* Rims */}
          <ConnectionRim radius={radiusOuter} position={[0, 0.75 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]} />
          <ConnectionRim radius={radiusOuter} position={[0, -0.75 * radiusScale, 0]} rotation={[Math.PI / 2, 0, 0]} />
          {/* Valve Handle */}
          <group rotation={[0, 0, handleRot]}>
             <mesh position={[0, 0, radiusOuter * 1.6]}>
               <boxGeometry args={[radiusOuter * 0.4, radiusOuter * 3, radiusOuter * 0.4]} />
               <meshStandardMaterial color="#ef4444" />
             </mesh>
          </group>
        </group>
      );
    }

    // REDUCER
    if (type === 'reducer') {
      const smallRadius = radiusOuter * 0.7;
      return (
        <group>
          {/* Tapered body */}
          <HollowTaperedCylinder radiusTop={smallRadius} radiusBottom={radiusOuter} height={0.8 * radiusScale} />
          {/* Rims */}
          <ConnectionRim radius={smallRadius} position={[0, 0.4 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]} />
          <ConnectionRim radius={radiusOuter} position={[0, -0.4 * radiusScale, 0]} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      );
    }

    // COUPLING / UNION
    if (type === 'coupling' || type === 'union') {
      return (
        <group>
          {/* Main Sleeve */}
          <HollowCylinder radius={radiusOuter * 1.15} height={0.6 * radiusScale} />
          {/* Rims for the sleeve */}
          <ConnectionRim radius={radiusOuter * 1.15} position={[0, 0.3 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]} />
          <ConnectionRim radius={radiusOuter * 1.15} position={[0, -0.3 * radiusScale, 0]} rotation={[Math.PI / 2, 0, 0]} />
          
          {type === 'union' && (
            <HollowCylinder radius={radiusOuter * 1.3} height={0.2 * radiusScale} />
          )}
        </group>
      );
    }

    // FLANGE (Reference Match: Threaded Floor Flange style)
    if (type === 'flange') {
      const faceRadius = radiusOuter * 2.2;
      const holeCircleRadius = radiusOuter * 1.6;
      const holeRadius = radiusOuter * 0.15;
      
      return (
        <group>
          {/* Main Face (Thick Disc) */}
          <HollowCylinder radius={faceRadius} height={0.15 * radiusScale} />
          
          {/* Hub (Central entrance) */}
          <HollowCylinder radius={radiusOuter * 1.3} height={0.5 * radiusScale} />
          
          {/* Face Rims */}
          <ConnectionRim radius={faceRadius} position={[0, 0.075 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]} />
          <ConnectionRim radius={faceRadius} position={[0, -0.075 * radiusScale, 0]} rotation={[Math.PI / 2, 0, 0]} />
          
          {/* 4 Mounting Holes (Recessed look) */}
          {!isGhost && Array.from({ length: 4 }).map((_, i) => {
             const angle = (i / 4) * Math.PI * 2 + (Math.PI / 4);
             return (
               <mesh 
                 key={i} 
                 position={[Math.cos(angle) * holeCircleRadius, 0.06 * radiusScale, Math.sin(angle) * holeCircleRadius]}
                 rotation={[-Math.PI / 2, 0, 0]}
               >
                 {/* Dark Circle to represent the hole depth */}
                 <circleGeometry args={[holeRadius, 16]} />
                 <meshStandardMaterial color="#1e293b" side={THREE.DoubleSide} />
               </mesh>
             );
          })}
        </group>
      );
    }

    // CAP (Outer Cover)
    if (type === 'cap') {
      return (
        <group position={[0, -0.05 * radiusScale, 0]}>
          <HollowCylinder radius={radiusOuter * 1.08} height={0.3 * radiusScale} openEnded={true} />
          {/* Rounded Top */}
          <mesh position={[0, 0.15 * radiusScale, 0]}>
             <sphereGeometry args={[radiusOuter * 1.08, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
             <meshStandardMaterial {...matProps} />
          </mesh>
        </group>
      );
    }

    // PLUG (Inner Insert)
    if (type === 'plug') {
      return (
        <group position={[0, -0.1 * radiusScale, 0]}>
          <mesh>
            <cylinderGeometry args={[radiusOuter * 0.95, radiusOuter * 0.95, 0.2 * radiusScale, 16]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
          {/* Hex Head */}
          <mesh position={[0, 0.15 * radiusScale, 0]}>
             <cylinderGeometry args={[radiusOuter * 1.1, radiusOuter * 1.1, 0.1 * radiusScale, 6]} />
             <meshStandardMaterial color="#475569" />
          </mesh>
        </group>
      );
    }

    // FILTER (Y-Strainer Style)
    if (type === 'filter') {
      const branchAngle = Math.PI / 4;
      return (
        <group>
          <HollowCylinder radius={radiusOuter * 1.1} height={1.4 * radiusScale} />
          <HollowSphere radius={radiusOuter * 1.1} />
          {/* Rims */}
          <ConnectionRim radius={radiusOuter * 1.1} position={[0, 0.7 * radiusScale, 0]} rotation={[-Math.PI / 2, 0, 0]} />
          <ConnectionRim radius={radiusOuter * 1.1} position={[0, -0.7 * radiusScale, 0]} rotation={[Math.PI / 2, 0, 0]} />
          {/* Y-Branch */}
          <group position={[0, 0, 0]} rotation={[0, 0, -branchAngle]}>
             <HollowCylinder radius={radiusOuter * 1.1} height={0.9 * radiusScale} position={[0, 0.45 * radiusScale, 0]} openEnded={false} />
             {/* Strainer Cap */}
             <mesh position={[0, 0.9 * radiusScale, 0]}>
                <cylinderGeometry args={[radiusOuter * 1.2, radiusOuter * 1.2, 0.1 * radiusScale, 6]} />
                <meshStandardMaterial {...matProps} color="#475569" />
             </mesh>
          </group>
        </group>
      );
    }

    // CYLINDER (PRIMITIVE)
    if (type === 'cylinder') {
      return (
        <group position={[0, length / 2, 0]}>
          <HollowCylinder radius={radiusOuter} height={length} />
          <ConnectionRim radius={radiusOuter} position={[0, length / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} />
          <ConnectionRim radius={radiusOuter} position={[0, -length / 2, 0]} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      );
    }

    // CUBE (PRIMITIVE)
    if (type === 'cube') {
      return (
        <mesh>
          <boxGeometry args={[radiusOuter * 2, radiusOuter * 2, radiusOuter * 2]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
      );
    }

    // CONE (PRIMITIVE)
    if (type === 'cone') {
      return (
        <mesh>
          <coneGeometry args={[radiusOuter, length, 16]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
      );
    }

    // WALL (PRIMITIVE)
    if (type === 'wall') {
      const w = component.properties?.od || 10;
      const h = component.properties?.length || 10;
      const t = component.properties?.thick || 0.2;
      return (
        <mesh position={[0, h/2, 0]}>
          <boxGeometry args={[w, h, t]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
      );
    }

    // WATER-TAP
    if (type === 'water-tap') {
      return (
        <group>
          {/* Main Body */}
          <HollowCylinder radius={radiusOuter} height={0.8 * radiusScale} />
          <HollowSphere radius={radiusOuter} />
          {/* Horizontal Neck */}
          <group position={[0, 0.1 * radiusScale, 0]} rotation={[Math.PI / 2, 0, 0]}>
             <HollowCylinder radius={radiusOuter * 0.8} height={0.6 * radiusScale} position={[0, 0.3 * radiusScale, 0]} />
             
             {/* Curved Spout (Segmented) */}
             <group position={[0, 0.6 * radiusScale, 0]}>
                <HollowTaperedCylinder 
                   radiusTop={radiusOuter * 0.7} 
                   radiusBottom={radiusOuter * 0.8} 
                   height={0.3 * radiusScale} 
                   position={[0, 0.15 * radiusScale, 0.05 * radiusScale]}
                   rotation={[-Math.PI / 8, 0, 0]}
                />
                <HollowTaperedCylinder 
                   radiusTop={radiusOuter * 0.6} 
                   radiusBottom={radiusOuter * 0.7} 
                   height={0.3 * radiusScale}
                   position={[0, 0.35 * radiusScale, 0.25 * radiusScale]}
                   rotation={[-Math.PI / 3, 0, 0]}
                />
                {/* Outlet Rim */}
                <ConnectionRim 
                   radius={radiusOuter * 0.6} 
                   position={[0, 0.5 * radiusScale, 0.35 * radiusScale]} 
                   rotation={[-Math.PI / 3, 0, 0]} 
                />
             </group>
          </group>
          {/* Handle / Lever */}
          <group position={[0, 0.25 * radiusScale, 0]}>
             <HollowSphere radius={radiusOuter * 0.9} />
             <mesh position={[radiusOuter * 0.8, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[radiusOuter * 0.3, radiusOuter * 2.5, 4, 8]} />
                <meshStandardMaterial color="#ef4444" />
             </mesh>
          </group>
        </group>
      );
    }

    // TANKS (Filter Vessel Style: Domed top, Flat bottom)
    if (type === 'tank') {
       const tankRadius = radiusOuter * 2;
       const floorOffset = length / 2; // Sits directly on floor
       
       return (
        <group position={[0, floorOffset, 0]}>
          {/* Main Cylinder */}
          <mesh>
            <cylinderGeometry args={[tankRadius, tankRadius, length, 32]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
          {/* Top Dome */}
          <mesh position={[0, length / 2, 0]}>
            <sphereGeometry args={[tankRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
          {/* Bottom (Flat) */}
          <mesh position={[0, -length / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[tankRadius, 32]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
        </group>
      );
    }

    // INDUSTRIAL TANK (Flat Bottom Pro Style)
    if (type === 'industrial-tank') {
       const tankRadius = radiusOuter * 2;
       const legHeight = tankRadius * 1.5; // Taller legs for pro tank
       const floorOffset = length / 2 + legHeight;
       
       return (
        <group position={[0, floorOffset, 0]}>
          {/* Main Cylinder Body */}
          <mesh>
             <cylinderGeometry args={[tankRadius, tankRadius, length, 32]} />
             <meshStandardMaterial {...matProps} />
          </mesh>
          
          {/* Top (Flat with Hatch) */}
          <group position={[0, length / 2, 0]}>
             <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[tankRadius, 32]} />
                <meshStandardMaterial {...matProps} />
             </mesh>
             {/* Main Hatch */}
             <mesh position={[0, 0.05 * radiusScale, 0]}>
                <cylinderGeometry args={[tankRadius * 0.25, tankRadius * 0.25, 0.1 * radiusScale, 16]} />
                <meshStandardMaterial {...matProps} color="#475569" />
             </mesh>
             {/* Small Pipe Vent */}
             <mesh position={[tankRadius * 0.4, 0.15 * radiusScale, 0]}>
                <cylinderGeometry args={[tankRadius * 0.08, tankRadius * 0.08, 0.3 * radiusScale]} />
                <meshStandardMaterial {...matProps} />
             </mesh>
          </group>
          
          {/* Bottom (Flat) */}
          <mesh position={[0, -length / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
             <circleGeometry args={[tankRadius, 32]} />
             <meshStandardMaterial {...matProps} />
          </mesh>
          
          {/* Structural Support Legs */}
          {!isGhost && (
            <group position={[0, -length / 2, 0]}>
              {[-1, 1].map(x => [-1, 1].map(z => {
                const angle = Math.atan2(z, x);
                const legX = Math.cos(angle) * tankRadius * 0.95;
                const legZ = Math.sin(angle) * tankRadius * 0.95;
                return (
                  <mesh key={`leg-${x}-${z}`} position={[legX, -legHeight / 2, legZ]}>
                    <boxGeometry args={[tankRadius * 0.12, legHeight, tankRadius * 0.12]} />
                    <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.2} />
                  </mesh>
                );
              }))}
            </group>
          )}

          {/* Service Ladder */}
          {!isGhost && (
            <group position={[tankRadius + 0.05, -length / 2, 0]}>
              {/* Rails */}
              <mesh position={[0, length / 2, 0.15 * radiusScale]}>
                <boxGeometry args={[0.02, length, 0.02]} />
                <meshStandardMaterial color="#64748b" />
              </mesh>
              <mesh position={[0, length / 2, -0.15 * radiusScale]}>
                <boxGeometry args={[0.02, length, 0.02]} />
                <meshStandardMaterial color="#64748b" />
              </mesh>
              {/* Rungs */}
              {Array.from({ length: Math.floor(length / 0.3) }).map((_, i) => (
                <mesh key={`rung-${i}`} position={[0, i * 0.3 + 0.15, 0]}>
                  <boxGeometry args={[0.015, 0.015, 0.3 * radiusScale]} />
                  <meshStandardMaterial color="#64748b" />
                </mesh>
              ))}
            </group>
          )}
        </group>
      );
    }

    // VERTICAL / STRAIGHT (Hollow with Rims)
    return (
      <group position={[0, length / 2, 0]}>
        <HollowCylinder radius={radiusOuter} height={length} />
        {/* Top Rim */}
        <mesh position={[0, length / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radiusOuter - WALL_THICKNESS, radiusOuter, 16]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
        {/* Bottom Rim */}
        <mesh position={[0, -length / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radiusOuter - WALL_THICKNESS, radiusOuter, 16]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
      </group>
    );
  };

  // ── Connection Sockets (Dynamic Mapping) ────────────────────
  const socketBubbles = useMemo(() => {
    if (!connectionMode || isGhost || !def || !def.sockets) return [];

    return def.sockets.map((s, idx) => {
      const pos = s.position.clone();
      
      // Apply type-specific scaling logic (matches App.jsx snapping)
      if (type === 'industrial-tank') {
        const tankRadius = radiusOuter * 2;
        const legHeight = tankRadius * 1.5;
        const floorOffset = (length / 2) + legHeight;
        pos.x *= (tankRadius + 0.1); 
        pos.z *= (tankRadius + 0.1);
        pos.y = (pos.y * (length / 2)) + floorOffset;
      } else if (type === 'straight' || type === 'vertical') {
        pos.y = (pos.y + 1) * (length / 2);
      } else if (type === 'tank') {
        const tankRadius = radiusOuter * 2;
        const floorOffset = length / 2;
        pos.x *= tankRadius;
        pos.z *= tankRadius;
        pos.y = (pos.y * (length / 2)) + floorOffset;
      } else {
        // Standard fittings
        pos.multiplyScalar(radiusScale);
      }

      return {
        id: idx,
        position: [pos.x, pos.y, pos.z]
      };
    });
  }, [connectionMode, isGhost, def, type, component.properties, length, radiusScale]);

  return (
    <group
      name={component.id}
      position={position}
      rotation={rotation}
      raycast={isGhost ? () => null : undefined}
      onPointerDown={(e) => {
        if (isGhost || connectionMode) return;
        e.stopPropagation();
        if (typeof onSelect === 'function') onSelect(e);
      }}
      onPointerOver={(e) => {
        if (isGhost) return;
        e.stopPropagation();
        setIsHovered(true);
      }}
      onPointerOut={() => {
        if (isGhost) return;
        setIsHovered(false);
      }}
    >
      {renderGeometry()}

      {isSelected && !isCapture && (
        <Outlines thickness={0.015} color={darkMode ? "#fbbf24" : "#2563eb"} />
      )}

      {socketBubbles.map((socket) => (
        <mesh 
          key={socket.id} 
          position={socket.position}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (typeof onSocketClick === 'function') onSocketClick(component.id, socket.id);
          }}
        >
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#ff0055" emissive="#ff0055" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

const MemorizedPipeComponent = memo(PipeComponent);
export default MemorizedPipeComponent;
