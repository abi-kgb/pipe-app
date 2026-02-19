import * as THREE from 'three';

export const MATERIALS = {
    steel: { id: 'steel', name: 'Steel', density: 7850, color: '#94a3b8' },
    ms: { id: 'ms', name: 'Mild Steel', density: 7850, color: '#64748b' },
    ss: { id: 'ss', name: 'Stainless Steel', density: 8000, color: '#e2e8f0' },
};

export const COMPONENT_DEFINITIONS = {
    straight: {
        type: 'straight',
        weightFactor: 0.1,
        standardWeight: 'Sch 40',
        defaultMaterial: 'steel',
        defaultOD: 0.30,
        defaultWT: 0.02,
        sockets: [
            { position: new THREE.Vector3(0, 1, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0, -1, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
    elbow: {
        type: 'elbow',
        weightPerPiece: 1.2,
        defaultMaterial: 'steel',
        defaultOD: 0.30,
        defaultWT: 0.02,
        sockets: [
            { position: new THREE.Vector3(1, 0, 0), direction: new THREE.Vector3(1, 0, 0) },
            { position: new THREE.Vector3(0, 1, 0), direction: new THREE.Vector3(0, 1, 0) },
        ],
    },
    vertical: {
        type: 'vertical',
        weightFactor: 0.1,
        defaultMaterial: 'steel',
        defaultOD: 0.30,
        defaultWT: 0.02,
        sockets: [
            { position: new THREE.Vector3(0, 1, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0, -1, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
    't-joint': {
        type: 't-joint',
        weightPerPiece: 1.8,
        defaultMaterial: 'steel',
        defaultOD: 0.30,
        defaultWT: 0.02,
        sockets: [
            { position: new THREE.Vector3(1, 0, 0), direction: new THREE.Vector3(1, 0, 0) },
            { position: new THREE.Vector3(-1, 0, 0), direction: new THREE.Vector3(-1, 0, 0) },
            { position: new THREE.Vector3(0, 1, 0), direction: new THREE.Vector3(0, 1, 0) },
        ],
    },
    valve: {
        type: 'valve',
        weightPerUnit: 3.5, // kg per piece
        standardWeight: 'Sch 40 / Std. Wt.',
        defaultMaterial: 'steel',
        sockets: [
            { position: new THREE.Vector3(0, 0.75, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0, -0.75, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
    filter: {
        type: 'filter',
        weightPerUnit: 5.0, // kg per piece
        standardWeight: 'Standard Weight',
        sockets: [
            { position: new THREE.Vector3(0, 0.7, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0, -0.5, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
    tank: {
        type: 'tank',
        weightPerUnit: 25.0, // kg per piece (base)
        standardWeight: 'Standard Weight',
        defaultOD: 2.0,
        defaultWT: 0.05,
        sockets: [
            { position: new THREE.Vector3(0, 2.1, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0, -1, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
    cap: {
        type: 'cap',
        weightPerUnit: 0.3, // kg per piece
        standardWeight: 'Sch 40 / Std. Wt.',
        sockets: [
            { position: new THREE.Vector3(0, -0.15, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
};
