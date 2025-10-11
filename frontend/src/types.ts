export type Role = "factory" | "distributor" | "wholesaler" | "retailer" | "admin";

export interface RoleState {
    inventory: number;
    backlog: number;
    orders: number[];
}

export interface GameState {
    week: number;
    roles: {
        factory: RoleState;
        distributor: RoleState;
        wholesaler: RoleState;
        retailer: RoleState;
        admin: RoleState; // TODO: need to figure out how not to have this
    };
    buffers: {
        productionBuffer: number;
        factoryToDistributorBuffer: number;
        distributorToWholesalerBuffer: number;
        wholesalerToRetailerBuffer: number;
    };
}
