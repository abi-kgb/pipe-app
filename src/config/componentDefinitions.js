import * as THREE from 'three';

export const MATERIALS = {
    steel: { id: 'steel', name: 'Carbon Steel', density: 7850, color: '#475569' },
    ms: { id: 'ms', name: 'Mild Steel', density: 7850, color: '#64748b' },
    gi: { id: 'gi', name: 'Galvanized Iron', density: 7850, color: '#cbd5e1' },
    ss304: { id: 'ss304', name: 'SS 304', density: 8000, color: '#e2e8f0' },
    ss316: { id: 'ss316', name: 'SS 316', density: 8000, color: '#f1f5f9' },
    copper: { id: 'copper', name: 'Copper', density: 8960, color: '#b45309' },
    brass: { id: 'brass', name: 'Brass', density: 8500, color: '#d97706' },
    ci: { id: 'ci', name: 'Cast Iron', density: 7200, color: '#334155' },
    pvc: { id: 'pvc', name: 'PVC (Polyvinyl)', density: 1400, color: '#ffffff' },
    cpvc: { id: 'cpvc', name: 'CPVC', density: 1550, color: '#fef3c7' },
    upvc: { id: 'upvc', name: 'UPVC', density: 1450, color: '#94a3b8' },
    hdpe: { id: 'hdpe', name: 'HDPE (Black)', density: 950, color: '#1e293b' },
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
    'elbow-45': {
        type: 'elbow-45',
        weightPerPiece: 0.9,
        defaultMaterial: 'steel',
        defaultOD: 0.30,
        defaultWT: 0.02,
        sockets: [
            { position: new THREE.Vector3(0.5, -0.2, 0), direction: new THREE.Vector3(1, -1, 0).normalize() },
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
    reducer: {
        type: 'reducer',
        weightPerPiece: 1.1,
        defaultMaterial: 'steel',
        defaultOD: 0.30,
        defaultWT: 0.02,
        sockets: [
            { position: new THREE.Vector3(0, 0.4, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0, -0.4, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
    flange: {
        type: 'flange',
        weightPerPiece: 2.5,
        defaultMaterial: 'steel',
        defaultOD: 0.50,
        defaultWT: 0.03,
        sockets: [
            { position: new THREE.Vector3(0, 0.1, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0, -0.1, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
    union: {
        type: 'union',
        weightPerPiece: 1.4,
        defaultMaterial: 'steel',
        defaultOD: 0.35,
        defaultWT: 0.02,
        sockets: [
            { position: new THREE.Vector3(0, 0.3, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0, -0.3, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
    cross: {
        type: 'cross',
        weightPerPiece: 2.2,
        defaultMaterial: 'steel',
        defaultOD: 0.30,
        defaultWT: 0.02,
        sockets: [
            { position: new THREE.Vector3(1, 0, 0), direction: new THREE.Vector3(1, 0, 0) },
            { position: new THREE.Vector3(-1, 0, 0), direction: new THREE.Vector3(-1, 0, 0) },
            { position: new THREE.Vector3(0, 1, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0, -1, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
    coupling: {
        type: 'coupling',
        weightPerPiece: 0.6,
        defaultMaterial: 'steel',
        defaultOD: 0.34,
        defaultWT: 0.02,
        sockets: [
            { position: new THREE.Vector3(0, 0.25, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0, -0.25, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
    plug: {
        type: 'plug',
        weightPerPiece: 0.2,
        defaultMaterial: 'steel',
        defaultOD: 0.30,
        defaultWT: 0.02,
        sockets: [
            { position: new THREE.Vector3(0, -0.1, 0), direction: new THREE.Vector3(0, -1, 0) },
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
