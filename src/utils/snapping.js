import * as THREE from 'three';
import { COMPONENT_DEFINITIONS } from '../config/componentDefinitions';

/**
 * checkIntersection
 * Checks if a candidate placement intersects with any existing components.
 * Refined to check multiple points (center + sockets) for better accuracy with fittings.
 */
export const checkIntersection = (
    position, // THREE.Vector3
    rotation, // THREE.Euler
    componentType,
    properties,
    existingComponents,
    excludeId = null
) => {
    // Walls are reference-only, never collide with anything
    if (componentType === 'wall') return false;

    const def = COMPONENT_DEFINITIONS[componentType];
    if (!def) return false;

    const radiusScale = properties?.radiusScale || 1;
    const length = properties?.length || 2;
    const od = properties?.od || (0.30 * radiusScale);
    const radius = od / 2;

    const quat = new THREE.Quaternion().setFromEuler(rotation);

    // Points to check: Center + all socket positions in world space
    const pointsToCheck = [position.clone()];
    for (const socket of def.sockets) {
        // Approximate socket position based on definition and properties
        const sPos = socket.position.clone();
        if (componentType === 'straight' || componentType === 'vertical') {
            sPos.y = (length / 2) * (socket.position.y > 0 ? 1 : -1);
        } else if (componentType === 'industrial-tank') {
            const hScale = (od + 0.3) / 2.2;
            const vScale = length / 4.0;
            sPos.x *= hScale;
            sPos.z *= hScale;
            sPos.y *= vScale;
        } else {
            sPos.multiplyScalar(radiusScale);
        }

        const worldSocketPos = sPos.applyQuaternion(quat).add(position);
        pointsToCheck.push(worldSocketPos);
    }

    // Broad phase optimization
    const maxPartDim = Math.max(od, length) * 1.5;

    for (const comp of existingComponents) {
        if (comp.id === excludeId) continue;
        if (comp.component_type === 'wall') continue; // SKIP WALLS FOR COLLISION

        const otherDef = COMPONENT_DEFINITIONS[comp.component_type];
        if (!otherDef) continue;

        const otherPos = new THREE.Vector3(comp.position_x, comp.position_y, comp.position_z);
        const otherRadiusScale = comp.properties?.radiusScale || 1;
        const otherLength = comp.properties?.length || 2;
        const otherOD = comp.properties?.od || (0.30 * otherRadiusScale);
        const otherRadius = otherOD / 2;

        const distToCenter = position.distanceTo(otherPos);
        const maxOtherDim = Math.max(otherOD, otherLength) * 1.5;

        if (distToCenter > (maxPartDim + maxOtherDim)) continue;

        for (const p of pointsToCheck) {
            const distToPoint = p.distanceTo(otherPos);
            const collisionThreshold = (radius + otherRadius) * 0.9;
            if (distToPoint < collisionThreshold) {
                return true;
            }
        }
    }

    return false;
};

