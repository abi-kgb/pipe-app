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

export const calculateTotalCost = (components) => {
    return components.reduce((total, comp) => total + calculateComponentCost(comp), 0);
};
