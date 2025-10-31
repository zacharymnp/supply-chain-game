import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

import { PlayerGameView } from "./views/PlayerGameView.tsx";
import { PlayerLobbyView } from "./views/PlayerLobbyView.tsx";
import { AdminLobbyView } from "./views/AdminLobbyView.tsx";
import { AdminGameView } from "./views/AdminGameView.tsx";
import "./styles/LobbyView.css";

import type { Game } from "./types";
import { Role } from "/types";

export default function App() {
    const [game, setGame] = useState<Game | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [roomCode, setRoomCode] = useState<string>("");
    const [availableRooms, setAvailableRooms] = useState<string[]>([]);
    const [error, setError] = useState<string>("");
    const [isRegistering, setRegistering] = useState<boolean>(false);

    const socketReference = useRef<Socket | null>(null);

// -------------------- COOKIES --------------------

    if((document.cookie).length > 0 && !token && !role){
        let cookie = document.cookie;
        let t = ""
        let r = ""
        for(let i = 0; i < cookie.length; i ++){
            if(cookie.charAt(i) === '_'){
                r = cookie.substring(0, i);
                t = cookie.substring(i);
            }
        }
        t = t.substring(6);
        r = r.substring(5);
        setToken(t);
        setRole(r);
        setError("");
    }

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
        document.cookie = "role=" + data.role + "_token=" + data.token;
        console.log(document.cookie);
        setToken(data.token);
        setRole(data.role);
        setError("");
    }

// -------------------- DISPLAY REGISTRATION SCREEN --------------------
    async function goToRegistration(){
        setRegistering(true);
    }

// -------------------- REGISTER ACCOUNT --------------------
    async function returnToLogin(event: React.FormEvent<HTMLFormElement>){
        event.preventDefault();
        const form = event.currentTarget;
        const username = (form.elements.namedItem("username") as HTMLInputElement).value;
        const password = (form.elements.namedItem("password") as HTMLInputElement).value;
        const password2 = (form.elements.namedItem("password2") as HTMLInputElement).value;
        if(password === password2){
            setRegistering(false); 
            setError("");
            await fetch("/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ username, password }),
            });
            
        }
        else{
           setError("Passwords must match");
        }
        
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

        // close any existing socket before reconnecting
        if (socketReference.current) {
            socketReference.current.disconnect();
        }

        // initialize socket connection
        const socket = io("http://localhost:5000", {
            query: { roomCode },
            auth: { token },
        });
        socketReference.current = socket;

        // event listeners
        socket.on("connect", () => {
            console.log("Connected to WebSocket:", socket.id);
        });
        socket.on("disconnect", (reason) => {
            console.log("Disconnected from WebSocket:", reason);
        });
        socket.on("error", (msg) => {
            console.error("Socket error:", msg);
        });
        socket.on("stateUpdate", (updatedGame: Game) => {
            console.log("Received state update:", updatedGame);
            setGame(updatedGame);
        });

        return () => {
            console.log("Cleaning up socket connection...");
            socket.disconnect();
            socketReference.current = null;
        };
    }, [token, roomCode]);

// ------------- REGISTRATION SCREEN ----------------------
    if (isRegistering) {
        return (
            <div className="lobby-container">
                <h1>Registration</h1>
                <form onSubmit={returnToLogin}>
                    <input name="username" placeholder="Username" required />
                    <input name="password" type="password" placeholder="Password" required />
                    <input name="password2" type="password" placeholder="Confirm Password" required />
                    <button type="submit">Register</button>
                </form>
                {error && <p className="error-message">{error}</p>}
            </div>
        );
    }

// -------------------- LOGIN SCREEN --------------------
    if (!token) {
        return (
        <div className="lobby-container">
            <h1>Supply Chain Game Login</h1>
            <form onSubmit={handleLogin}>
                <input name="username" placeholder="Username" required />
                <input name="password" type="password" placeholder="Password" required />
                <button type="submit">Login</button>
            </form>
            <form onSubmit={goToRegistration}>
                <button type="submit">Register</button>
            </form>
            {error && <p className="error-message">{error}</p>}
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
        return <AdminGameView socket={socketReference.current!} token={token} game={game} />;
    }
    else {
        return <PlayerGameView socket={socketReference.current!} token={token} role={role as Role} game={game} />;
    }
}