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
    const [error, setError] = useState<string>("");

    // Handle login
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

    // Connect to socket and get game state prior to login
    useEffect(() => {
        if (!token) return;

        fetch("/api/state", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((response) => response.json())
            .then((data: GameState) => setGameState(data));

        socket = io("http://localhost:5000");
        socket.on("stateUpdate", (newState: GameState) => {
            setGameState(newState);
        });

        return () => {
            socket?.disconnect();
        };
    }, [token]);

    // Prior to login, show login screen
    if (!token) {
        return (
            <div style={{ padding: "2rem" }}>
                <h1>Supply Chain Game Login</h1>
                <form onSubmit={handleLogin}>
                    <input name="username" placeholder="Role (e.g. retailer)" required />
                    <input name="password" type="password" placeholder="Password" required />
                    <button type="submit">Login</button>
                </form>
                {error && <p style={{ color: "red" }}>{error}</p>}
            </div>
        );
    }

    // ✅ After login, render correct view
    if (!gameState) return <p>Loading game state...</p>;
    return (
        <div style={{ padding: "2rem" }}>
            {role === "admin" ? (
                <AdminView token={token} gameState={gameState} />
            ) : (
                <GameView token={token} role={role as Role} gameState={gameState} />

            )}
        </div>
    );
}