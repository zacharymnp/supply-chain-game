//import React from "react";
import type { Game } from "types";

interface Props {
    token: string;
    game: Game;
}

export function AdminGameView({ token, game }: Props) {
    const roomCode = game.roomCode;
    const week = game.week;
    const gameState = game.state;

    async function nextWeek() {
        await fetch("/api/advanceWeek", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ roomCode }),
        });
    }

    return (
        <div style={{ padding: "2rem" }}>
            <h2>Facilitator Panel - Room: {roomCode}</h2>
            <p>Current week: {week}</p>
            <button onClick={nextWeek}>Advance Week</button>
            <h3>Full Game State</h3>
            <pre>{JSON.stringify(gameState, null, 2)}</pre>
        </div>
    );
}