import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

import { PlayerGameView } from "./views/PlayerGameView.tsx";
import { PlayerLobbyView } from "./views/PlayerLobbyView.tsx";
import { AdminLobbyView } from "./views/AdminLobbyView.tsx";
import { AdminGroupView } from "./views/AdminGroupView.tsx";
import { AdminGameView } from "./views/AdminGameView.tsx";
import "./styles/LobbyView.css";

import type { Game } from "./types";
import { Role } from "./types";

export default function App() {
    const [game, setGame] = useState<Game | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [roomCode, setRoomCode] = useState<string>("");
    const [groupCode, setGroupCode] = useState<string>("");
    const [availableRooms, setAvailableRooms] = useState<string[]>([]);
    const [availableGroups, setAvailableGroups] = useState<string[]>([]);
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
        const response = await fetch("/api/auth/login", {
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
            await fetch("/api/auth/register", {
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

// -------------------- FETCH GROUPS --------------------
    useEffect(() => {
        if (!token) return;

        fetch("/api/groups", {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` }})
            .then((response) => response.json())
            .then((data) => setAvailableGroups(data.groups))
            .catch(() => setError("Failed to load groups"));

        fetch("/api/games/rooms", {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` }})
            .then((response) => response.json())
            .then((data) => setAvailableRooms(data.rooms))
            .catch(() => setError("Failed to load rooms"));
    }, [token]);

// -------------------- CONNECT SOCKET --------------------
    useEffect(() => {
        if (!token) return;
        if (socketReference.current) socketReference.current.disconnect(); // close any existing socket before reconnecting

        // initialize socket connection
        const socket = io(import.meta.env.VITE_BACKEND_URL, {
            auth: { token }
        });
        socketReference.current = socket;

        // event listeners
        socket.on("connect", () => {});
        socket.on("disconnect", () => {});
        socket.on("error", (msg) => {
            console.error("Socket error:", msg);
        });
        socket.on("stateUpdate", (updatedGame: Game) => {
            setGame(updatedGame);
        });

        return () => {
            socket.disconnect();
            socketReference.current = null;
        };
    }, [token]);

// -------------------- LOAD GAME ON ROOM CHANGE --------------------
    useEffect(() => {
        if (!token || !roomCode) return;

        fetch(`/api/games/${roomCode}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` }})
            .then((response) => response.json())
            .then((data: Game) => setGame(data))
            .catch(() => setError("Failed to load game"));
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

// -------------------- VIEWS --------------------
    if (role === "ADMIN") {
        // AdminLobbyView
        if (!groupCode && !roomCode) {
            return (
                <AdminLobbyView
                    token={token}
                    availableGroups={availableGroups}
                    onGroupSelect={(group) => setGroupCode(group)}
                    refreshGroups={() => {
                        fetch("/api/groups", {
                            method: "GET",
                            headers: { Authorization: `Bearer ${token}` }})
                            .then((response) => response.json())
                            .then((data) => setAvailableGroups(data.groups))
                            .catch(() => setError("Failed to load groups"));
                    }}
                />
            );
        }

        // AdminGroupView
        if (groupCode && !roomCode) {
            return (
                <AdminGroupView
                    socket={socketReference.current!}
                    token={token}
                    groupCode={groupCode}
                    onRoomSelect={(room) => setRoomCode(room)}
                    onExit={() => setGroupCode("")}
                />
            );
        }

        // AdminGameView
        if (roomCode) {
            if (!game) return <p>Loading game state...</p>;
            return <AdminGameView
                socket={socketReference.current!}
                token={token}
                game={game}
                onExit={() => setRoomCode("")}
            />
        }
    }

    // PlayerLobbyView
    if (!roomCode) {
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

    // PlayerGameView
    if (!game) return <p>Loading game state...</p>;
    return <PlayerGameView socket={socketReference.current!} token={token} role={role as Role} game={game} />;
}