export const findSnapPoint = (
    raycaster,
    components,
    placingType,
    viewMode = 'iso',
    placingTemplate = null
) => {
    // --- PRE-PROCESSING ---
    // ASSEMBLY SUPPORT: use first part's definition as the placing type
    let effectiveType = placingType;
    if (placingType === 'assembly' && placingTemplate?.parts?.[0]) {
        effectiveType = placingTemplate.parts[0].component_type || placingTemplate.parts[0].type;
    }

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
                const hScaleGen = ((component.properties?.od || 2.2) + 0.3) / 2.2;
                const vScaleGen = (component.properties?.length || 4.0) / 4.0;
                pos.x *= hScaleGen;
                pos.z *= hScaleGen;
                pos.y *= vScaleGen;
                break;
            case 'industrial-tank':
                // +0.5m visual padding — match actual nozzle tip positions
                const hScale = ((component.properties?.od || 2.2) + 0.5) / 2.2;
                const vScale = (component.properties?.length || 4.0) / 4.0;
                pos.x *= hScale;
                pos.z *= hScale;
                pos.y *= vScale;
                break;
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

        // Round to grid
        target.x = Math.round(target.x);
        target.y = Math.round(target.y);
        target.z = Math.round(target.z);

        // Ground Offset: Ensure component sits ON TOP of the grid
        const properties = placingTemplate?.properties || {};
        const lengthVal = properties.length || 2.0;
        const od = properties.od || (0.30 * (properties.radiusScale || 1));
        const radiusVal = od / 2;

        // Is it a vertical pipe orientation?
        // In our app, default rotation (0,0,0) for 'straight'/'vertical' is a vertical cylinder.
        const isVertical = effectiveType === 'vertical' || effectiveType === 'straight';

        if (viewMode !== 'front') {
            // Horizontal ground placement
            target.y = isVertical ? (lengthVal / 2) : radiusVal;
        } else {
            // Front view vertical backplane placement
            target.z = radiusVal;
        }

        // --- ORIGIN SNAPPING ---
        // For the first component, be very aggressive (4m radius)
        // For subsequent components, be helpful (1.5m radius)
        const snapThreshold = components.length === 0 ? 4.0 : 1.5;

        const originPoint = viewMode !== 'front'
            ? new THREE.Vector3(0, target.y, 0)
            : new THREE.Vector3(0, 0, radiusVal);

        // Check if current target is near origin
        const distToOrigin = target.distanceTo(originPoint);
        if (distToOrigin < snapThreshold) {
            const rot = new THREE.Euler(0, 0, 0);
            const isIntersecting = checkIntersection(originPoint, rot, effectiveType, properties, components);
            return {
                position: originPoint,
                rotation: rot,
                isValid: true,
                isSnappedToOrigin: true,
                isIntersecting
            };
        }

        const rot = new THREE.Euler(0, 0, 0);
        const isIntersecting = checkIntersection(target, rot, effectiveType, properties, components);
        return {
            position: target,
            rotation: rot,
            isValid: true,
            isIntersecting
        };
    };

    if (components.length === 0) {
        return getFallbackSnap() || { position: new THREE.Vector3(), rotation: new THREE.Euler(), isValid: false, isIntersecting: false };
    }

    const placingDef = COMPONENT_DEFINITIONS[effectiveType];
    if (!placingDef) return getFallbackSnap() || { position: new THREE.Vector3(), rotation: new THREE.Euler(), isValid: false, isIntersecting: false };

    let bestSnap = { position: new THREE.Vector3(), rotation: new THREE.Euler(), isValid: false };
    let globalBestScore = Infinity;

    const ray = raycaster.ray;
    const isMultiSocket = placingDef.sockets.length > 2;

    // -----------------------------------------------------------
    // PHASE 1: Build a cache of ALL open world-space sockets
    // in the scene for fast multi-match lookups.
    // -----------------------------------------------------------
    const worldSockets = []; // { position: Vector3, direction: Vector3, compId: string }
    for (const comp of components) {
        const def = COMPONENT_DEFINITIONS[comp.component_type];
        if (!def) continue;

        const pos = new THREE.Vector3(comp.position_x, comp.position_y, comp.position_z);
        const rot = new THREE.Euler(
            (comp.rotation_x * Math.PI) / 180,
            (comp.rotation_y * Math.PI) / 180,
            (comp.rotation_z * Math.PI) / 180
        );
        const quat = new THREE.Quaternion().setFromEuler(rot);

        for (const socket of def.sockets) {
            const wPos = getDynamicSocketPos(comp, socket).applyQuaternion(quat).add(pos);
            const wDir = socket.direction.clone().applyQuaternion(quat).normalize();
            worldSockets.push({ position: wPos, direction: wDir, compId: comp.id });
        }
    }

    // -----------------------------------------------------------
    // PHASE 2: For each candidate snap, score it. Multi-socket
    // components get a bonus for each additional socket that
    // aligns with a scene socket.
    // -----------------------------------------------------------
    const MULTI_MATCH_BONUS = -2.0; // Negative = better score
    const SOCKET_ALIGN_TOLERANCE_SQ = 0.25; // 0.5m distance tolerance squared
    const DIR_ALIGN_THRESHOLD = -0.8; // dot product threshold (opposing dirs)

    const countExtraMatches = (candidatePos, candidateQuat, primaryTargetCompId) => {
        let matches = 0;
        for (const plSocket of placingDef.sockets) {
            const plWorldPos = getDynamicSocketPos(
                { component_type: effectiveType, properties: placingTemplate?.properties || {} },
                plSocket
            ).applyQuaternion(candidateQuat).add(candidatePos);

            const plWorldDir = plSocket.direction.clone().applyQuaternion(candidateQuat).normalize();

            for (const ws of worldSockets) {
                // Don't count the primary connection again
                if (ws.compId === primaryTargetCompId && matches === 0) continue;

                const distSq = plWorldPos.distanceToSquared(ws.position);
                if (distSq > SOCKET_ALIGN_TOLERANCE_SQ) continue;

                // Directions should be opposing (dot product ~ -1)
                const dot = plWorldDir.dot(ws.direction);
                if (dot < DIR_ALIGN_THRESHOLD) {
                    matches++;
                    break; // One match per placing socket is enough
                }
            }
        }
        return matches;
    };

    for (const targetComp of components) {
        const targetDef = COMPONENT_DEFINITIONS[targetComp.component_type];
        if (!targetDef) continue;

        const targetPos = new THREE.Vector3(targetComp.position_x, targetComp.position_y, targetComp.position_z);

        // Broad phase: skip distant components
        if (ray.distanceSqToPoint(targetPos) > 225.0) continue;

        const targetRot = new THREE.Euler(
            (targetComp.rotation_x * Math.PI) / 180,
            (targetComp.rotation_y * Math.PI) / 180,
            (targetComp.rotation_z * Math.PI) / 180
        );
        const targetQuat = new THREE.Quaternion().setFromEuler(targetRot);

        for (const targetSocket of targetDef.sockets) {
            const worldTargetSocketPos = getDynamicSocketPos(targetComp, targetSocket)
                .applyQuaternion(targetQuat)
                .add(targetPos);

            const distToTargetSocket = ray.distanceSqToPoint(worldTargetSocketPos);
            if (distToTargetSocket > 3.5) continue;

            for (const plSocket of placingDef.sockets) {
                const targetDir = targetSocket.direction.clone().applyQuaternion(targetQuat).normalize();
                const placingDir = plSocket.direction.clone().normalize();

                // Align placing socket direction to oppose target socket direction
                const alignQuat = new THREE.Quaternion().setFromUnitVectors(
                    placingDir,
                    targetDir.clone().negate()
                );

                // -----------------------------------------------------------
                // AUTO-FIT: For multi-socket components, test 4 rotations
                // around the connection axis to find the best fit.
                // -----------------------------------------------------------
                const rotationsToTest = isMultiSocket
                    ? [0, Math.PI / 2, Math.PI, -Math.PI / 2]
                    : [0]; // Single/double socket: no spin needed

                for (const spin of rotationsToTest) {
                    const spinQuat = new THREE.Quaternion().setFromAxisAngle(
                        targetDir.clone().negate(), spin
                    );
                    const candidateQuat = spinQuat.clone().multiply(alignQuat);
                    const candidateRot = new THREE.Euler().setFromQuaternion(candidateQuat);

                    const plSocketOffset = getDynamicSocketPos(
                        { component_type: effectiveType, properties: placingTemplate?.properties || {} },
                        plSocket
                    ).applyQuaternion(candidateQuat);

                    const finalPos = worldTargetSocketPos.clone().sub(plSocketOffset);

                    const distToFinalCenter = ray.distanceSqToPoint(finalPos);
                    let score = distToTargetSocket + distToFinalCenter * 0.5;

                    // Multi-match bonus: reward orientations that connect more sockets
                    if (isMultiSocket) {
                        const extraMatches = countExtraMatches(finalPos, candidateQuat, targetComp.id);
                        score += extraMatches * MULTI_MATCH_BONUS;
                    }

                    // Intersection Penalty: Massive penalty for collision rotations
                    const isIntersecting = checkIntersection(
                        finalPos,
                        candidateRot,
                        effectiveType,
                        placingTemplate?.properties || {},
                        components,
                        targetComp.id
                    );

                    if (isIntersecting) {
                        score += 5000; // Force non-colliding orientation
                    }

                    if (score < globalBestScore) {
                        globalBestScore = score;
                        bestSnap = {
                            position: finalPos,
                            rotation: candidateRot,
                            isValid: true,
                            targetComponentId: targetComp.id,
                            isSnappedToSocket: true,
                            isIntersecting
                        };
                    }
                }
            }
        }
    }

    const finalResult = bestSnap.isValid ? bestSnap : (getFallbackSnap() || bestSnap);
    if (!finalResult.isSnappedToSocket) finalResult.isSnappedToSocket = false;
    if (finalResult.isIntersecting === undefined) finalResult.isIntersecting = false;
    return finalResult;
};

