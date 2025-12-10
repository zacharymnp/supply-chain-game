import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { Game } from "types";

interface Props {
    token: string;
    game: Game;
}

export function GameGraphs({ token, game }: Props) {
    const { roomCode, week, state: gameState } = game;
    const roleData = gameState.roles;


    const [orderData, setOrderData] = useState<Record<string, Record<number, number>>>({
        RETAILER: {},
        WHOLESALER: {},
        DISTRIBUTOR: {},
        FACTORY: {},
    });

// -------------------- CALCULATE COSTS --------------------
    const roles = ["RETAILER", "WHOLESALER", "DISTRIBUTOR", "FACTORY"] as const;
    const costs: Record<string, number> = {
        RETAILER: 0,
        WHOLESALER: 0,
        DISTRIBUTOR: 0,
        FACTORY: 0,
    };
    for (let weekIndex = 0; weekIndex < week; weekIndex++) {
        for (const role of roles) {
            const inventory = roleData[role].inventory[weekIndex]
            costs[role] += inventory > 0 ? inventory * 0.5 : -inventory;
        }
    }

// -------------------- GET ORDER DATA --------------------
    async function getOrders() {
        try {
            const response = await fetch(`/api/orders/allOrders?roomCode=${roomCode}`, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to fetch orders");
            const data = await response.json();
            if (data.success) setOrderData(data.orders);
        }
        catch (error) {
            console.error("Failed to get orders", error);
        }
    }

// -------------------- GENERATE CHART DATA --------------------
    const chartData = Array.from({ length: week }, (_, i) => ({
        week: i + 1,
        retailerInventory: roleData.RETAILER.inventory[i],
        wholesalerInventory: roleData.WHOLESALER.inventory[i],
        distributorInventory: roleData.DISTRIBUTOR.inventory[i],
        factoryInventory: roleData.FACTORY.inventory[i],
        retailerOrder: orderData["RETAILER"][i + 1],
        wholesalerOrder: orderData["WHOLESALER"][i + 1],
        distributorOrder: orderData["DISTRIBUTOR"][i + 1],
        factoryOrder: orderData["FACTORY"][i + 1],
        customerOrder: gameState.customerOrder[i],
    }));

    const inventoryLines = [
        { key: "retailerInventory", label: "Retailer Inventory", color: "#8884d8" },
        { key: "wholesalerInventory", label: "Wholesaler Inventory", color: "#ff7300" },
        { key: "distributorInventory", label: "Distributor Inventory", color: "#0088FE" },
        { key: "factoryInventory", label: "Factory Inventory", color: "#FFBB28" },
    ];
    const orderLines = [
        { key: "retailerOrder", label: "Retailer Inventory", color: "#8884d8" },
        { key: "wholesalerOrder", label: "Wholesaler Inventory", color: "#ff7300" },
        { key: "distributorOrder", label: "Distributor Inventory", color: "#0088FE" },
        { key: "factoryOrder", label: "Factory Inventory", color: "#FFBB28" },
        { key: "customerOrder", label: "Customer Orders", color: "#FF0000" },
    ];

    const [visibleInventoryLines, setVisibleInventoryLines] = useState<string[]>(inventoryLines.map((line) => line.key));
    const [visibleOrderLines, setVisibleOrderLines] = useState<string[]>(orderLines.map((line) => line.key));
    const toggleInventoryLine = (key: string) => {
        setVisibleInventoryLines((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };
    const toggleOrderLine = (key: string) => {
        setVisibleOrderLines((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

// -------------------- ON RENDER --------------------
    useEffect(() => {
        void getOrders();
    }, [roomCode]);

// -------------------- GRAPH VIEW --------------------
    return (
        <div className="chart-container">
            <h3 className="chart-title">Costs</h3>
            <div className="costs-panel">
                <table className="costs-table">
                    <thead>
                    <tr>
                        <th>Role</th>
                        <th>Total Cost ($)</th>
                    </tr>
                    </thead>
                    <tbody>
                    {roles.map((role) => (
                        <tr key={role}>
                            <td>{role}</td>
                            <td>{costs[role].toFixed(2)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <h3 className="chart-title">Inventory by Week</h3>
            <div className="chart-panel inventory-panel">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 12, right: 18, left: 8, bottom: 6 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {inventoryLines
                            .filter((line) => visibleInventoryLines.includes(line.key))
                            .map((line) => (
                                <Line key={line.key} type="monotone" dataKey={line.key} stroke={line.color} />
                            ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="chart-legend">
                {inventoryLines.map((line) => (
                    <label key={line.key} className="chart-legend-item">
                        <input
                            type="checkbox"
                            checked={visibleInventoryLines.includes(line.key)}
                            onChange={() => toggleInventoryLine(line.key)}
                        />
                        {line.label}
                    </label>
                ))}
            </div>

            <h3 className="chart-title">Orders by Week</h3>
            <div className="chart-panel orders-panel">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 12, right: 18, left: 8, bottom: 6 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {orderLines
                            .filter((line) => visibleOrderLines.includes(line.key))
                            .map((line) => (
                                <Line key={line.key} type="monotone" dataKey={line.key} stroke={line.color} />
                            ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="chart-legend">
                {orderLines.map((line) => (
                    <label key={line.key} className="chart-legend-item">
                        <input
                            type="checkbox"
                            checked={visibleOrderLines.includes(line.key)}
                            onChange={() => toggleOrderLine(line.key)}
                        />
                        {line.label}
                    </label>
                ))}
            </div>
        </div>
    );
}