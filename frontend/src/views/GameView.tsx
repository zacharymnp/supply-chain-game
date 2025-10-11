import React from "react";
import type { Role, GameState } from "types";

interface Props {
    token: string;
    role: Role;
    gameState: GameState;
}

export function GameView({ token, role, gameState }: Props) {
    async function submitOrder(event: React.FormEvent) {
        event.preventDefault();
        const amount = Number((event.currentTarget as HTMLFormElement).amount.value);
        await fetch("/api/order", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ role, amount }),
        });
    }

    const roleData = gameState.roles[role];

    return (
        <div>
            <h2>Role: {role}</h2>
            <p>Week: {gameState.week}</p>
            <p>Inventory: {roleData.inventory}</p>
            <p>Backlog: {roleData.backlog}</p>
            <p>Orders: {roleData.orders.join(", ") || "none"}</p>

            <form onSubmit={submitOrder}>
                <input name="amount" type="number" placeholder="Order amount" required />
                <button type="submit">Place Order</button>
            </form>
        </div>
    );
}