/**
 * findSnapForTransform
 * Used to find a snap point during a drag/transform operation for already placed components.
 */
export const findSnapForTransform = (
    movingIds,
    allComponents,
    pivotPosition, // THREE.Vector3
    pivotRotation, // THREE.Euler
    isRotationMode = false
) => {
    const fixedComponents = allComponents.filter(c => !movingIds.includes(c.id));
    if (fixedComponents.length === 0) return null;

    // Build cache of fixed world sockets
    const fixedWorldSockets = [];
    for (const comp of fixedComponents) {
        const def = COMPONENT_DEFINITIONS[comp.component_type];
        if (!def) continue;

        const pos = new THREE.Vector3(comp.position_x, comp.position_y, comp.position_z);
        const rot = new THREE.Euler(
            (comp.rotation_x * Math.PI) / 180,
            (comp.rotation_y * Math.PI) / 180,
            (comp.rotation_z * Math.PI) / 180
        );
        const quat = new THREE.Quaternion().setFromEuler(rot);

        for (const socket of def.sockets) {
            const wPos = socket.position.clone().multiplyScalar(comp.properties?.radiusScale || 1).applyQuaternion(quat).add(pos);
            const wDir = socket.direction.clone().applyQuaternion(quat).normalize();
            fixedWorldSockets.push({ position: wPos, direction: wDir, compId: comp.id });
        }
    }

    const pivotQuat = new THREE.Quaternion().setFromEuler(pivotRotation);
    let bestSnap = null;
    let minScore = Infinity;

    // Thresholds
    const SNAP_DIST_THRESHOLD = 1.0;
    const SNAP_DIST_THRESHOLD_SQ = SNAP_DIST_THRESHOLD * SNAP_DIST_THRESHOLD;

    // For each moving component, check its sockets against all fixed sockets
    for (const mId of movingIds) {
        const comp = allComponents.find(c => c.id === mId);
        if (!comp) continue;
        const def = COMPONENT_DEFINITIONS[comp.component_type];
        if (!def) continue;

        // For now, let's just use the First Moving Component as the snap driver for simplicity and performance.
        if (mId !== movingIds[0]) continue;

        const deltaPos = pivotPosition.clone();
        const deltaQuat = pivotQuat.clone();

        for (const mSocket of def.sockets) {
            const mSocketWorldPosAtPivot = mSocket.position.clone()
                .multiplyScalar(comp.properties?.radiusScale || 1)
                .applyQuaternion(deltaQuat)
                .add(deltaPos);

            const mSocketWorldDirAtPivot = mSocket.direction.clone()
                .applyQuaternion(deltaQuat)
                .normalize();

            for (const fSocket of fixedWorldSockets) {
                const distSq = mSocketWorldPosAtPivot.distanceToSquared(fSocket.position);
                if (distSq < SNAP_DIST_THRESHOLD_SQ) {
                    const dot = mSocketWorldDirAtPivot.dot(fSocket.direction);
                    if (dot < -0.8) {
                        const score = distSq;
                        if (score < minScore) {
                            minScore = score;

                            const mSocketOffset = mSocket.position.clone()
                                .multiplyScalar(comp.properties?.radiusScale || 1)
                                .applyQuaternion(deltaQuat);

                            const finalPos = fSocket.position.clone().sub(mSocketOffset);
                            const isIntersecting = checkIntersection(
                                finalPos,
                                pivotRotation,
                                comp.component_type,
                                comp.properties,
                                allComponents,
                                fSocket.compId
                            );

                            bestSnap = {
                                position: finalPos,
                                rotation: deltaQuat,
                                socketPos: fSocket.position.clone(),
                                isIntersecting
                            };
                        }
                    }
                }
            }
        }
    }

    return bestSnap;
};
/**
 * calculateManualConnection
 * Calculates the position and rotation needed for component B to connect to component A
 * at specific socket indices.
 */
