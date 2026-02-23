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
            prefix = 'S';
            break;
        case 'elbow':
            prefix = 'E90';
            break;
        case 'elbow-45':
            prefix = 'E45';
            break;
        case 't-joint':
            prefix = 'T';
            break;
        case 'valve':
            prefix = 'V';
            break;
        case 'flange':
            prefix = 'F';
            break;
        case 'filter':
            prefix = 'FL';
            break;
        case 'tank':
            prefix = 'TK';
            break;
        case 'reducer':
            prefix = 'R';
            break;
        case 'cap':
            prefix = 'CP';
            break;
        case 'union':
            prefix = 'U';
            break;
        case 'cross':
            prefix = 'X';
            break;
        case 'coupling':
            prefix = 'C';
            break;
        case 'plug':
            prefix = 'P';
            break;
        default:
            prefix = type.substring(0, 2).toUpperCase();
    }

    return `${prefix}${index + 1}`;
};
