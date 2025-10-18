import React, { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

import { GameView } from "./views/GameView";
import { AdminView } from "./views/AdminView";
import type { Role, GameState } from "./types";

let socket: Socket | null = null;

export default function App() {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [roomCode, setRoomCode] = useState<string>("");
    const [availableRooms, setAvailableRooms] = useState<string[]>([]);
    const [error, setError] = useState<string>("");

// -------------------- LOGIN --------------------
    async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const username = (form.elements.namedItem("username") as HTMLInputElement).value;
        const password = (form.elements.namedItem("password") as HTMLInputElement).value;

        const response = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            setError("Invalid username or password");
            return;
        }

        const data = await response.json();
        setToken(data.token);
        setRole(data.role);
        setError("");
    }

// -------------------- FETCH ROOMS --------------------
    useEffect(() => {
        if (!token) return;

        fetch("/api/rooms", {headers: {Authorization: `Bearer ${token}`}})
            .then((response) => response.json())
            .then((data) => {
                console.log("Fetched rooms:", data);
                setAvailableRooms(data.rooms);
            })
            .catch((error) => {
                console.error("Failed to load rooms:", error);
                setError("Failed to load rooms");
            });
    });

// -------------------- CONNECT SOCKET --------------------
    useEffect(() => {
        if (!token || !roomCode) return;

        fetch(`/api/state/${roomCode}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((response) => response.json())
            .then((data: GameState) => setGameState(data))
            .catch((error) => {
                console.error("Failed to load game state:", error);
                setError("Failed to load game state")
            });

        // Connect websocket
        socket = io("http://localhost:5000", { query: { roomCode } });
        socket.on("stateUpdate", (newState: GameState) => {
            setGameState(newState);
        });

        return () => {
            socket?.disconnect();
        };
    }, [token, roomCode]);

// -------------------- LOGIN SCREEN --------------------
    if (!token) {
        return (
            <div style={{ padding: "2rem" }}>
                <h1>Supply Chain Game Login</h1>
                <form onSubmit={handleLogin}>
                    <input name="username" placeholder="Username" required />
                    <input name="password" type="password" placeholder="Password" required />
                    <button type="submit">Login</button>
                </form>
                {error && <p style={{ color: "red" }}>{error}</p>}
            </div>
        );
    }

// -------------------- ROOM SELECTION --------------------
    if (!token || !roomCode) {
        if (role === "admin") {
            return <AdminView token={token}/>;
        }
        else {
            return (
                <div style={{ padding: "2rem" }}>
                    <h2>Select Room & Role</h2>
                    {availableRooms.length === 0 ? (
                        <p>No active rooms. Please wait for an admin to create one.</p>
                    ) : (
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                const form = event.currentTarget;
                                const selectedRoom = (form.elements.namedItem("roomCode") as HTMLSelectElement).value;
                                const selectedRole = (form.elements.namedItem("role") as HTMLSelectElement).value;
                                setRoomCode(selectedRoom);
                                setRole(selectedRole);
                            }}
                        >
                            <label>
                                Room:
                                <select name="roomCode" required>
                                    {availableRooms.map((room) => (
                                        <option key={room} value={room}>
                                            {room}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                Role:
                                <select name="role" required>
                                    <option value="retailer">Retailer</option>
                                    <option value="wholesaler">Wholesaler</option>
                                    <option value="distributor">Distributor</option>
                                    <option value="factory">Factory</option>
                                </select>
                            </label>
                            <button type="submit">Join Game</button>
                        </form>
                    )}
                </div>
            );
        }
    }

// -------------------- GAME VIEW --------------------
    if (!gameState) return <p>Loading game state...</p>;
    return (
        <div style={{ padding: "2rem" }}>
            {role === "admin" ? (
                <AdminView token={token} roomCode={roomCode} gameState={gameState} />
            ) : (
                <GameView token={token} roomCode={roomCode} role={role as Role} gameState={gameState} />

            )}
        </div>
    );
}