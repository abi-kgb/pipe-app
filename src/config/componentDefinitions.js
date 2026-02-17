import * as THREE from 'three';

export const COMPONENT_DEFINITIONS = {
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
            { position: new THREE.Vector3(0, 1, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0.5, 0, 0), direction: new THREE.Vector3(1, 0, 0) },
        ],
    },
    'elbow-45': {
        type: 'elbow-45',
        sockets: [
            { position: new THREE.Vector3(0, 0.7, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0.5, -0.2, 0), direction: new THREE.Vector3(0.707, -0.707, 0) },
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
            { position: new THREE.Vector3(0, 0.75, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0, -0.75, 0), direction: new THREE.Vector3(0, -1, 0) },
            { position: new THREE.Vector3(0.75, 0, 0), direction: new THREE.Vector3(1, 0, 0) },
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
            { position: new THREE.Vector3(0, 0.7, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0, -0.5, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
    tank: {
        type: 'tank',
        sockets: [
            { position: new THREE.Vector3(0, 2.1, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0, -1, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
    cap: {
        type: 'cap',
        sockets: [
            { position: new THREE.Vector3(0, -0.15, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
};
