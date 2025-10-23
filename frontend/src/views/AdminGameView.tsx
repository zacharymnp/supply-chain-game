import React, { useState } from "react";
import type { Game } from "types";

interface Props {
    token: string;
    game: Game;
}

export function AdminGameView({ token, game }: Props) {
    const roomCode = game.roomCode;
    const week = game.week;
    const gameState = game.state;

    const [newCustomerOrder, setNewCustomerOrder] = useState<number>(0);
    const [message, setMessage] = useState<string>("");

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
            <button onClick={nextWeek}>Advance Week</button>

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