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

    // ASSEMBLY SUPPORT: use first part's definition as the placing type
    let effectiveType = placingType;
    if (placingType === 'assembly' && placingTemplate?.parts?.[0]) {
        effectiveType = placingTemplate.parts[0].component_type || placingTemplate.parts[0].type;
    }

    const placingDef = COMPONENT_DEFINITIONS[effectiveType];
    if (!placingDef) return getFallbackSnap() || { position: new THREE.Vector3(), rotation: new THREE.Euler(), isValid: false };

    let bestSnap = { position: new THREE.Vector3(), rotation: new THREE.Euler(), isValid: false };
    let globalBestDist = Infinity;


    for (const targetComp of components) {
        const targetDef = COMPONENT_DEFINITIONS[targetComp.component_type];
        if (!targetDef) continue;

        const targetPos = new THREE.Vector3(targetComp.position_x, targetComp.position_y, targetComp.position_z);
        const targetRot = new THREE.Euler(
            (targetComp.rotation_x * Math.PI) / 180,
            (targetComp.rotation_y * Math.PI) / 180,
            (targetComp.rotation_z * Math.PI) / 180
        );
        const targetQuat = new THREE.Quaternion().setFromEuler(targetRot);

        for (const targetSocket of targetDef.sockets) {
            // Get world position of this target socket
            const worldTargetSocketPos = getDynamicSocketPos(targetComp, targetSocket)
                .applyQuaternion(targetQuat)
                .add(targetPos);

            // Distance from mouse ray to this target socket
            const distToTargetSocket = raycaster.ray.distanceSqToPoint(worldTargetSocketPos);

            // Only consider sockets within snap radius (10 world units - increased for better magnetism)
            if (distToTargetSocket > 100.0) continue;

            // Among all placing sockets, find the one whose final center position
            // is closest to the mouse ray — this makes snapping feel intuitive
            for (const plSocket of placingDef.sockets) {
                const targetDir = targetSocket.direction.clone().applyQuaternion(targetQuat).normalize();
                const placingDir = plSocket.direction.clone().normalize();

                // Align placing socket direction to oppose the target socket direction
                const alignQuat = new THREE.Quaternion().setFromUnitVectors(
                    placingDir,
                    targetDir.clone().negate()
                );
                const finalRot = new THREE.Euler().setFromQuaternion(alignQuat);

                // Compute where the placing component's center would end up
                // USE properties from template if available (critical for correct preview)
                const plSocketOffset = getDynamicSocketPos(
                    { component_type: effectiveType, properties: placingTemplate?.properties || {} },
                    plSocket
                ).applyQuaternion(alignQuat);
                const finalPos = worldTargetSocketPos.clone().sub(plSocketOffset);

                // Measure how close the final center would be to the mouse ray
                const distToFinalCenter = raycaster.ray.distanceSqToPoint(finalPos);

                // Total score: prefer snap points where both the target socket AND 
                // the resulting component center are close to the cursor
                const score = distToTargetSocket + distToFinalCenter * 0.5;

                if (score < globalBestDist) {
                    globalBestDist = score;
                    bestSnap = {
                        position: finalPos,
                        rotation: finalRot,
                        isValid: true,
                        targetComponentId: targetComp.id,
                        isSnappedToSocket: true
                    };
                }
            }
        }
    }

    const finalResult = bestSnap.isValid ? bestSnap : (getFallbackSnap() || bestSnap);
    if (!finalResult.isSnappedToSocket) finalResult.isSnappedToSocket = false;
    return finalResult;
};
