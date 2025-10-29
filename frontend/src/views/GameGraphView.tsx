import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { Game } from "types";

interface Props {
    game: Game;
}

export function GameGraphs({ game }: Props) {
    if (!game) return null;
    const roleData = game.state.roles;

    const chartData = Array.from({ length: game.week }, (_, i) => ({
        week: i + 1,
        retailerInventory: roleData.RETAILER.inventory[i],
        retailerBacklog: roleData.RETAILER.backlog[i],
        wholesalerInventory: roleData.WHOLESALER.inventory[i],
        wholesalerBacklog: roleData.WHOLESALER.backlog[i],
        distributorInventory: roleData.DISTRIBUTOR.inventory[i],
        distributorBacklog: roleData.DISTRIBUTOR.backlog[i],
        factoryInventory: roleData.FACTORY.inventory[i],
        factoryBacklog: roleData.FACTORY.backlog[i],
        customerOrder: game.state.customerOrder[i],
    }));

    const lines = [
        { key: "retailerInventory", label: "Retailer Inventory", color: "#8884d8" },
        { key: "retailerBacklog", label: "Retailer Backlog", color: "#82ca9d" },
        { key: "wholesalerInventory", label: "Wholesaler Inventory", color: "#ff7300" },
        { key: "wholesalerBacklog", label: "Wholesaler Backlog", color: "#387908" },
        { key: "distributorInventory", label: "Distributor Inventory", color: "#0088FE" },
        { key: "distributorBacklog", label: "Distributor Backlog", color: "#00C49F" },
        { key: "factoryInventory", label: "Factory Inventory", color: "#FFBB28" },
        { key: "factoryBacklog", label: "Factory Backlog", color: "#FF8042" },
    ];

    const [visibleLines, setVisibleLines] = useState<string[]>(lines.map((line) => line.key));
    const toggleLine = (key: string) => {
        setVisibleLines((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    return (
        <div className="chart-container">
            <h3>Toggle Lines</h3>
            {lines.map((line) => (
                <label key={line.key}>
                    <input
                        type="checkbox"
                        checked={visibleLines.includes(line.key)}
                        onChange={() => toggleLine(line.key)}
                    />
                    {line.label}
                </label>
            ))}

            <h3>Inventory and Backlog by Role</h3>
            <ResponsiveContainer width="100%" className="inventory-backlog-chart">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {lines
                        .filter((line) => line.key !== "customerOrder" && visibleLines.includes(line.key))
                        .map((line) => (
                            <Line key={line.key} type="monotone" dataKey={line.key} stroke={line.color} />
                        ))}
                </LineChart>
            </ResponsiveContainer>

            <h3>Customer Orders</h3>
            <ResponsiveContainer width="100%" className="customer-order-chart">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="customerOrder" stroke="#FF0000" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}