/**
 * Generates a professional tag for a component based on its type and index.
 * Rules:
 * - Straight/Vertical pipes: S1, S2...
 * - 90-degree Elbows: E901, E902...
 * - 45-degree Elbows: E451, E452...
 * - T-Joints: T1, T2...
 * - Valves: V1, V2...
 * - Flanges: F1, F2...
 * - Filters: FL1, FL2...
 * - Tanks: TK1, TK2...
 */
export const getComponentTag = (type, index) => {
    let prefix = 'S'; // Default for pipes

    switch (type) {
        case 'straight':
        case 'vertical':
            prefix = 's';
            break;
        case 'elbow':
            prefix = 'e90';
            break;
        case 'elbow-45':
            prefix = 'e45';
            break;
        case 't-joint':
            prefix = 't';
            break;
        case 'valve':
            prefix = 'v';
            break;
        case 'flange':
            prefix = 'f';
            break;
        case 'filter':
            prefix = 'fl';
            break;
        case 'tank':
            prefix = 'tk';
            break;
        case 'reducer':
            prefix = 'r';
            break;
        case 'cap':
            prefix = 'cp';
            break;
        case 'union':
            prefix = 'u';
            break;
        case 'cross':
            prefix = 'x';
            break;
        case 'coupling':
            prefix = 'c';
            break;
        case 'plug':
            prefix = 'p';
            break;
        default:
            prefix = type.substring(0, 2).toLowerCase();
    }

    return `${prefix}${index + 1}`;
};
