import React, { useEffect, useState } from "react";
import "../styles/GameView.css";
import { Socket } from "socket.io-client";

interface Props {
    socket: Socket;
    token: string;
    groupCode: string;
    onRoomSelect: (roomCode: string) => void;
    onExit: () => void;
}

export function AdminGroupView({ socket, token, groupCode, onRoomSelect, onExit }: Props) {
    const [games, setGames] = useState<string[]>([]);
    const [week, setWeek] = useState<number>(1);
    const [selectedGame, setSelectedGame] = useState<string>("");
    const [newCustomerOrder, setNewCustomerOrder] = useState<number>(0);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

// -------------------- LOAD GAMES IN GROUP --------------------
    async function loadGroupData() {
        try {
            const response = await fetch(`/api/group/${groupCode}`, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            setGames(data.games);
            setWeek(data.week);
        }
        catch (error) {
            console.error("Failed to load games", error);
            setError("Failed to load games");
        }
    }

    useEffect(() => {
        void loadGroupData();
    }, [token, groupCode]);


// -------------------- HANDLE SELECTED GAME --------------------
    useEffect(() => {
        if (selectedGame && socket) {
            socket.emit("joinRoom", selectedGame);
        }
    }, [socket, selectedGame]);

// -------------------- ADVANCE WEEK --------------------
    async function advanceWeek(event: React.FormEvent) {
        event.preventDefault();
        try {
            let allOrdersIn = true;

            for (const room of games) {
                const response = await fetch(`/api/orderStatus?roomCode=${room}`, {
                    method: "GET",
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!response.ok) throw new Error("Failed to fetch order status");
                const data = await response.json();
                for (const role in data.status) {
                    if (data.status[role].amount === -1) {
                        allOrdersIn = false;
                        break;
                    }
                }
            }

            if (!allOrdersIn) {
                setMessage("Not all orders are placed yet.");
                setTimeout(() => setMessage(""), 10000);
            }
            else {
                const response = await fetch("/api/advanceWeek", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ groupCode: groupCode }),
                });
                if (!response.ok) throw new Error("Failed to advance week");
                setMessage("Advanced week for all rooms.");
                setTimeout(() => setMessage(""), 10000);
                await loadGroupData();
            }
        }
        catch (error) {
            console.error("Failed to advance all selected weeks", error);
            setError("Error advancing weeks.");
        }
    }

// -------------------- ADD CUSTOMER ORDER TO ALL GAMES --------------------
    async function addCustomerOrder(event: React.FormEvent) {
        event.preventDefault();
        try {
            const response = await fetch("/api/customerOrder", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    roomCodes: games,
                    amount: newCustomerOrder,
                }),
            });
            if (!response.ok) throw new Error("Failed to add customer orders");
            setMessage(`Customer order of ${newCustomerOrder} added to all games.`);
            setTimeout(() => setMessage(""), 10000);
            await loadGroupData();
        }
        catch (error) {
            console.error("Error adding customer orders to all rooms:", error);
            setError("Failed to add customer orders.");
        }
    }

// -------------------- ADMIN GROUP VIEW --------------------
    return (
        <div className="lobby-container">
            <h2>Admin Game View for ({groupCode})</h2>

            {week && <h3>Current Week: {week}</h3>}

            <div className="lobby-grid">
                <div className="lobby-panel">
                    <h3>Teams in this game</h3>
                    {games.length === 0 ? (
                        <p>No games found.</p>
                    ) : (
                        <ul>
                            {games.map((game) => (
                                <li key={game}>
                                    {game}{" "}
                                    <button onClick={() => {
                                        onRoomSelect(game);
                                        setSelectedGame(game);
                                    }}>Open</button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <button onClick={onExit}>Return to Lobby</button>
                </div>

                <div className="lobby-panel">
                    <form onSubmit={addCustomerOrder}>
                        <label>
                            New Customer Order:
                            <input
                                type="number"
                                placeholder="Customer order amount"
                                value={newCustomerOrder}
                                onChange={(event) => setNewCustomerOrder(Number(event.target.value))}
                                min={0}
                                required
                            />
                        </label>
                        <button type="submit">Update or Add Customer Order</button>
                    </form>

                    <button onClick={advanceWeek}>Advance Week</button>

                    {message && <p className="message">{message}</p>}
                    {error && <p className="error">{error}</p>}
                </div>
            </div>
        </div>
    );
}
