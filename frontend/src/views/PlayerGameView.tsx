import React, { useEffect, useState } from "react";
import type { Role, Game } from "types";

import { Socket } from "socket.io-client";

interface Props {
    socket: Socket;
    token: string;
    game: Game;
    role: Role;
}

export function PlayerGameView({ socket, token, game, role }: Props) {
    const { roomCode, week, state: gameState } = game;
    const roleData = gameState.roles[role];

    const [message, setMessage] = useState<string>("");

// -------------------- CONNECT SOCKET --------------------
    useEffect(() => {
        socket.emit("joinRoom", roomCode);

        socket.on("stateUpdate", (updatedGame: Game) => {
            if (updatedGame.roomCode === roomCode) {
                console.log("Game state updated");
            }
        });

        return () => {
            socket.off("stateUpdate");
        };
    }, [socket, roomCode]);

// -------------------- PLACE ORDER --------------------
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

// -------------------- PLAYER GAME VIEW --------------------
    return (
        <div>
            <h2>Room: {roomCode}</h2>
            <h3>Role: {role}</h3>
            <p>Week: {week}</p>
            <p>Inventory: {roleData.inventory[week - 1]}</p>
            <p>Backlog: {roleData.backlog[week - 1]}</p>

            <form onSubmit={submitOrder}>
                <input name="amount" type="number" placeholder="Order amount" required />
                <button type="submit">Place Order</button>
            </form>

            {message && <p style={{ color: "green" }}>{message}</p>}
        </div>
    );
}