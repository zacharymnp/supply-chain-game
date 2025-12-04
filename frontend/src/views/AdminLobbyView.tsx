import React, { useState } from "react";
import "../styles/LobbyView.css";

interface Props {
    token: string;
    availableGroups: string[];
    onGroupSelect: (groupCode: string) => void;
    refreshGroups: () => void;
}

async function handleLogout(){
    document.cookie = "role=a;expires=Thu, 18 Dec 2013 12:00:00 UTC";
}

export function AdminLobbyView({ token, availableGroups, onGroupSelect, refreshGroups }: Props) {
    const [newGroupSize, setNewGroupSize] = useState<number>(1);
    const [newGroupName, setNewGroupName] = useState<string>("");
    const [pattern, setPattern] = useState<"oneSpike"|"constant"|"manual">("oneSpike");
    const [baseOrder, setBaseOrder] = useState<number>(4);
    const [weeksUntilSpike, setWeeksUntilSpike] = useState<number>(4);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

// -------------------- CREATE NEW GROUP --------------------
    async function createGroup(event: React.FormEvent) {
        event.preventDefault();
        try {
            const response = await fetch(`/api/groups/createGroup`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ size: newGroupSize, name: newGroupName, pattern, baseOrder, weeksUntilSpike }),
            });
            if (!response.ok) throw new Error("Failed to create group");
            setMessage(`Created group ${newGroupName} with ${newGroupSize} games`);
            setNewGroupSize(1);
            refreshGroups();
        }
        catch (error) {
            console.error(error);
            setError("Failed to create group");
            setTimeout(() => setError(""), 10000);
        }
    }

// -------------------- ADMIN LOBBY VIEW --------------------
    return (
        <div className="lobby-container">
            <h2>Admin Lobby</h2>

            <div className="lobby-grid">
                <div className="lobby-panel">
                    <form onSubmit={createGroup}>
                        <input
                            type="text"
                            placeholder="Set name of new game"
                            onChange={(event) => setNewGroupName(event.target.value)}
                            required
                        />
                        <label>
                            Number of Teams:
                            <input
                                type="number"
                                min={1}
                                placeholder="Set number of teams"
                                value={newGroupSize}
                                onChange={(e) => setNewGroupSize(Number(e.target.value))}
                                required
                            />
                        </label>
                        <label>
                            Customer order pattern:
                            <select value={pattern} onChange={(event) => setPattern(event.target.value as any)}>
                                <option value="oneSpike">One Spike</option>
                                <option value="constant">Constant</option>
                                <option value="manual">Manual</option>
                            </select>
                        </label>
                        <label>
                            Base customer order:
                            <input
                                type="number"
                                min={1}
                                placeholder="Set base customer order"
                                value={baseOrder}
                                onChange={(event) => setBaseOrder(Number(event.target.value))}
                                required
                            />
                        </label>
                        {pattern === "oneSpike" &&
                            <label>
                                Weeks until customer orders spike:
                                <input
                                    type="number"
                                    min={1}
                                    placeholder="Set weeks until orders spike"
                                    value={weeksUntilSpike}
                                    onChange={(event) => setWeeksUntilSpike(Number(event.target.value))}
                                />
                            </label>}
                        <button type="submit">Create a new game</button>
                    </form>

                    {message && <p className="message">{message}</p>}

                    {error && <p className="error">{error}</p>}

                    <form className="logout-form" onSubmit={handleLogout}>
                        <button type="submit">Logout</button>
                    </form>
                </div>
                <div className="lobby-panel">
                    <h3>Or join an existing game</h3>
                    {!availableGroups || availableGroups.length === 0 ? (
                        <p>No active games</p>
                    ) : (
                        <ul>
                            {availableGroups.map((group) => (
                                <li key={group}>
                                    {group}{" "}
                                    <button onClick={() => onGroupSelect(group)}>Join</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}