export const calculateManualConnection = (compA, socketIdxA, compB, socketIdxB) => {
    const defA = COMPONENT_DEFINITIONS[compA.component_type || compA.type];
    const defB = COMPONENT_DEFINITIONS[compB.component_type || compB.type];
    if (!defA || !defB) return null;

    const socketA = defA.sockets[socketIdxA];
    const socketB = defB.sockets[socketIdxB];
    if (!socketA || !socketB) return null;

    // 1. Get world position and direction of Target Socket (A)
    const quatA = new THREE.Quaternion().setFromEuler(new THREE.Euler(
        (compA.rotation_x || 0) * (Math.PI / 180),
        (compA.rotation_y || 0) * (Math.PI / 180),
        (compA.rotation_z || 0) * (Math.PI / 180)
    ));
    const posA = new THREE.Vector3(compA.position_x, compA.position_y, compA.position_z);

    // Use the dynamic position logic from earlier
    const getDynamicSocketPos = (component, socket) => {
        const length = component.properties?.length || 2;
        const radiusScale = component.properties?.radiusScale || 1;
        const pos = socket.position.clone();
        if (component.component_type === 'straight' || component.component_type === 'vertical') {
            pos.y = (length / 2) * (socket.position.y > 0 ? 1 : -1);
        } else if (component.component_type === 'industrial-tank') {
            const hScale = ((component.properties?.od || 2.2) + 0.3) / 2.2;
            const vScale = (component.properties?.length || 4.0) / 4.0;
            pos.x *= hScale;
            pos.z *= hScale;
            pos.y *= vScale;
        } else if (component.component_type === 'tank' || component.component_type === 'cap') {
            pos.multiplyScalar(radiusScale);
        } else {
            pos.multiplyScalar(radiusScale);
        }
        return pos;
    };

    const localSocketAPos = getDynamicSocketPos(compA, socketA);
    const worldSocketAPos = localSocketAPos.applyQuaternion(quatA).add(posA);
    const worldSocketADir = socketA.direction.clone().applyQuaternion(quatA).normalize();

    // 2. Calculate target rotation for B
    // We want B's socket direction to be opposite to A's socket direction
    const targetDirForB = worldSocketADir.clone().negate();
    const localSocketBDir = socketB.direction.clone().normalize();

    // Find quaternion that aligns localSocketBDir to targetDirForB
    const alignQuat = new THREE.Quaternion().setFromUnitVectors(localSocketBDir, targetDirForB);
    const targetRotationB = new THREE.Euler().setFromQuaternion(alignQuat);

    // 3. Calculate target position for B
    // finalPosB + rotatedLocalSocketB = worldSocketAPos
    // finalPosB = worldSocketAPos - rotatedLocalSocketB
    const localSocketBPos = getDynamicSocketPos(compB, socketB);
    const rotatedLocalSocketBPos = localSocketBPos.applyQuaternion(alignQuat);
    const targetPositionB = worldSocketAPos.clone().sub(rotatedLocalSocketBPos);

    return {
        position: targetPositionB,
        rotation: targetRotationB,
        socketWorldPos: worldSocketAPos.clone()
    };
};
