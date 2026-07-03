import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update, onDisconnect, get, child } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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

export function createRoom(roomId) {
    return set(ref(db, `rooms/${roomId}/metadata`), {
        status: 'active',
        createdAt: Date.now()
    });
}

export function closeRoom(roomId) {
    return update(ref(db, `rooms/${roomId}/metadata`), { status: 'closed' });
}

export function joinRoom(roomId, playerId, playerData, callbacks) {
    const playerRef = ref(db, `rooms/${roomId}/players/${playerId}`);
    
    // Register player
    set(playerRef, playerData);

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

    // Listen to metadata to kick if closed
    onValue(ref(db, `rooms/${roomId}/metadata`), (snapshot) => {
        const meta = snapshot.val();
        if (meta && meta.status === 'closed') {
            callbacks.onRoomClosed();
        }
    });
}

export function updateVote(roomId, playerId, vote) {
    return update(ref(db, `rooms/${roomId}/players/${playerId}`), { vote });
}

export function updateRevealedState(roomId, revealed, revealedBy = null) {
    return update(ref(db, `rooms/${roomId}/state`), { revealed, revealedBy });
}

export function clearAllVotes(roomId, playersData) {
    const updates = {};
    updates[`rooms/${roomId}/state/revealed`] = false;
    updates[`rooms/${roomId}/state/revealedBy`] = null;

    Object.keys(playersData).forEach(pId => {
        updates[`rooms/${roomId}/players/${pId}/vote`] = null;
    });

    return update(ref(db), updates);
}

export function fetchActiveRooms(callback) {
    if (!db) return;
    onValue(ref(db, 'rooms'), (snapshot) => {
        const rooms = snapshot.val();
        const active = [];
        if (rooms) {
            for (const [id, data] of Object.entries(rooms)) {
                if (data.metadata && data.metadata.status === 'active') {
                    active.push(id);
                }
            }
        }
        callback(active);
    });
}
