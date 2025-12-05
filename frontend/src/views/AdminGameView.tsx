import { useEffect, useState } from "react";
import type { Role, Game } from "types";
import { GameGraphs } from "./GameGraphView";
import "../styles/GameView.css";
import { Socket } from "socket.io-client";

interface Props {
    socket: Socket;
    token: string;
    game: Game;
    onExit: () => void;
}

export function AdminGameView({ socket, token, game, onExit }: Props) {
    const { roomCode, week, state: gameState } = game;

    const [showGraphs, setShowGraphs] = useState(false);
    const [orderStatus, setOrderStatus] = useState<Record<string, { amount: number }>>({
        RETAILER: { amount: -1 },
        WHOLESALER: { amount: -1 },
        DISTRIBUTOR: { amount: -1 },
        FACTORY: { amount: -1 },
        CUSTOMER: { amount: -1 },
    });
    const [orders, setOrders] = useState<Record<string, Record<string, number>>>({
        RETAILER: {},
        WHOLESALER: {},
        DISTRIBUTOR: {},
        FACTORY: {},
    });

// -------------------- CONFIRM ORDER STATUSES --------------------
    async function getOrderStatus() {
        try {
            const response = await fetch(`/api/orders/orderStatus?roomCode=${roomCode}`, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to fetch order status");
            const data = await response.json();
            setOrderStatus(data.status);
        }
        catch (error) {
            console.error("Failed to check order statuses", error);
        }
    }

// -------------------- GATHER ALL ORDER DATA --------------------
    async function getAllOrders() {
        try {
            const response = await fetch(`/api/orders/allOrders?roomCode=${roomCode}`, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to fetch all orders");
            const data = await response.json();
            if (data.success) setOrders(data.orders);

        }
        catch (error) {
            console.error("Failed to retrieve all game orders", error);
        }
    }

// -------------------- CONNECT SOCKET -----------
    useEffect(() => {
        void getOrderStatus();
        void getAllOrders();

        if (!socket || !socket.connected) return;
        socket.emit("joinRoom", roomCode);

        const handleStateUpdate = (updatedGame: Game) => {
            if (updatedGame.roomCode === roomCode) {
                setOrderStatus({
                    RETAILER: { amount: -1 },
                    WHOLESALER: { amount: -1 },
                    DISTRIBUTOR: { amount: -1 },
                    FACTORY: { amount: -1 },
                    CUSTOMER: { amount: -1 },
                });
                void getOrderStatus();
                void getAllOrders();
            }
        };

        socket.on("stateUpdate", handleStateUpdate);

        return () => {
            socket.off("stateUpdate", handleStateUpdate);
        };
    }, [socket, roomCode]);

// -------------------- PROCESS SERVER SENT EVENTS --------------------
    useEffect(() => {
        const eventSource = new EventSource(`/api/sse/events/${roomCode}`);
        eventSource.addEventListener("showGraphs", (event) => {
            const data = JSON.parse((event as any).data);
            setShowGraphs(data.show);
        });
        return () => eventSource.close();
    }, [roomCode]);

// -------------------- ADMIN GAME VIEW --------------------
    return (
        <div className="game-view-container">
            <h2>Facilitator Panel - Team: {roomCode}</h2>
            <button onClick={onExit}>Return to Full Game View</button>
            {!showGraphs ? (
                <div>
                    <h3>Current week: {week}</h3>
                    <h3>Order Status</h3>
                    <ul>
                        {["RETAILER", "WHOLESALER", "DISTRIBUTOR", "FACTORY", "CUSTOMER"].map((role) => (
                            <li key={role}>
                                {role}:{" "}
                                {orderStatus[role].amount >= 0 ? (
                                    <span className="order-placed">Order Placed ({orderStatus[role].amount})</span>
                                ) : (
                                    <span className="order-awaiting">Awaiting Order</span>
                                )}
                            </li>
                        ))}
                    </ul>

                    <h3>Full Game State</h3>
                    {gameState && <div style={{overflowX: "auto"}}>
                        <table className="game-overview-table">
                            <thead>
                            <tr>
                                <th>Week</th>
                                {["RETAILER", "WHOLESALER", "DISTRIBUTOR", "FACTORY"].map((role) => (
                                    <th key={role}>{role}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {[...Array(week)].map((_, i) => {
                                const weekIndex = i + 1;
                                return (
                                    <tr key={weekIndex}>
                                        <td>{weekIndex}</td>
                                        {["RETAILER", "WHOLESALER", "DISTRIBUTOR", "FACTORY"].map((role) => {
                                            const r = role as Role;
                                            const inventory = gameState.roles[r]?.inventory[i] ?? "-";
                                            const orderAmount = orders[role]?.[weekIndex.toString()] ?? "-";
                                            return (
                                                <td key={role}>
                                                    Inventory: {inventory} | Amount Ordered: {orderAmount}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>}
                </div>
            ) : (
                <div className="chart-section">
                    <GameGraphs token={token} game={game} />
                </div>
            )}
        </div>
    );
}