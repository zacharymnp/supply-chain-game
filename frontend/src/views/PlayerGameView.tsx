import React, { useState } from "react";
import type { Role, Game } from "types";

interface Props {
    token: string;
    game: Game;
    role: Role;
}

export function PlayerGameView({ token, game, role }: Props) {
    const roomCode = game.roomCode;
    const week = game.week;
    const gameState = game.state;
    const roleData = gameState.roles[role];

    const [message, setMessage] = useState<string>("");

    async function submitOrder(event: React.FormEvent) {
        event.preventDefault();

        const form = event.currentTarget as HTMLFormElement;
        const amountInput = form.amount as HTMLInputElement;
        const amount = Number(amountInput.value);

        try {
            const response = await fetch("/api/order", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ roomCode, role, amount, week }),
            });

            if (response.ok) {
                amountInput.value = "";
                setMessage(`Order of ${amount} submitted successfully!`);
                setTimeout(() => setMessage(""), 10000);
            }
            else {
                setMessage("Failed to submit order.");
            }
        }
        catch (error) {
            console.error(error);
            setMessage("Server error, please try again.");
        }
    }

    return (
        <div>
            <h2>Room: {roomCode}</h2>
            <h3>Role: {role}</h3>
            <p>Week: {week}</p>
            <p>Inventory: {roleData.inventory}</p>
            <p>Backlog: {roleData.backlog}</p>

            <form onSubmit={submitOrder}>
                <input name="amount" type="number" placeholder="Order amount" required />
                <button type="submit">Place Order</button>
            </form>

            {message && <p style={{ color: "green" }}>{message}</p>}
        </div>
    );
}