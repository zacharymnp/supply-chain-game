import React, { useEffect, useState } from "react";
import type { Game } from "types";

import { io } from "socket.io-client";
const socket = io();

interface Props {
    token: string;
    game: Game;
}

export function AdminGameView({ token, game }: Props) {
    const roomCode = game.roomCode;
    const week = game.week;
    const gameState = game.state;

    const [newCustomerOrder, setNewCustomerOrder] = useState<number>(0);
    const [customerOrderPlaced, setCustomerOrderPlaced] = useState<boolean>(false);
    const [message, setMessage] = useState<string>("");
    const [orderStatus, setOrderStatus] = useState<Record<string, boolean>>({});

    async function getOrderStatus() {
        // check team orders
        const response = await fetch(`/api/orderStatus?roomCode=${roomCode}&week=${week}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
            const data = await response.json();
            setOrderStatus(data.status);

            // check customer order
            try {
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
        else {
            console.error("Failed to fetch order status");
        }
    }
    useEffect(() => {
        void getOrderStatus();

        socket.on("stateUpdate", (updatedGame) => {
            if (updatedGame.roomCode === roomCode) {
                setOrderStatus({});
                void getOrderStatus();
            }
        });

        return () => {
            socket.off("stateUpdate");
        };
    }, [roomCode, week]);

    // only allow the admin to advance the week once all orders have been placed
    const allOrdersPlaced = Object.values(orderStatus).every((placed) => placed)
        && customerOrderPlaced;

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
            setNewCustomerOrder(0);
        }
        else {
            setMessage("Failed to add customer order.");
        }
    }

    return (
        <div style={{ padding: "2rem" }}>
            <h2>Facilitator Panel - Room: {roomCode}</h2>
            <p>Current week: {week}</p>

            <h3>Order Status</h3>
            <ul>
                {["RETAILER", "WHOLESALER", "DISTRIBUTOR", "FACTORY"].map((role) => (
                    <li key={role}>
                        {role}:{" "}
                        {orderStatus[role] ? (
                            <span style={{ color: "green" }}>Order Placed</span>
                        ) : (
                            <span style={{ color: "red" }}>Awaiting Order</span>
                        )}
                    </li>
                ))}
            </ul>

            <button onClick={nextWeek} disabled={!allOrdersPlaced}>
                {allOrdersPlaced ? "Advance Week" : "Waiting for orders..."}
            </button>

            <form onSubmit={submitCustomerOrder} style={{ marginTop: "1rem" }}>
                <input
                    type="number"
                    placeholder="Customer order amount"
                    value={newCustomerOrder}
                    onChange={(event) => setNewCustomerOrder(Number(event.target.value))}
                    min={0}
                    required
                />
                <button type="submit" style={{ marginLeft: "0.5rem" }}>
                    Add Customer Order
                </button>
            </form>

            {message && <p style={{ color: "green" }}>{message}</p>}

            <h3>Full Game State</h3>
            <pre>{JSON.stringify(gameState, null, 2)}</pre>
        </div>
    );
}