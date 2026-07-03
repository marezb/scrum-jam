import { generateId, verifyPassword, POKER_CARDS, FIB_COLORS, firebaseConfig } from './config.js?v=12';
import { elements, screens, showScreen, renderDeck, updateDeckSelection, renderPlayers } from './ui.js?v=12';
import { calculateAverage, getClosestFibonacci, checkAutoRevealCondition } from './game-logic.js?v=12';
import * as db from './firebase-service.js?v=12';

// State variables
let currentPlayerId = localStorage.getItem('sp_playerId');
if (!currentPlayerId) {
    currentPlayerId = generateId();
    localStorage.setItem('sp_playerId', currentPlayerId);
}

let currentName = localStorage.getItem('sp_playerName') || '';
let currentRole = localStorage.getItem('sp_playerRole') || 'player';
let currentRoomId = null;
let isRevealed = false;
let isOfflineMode = localStorage.getItem('sp_offlineMode') === 'true';
let playersData = {};
let currentRoundNumber = 1;

// === Initialization ===
function init() {
    try {
        if (!db.initFirebase(firebaseConfig)) throw new Error("Init failed");

        elements.playerNameInput.value = currentName;
        elements.spectatorModeInput.checked = (currentRole === 'spectator');

        const urlParams = new URLSearchParams(window.location.search);
        const urlRoom = urlParams.get('room');

        if (urlRoom) {
            elements.roomIdInput.value = urlRoom;
            elements.passwordGroup.classList.add('hidden');
            elements.spectatorGroup.classList.remove('hidden');
            elements.roomIdGroup.classList.remove('hidden');
            elements.joinBtn.innerText = "Join Game";

            showScreen('login');
        } else {
            showScreen('login');
        }
    } catch (e) {
        console.error("Init error:", e);
        showScreen('login');
    }
}



// === Login Handlers ===
elements.passwordInput.addEventListener('input', async (e) => {
    const pwd = e.target.value.trim();
    if (pwd.length > 0) {
        const isValid = await verifyPassword(pwd);
        if (isValid) {
            elements.adminDashboard.classList.remove('hidden');
            if (db && db.fetchActiveRooms) db.fetchActiveRooms(renderActiveRooms);
        } else {
            elements.adminDashboard.classList.add('hidden');
        }
    } else {
        elements.adminDashboard.classList.add('hidden');
    }
});

elements.joinForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
        const urlParams = new URLSearchParams(window.location.search);
        let room = urlParams.get('room');

        if (!room) {
            const password = elements.passwordInput.value.trim();
            const isValid = await verifyPassword(password);
            if (!isValid) {
                alert("Access Denied: Incorrect password. Please Ask Marek for approval.");
                return;
            }
            room = generateId(8).toUpperCase();
            
            // Show admin dashboard after successful authentication
            elements.adminDashboard.classList.remove('hidden');
            if (db && db.fetchActiveRooms) db.fetchActiveRooms(renderActiveRooms);

            if (!isOfflineMode) {
                await db.createRoom(room);
                localStorage.setItem(`sp_admin_${room}`, "true");
            }
        }

        currentName = elements.playerNameInput.value.trim();
        currentRole = elements.spectatorModeInput.checked ? 'spectator' : 'player';

        localStorage.setItem('sp_playerName', currentName);
        localStorage.setItem('sp_playerRole', currentRole);

        if (isOfflineMode) {
            joinRoomOffline(room);
        } else {
            joinRoomOnline(room);
        }
    } catch (err) {
        console.error("Failed to create/join room:", err);
        document.body.innerHTML = `<h1 style="color:red;z-index:9999;position:absolute;">ERROR: ${err.message} ${err.stack}</h1>`;
        alert("Error connecting to the server. Please try again or check your connection.");
    }
});

