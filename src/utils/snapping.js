import * as THREE from 'three';
import { COMPONENT_DEFINITIONS } from '../config/componentDefinitions';

export const findSnapPoint = (
    raycaster,
    components,
    placingType,
    viewMode = 'iso',
    placingTemplate = null
) => {
    const getDynamicSocketPos = (component, socket) => {
        const length = component.properties?.length || 2;
        const radiusScale = component.properties?.radiusScale || 1;
        const pos = socket.position.clone();

        // Adjust positions based on component type and dynamic properties
        switch (component.component_type) {
            case 'straight':
            case 'vertical':
                // For straight pipes, Y position is half the length
                pos.y = (length / 2) * (socket.position.y > 0 ? 1 : -1);
                break;
            case 'elbow':
            case 'elbow-45':
            case 't-joint':
            case 'valve':
            case 'filter':
            case 'tank':
            case 'cap':
                // Most fittings scale uniformly with radiusScale
                pos.multiplyScalar(radiusScale);
                break;
        }
        return pos;
    };

    // --- Ground/Background Placement Fallback ---
    // Top and ISO use Y=0 ground. Front uses Z=0 vertical plane.
    const fallbackPlane = (viewMode === 'front')
        ? new THREE.Plane(new THREE.Vector3(0, 0, 1), 0) // Front view: Z=0
        : new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Others: Y=0

    const fallbackTarget = new THREE.Vector3();
    const hasFallbackIntersect = raycaster.ray.intersectPlane(fallbackPlane, fallbackTarget);

    const getFallbackSnap = () => {
        if (!hasFallbackIntersect) return null;
        const target = fallbackTarget.clone();

        // Grid snapping
        target.x = Math.round(target.x);
        target.y = Math.round(target.y);
        target.z = Math.round(target.z);

        return {
            position: target,
            rotation: new THREE.Euler(0, 0, 0),
            isValid: true,
        };
    };

    if (components.length === 0) {
        return getFallbackSnap() || { position: new THREE.Vector3(), rotation: new THREE.Euler(), isValid: false };
    }

    let closestDist = Infinity;
    let bestSnap = { position: new THREE.Vector3(), rotation: new THREE.Euler(), isValid: false };

    // ASSEMBLY SUPPORT: If we are placing an assembly, use the first part's definition for snapping context
    let effectiveType = placingType;
    if (placingType === 'assembly' && placingTemplate?.parts?.[0]) {
        effectiveType = placingTemplate.parts[0].component_type || placingTemplate.parts[0].type;
    }

    const placingDef = COMPONENT_DEFINITIONS[effectiveType];
    if (!placingDef) return getFallbackSnap() || bestSnap;

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
            const socketPos = getDynamicSocketPos(component, socket).applyQuaternion(compQuat).add(compPos);
            const distanceToRay = raycaster.ray.distanceSqToPoint(socketPos);

            if (distanceToRay < 12.25 && distanceToRay < closestDist) {
                closestDist = distanceToRay;

                const targetDir = socket.direction.clone().applyQuaternion(compQuat).normalize();
                const placingDir = placingSocket.direction.clone().normalize();

                const alignQuat = new THREE.Quaternion().setFromUnitVectors(placingDir, targetDir.clone().negate());
                const finalRot = new THREE.Euler().setFromQuaternion(alignQuat);

                // For the placing ghost, we use default properties (radiusScale=1, length=2)
                const ghostSocketPos = getDynamicSocketPos({ component_type: effectiveType }, placingSocket);
                const offset = ghostSocketPos.applyQuaternion(alignQuat);
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

    return bestSnap.isValid ? bestSnap : (getFallbackSnap() || bestSnap);
};
