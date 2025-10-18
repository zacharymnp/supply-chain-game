import React from "react";
import type { Role } from "types";

interface Props {
    availableRooms: string[];
    onRoomSelect: (roomCode: string, role: Role) => void;
}

export function PlayerLobbyView({ availableRooms, onRoomSelect }: Props) {
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
                        const role = (form.elements.namedItem("role") as HTMLSelectElement).value.toUpperCase() as Role;
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