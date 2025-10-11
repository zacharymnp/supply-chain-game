//import React from "react";
import type { GameState } from "types";

interface Props {
    token: string;
    gameState: GameState;
}

export function AdminView({ token, gameState }: Props) {
    async function nextWeek() {
        await fetch("/api/advanceWeek", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    return (
        <div>
            <h2>Facilitator Panel</h2>
            <p>Current week: {gameState.week}</p>
            <button onClick={nextWeek}>Advance Week</button>

            <h3>Full Game State</h3>
            <pre>{JSON.stringify(gameState, null, 2)}</pre>
        </div>
    );
}