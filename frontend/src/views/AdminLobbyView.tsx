import React, { useState } from "react";
import "../styles/LobbyView.css";

interface Props {
    token: string;
    availableRooms: string[];
    onRoomSelect: (roomCode: string) => void;
    refreshRooms: () => void;
}

async function handleLogout(){
    document.cookie = "role=a;expires=Thu, 18 Dec 2013 12:00:00 UTC";
}

export function AdminLobbyView({ token, availableRooms, onRoomSelect, refreshRooms }: Props) {
    const [newRoomCode, setNewRoomCode] = useState("");
    const [customerOrderAmount, setCustomerOrderAmount] = useState<number>(0);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

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
            setError("Failed to create room");
            setTimeout(() => setError(""), 10000);
        }
    }

// -------------------- ADD CUSTOMER ORDER IN ALL SELECTED ROOMS --------------------
    async function addCustomerOrdersToAll(event: React.FormEvent) {
        event.preventDefault();
        try {
            const response = await fetch("/api/customerOrderMultiple", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    roomCodes: availableRooms,
                    amount: customerOrderAmount,
                }),
            });
            if (!response.ok) throw new Error("Failed to add customer orders");
        }
        catch (error) {
            console.error("Error adding customer orders to all rooms:", error);
            setError("Failed to add customer orders.");
        }
    }

// -------------------- ADVANCE WEEKS IN ALL SELECTED ROOMS --------------------
    async function advanceWeekMultiple(event: React.FormEvent) {
        event.preventDefault();
        try {
            let allOrdersIn = true;
            for (const room of availableRooms) {
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
                for (const room of availableRooms) {
                    const response = await fetch("/api/advanceWeek", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ roomCode: room }),
                    });
                    if (!response.ok) throw new Error("Failed to advance week");
                }
                setMessage("Advanced week for all rooms.");
                setTimeout(() => setMessage(""), 10000);
            }
        }
        catch (error) {
            console.error("Failed to advance all selected weeks", error);
            setError("Error advancing weeks.");
        }

    }

// -------------------- ADD ORDERS AND ADVANCE ALL SELECTED ROOMS --------------------
    async function addOrdersAndAdvanceAll(event: React.FormEvent) {
        event.preventDefault();
        try {
            await addCustomerOrdersToAll(event);
            await advanceWeekMultiple(event);
        }
        catch (error) {
            console.error("Failed to add orders and advance weeks:", error);
        }
    }

// -------------------- SHOW GRAPHS FOR ALL ROOMS --------------------
    async function showGraphsForAllRooms() {
        try {
            await fetch("/api/showGraphs", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ roomCodes: availableRooms }),
            });
        }
        catch (error) {
            console.error("Failed to trigger showGraphs:", error);
        }
    }

// -------------------- ADMIN LOBBY VIEW --------------------
    return (
        <div className="lobby-container">
            <h2>Admin Lobby</h2>

            <div className="lobby-grid">
                <div className="lobby-panel">
                    <form onSubmit={createRoom}>
                        <input
                            placeholder="New Team Code"
                            value={newRoomCode}
                            onChange={(event) => setNewRoomCode(event.target.value)}
                            required
                        />
                        <button type="submit">Create Team</button>
                    </form>

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

                    <form className="logout-form" onSubmit={handleLogout}>
                        <button type="submit">Logout</button>
                    </form>
                </div>
                <div className="lobby-panel">
                    <form onSubmit={addOrdersAndAdvanceAll}>
                        <input
                            type="number"
                            placeholder="Customer order amount"
                            value={customerOrderAmount}
                            onChange={(event) => setCustomerOrderAmount(Number(event.target.value))}
                            min={0}
                            required
                        />
                        <button type="submit">Add Customer Order to All Rooms and Advance Week</button>
                    </form>

                    {message && <p className="message">{message}</p>}

                    {error && <p className="error">{error}</p>}

                    <button onClick={showGraphsForAllRooms}>
                        Show Graphs for All Rooms
                    </button>
                </div>
            </div>
        </div>
    );
}