import React, { useState } from "react";
import type { GameState } from "types";

interface Props {
    token: string;
    roomCode?: string;
    gameState?: GameState;
}

export function AdminView({ token, roomCode, gameState }: Props) {
    const [newRoomCode, setNewRoomCode] = useState("");
    const [message, setMessage] = useState("");

    async function createRoom(event: React.FormEvent) {
        event.preventDefault();
        const response = await fetch(`/api/createGame`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ roomCode: newRoomCode }),
        });
        if (response.ok) {
            setMessage(`Created room ${newRoomCode}`);
        } else {
            setMessage("Failed to create room");
        }
    }

    if (!roomCode || !gameState) {
        return (
            <div style={{ padding: "2rem" }}>
                <h2>Admin Control Panel</h2>
                <form onSubmit={createRoom}>
                    <input
                        placeholder="New Room Code"
                        value={newRoomCode}
                        onChange={(event) => setNewRoomCode(event.target.value)}
                        required
                    />
                    <button type="submit">Create Room</button>
                </form>
                {message && <p>{message}</p>}
            </div>
        );
    }

    async function nextWeek() {
        await fetch("/api/advanceWeek", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ roomCode }),
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