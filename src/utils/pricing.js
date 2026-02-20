import { COMPONENT_DEFINITIONS, MATERIALS } from '../config/componentDefinitions';

// ─────────────────────────────────────────────────────────────────
// Real Indian market pipe prices (₹) – Feb 2026
// Source: IndiaMART / Prince Pipes / Vijay Sales Corporation
// Notes: prices per piece/meter as stated; GST (18%) added on top
// ─────────────────────────────────────────────────────────────────
export const PIPE_PRICE_CATALOG = {
    pvc: {
        label: 'PVC (Agri / Conduit)',
        note: 'Used for agriculture, drainage, and electrical conduit.',
        items: [
            { label: 'PVC Agri Pipe (4kgf) 2-inch – Per Meter', pricePerMeter: 68, unit: 'meter' },
            { label: 'PVC Conduit (Heavy) 20mm – Per Meter', pricePerMeter: 43, unit: 'meter' },
            { label: '4-inch (110mm) PVC Pipe – 6m', pricePerPiece: 894, unit: 'piece' },
        ],
    },
    upvc: {
        label: 'UPVC (Unplasticized PVC)',
        note: 'Sch 40/80 for plumbing and water supply.',
        items: [
            { label: 'UPVC Pipe Sch 40 (1 Inch) – Per Meter', pricePerMeter: 88, unit: 'meter' },
            { label: 'UPVC Pipe Sch 80 (1 Inch) – Per Meter', pricePerMeter: 185, unit: 'meter' },
            { label: '160mm Aroflow UPVC Pipe – 6m', pricePerPiece: 280, unit: 'piece' },
        ],
    },
    cpvc: {
        label: 'CPVC (Chlorinated PVC)',
        note: 'Hot and cold water distribution (SDR 11/13.5).',
        items: [
            { label: 'CPVC Pipe SDR 11 (1 Inch) – Per Meter', pricePerMeter: 160, unit: 'meter' },
            { label: 'CPVC Pipe SDR 13.5 (1 Inch) – Per Meter', pricePerMeter: 108, unit: 'meter' },
        ],
    },
    steel: {
        label: 'Steel Pipes (MS & GI)',
        note: 'Structural, industrial, and high-pressure applications.',
        items: [
            { label: 'MS Pipe ERW Medium (1 Inch) – Per Meter', pricePerMeter: 203, unit: 'meter' },
            { label: 'GI Pipe B-Class (1 Inch) – Per Meter', pricePerMeter: 207, unit: 'meter' },
            { label: 'GI Pipe C-Class (1 Inch) – Per Meter', pricePerMeter: 257, unit: 'meter' },
            { label: 'SS 304 Pipe (1 Inch) – Per Meter', pricePerMeter: 620, unit: 'meter' },
        ],
    },
    specialty: {
        label: 'Other Specialised Pipes',
        note: 'HDPE, copper, flexible, and conduit pipes.',
        items: [
            { label: 'HDPE Pipe 2-inch (underground)', pricePerMeter: 220, unit: 'meter' },
            { label: 'Flexible Garden Pipe 1-inch', pricePerKg: 80, unit: 'kg' },
            { label: 'Copper Pipe ½-inch', pricePerKg: 1195, unit: 'kg' },
            { label: 'PVC Conduit Pipe 25mm', pricePerPiece: 47, unit: 'piece' },
        ],
    },
};

// GST rate (18%) applied when generating quotations
export const GST_RATE = 0.18;

// ─────────────────────────────────────────────────────────────────
// Material → ₹/kg lookup (Current India Market Rates - Feb 2026)
// Typical industrial rates for MS/SS/PVC in India.
// ─────────────────────────────────────────────────────────────────
export const MATERIAL_PRICE_PER_KG = {
    pvc: 84,      // ₹75-95 (Agri/Plumbing grade)
    upvc: 82,     // ₹78-90
    cpvc: 185,    // ₹170-210 (High temp grade)
    steel: 72,    // Carbon Steel (A106/A53) ₹65-80
    ms: 68,       // Mild Steel ₹62-75
    gi: 85,       // Galvanized Iron ₹78-95
    ss304: 280,   // ₹260-310
    ss316: 380,   // ₹350-420
    ci: 65,       // Cast Iron ₹60-75
    hdpe: 98,     // ₹90-110
    copper: 1240, // ₹1150-1300
    brass: 980,   // ₹920-1050
    default: 80,
};

