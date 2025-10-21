export const Role = {
    ADMIN: "ADMIN",
    RETAILER: "RETAILER",
    WHOLESALER: "WHOLESALER",
    DISTRIBUTOR: "DISTRIBUTOR",
    FACTORY: "FACTORY",
} as const;
export type Role = typeof Role[keyof typeof Role];

export interface Order {
    role: Role;
    amount: number;
    weeksUntilArrival: number; // counts down from 2 to 0
}

export interface RoleState {
    inventory: number[];
    backlog: number[];
    incomingOrders: Order[];
}

export interface GameState {
    customerOrder: number[];
    roles: Record<Role, RoleState>;
}

export interface Game {
    roomCode: string;
    week: number;
    state: GameState;
}