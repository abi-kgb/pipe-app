import * as THREE from 'three';
import { COMPONENT_DEFINITIONS } from '../config/componentDefinitions';

export const findSnapPoint = (
    raycaster,
    components,
    placingType
) => {
    if (components.length === 0) {
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const target = new THREE.Vector3();
        const intersect = raycaster.ray.intersectPlane(plane, target);

        if (intersect) {
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
    let bestSnap = { position: new THREE.Vector3(), rotation: new THREE.Euler(), isValid: false };

    const placingDef = COMPONENT_DEFINITIONS[placingType];
    const placingSocket = placingDef.sockets[0];

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

        for (const socket of def.sockets) {
            const socketPos = socket.position.clone().applyQuaternion(compQuat).add(compPos);
            const distanceToRay = raycaster.ray.distanceSqToPoint(socketPos);

            if (distanceToRay < 9 && distanceToRay < closestDist) {
                closestDist = distanceToRay;

                const targetDir = socket.direction.clone().applyQuaternion(compQuat).normalize();
                const placingDir = placingSocket.direction.clone().normalize();

                const alignQuat = new THREE.Quaternion().setFromUnitVectors(placingDir, targetDir.clone().negate());
                const finalRot = new THREE.Euler().setFromQuaternion(alignQuat);

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
