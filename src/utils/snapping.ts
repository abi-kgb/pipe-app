import * as THREE from 'three';
import { PipelineComponent, ComponentType } from '../types/pipeline';
import { COMPONENT_DEFINITIONS, ComponentDefinition } from '../config/componentDefinitions';

interface SnapResult {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    isValid: boolean;
    targetComponentId?: string;
}

export const findSnapPoint = (
    raycaster: THREE.Raycaster,
    components: PipelineComponent[],
    placingType: ComponentType
): SnapResult => {
    // If no components exist, allow placement anywhere on the grid (y=0 plane)
    if (components.length === 0) {
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const target = new THREE.Vector3();
        const intersect = raycaster.ray.intersectPlane(plane, target);

        if (intersect) {
            // Snap to grid
            target.x = Math.round(target.x);
            target.z = Math.round(target.z);
            return {
                position: target,
                rotation: new THREE.Euler(0, 0, 0),
                isValid: true,
            };
        }
        return { position: new THREE.Vector3(), rotation: new THREE.Euler(), isValid: false };
    }

    let closestDist = Infinity;
    let bestSnap: SnapResult = { position: new THREE.Vector3(), rotation: new THREE.Euler(), isValid: false };

    const placingDef = COMPONENT_DEFINITIONS[placingType];
    const placingSocket = placingDef.sockets[0]; // Always snap using the first socket of the new component

    // Iterate through all existing components
    for (const component of components) {
        const def = COMPONENT_DEFINITIONS[component.component_type];
        if (!def) continue;

        const compPos = new THREE.Vector3(component.position_x, component.position_y, component.position_z);
        const compRot = new THREE.Euler(
            (component.rotation_x * Math.PI) / 180,
            (component.rotation_y * Math.PI) / 180,
            (component.rotation_z * Math.PI) / 180
        );
        const compQuat = new THREE.Quaternion().setFromEuler(compRot);

        // Check each socket of the existing component
        for (const socket of def.sockets) {
            // Calculate world position of the socket
            const socketPos = socket.position.clone().applyQuaternion(compQuat).add(compPos);

            // Calculate distance to ray
            const distanceToRay = raycaster.ray.distanceSqToPoint(socketPos);

            // Threshold for snapping (increased for easier placement)
            if (distanceToRay < 9 && distanceToRay < closestDist) {
                closestDist = distanceToRay;

                // Calculate rotation to align sockets
                // We want the new component's socket direction to be OPPOSITE to the target socket direction
                const targetDir = socket.direction.clone().applyQuaternion(compQuat).normalize();
                const placingDir = placingSocket.direction.clone().normalize(); // Local direction of new component's socket

                // Required rotation for the new component
                const alignQuat = new THREE.Quaternion().setFromUnitVectors(placingDir, targetDir.clone().negate());
                const finalRot = new THREE.Euler().setFromQuaternion(alignQuat);

                // Calculate the position offset
                // The new component should be placed such that its socket connects to the target socket
                // World Pos = Target Socket Pos - (New Socket Pos (local) * Rotation)
                const offset = placingSocket.position.clone().applyQuaternion(alignQuat);
                const finalPos = socketPos.clone().sub(offset);

                bestSnap = {
                    position: finalPos,
                    rotation: finalRot,
                    isValid: true,
                    targetComponentId: component.id,
                };
            }
        }
    }

    return bestSnap;
};
