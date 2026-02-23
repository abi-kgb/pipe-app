import * as THREE from 'three';

export const MATERIALS = {
    steel: { id: 'steel', name: 'Carbon Steel', density: 7850, color: '#78716c' },
    ms: { id: 'ms', name: 'Mild Steel', density: 7850, color: '#a8a29e' },
    gi: { id: 'gi', name: 'Galvanized Iron', density: 7850, color: '#d1d5db' },
    ss304: { id: 'ss304', name: 'SS 304', density: 8000, color: '#e2e8f0' },
    ss316: { id: 'ss316', name: 'SS 316', density: 8000, color: '#bfdbfe' },
    copper: { id: 'copper', name: 'Copper', density: 8960, color: '#c2410c' },
    brass: { id: 'brass', name: 'Brass', density: 8500, color: '#ca8a04' },
    ci: { id: 'ci', name: 'Cast Iron', density: 7200, color: '#44403c' },
    pvc: { id: 'pvc', name: 'PVC (Polyvinyl)', density: 1400, color: '#93c5fd' },
    cpvc: { id: 'cpvc', name: 'CPVC', density: 1550, color: '#fde68a' },
    upvc: { id: 'upvc', name: 'UPVC', density: 1450, color: '#6ee7b7' },
    hdpe: { id: 'hdpe', name: 'HDPE (Black)', density: 950, color: '#1e293b' },
};

export const COMPONENT_DEFINITIONS = {
    straight: {
        type: 'straight',
        weightFactor: 0.1,
        standardWeight: 'Sch 40',
        defaultMaterial: 'pvc',
        defaultOD: 0.30,
        defaultWT: 0.01,
        sockets: [
            { position: new THREE.Vector3(0, 1, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0, -1, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
    elbow: {
        type: 'elbow',
        weightPerPiece: 1.2,
        defaultMaterial: 'pvc',
        defaultOD: 0.30,
        defaultWT: 0.01,
        sockets: [
            { position: new THREE.Vector3(1, 0, 0), direction: new THREE.Vector3(1, 0, 0) },
            { position: new THREE.Vector3(0, 1, 0), direction: new THREE.Vector3(0, 1, 0) },
        ],
    },
    'elbow-45': {
        type: 'elbow-45',
        weightPerPiece: 0.9,
        defaultMaterial: 'pvc',
        defaultOD: 0.30,
        defaultWT: 0.01,
        sockets: [
            { position: new THREE.Vector3(0.5, -0.2, 0), direction: new THREE.Vector3(1, -1, 0).normalize() },
            { position: new THREE.Vector3(0, 1, 0), direction: new THREE.Vector3(0, 1, 0) },
        ],
    },
    vertical: {
        type: 'vertical',
        weightFactor: 0.1,
        defaultMaterial: 'pvc',
        defaultOD: 0.30,
        defaultWT: 0.01,
        sockets: [
            { position: new THREE.Vector3(0, 1, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0, -1, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
    't-joint': {
        type: 't-joint',
        weightPerPiece: 1.8,
        defaultMaterial: 'pvc',
        defaultOD: 0.30,
        defaultWT: 0.01,
        sockets: [
            { position: new THREE.Vector3(1, 0, 0), direction: new THREE.Vector3(1, 0, 0) },
            { position: new THREE.Vector3(-1, 0, 0), direction: new THREE.Vector3(-1, 0, 0) },
            { position: new THREE.Vector3(0, 1, 0), direction: new THREE.Vector3(0, 1, 0) },
        ],
    },
    reducer: {
        type: 'reducer',
        weightPerPiece: 1.1,
        defaultMaterial: 'pvc',
        defaultOD: 0.30,
        defaultWT: 0.01,
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
        defaultWT: 0.01,
        sockets: [
            { position: new THREE.Vector3(0, 0.1, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0, -0.1, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
    union: {
        type: 'union',
        weightPerPiece: 1.4,
        defaultMaterial: 'pvc',
        defaultOD: 0.35,
        defaultWT: 0.01,
        sockets: [
            { position: new THREE.Vector3(0, 0.3, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0, -0.3, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
    cross: {
        type: 'cross',
        weightPerPiece: 2.2,
        defaultMaterial: 'pvc',
        defaultOD: 0.30,
        defaultWT: 0.01,
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
        defaultMaterial: 'pvc',
        defaultOD: 0.34,
        defaultWT: 0.01,
        sockets: [
            { position: new THREE.Vector3(0, 0.25, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0, -0.25, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
    plug: {
        type: 'plug',
        weightPerPiece: 0.2,
        defaultMaterial: 'pvc',
        defaultOD: 0.30,
        defaultWT: 0.01,
        sockets: [
            { position: new THREE.Vector3(0, -0.1, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
    valve: {
        type: 'valve',
        weightPerUnit: 3.5, // kg per piece
        standardWeight: 'Sch 40 / Std. Wt.',
        defaultMaterial: 'pvc',
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
    cylinder: {
        type: 'cylinder',
        weightFactor: 0.15, // Solider than pipe
        defaultMaterial: 'steel',
        defaultOD: 1.0,
        sockets: [
            { position: new THREE.Vector3(0, 1, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0, -1, 0), direction: new THREE.Vector3(0, -1, 0) },
        ],
    },
    cube: {
        type: 'cube',
        weightFactor: 0.2,
        defaultMaterial: 'steel',
        defaultOD: 1.0,
        sockets: [
            { position: new THREE.Vector3(1, 0, 0), direction: new THREE.Vector3(1, 0, 0) },
            { position: new THREE.Vector3(-1, 0, 0), direction: new THREE.Vector3(-1, 0, 0) },
            { position: new THREE.Vector3(0, 1, 0), direction: new THREE.Vector3(0, 1, 0) },
            { position: new THREE.Vector3(0, -1, 0), direction: new THREE.Vector3(0, -1, 0) },
            { position: new THREE.Vector3(0, 0, 1), direction: new THREE.Vector3(0, 0, 1) },
            { position: new THREE.Vector3(0, 0, -1), direction: new THREE.Vector3(0, 0, -1) },
        ],
    },
    cone: {
        type: 'cone',
        weightFactor: 0.1,
        defaultMaterial: 'steel',
        defaultOD: 1.0,
        sockets: [
            { position: new THREE.Vector3(0, 1, 0), direction: new THREE.Vector3(0, 1, 0) }, // Tip
            { position: new THREE.Vector3(0, 0, 0), direction: new THREE.Vector3(0, -1, 0) }, // Base (center)
        ],
    },
};
