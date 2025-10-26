import React, { useState } from "react";

interface Props {
    token: string;
    availableRooms: string[];
    onRoomSelect: (roomCode: string) => void;
    refreshRooms: () => void;
}

export function AdminLobbyView({ token, availableRooms, onRoomSelect, refreshRooms }: Props) {
    const [newRoomCode, setNewRoomCode] = useState("");
    const [message, setMessage] = useState("");

// -------------------- CREATE NEW ROOM --------------------
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
            setNewRoomCode("");
            refreshRooms();
        }
        else {
            setMessage("Failed to create room");
        }
    }

// -------------------- ADMIN LOBBY VIEW --------------------
    return (
        <div style={{ padding: "2rem" }}>
            <h2>Admin Lobby</h2>

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

            <h3>Or join an existing room</h3>
            {availableRooms.length === 0 ? (
                <p>No active rooms</p>
            ) : (
                <ul>
                    {availableRooms.map((room) => (
                        <li key={room}>
                            {room}{" "}
                            <button onClick={() => onRoomSelect(room)}>Join</button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}