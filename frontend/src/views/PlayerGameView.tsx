import React from "react";
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

    async function submitOrder(event: React.FormEvent) {
        event.preventDefault();
        const amount = Number((event.currentTarget as HTMLFormElement).amount.value);
        await fetch("/api/order", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ roomCode, role, amount, week }),
        });
    }

    const roleData = gameState.roles[role];

    // TODO: temp
    const orders: number[] = [];
    roleData.incomingOrders.forEach((order) => {
        orders.push(order.amount);
    })

    return (
        <div>
            <h2>Room: {roomCode}</h2>
            <h3>Role: {role}</h3>
            <p>Week: {week}</p>
            <p>Inventory: {roleData.inventory}</p>
            <p>Backlog: {roleData.backlog}</p>
            <p>Orders: {orders.join(", ") || "none"}</p>

            <form onSubmit={submitOrder}>
                <input name="amount" type="number" placeholder="Order amount" required />
                <button type="submit">Place Order</button>
            </form>
        </div>
    );
}