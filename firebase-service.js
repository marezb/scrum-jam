import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update, onDisconnect, get, child, remove, push } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

let app;
export let db;

export function initFirebase(config) {
    try {
        app = initializeApp(config);
        db = getDatabase(app);
        return true;
    } catch (e) {
        console.error("Firebase init error:", e);
        return false;
    }
}

export function createRoom(roomId, creatorName, roomName = null) {
    return set(ref(db, 'rooms/' + roomId), {
        metadata: {
            status: 'active',
            createdAt: Date.now(),
            lastActive: Date.now(),
            createdBy: creatorName,
            roomName: roomName
        }
    });
}

export function updateRoomName(roomId, newName) {
    return update(ref(db, `rooms/${roomId}/metadata`), {
        roomName: newName
    });
}

export function getRoomMetadata(roomId) {
    return get(ref(db, `rooms/${roomId}/metadata`));
}

export function setTimer(roomId, durationSec, startedBy) {
    return update(ref(db, `rooms/${roomId}/state`), {
        timerEndsAt: Date.now() + durationSec * 1000,
        timerStartedBy: startedBy
    });
}

export function clearTimer(roomId) {
    return update(ref(db, `rooms/${roomId}/state`), {
        timerEndsAt: null,
        timerStartedBy: null
    });
}

export function setAutoTimer(roomId, durationSec) {
    return update(ref(db, `rooms/${roomId}/state`), {
        autoTimer: durationSec
    });
}

export function closeRoom(roomId) {
    alert("System: Uruchamiam nową funkcję kasowania (v5) dla pokoju " + roomId);
    console.warn("Completely deleting room from database:", roomId);
    // Explicitly remove children in case Firebase security rules prevent deleting the parent node directly
    remove(ref(db, `rooms/${roomId}/state`));
    remove(ref(db, `rooms/${roomId}/players`));
    remove(ref(db, `rooms/${roomId}/history`));
    return remove(ref(db, `rooms/${roomId}/metadata`));
}

export function joinRoom(roomId, playerId, playerData, callbacks) {
    const playerRef = ref(db, `rooms/${roomId}/players/${playerId}`);
    
    // Register player
    set(playerRef, playerData);
    update(ref(db, `rooms/${roomId}/metadata`), { lastActive: Date.now() });

    // Remove player on disconnect
    onDisconnect(playerRef).remove();

    // Listen to players
    onValue(ref(db, `rooms/${roomId}/players`), (snapshot) => {
        const playersData = snapshot.val() || {};
        callbacks.onPlayersChange(playersData);
    });

    // Listen to room state
    onValue(ref(db, `rooms/${roomId}/state`), (snapshot) => {
        const state = snapshot.val() || { revealed: false };
        callbacks.onStateChange(state);
    });

    // Listen to metadata to kick if closed or deleted
    onValue(ref(db, `rooms/${roomId}/metadata`), (snapshot) => {
        const meta = snapshot.val();
        if (!meta || meta.status === 'closed') {
            callbacks.onRoomClosed();
        }
    });

    // Listen to history
    if (callbacks.onHistoryChange) {
        onValue(ref(db, `rooms/${roomId}/history`), (snapshot) => {
            const history = snapshot.val() || {};
            callbacks.onHistoryChange(history);
        });
    }
}

export function updateVote(roomId, playerId, vote) {
    update(ref(db, `rooms/${roomId}/metadata`), { lastActive: Date.now() });
    return update(ref(db, `rooms/${roomId}/players/${playerId}`), { vote });
}

export function updateRevealedState(roomId, revealed, revealedBy = null) {
    update(ref(db, `rooms/${roomId}/metadata`), { lastActive: Date.now() });
    return update(ref(db, `rooms/${roomId}/state`), { revealed, revealedBy });
}

export function clearAllVotes(roomId, playersData, resetByName = null) {
    const updates = {};
    updates[`rooms/${roomId}/state/revealed`] = false;
    updates[`rooms/${roomId}/state/revealedBy`] = null;
    updates[`rooms/${roomId}/state/resetBy`] = resetByName;
    updates[`rooms/${roomId}/metadata/lastActive`] = Date.now();

    Object.keys(playersData).forEach(pId => {
        updates[`rooms/${roomId}/players/${pId}/vote`] = null;
    });

    return update(ref(db), updates);
}

export function addRoundHistory(roomId, score) {
    update(ref(db, `rooms/${roomId}/metadata`), { lastActive: Date.now() });
    return push(ref(db, `rooms/${roomId}/history`), {
        type: 'round',
        score: score,
        timestamp: Date.now()
    });
}
export function clearRoundHistory(roomId) {
    update(ref(db, `rooms/${roomId}/metadata`), { lastActive: Date.now() });
    return remove(ref(db, `rooms/${roomId}/history`));
}

export async function fetchActiveRooms(callback) {
    if (!db) return;
    
    try {
        onValue(ref(db, 'rooms'), (snapshot) => {
            const rooms = snapshot.val();
            const active = [];
            if (rooms) {
                for (const [id, data] of Object.entries(rooms)) {
                    if (data.metadata && data.metadata.status === 'active') {
                        active.push({
                            id: id,
                            lastActive: data.metadata.lastActive || data.metadata.createdAt || null,
                            createdBy: data.metadata.createdBy || 'Unknown',
                            roomName: data.metadata.roomName || null
                        });
                    }
                }
            }
            callback(active);
        }, async (error) => {
            console.warn("Could not read all rooms (likely permission denied). Falling back to local history.");
            const active = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('sp_admin_')) {
                    const roomId = key.replace('sp_admin_', '');
                    try {
                        const snapshot = await get(ref(db, `rooms/${roomId}/metadata`));
                        if (snapshot.exists() && snapshot.val().status === 'active') {
                            active.push({
                                id: roomId,
                                lastActive: snapshot.val().lastActive || snapshot.val().createdAt || null,
                                createdBy: snapshot.val().createdBy || 'Unknown',
                                roomName: snapshot.val().roomName || null
                            });
                        }
                    } catch (err) {
                        // ignore errors for individual rooms
                    }
                }
            }
            callback(active);
        });
    } catch (e) {
        console.error("fetchActiveRooms error:", e);
    }
}
