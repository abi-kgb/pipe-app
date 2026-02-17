import { ComponentType } from '../types/pipeline';
import * as THREE from 'three';

interface Socket {
    position: THREE.Vector3;
    direction: THREE.Vector3; // Normalized vector pointing OUT of the socket
}

export interface ComponentDefinition {
    type: ComponentType;
    sockets: Socket[];
}

export const COMPONENT_DEFINITIONS: Record<ComponentType, ComponentDefinition> = {
    straight: {
        type: 'straight',
        sockets: [
            { position: new THREE.Vector3(0, 1, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0, -1, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
    elbow: {
        type: 'elbow',
        sockets: [
            { position: new THREE.Vector3(0, 1, 0), direction: new THREE.Vector3(0, 1, 0) }, // Top
            { position: new THREE.Vector3(0.5, 0, 0), direction: new THREE.Vector3(1, 0, 0) }, // Side (rotated)
        ],
    },
    'elbow-45': {
        type: 'elbow-45',
        sockets: [
            { position: new THREE.Vector3(0, 0.7, 0), direction: new THREE.Vector3(0, 1, 0) }, // Top
            { position: new THREE.Vector3(0.5, -0.2, 0), direction: new THREE.Vector3(0.707, -0.707, 0) }, // 45-degree angle
        ],
    },
    vertical: {
        type: 'vertical',
        sockets: [
            { position: new THREE.Vector3(0, 1.5, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0, -1.5, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
    't-joint': {
        type: 't-joint',
        sockets: [
            { position: new THREE.Vector3(0, 0.75, 0), direction: new THREE.Vector3(0, 1, 0) }, // Top
            { position: new THREE.Vector3(0, -0.75, 0), direction: new THREE.Vector3(0, -1, 0) }, // Bottom
            { position: new THREE.Vector3(0.75, 0, 0), direction: new THREE.Vector3(1, 0, 0) }, // Side
        ],
    },
    valve: {
        type: 'valve',
        sockets: [
            { position: new THREE.Vector3(0, 0.75, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0, -0.75, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
    filter: {
        type: 'filter',
        sockets: [
            { position: new THREE.Vector3(0, 0.7, 0), direction: new THREE.Vector3(0, 1, 0) }, // Top (at cap position 0.6 + 0.1)
            { position: new THREE.Vector3(0, -0.5, 0), direction: new THREE.Vector3(0, -1, 0) }, // Bottom
        ],
    },
    tank: {
        type: 'tank',
        sockets: [
            { position: new THREE.Vector3(0, 2.1, 0), direction: new THREE.Vector3(0, 1, 0) }, // Top of dome (cylinder at 1 + dome radius 1 + margin)
            { position: new THREE.Vector3(0, -1, 0), direction: new THREE.Vector3(0, -1, 0) }, // Bottom of cylinder
        ],
    },
    cap: {
        type: 'cap',
        sockets: [
            { position: new THREE.Vector3(0, -0.15, 0), direction: new THREE.Vector3(0, -1, 0) }, // Bottom only (to connect to pipe)
        ],
    },
};