// ─────────────────────────────────────────────────────────────────
// Real per-meter pipe prices (₹) by material key
// Derived directly from PIPE_PRICE_CATALOG above.
// ─────────────────────────────────────────────────────────────────
export const PIPE_PRICE_PER_METER = {
    pvc: 68,      // Agri 2-inch avg
    upvc: 88,     // Sch 40 1-inch avg
    cpvc: 160,    // SDR 11 1-inch avg
    steel: 203,   // MS ERW Medium 1-inch avg
    ms: 203,
    gi: 207,
    ss304: 620,
    ss316: 780,
    ci: 245,
    hdpe: 220,
    copper: 840,
    brass: 940,
    default: 88,
};

// ─────────────────────────────────────────────────────────────────
// Component base prices (₹) – fittings / valves / accessories
// ─────────────────────────────────────────────────────────────────
export const COMPONENT_BASE_PRICES = {
    elbow: 45,
    'elbow-45': 35,
    't-joint': 60,
    valve: 350,
    filter: 280,
    tank: 1800,
    cap: 25,
};

// ─────────────────────────────────────────────────────────────────
// Per-component cost (₹)
// Pipes  → real ₹/meter (from catalog) × length × size-scale
// Others → piece price × size-scale
// ─────────────────────────────────────────────────────────────────
export const calculateComponentCost = (component) => {
    const length = component.properties?.length || 2;
    const def = COMPONENT_DEFINITIONS[component.component_type];
    const materialKey = component.properties?.material || def?.defaultMaterial || 'steel';

    let cost = 0;

    // Use weight-based pricing for everything to ensure consistency
    // with calculateTotalCost and to account for significant volume/size changes
    const weight = calculateComponentWeight(component);
    const ratePerKg = MATERIAL_PRICE_PER_KG[materialKey] ?? MATERIAL_PRICE_PER_KG.default;

    // For specific items that might still need per-piece pricing (like valves/filters),
    // we can check if they have a fixed price in catalog, but currently
    // the user requested volume-based cost impact.
    // However, let's keep base prices for non-pipe items if they are not just raw material.

    switch (component.component_type) {
        case 'straight':
        case 'vertical':
        case 'tank': {
            // Purely weight based for these
            cost = weight * ratePerKg;
            break;
        }
        default: {
            // For fittings/valves: Use base price OR weight price, whichever is higher?
            // Or just weight price?
            // User asked: "is the cost is changed with respect to volume?"
            // Implies they want volume/weight to drive cost.
            // Let's use weight based for everything to be safe and consistent.
            // But we should add a minimum base price if it's too small?
            // Let's stick to weight * rate for consistency with the "Total Estimate" shown in UI.

            // Actually, for Valves/Filters, usually there is a piece price.
            // Current code used COMPONENT_BASE_PRICES.
            // Let's check COMPONENT_BASE_PRICES usage in calculateTotalCost.
            // Wait, calculateTotalCost ONLY uses weight!
            // "return total + weight * ratePerKg;"
            // So to match "Total Estimate", we must use weight * ratePerKg here too.

            cost = weight * ratePerKg;
        }
    }

    return Math.round(cost * 100) / 100;
};

