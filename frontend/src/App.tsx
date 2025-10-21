import React, { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

import { PlayerGameView } from "./views/PlayerGameView.tsx";
import { PlayerLobbyView } from "./views/PlayerLobbyView.tsx";
import { AdminLobbyView } from "./views/AdminLobbyView.tsx";
import { AdminGameView } from "./views/AdminGameView.tsx";

import type { Game } from "./types";
import { Role } from "/types";

let socket: Socket | null = null;

export default function App() {
    const [game, setGame] = useState<Game | null>(null);
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
            .then((data) => setAvailableRooms(data.rooms))
            .catch(() => setError("Failed to load rooms"));
    }, [token]);

// -------------------- CONNECT SOCKET --------------------
    useEffect(() => {
        if (!token || !roomCode) return;

        fetch(`/api/game/${roomCode}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((response) => response.json())
            .then((data: Game) => setGame(data))
            .catch(() => setError("Failed to load game"));

        // Connect websocket
        socket = io("http://localhost:5000", { query: { roomCode } });
        socket.on("stateUpdate", (updatedGame: Game) => {
            setGame(updatedGame);
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

// -------------------- LOBBY VIEWS --------------------
    if (!roomCode) {
        if (role === "ADMIN") {
            return (
                <AdminLobbyView
                    token={token}
                    availableRooms={availableRooms}
                    onRoomSelect={setRoomCode}
                    refreshRooms={() => {
                        fetch("/api/rooms", { headers: { Authorization: `Bearer ${token}` } })
                            .then((response) => response.json())
                            .then((data) => setAvailableRooms(data.rooms))
                            .catch(() => setError("Failed to load rooms"));
                    }}
                />
            );
        }
        else {
            return (
                <PlayerLobbyView
                    availableRooms={availableRooms}
                    onRoomSelect={(selectedRoom, selectedRole) => {
                        setRoomCode(selectedRoom);
                        setRole(selectedRole);
                    }}
                />
            );
        }
    }

// -------------------- GAME VIEWS --------------------
    if (!game) return <p>Loading game state...</p>;
    if (role === "ADMIN") {
        return <AdminGameView token={token} game={game} />;
    }
    else {
        return <PlayerGameView token={token} role={role as Role} game={game} />;
    }
}