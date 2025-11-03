import { useEffect, useState } from "react";
import type { Game } from "types";
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

// -------------------- CONFIRM ORDER STATUSES --------------------
    async function getOrderStatus() {
        try {
            // check team orders
            const response = await fetch(`/api/orderStatus?roomCode=${roomCode}`, {
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

// -------------------- CONNECT SOCKET -----------
    useEffect(() => {
        if (!socket || !socket.connected) return;
        socket.emit("joinRoom", roomCode);
        void getOrderStatus();

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
            }
        };

        socket.on("stateUpdate", handleStateUpdate);

        return () => {
            socket.off("stateUpdate", handleStateUpdate);
        };
    }, [socket, roomCode]);

// -------------------- PROCESS SERVER SENT EVENTS --------------------
    useEffect(() => {
        const eventSource = new EventSource(`/api/events/${roomCode}`);
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
                    <p>Current week: {week}</p>
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
                    <pre>{JSON.stringify(gameState, null, 2)}</pre>
                </div>
            ) : (
                <div className="chart-section">
                    <GameGraphs token={token} game={game} />
                </div>
            )}
        </div>
    );
}