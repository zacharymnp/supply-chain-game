//import React from "react";
import type { Role } from "types";

interface Props {
    availableRooms: string[];
    onRoomSelect: (roomCode: string, role: Role) => void;
}

async function handleLogout(event: React.FormEvent<HTMLFormElement>){
    document.cookie = "role=a;expires=Thu, 18 Dec 2013 12:00:00 UTC";
}

export function PlayerLobbyView({ availableRooms, onRoomSelect }: Props) {
// -------------------- PLAYER LOBBY VIEW --------------------
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
                        const roomCode = (form.elements.namedItem("roomCode") as HTMLSelectElement).value;
                        const role = (form.elements.namedItem("role") as HTMLSelectElement).value as Role;
                        onRoomSelect(roomCode, role);
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
                            <option value="RETAILER">Retailer</option>
                            <option value="WHOLESALER">Wholesaler</option>
                            <option value="DISTRIBUTOR">Distributor</option>
                            <option value="FACTORY">Factory</option>
                        </select>
                    </label>
                    <button type="submit">Join Game</button>
                </form>
            )}
            <form onSubmit={handleLogout}>
                    <button type="submit">Logout</button>
            </form>
        </div>
    );
}