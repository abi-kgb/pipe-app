
import { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Vector3, Quaternion, Plane, Matrix4 } from 'three';
import { useThree } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import { PipelineComponent } from '../types/pipeline';

interface BoundingBoxGizmoProps {
    component: PipelineComponent;
    onUpdate: (component: PipelineComponent) => void;
}

export default function BoundingBoxGizmo({ component, onUpdate }: BoundingBoxGizmoProps) {
    const controls = useThree((state) => state.controls) as unknown as { enabled: boolean } | null;
    const { camera, raycaster, gl } = useThree();

    // Dimensions
    const length = (component.properties?.length as number) || 2;
    const radiusScale = (component.properties?.radiusScale as number) || 1;
    const radius = 0.15 * radiusScale;

    const boxHeight = length;
    const boxWidth = radius * 2;
    const boxDepth = radius * 2;

    // Component transform
    const position = new Vector3(component.position_x, component.position_y, component.position_z);
    const rotation = new THREE.Euler(
        (component.rotation_x * Math.PI) / 180,
        (component.rotation_y * Math.PI) / 180,
        (component.rotation_z * Math.PI) / 180
    );
    const quaternion = new Quaternion().setFromEuler(rotation);

    // Local Axes
    const localX = new Vector3(1, 0, 0).applyQuaternion(quaternion);
    const localY = new Vector3(0, 1, 0).applyQuaternion(quaternion);
    const localZ = new Vector3(0, 0, 1).applyQuaternion(quaternion);

    // Handle Logic
    const Handle = ({ offset, axisVector, cursor, type, sideMultiplier }: { offset: [number, number, number], axisVector: Vector3, cursor: string, type: 'length' | 'radius', sideMultiplier: number }) => {
        const [hovered, setHovered] = useState(false);
        const [dragStart, setDragStart] = useState<{ plane: Plane, startPoint: Vector3, startLength: number, startRadiusScale: number, startPos: Vector3 } | null>(null);

        // Safely manage controls state based on dragging
        useEffect(() => {
            if (controls) {
                controls.enabled = !dragStart;
            }
            return () => {
                if (controls) controls.enabled = true;
            };
        }, [dragStart, controls]);

        return (
            <mesh
                position={offset}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = cursor; }}
                onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
                onPointerDown={(e) => {
                    e.stopPropagation();
                    (e.target as Element).setPointerCapture(e.pointerId);

                    // Create a virtual plane facing the camera for stable dragging
                    const normal = new Vector3();
                    camera.getWorldDirection(normal).negate();
                    const plane = new Plane().setFromNormalAndCoplanarPoint(normal, e.point);

                    setDragStart({
                        plane,
                        startPoint: e.point.clone(),
                        startLength: length,
                        startRadiusScale: radiusScale,
                        startPos: position.clone()
                    });
                }}
                onPointerUp={(e) => {
                    e.stopPropagation();
                    (e.target as Element).releasePointerCapture(e.pointerId);
                    setDragStart(null);
                }}
                onPointerMove={(e) => {
                    if (dragStart) {
                        e.stopPropagation();

                        // Raycast against the virtual plane
                        const currentPoint = new Vector3();
                        const intersection = e.ray.intersectPlane(dragStart.plane, currentPoint);

                        if (intersection) {
                            // Vector from drag start to current point (World Space)
                            const dragVec = new Vector3().subVectors(intersection, dragStart.startPoint);

                            // Project drag onto the interest axis (local axis in world space)
                            const projectedDelta = dragVec.dot(axisVector);

                            // Calculate new values
                            let newLength = dragStart.startLength;
                            let newRadiusScale = dragStart.startRadiusScale;
                            let posShift = new Vector3(0, 0, 0);

                            if (type === 'length') {
                                // Change = projectedDelta * sideMultiplier
                                const change = projectedDelta * sideMultiplier;
                                newLength = Math.max(0.5, dragStart.startLength + change);

                                // To keep opposite side fixed:
                                // Center moves by (Change / 2) * AxisDirection (Weighted by multiplier to move WITH the growth)
                                const actualChange = newLength - dragStart.startLength;
                                const shiftMag = actualChange / 2 * sideMultiplier;
                                posShift = axisVector.clone().multiplyScalar(shiftMag);
                            } else {
                                // Radius
                                // Symmetric Scaling (Center Fixed)
                                // If I drag Right (+), Radius increases by Delta.
                                // Right Edge moves by Delta. Left Edge moves by -Delta.

                                const change = projectedDelta * sideMultiplier;
                                const deltaRadius = change; // 1:1 movement with mouse

                                const deltaScale = deltaRadius / 0.15;

                                newRadiusScale = Math.max(0.5, dragStart.startRadiusScale + deltaScale);

                                // No position shift for radius (concentric growth)
                                posShift = new Vector3(0, 0, 0);
                            }

                            onUpdate({
                                ...component,
                                position_x: dragStart.startPos.x + posShift.x,
                                position_y: dragStart.startPos.y + posShift.y,
                                position_z: dragStart.startPos.z + posShift.z,
                                properties: {
                                    ...component.properties,
                                    length: newLength,
                                    radiusScale: newRadiusScale
                                }
                            });
                        }
                    }
                }}
            >
                <boxGeometry args={[0.2, 0.2, 0.2]} />
                <meshBasicMaterial color={hovered || dragStart ? '#ff0000' : '#888888'} />
            </mesh>
        );
    };

    const halfLen = length / 2;
    const halfWid = radius; // Width from center
    const halfDep = radius; // Depth from center

    return (
        <group>
            {/* Wireframe */}
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(radius * 2, length, radius * 2)]} />
                <lineBasicMaterial color="#4287f5" />
            </lineSegments>

            {/* Top (Length +) */}
            {(component.component_type === 'straight' || component.component_type === 'tank' || component.component_type === 'vertical') && (
                <Handle
                    offset={[0, halfLen, 0]}
                    axisVector={localY}
                    cursor="ns-resize"
                    type="length"
                    sideMultiplier={1}
                />
            )}
            {/* Bottom (Length -) */}
            {(component.component_type === 'straight' || component.component_type === 'tank' || component.component_type === 'vertical') && (
                <Handle
                    offset={[0, -halfLen, 0]}
                    axisVector={localY}
                    cursor="ns-resize"
                    type="length"
                    sideMultiplier={-1}
                />
            )}

            {/* Right (Local X+) */}
            <Handle
                offset={[halfWid, 0, 0]}
                axisVector={localX}
                cursor="ew-resize"
                type="radius"
                sideMultiplier={1}
            />
            {/* Left (Local X-) */}
            <Handle
                offset={[-halfWid, 0, 0]}
                axisVector={localX}
                cursor="ew-resize"
                type="radius"
                sideMultiplier={-1}
            />

            {/* Front (Local Z+) */}
            <Handle
                offset={[0, 0, halfDep]}
                axisVector={localZ}
                cursor="ew-resize"
                type="radius"
                sideMultiplier={1}
            />
            {/* Back (Local Z-) */}
            <Handle
                offset={[0, 0, -halfDep]}
                axisVector={localZ}
                cursor="ew-resize"
                type="radius"
                sideMultiplier={-1}
            />

            {/* Dimensions Labels */}
            <Billboard position={[halfWid + 0.3, 0, 0]}>
                <Text fontSize={0.2} color="black" outlineWidth={0.02} outlineColor="white">
                    {(radius * 2).toFixed(2)}
                </Text>
            </Billboard>
            <Billboard position={[0, halfLen + 0.2, 0]}>
                <Text fontSize={0.2} color="black" outlineWidth={0.02} outlineColor="white">
                    {length.toFixed(2)}
                </Text>
            </Billboard>
        </group>
    );
}
