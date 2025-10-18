export type Role = "factory" | "distributor" | "wholesaler" | "retailer" | "admin";

export interface Order {
    role: string;
    amount: number;
    weeksUntilArrival: number; // counts down from 2 to 0
}

export interface RoleState {
    inventory: number[];
    backlog: number[];
    incomingOrders: Order[];
}

export interface GameState {
    week: number;
    customerOrder: number[];
    roles: {
        retailer: RoleState;
        wholesaler: RoleState;
        distributor: RoleState;
        factory: RoleState;
        admin: RoleState; // TODO: need to figure out how not to have this
    };
}
