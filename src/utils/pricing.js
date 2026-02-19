import { COMPONENT_DEFINITIONS, MATERIALS } from '../config/componentDefinitions';

export const COMPONENT_BASE_PRICES = {
    'straight': 10,
    'elbow': 15,
    'elbow-45': 12,
    't-joint': 20,
    'vertical': 10,
    'valve': 45,
    'filter': 30,
    'tank': 150,
    'cap': 5,
};

export const calculateComponentCost = (component) => {
    const basePrice = COMPONENT_BASE_PRICES[component.component_type] || 10;
    const length = component.properties?.length || 2;
    const radiusScale = component.properties?.radiusScale || 1;

    let cost = 0;

    switch (component.component_type) {
        case 'straight':
        case 'vertical':
            cost = basePrice * length * radiusScale;
            break;

        case 'tank':
            cost = basePrice * length * (radiusScale * radiusScale);
            break;

        default:
            cost = basePrice * radiusScale;
            break;
    }

    return Math.round(cost * 100) / 100;
};

export const calculateComponentWeight = (component) => {
    const def = COMPONENT_DEFINITIONS[component.component_type];
    if (!def) return 0;

    const materialKey = component.properties?.material || def.defaultMaterial || 'steel';
    const material = MATERIALS[materialKey];
    const density = material ? material.density : 7850;

    // Base weight based on component type
    let weight = 0;

    const length = component.properties?.length || 1;
    // Base OD is 0.30m (matches defaultOD)
    const od = component.properties?.od || (0.30 * (component.properties?.radiusScale || 1));
    const wt = component.properties?.wallThickness || (def.defaultWT || 0.02);
    const radiusOuter = od / 2;
    const radiusInner = Math.max(0, radiusOuter - wt);

    switch (component.component_type) {
        case 'straight':
        case 'vertical':
            // Volume of hollow cylinder: PI * (Ro^2 - Ri^2) * h
            const crossSectionArea = Math.PI * (Math.pow(radiusOuter, 2) - Math.pow(radiusInner, 2));
            const volume = crossSectionArea * length;
            weight = volume * density; // kg/m^3 * m^3 = kg
            break;
        case 'tank':
            // Tanks are also hollow-ish, but for now we'll use outer volume or simple wall calc
            // Let's assume tank is a larger cylinder with the same WT logic
            const tankArea = Math.PI * (Math.pow(radiusOuter, 2) - Math.pow(radiusInner, 2));
            const tankVolume = tankArea * length;
            weight = tankVolume * density;
            break;
        default:
            // Fittings and others use piece weight
            weight = (def.weightPerPiece || def.weightPerUnit || 1);
            // Adjust by density relative to standard steel and scale by OD
            const sizeScale = od / 0.30;
            weight = weight * (density / 7850) * sizeScale;
    }

    return parseFloat(weight.toFixed(2));
};

export const calculateTotalCost = (components) => {
    return components.reduce((total, comp) => {
        const weight = calculateComponentWeight(comp);
        // Rough estimate: $2 per kg
        return total + (weight * 2);
    }, 0);
};

export const calculateTotalWeight = (components) => {
    return components.reduce((total, comp) => total + calculateComponentWeight(comp), 0);
};
