import { PipelineComponent } from '../types/pipeline';

export const COMPONENT_BASE_PRICES: Record<string, number> = {
    'straight': 10, // Per unit length
    'elbow': 15,
    'elbow-45': 12,
    't-joint': 20,
    'vertical': 10, // Per unit length
    'valve': 45,
    'filter': 30,
    'tank': 150,
    'cap': 5,
};

export const calculateComponentCost = (component: PipelineComponent): number => {
    const basePrice = COMPONENT_BASE_PRICES[component.component_type] || 10;
    const length = (component.properties?.length as number) || 2; // Default length if not straight
    const radiusScale = (component.properties?.radiusScale as number) || 1;

    let cost = 0;

    switch (component.component_type) {
        case 'straight':
        case 'vertical':
            // Cost = Rate * Length * ThicknessFactor
            cost = basePrice * length * radiusScale;
            break;

        case 'tank':
            // Tank cost depends significantly on size (Volume approx)
            // Base * Length (Height) * RadiusScale^2
            cost = basePrice * length * (radiusScale * radiusScale);
            break;

        default:
            // Fittings: Fixed Base * Size Factor
            cost = basePrice * radiusScale;
            break;
    }

    return Math.round(cost * 100) / 100; // Round to 2 decimals
};

export const calculateTotalCost = (components: PipelineComponent[]): number => {
    return components.reduce((total, comp) => total + calculateComponentCost(comp), 0);
};
