import React, { useEffect, useState } from "react";
import type { Role, Game } from "types";
import { GameGraphs } from "./GameGraphView";
import "./GameView.css";
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

    const [outgoingOrder, setOutgoingOrder] = useState<string>("");
    const [message, setMessage] = useState<string>("");

// -------------------- CONNECT SOCKET --------------------
    useEffect(() => {
        socket.emit("joinRoom", roomCode);


        const handleStateUpdate = (updatedGame: Game) => {
            if (updatedGame.roomCode === roomCode) {
                void getOutgoingOrder();
            }
        };

        socket.on("stateUpdate", handleStateUpdate);

        return () => {
            socket.off("stateUpdate", handleStateUpdate);
        };
    }, [socket, roomCode, week]);

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

// -------------------- GET OUTGOING ORDER --------------------
    async function getOutgoingOrder() {
        try {
            const response = await fetch(`/api/outgoingOrder?roomCode=${roomCode}&role=${role}`, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to fetch outgoing order");
            const data = await response.json();
            if (data.amount > -1) setOutgoingOrder(data.amount);
        }
        catch (error) {
            console.error("Failed to get outgoing order", error);
        }
    }

// -------------------- PLAYER GAME VIEW --------------------
    return (
        <div className="game-view-container">
            <h2>Room: {roomCode}</h2>
            <h3>Role: {role}</h3>
            <p>Week: {week}</p>
            <p>
                {roleData.inventory[week - 1] >= 0
                ? `Inventory: ${roleData.inventory[week - 1]}`
                : `Backlog: ${-roleData.inventory[week - 1]}`}
            </p>
            {outgoingOrder && <p className="outgoing-order">Outgoing order: {outgoingOrder}</p>}

            {week < 50 ? (
                <form onSubmit={submitOrder}>
                    <input name="amount" type="number" placeholder="Order amount" min={0} required />
                    <button type="submit">Place Order</button>
                    {message && <p className="message">{message}</p>}
                </form>
            ) : (
                <div className="chart-section">
                    <GameGraphs game={game} />
                </div>
            )}
        </div>
    );
}