function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Unknown';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function renderActiveRooms(activeRooms) {
    elements.activeRoomsList.innerHTML = '';
    if (activeRooms.length === 0) {
        elements.activeRoomsList.innerHTML = '<li style="color: var(--text-muted); justify-content: center;">No active rooms found.</li>';
        return;
    }

    activeRooms.forEach(room => {
        const roomId = typeof room === 'string' ? room : room.id;
        const lastActiveText = room.lastActive ? formatTimeAgo(room.lastActive) : 'Unknown';
        
        const li = document.createElement('li');
        li.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 4px;">
                <span>Room: ${roomId}</span>
                <span style="font-size: 0.75rem; color: var(--text-muted);">Last active: ${lastActiveText}</span>
            </div>
            <div class="room-actions">
                <button class="btn icon-btn copy-btn" data-room="${roomId}" title="Copy Link">Copy Link</button>
                <button class="btn icon-btn close-btn" data-room="${roomId}" title="Close Room" style="color: #ef4444;">Close</button>
            </div>
        `;
        elements.activeRoomsList.appendChild(li);
    });

    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const url = new URL(window.location.href);
            url.searchParams.set('room', e.target.dataset.room);
            navigator.clipboard.writeText(url.toString());
            e.target.innerText = "Copied!";
            setTimeout(() => e.target.innerText = "Copy Link", 1500);
        });
    });

    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const isConfirmed = confirm("Are you sure you want to close this room?");
            if (isConfirmed) {
                db.closeRoom(e.target.dataset.room);
            }
        });
    });
}

// === Game Actions ===
elements.copyLinkBtn.addEventListener('click', () => {
    if (isOfflineMode) {
        alert("Sharing links is disabled in Offline Mode to prevent errors. Please configure Firebase for multiplayer.");
        return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set('room', currentRoomId);
    navigator.clipboard.writeText(url.toString()).then(() => {
        const originalHtml = elements.copyLinkBtn.innerHTML;
        elements.copyLinkBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
        setTimeout(() => elements.copyLinkBtn.innerHTML = originalHtml, 2000);
    });
});

elements.revealBtn.addEventListener('click', () => {
    if (!currentRoomId) return;
    if (isOfflineMode) {
        isRevealed = true;
        updateGameStateOffline(true, currentName);
    } else {
        const res = calculateAverage(playersData);
        if (res) {
            db.addRoundHistory(currentRoomId, getClosestFibonacci(res.average));
        }
        db.updateRevealedState(currentRoomId, true, currentName);
    }
});

elements.resetBtn.addEventListener('click', () => {
    if (!currentRoomId) return;
    if (isOfflineMode) {
        isRevealed = false;
        Object.keys(playersData).forEach(pId => { playersData[pId].vote = null; });
        updateGameStateOffline(false, null, currentName, true);
    } else {
        db.clearAllVotes(currentRoomId, playersData, currentName);
    }
});

elements.closeRoomBtn.addEventListener('click', () => {
    if (!currentRoomId || isOfflineMode) return;
    if (confirm("Are you sure you want to close this room? No one will be able to join.")) {
        db.closeRoom(currentRoomId);
    }
});

// === Join Room Logic ===
function joinRoomOnline(roomId) {
    currentRoomId = roomId;
    elements.displayRoomId.innerText = roomId;

    if (localStorage.getItem(`sp_admin_${roomId}`) === "true") {
        elements.closeRoomBtn.classList.remove('hidden');
        elements.clearHistoryBtn.classList.remove('hidden');
    } else {
        elements.closeRoomBtn.classList.add('hidden');
        elements.clearHistoryBtn.classList.add('hidden');
    }

    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    window.history.pushState({}, '', url);

    showScreen('game');
    if (currentRole === 'spectator') {
        elements.deckArea.classList.add('hidden');
    } else {
        elements.deckArea.classList.remove('hidden');
        renderDeck(handleCardSelect);
    }

    const playerData = {
        name: currentName,
        vote: null,
        joinedAt: Date.now(),
        role: currentRole
    };

    db.joinRoom(roomId, currentPlayerId, playerData, {
        onPlayersChange: (data) => {
            // Filter out corrupted/ghost entries (missing name)
            const cleanData = {};
            for (const [id, player] of Object.entries(data)) {
                if (player && player.name) {
                    cleanData[id] = player;
                }
            }
            playersData = cleanData;
            renderPlayers(playersData, isRevealed);
            updateDeckSelection(playersData[currentPlayerId]?.vote, isRevealed);
            if (!isRevealed && checkAutoRevealCondition(playersData)) {
                // To avoid multiple history entries, only the first active player pushes it
                const activeIds = Object.keys(playersData).filter(id => playersData[id].role !== 'spectator').sort();
                if (activeIds[0] === currentPlayerId) {
                    const res = calculateAverage(playersData);
                    if (res) {
                        db.addRoundHistory(currentRoomId, getClosestFibonacci(res.average));
                    }
                }
                db.updateRevealedState(currentRoomId, true, "System (Auto)");
            }
        },
        onStateChange: (state) => {
            const wasRevealed = isRevealed;
            isRevealed = state.revealed;
            const animate = isRevealed && !wasRevealed;
            const resetAnim = !isRevealed && wasRevealed;
            updateUIState(state.revealedBy, state.resetBy);
            renderPlayers(playersData, isRevealed, animate, resetAnim);
        },
        onRoomClosed: () => {
            alert("This room has been closed by the admin.");
            window.location.href = window.location.pathname;
        },
        onHistoryChange: (history) => {
            renderHistory(history);
        }
    });
}

function joinRoomOffline(roomId) {
    currentRoomId = roomId;
    elements.displayRoomId.innerText = roomId + " (Offline)";
    showScreen('game');
    
    if (currentRole === 'spectator') {
        elements.deckArea.classList.add('hidden');
    } else {
        elements.deckArea.classList.remove('hidden');
        renderDeck(handleCardSelect);
    }

    playersData = {
        [currentPlayerId]: {
            name: currentName || "Me",
            vote: null,
            joinedAt: Date.now(),
            role: currentRole
        }
    };

    const fakePlayers = ["Alice", "Bob", "Charlie"];
    fakePlayers.forEach((name, i) => {
        playersData[`fake_${i}`] = {
            name: name,
            vote: POKER_CARDS[Math.floor(Math.random() * (POKER_CARDS.length - 1))],
            joinedAt: Date.now() + i + 1,
            role: 'player'
        };
    });
    playersData['fake_spec'] = {
        name: "John (Spectator)",
        joinedAt: Date.now() + 10,
        role: 'spectator'
    };

    isRevealed = false;
    updateGameStateOffline();
}

function updateGameStateOffline(animate = false, revealedBy = null, resetBy = null, resetAnim = false) {
    updateUIState(revealedBy, resetBy);
    if (!isRevealed) {
        Object.keys(playersData).forEach(pId => {
            if (pId.startsWith('fake_') && playersData[pId].vote === null && playersData[pId].role !== 'spectator') {
                playersData[pId].vote = POKER_CARDS[Math.floor(Math.random() * (POKER_CARDS.length - 1))];
            }
        });
    }
    renderPlayers(playersData, isRevealed, animate, resetAnim);
    updateDeckSelection(playersData[currentPlayerId]?.vote, isRevealed);
}

function updateUIState(revealedBy = null, resetBy = null) {
    if (isRevealed) {
        elements.revealBtn.classList.add('hidden');
        elements.resetBtn.classList.remove('hidden');
        elements.resultsArea.classList.remove('hidden');
        elements.statsPanel.classList.remove('hidden');
        if (revealedBy && elements.revealedByInfo) {
            elements.revealedByInfo.innerText = `Revealed by ${revealedBy}`;
            elements.revealedByInfo.classList.remove('hidden');
        } else if (elements.revealedByInfo) {
            elements.revealedByInfo.classList.add('hidden');
        }
        handleCalculateResults();
    } else {
        elements.revealBtn.classList.remove('hidden');
        elements.resetBtn.classList.add('hidden');
        elements.resultsArea.classList.add('hidden');
        elements.statsPanel.classList.add('hidden');
        if (resetBy && elements.revealedByInfo) {
            elements.revealedByInfo.innerHTML = `<strong style="font-size: 1.1em; color: var(--text-main);">Round ${currentRoundNumber}</strong><br><span style="font-style: italic;">Started by ${resetBy}</span>`;
            elements.revealedByInfo.classList.remove('hidden');
        } else if (elements.revealedByInfo) {
            elements.revealedByInfo.classList.add('hidden');
        }
    }
}

function renderHistory(historyObj) {
    elements.historyList.innerHTML = '';
    const historyEntries = Object.values(historyObj).sort((a, b) => a.timestamp - b.timestamp);
    if (historyEntries.length > 0) {
        elements.historyPanel.classList.remove('hidden');
        let roundCounter = 1;
        historyEntries.forEach((entry) => {
            if (entry.type === 'new_round') return; // ignore legacy new_round entries
            const li = document.createElement('li');
            let scoreText = entry.score;
            let bgStyle = '';
            let textStyle = '';
            if (FIB_COLORS[entry.score]) {
                bgStyle = `background-color: ${FIB_COLORS[entry.score].bg};`;
                textStyle = `color: ${FIB_COLORS[entry.score].text};`;
            }
            li.innerHTML = `<span>Round ${roundCounter}</span> <strong style="${bgStyle} ${textStyle} padding: 2px 10px; border-radius: 12px;">${scoreText}</strong>`;
            roundCounter++;
            elements.historyList.appendChild(li);
        });
        currentRoundNumber = roundCounter;
        
        // Auto-scroll to the bottom to always show the newest round
        elements.historyList.scrollTop = elements.historyList.scrollHeight;
    } else {
        elements.historyPanel.classList.add('hidden');
        currentRoundNumber = 1;
    }
}

elements.clearHistoryBtn.addEventListener('click', () => {
    if (!currentRoomId || isOfflineMode) return;
    if (confirm("Are you sure you want to clear the round history for everyone?")) {
        db.clearRoundHistory(currentRoomId);
    }
});

function handleCalculateResults() {
    const res = calculateAverage(playersData);
    if (res) {
        const closestFib = getClosestFibonacci(res.average);
        elements.averageScoreDisplay.innerText = closestFib;
        const sumLine = `${res.equationParts.join(' + ')} = ${res.sum}`;
        const divLine = `${res.sum} / ${res.count} = ${res.average.toFixed(1)}`;
        elements.statsEquation.innerHTML = `Calculation:<br>${sumLine}<br>${divLine}`;
        elements.statsClosest.innerHTML = `Closest Fibonacci: <strong>${getClosestFibonacci(res.average)}</strong>`;
        // Trigger confetti on unanimous vote (if at least two votes exist and all are equal)
        if (res.count > 1 && res.equationParts.every(val => val === res.equationParts[0])) {
            if (window.confetti) {
                for (let i = 0; i < 4; i++) {
                    setTimeout(() => {
                        confetti({
                            particleCount: 120,
                            spread: 100,
                            origin: { y: 0.6 },
                            zIndex: 9999,
                            ticks: 400,
                            gravity: 0.5,
                            startVelocity: 35
                        });
                    }, i * 1000); // 1000ms gap between explosions for a longer effect
                }
            }
        }
    } else {
        elements.averageScoreDisplay.innerText = "-";
        elements.statsEquation.innerHTML = "No numeric votes cast.";
        elements.statsClosest.innerHTML = "";
    }
}

function handleCardSelect(value) {
    if (!currentRoomId || isRevealed) return;
    const currentVote = playersData[currentPlayerId]?.vote;
    const newVote = currentVote === value ? null : value;

    if (isOfflineMode) {
        playersData[currentPlayerId].vote = newVote;
        if (!isRevealed && checkAutoRevealCondition(playersData)) {
            isRevealed = true;
            updateGameStateOffline(true, "System (Auto)");
        } else {
            updateGameStateOffline();
        }
    } else {
        db.updateVote(currentRoomId, currentPlayerId, newVote);
    }
}

// Start app
init();

// Export for tests
window.__TEST_EXPORTS__ = {
    calculateAverage,
    getClosestFibonacci,
    generateId,
    joinRoomOffline,
    handleCardSelect,
    get playersData() { return playersData; },
    setPlayersData: (data) => { playersData = data; },
    setIsRevealed: (rev) => { isRevealed = rev; },
    calculateResults: handleCalculateResults,
    renderPlayers: (animate) => renderPlayers(playersData, isRevealed, animate),
    renderHistory: renderHistory
};