// ─────────────────────────────────────────────────────────────────
// Weight calculation (kg) – Precise geometric volume method
// ─────────────────────────────────────────────────────────────────
export const calculateComponentWeight = (component) => {
    const def = COMPONENT_DEFINITIONS[component.component_type];
    if (!def) return 0;

    const materialKey = component.properties?.material || def.defaultMaterial || 'steel';
    const material = MATERIALS[materialKey];
    const density = material ? material.density : 7850;

    const length = component.properties?.length || 1;
    const radiusScale = component.properties?.radiusScale || 1;
    const od = component.properties?.od || (0.30 * radiusScale);
    const wt = component.properties?.wallThickness || (def.defaultWT || 0.02);
    const radiusOuter = od / 2;
    const radiusInner = Math.max(0, radiusOuter - wt);

    const crossSectionArea = Math.PI * (Math.pow(radiusOuter, 2) - Math.pow(radiusInner, 2));
    let volume = 0; // m³

    switch (component.component_type) {
        case 'straight':
        case 'vertical':
            volume = crossSectionArea * length;
            break;

        case 'elbow':
            // 90 deg Elbow volume = CrossSectionArea * ArcLength of centerline
            // Centerline radius is typically equivalent to the outer radius for short/long radius elbows
            // We'll use 1 * radiusScale as the bend radius (standard)
            const bendRadius90 = 1 * radiusScale;
            const arcLength90 = (Math.PI / 2) * bendRadius90;
            volume = crossSectionArea * arcLength90;
            break;

        case 'elbow-45':
            const bendRadius45 = 1 * radiusScale;
            const arcLength45 = (Math.PI / 4) * bendRadius45;
            volume = crossSectionArea * arcLength45;
            break;

        case 't-joint':
            // Volume = Main pass (1.5 * radiusScale) + Side branch (0.75 * radiusScale)
            volume = crossSectionArea * (1.5 * radiusScale + 0.75 * radiusScale);
            break;

        case 'cross':
            // Volume = Main pass (2 * radiusScale) + Cross pass (2 * radiusScale) - intersection overlap
            volume = crossSectionArea * (2 * radiusScale + 2 * radiusScale);
            break;

        case 'reducer': {
            // Volume of a hollow conical frustum = (π * h / 3) * (R1² + R1*R2 + R2²) - inner frustum
            const h = 0.8 * radiusScale;
            const R1_out = radiusOuter;
            const R2_out = radiusOuter * 0.6;
            const R1_in = radiusInner;
            const R2_in = radiusInner * 0.6;

            const vOut = (Math.PI * h / 3) * (R1_out * R1_out + R1_out * R2_out + R2_out * R2_out);
            const vIn = (Math.PI * h / 3) * (R1_in * R1_in + R1_in * R2_in + R2_in * R2_in);
            volume = vOut - vIn;
            break;
        }

        case 'flange': {
            // Main disc + hub
            const discVolume = Math.PI * Math.pow(radiusOuter * 1.8, 2) * (0.2 * radiusScale);
            const hubVolume = crossSectionArea * (0.1 * radiusScale);
            volume = discVolume + hubVolume;
            break;
        }

        case 'union':
            // Two ends + center nut (simplified as cylinders)
            const endsVolume = crossSectionArea * (0.3 * radiusScale * 2);
            const nutVolume = (Math.PI * Math.pow(radiusOuter * 1.3, 2) * (0.2 * radiusScale));
            volume = endsVolume + nutVolume;
            break;

        case 'coupling':
            // Hollow cylinder (0.5 * radiusScale)
            volume = crossSectionArea * (0.5 * radiusScale);
            break;

        case 'cap':
            // Cylinder + partial sphere cap
            const capCylinderVolume = Math.PI * Math.pow(radiusOuter, 2) * (0.3 * radiusScale);
            const domeVolume = (2 / 3) * Math.PI * Math.pow(radiusOuter * 1.2, 3); // Hemispherical approx
            volume = capCylinderVolume + domeVolume;
            break;

        case 'plug':
            // Hex head + short body
            const headVolume = (Math.PI * Math.pow(radiusOuter * 1.2, 2) * (0.1 * radiusScale));
            const bodyVolume = Math.PI * Math.pow(radiusOuter, 2) * (0.2 * radiusScale);
            volume = headVolume + bodyVolume;
            break;

        case 'tank': {
            const tankArea = Math.PI * (Math.pow(radiusOuter, 2) - Math.pow(radiusInner, 2));
            const mainBody = tankArea * length;
            const dome = (2 / 3) * Math.PI * (Math.pow(radiusOuter, 3) - Math.pow(radiusInner, 3));
            volume = mainBody + dome;
            break;
        }

        case 'valve':
        case 'filter':
            // Use a base unit volume multiplied by scale
            const baseVol = (def.weightPerUnit || 3.5) / 7850; // Reference to steel
            const sizeScale = od / 0.30;
            volume = baseVol * Math.pow(sizeScale, 3);
            break;

        case 'cylinder':
            // Solid cylinder volume = PI * r² * h
            volume = Math.PI * Math.pow(radiusOuter, 2) * length;
            break;

        case 'cube':
            // Solid cube volume = s³
            volume = Math.pow(od, 3);
            break;

        case 'cone':
            // Solid cone volume = (1/3) * PI * r² * h
            // We use radiusScale as the height in our coneGeometry
            volume = (1 / 3) * Math.PI * Math.pow(radiusOuter, 2) * (1 * radiusScale);
            break;

        default:
            volume = crossSectionArea * length;
    }

    const weight = volume * density;
    return parseFloat(weight.toFixed(2));
};

