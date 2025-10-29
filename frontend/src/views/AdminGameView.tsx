import React, { useEffect, useState } from "react";
import type { Game } from "types";
import { GameGraphs } from "./GameGraphView";
import "./GameView.css";
import { Socket } from "socket.io-client";

interface Props {
    socket: Socket;
    token: string;
    game: Game;
}

export function AdminGameView({ socket, token, game }: Props) {
    const { roomCode, week, state: gameState } = game;

    const [newCustomerOrder, setNewCustomerOrder] = useState<number>(0);
    const [customerOrderPlaced, setCustomerOrderPlaced] = useState<boolean>(false);
    const [message, setMessage] = useState<string>("");
    const [orderStatus, setOrderStatus] = useState<Record<string, boolean>>({});

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

            // check customer order
            const gameResponse = await fetch(`/api/game/${roomCode}`, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (gameResponse.ok) {
                const gameData = await gameResponse.json();
                setCustomerOrderPlaced(gameData.state.customerOrder.length >= week);
            }
        }
        catch (error) {
            console.error("Failed to check customer order", error);
        }
    }

// -------------------- CONNECT SOCKET -----------
    useEffect(() => {
        socket.emit("joinRoom", roomCode);
        void getOrderStatus(); // initial load

        const handleStateUpdate = (updatedGame: Game) => {
            if (updatedGame.roomCode === roomCode) {
                setOrderStatus({});
                void getOrderStatus();
            }
        };

        socket.on("stateUpdate", handleStateUpdate);

        return () => {
            socket.off("stateUpdate", handleStateUpdate);
        };
    }, [socket, roomCode, week, token]);

// -------------------- ADVANCE WEEK --------------------
    async function nextWeek(event: React.MouseEvent<HTMLButtonElement>) {
        event.preventDefault();
        await fetch("/api/advanceWeek", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ roomCode }),
        });
    }

// -------------------- SUBMIT CUSTOMER ORDER --------------------
    async function submitCustomerOrder(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const amount = Number(newCustomerOrder);
        if (isNaN(amount) || amount < 0) return;

        const response = await fetch("/api/customerOrder", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ roomCode, amount }),
        });

        if (response.ok) {
            setMessage(`Customer order of ${amount} added successfully!`);
            setNewCustomerOrder(amount);
        }
        else {
            setMessage("Failed to add customer order.");
        }
    }

// -------------------- COMPUTE ORDER STATUS --------------------
    const allOrdersPlaced = Object.values(orderStatus).every((placed) => placed)
        && customerOrderPlaced;

// -------------------- ADMIN GAME VIEW --------------------
    return (
        <div className="game-view-container">
            <h2>Facilitator Panel - Room: {roomCode}</h2>
            <p>Current week: {week}</p>

            {week < 50 ? (
                <>
                    <h3>Order Status</h3>
                    <ul>
                        {["RETAILER", "WHOLESALER", "DISTRIBUTOR", "FACTORY"].map((role) => (
                            <li key={role}>
                                {role}:{" "}
                                {orderStatus[role] ? (
                                    <span className="order-placed">Order Placed</span>
                                ) : (
                                    <span className="order-awaiting">Awaiting Order</span>
                                )}
                            </li>
                        ))}
                    </ul>

                    <button onClick={nextWeek} disabled={!allOrdersPlaced}>
                        {allOrdersPlaced ? "Advance Week" : "Waiting for orders..."}
                    </button>

                    <form onSubmit={submitCustomerOrder}>
                        <input
                            type="number"
                            placeholder="Customer order amount"
                            value={newCustomerOrder}
                            onChange={(event) => setNewCustomerOrder(Number(event.target.value))}
                            min={0}
                            required
                        />
                        <button type="submit">Add Customer Order</button>
                    </form>

                    {message && <p className="message">{message}</p>}

                    <h3>Full Game State</h3>
                    <pre>{JSON.stringify(gameState, null, 2)}</pre>
                </>
            ) : (
                <div className="chart-section">
                    <GameGraphs game={game} />
                </div>
            )}
        </div>
    );
}