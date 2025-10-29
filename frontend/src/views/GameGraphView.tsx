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

    return (
        <div className="chart-container">
            <h3>Inventory and Backlog by Role</h3>
            <ResponsiveContainer width="100%" className="inventory-backlog-chart">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="retailerInventory" stroke="#8884d8" />
                    <Line type="monotone" dataKey="retailerBacklog" stroke="#82ca9d" />
                    <Line type="monotone" dataKey="wholesalerInventory" stroke="#ff7300" />
                    <Line type="monotone" dataKey="wholesalerBacklog" stroke="#387908" />
                    <Line type="monotone" dataKey="distributorInventory" stroke="#0088FE" />
                    <Line type="monotone" dataKey="distributorBacklog" stroke="#00C49F" />
                    <Line type="monotone" dataKey="factoryInventory" stroke="#FFBB28" />
                    <Line type="monotone" dataKey="factoryBacklog" stroke="#FF8042" />
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