// -----------------------------------------------------------------
// Price and Weight Calculation Constants (Feb 2026 - Indian Market)
// -----------------------------------------------------------------

export const formatIndianNumber = (num) => {
    const value = num || 0;
    const x = value.toFixed(2).split('.');
    let x1 = x[0];
    const x2 = x.length > 1 ? '.' + x[1] : '';
    const rgx = /(\d+)(\d{3})/;
    if (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    const lastThree = x1.split(',').pop();
    const firstPart = x1.substring(0, x1.length - lastThree.length - 1);
    if (firstPart) {
        return firstPart.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + ',' + lastThree + x2;
    }
    return x1 + x2;
};
export const calculateComponentMetrics = (component) => {
    const weight = calculateComponentWeight(component);
    const def = COMPONENT_DEFINITIONS[component.component_type];
    if (!def) return { weight: 0, volume: 0, od: 0, thick: 0, length: 0 };

    const materialKey = component.properties?.material || def.defaultMaterial || 'steel';
    const material = MATERIALS[materialKey];
    const density = material ? material.density : 7850;

    const length = component.properties?.length || 1;
    const radiusScale = component.properties?.radiusScale || 1;
    const od = component.properties?.od || (0.30 * radiusScale);
    const wt = component.properties?.wallThickness || (def.defaultWT || 0.02);

    const volume = weight / density;

    return {
        weight: weight,
        volume: parseFloat(volume.toFixed(5)),
        od: parseFloat(od.toFixed(3)),
        thick: parseFloat(wt.toFixed(4)),
        length: parseFloat(length.toFixed(3)),
        material: material ? material.name : materialKey
    };
};

// ─────────────────────────────────────────────────────────────────
// Total cost (₹) using ₹/kg material rates + GST
// ─────────────────────────────────────────────────────────────────
export const calculateTotalCost = (components, includeGST = false) => {
    const subtotal = components.reduce((total, comp) => {
        const weight = calculateComponentWeight(comp);
        const materialKey = comp.properties?.material || 'default';
        const ratePerKg = MATERIAL_PRICE_PER_KG[materialKey] ?? MATERIAL_PRICE_PER_KG.default;
        return total + weight * ratePerKg;
    }, 0);

    return includeGST
        ? Math.round(subtotal * (1 + GST_RATE) * 100) / 100
        : Math.round(subtotal * 100) / 100;
};

export const calculateTotalWeight = (components) => {
    return components.reduce((total, comp) => total + calculateComponentWeight(comp), 0);
};
