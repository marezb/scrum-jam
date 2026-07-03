import { POKER_CARDS } from './config.js?v=2';

export const elements = {
    // Login Screen
    joinForm: document.getElementById('join-form'),
    playerNameInput: document.getElementById('player-name'),
    roomIdInput: document.getElementById('room-id'),
    passwordInput: document.getElementById('room-password'),
    spectatorModeInput: document.getElementById('spectator-mode'),
    passwordGroup: document.getElementById('password-group'),
    spectatorGroup: document.getElementById('spectator-group'),
    roomIdGroup: document.getElementById('room-id-group'),
    adminDashboard: document.getElementById('admin-dashboard'),
    activeRoomsList: document.getElementById('active-rooms-list'),
    joinBtn: document.getElementById('join-btn'),
    

    // Game Screen
    displayRoomId: document.getElementById('display-room-id'),
    copyLinkBtn: document.getElementById('copy-link-btn'),
    cardsContainer: document.getElementById('cards-container'),
    playersContainer: document.getElementById('players-container'),
    revealBtn: document.getElementById('reveal-btn'),
    resetBtn: document.getElementById('reset-btn'),
    revealedByInfo: document.getElementById('revealed-by-info'),
    resultsArea: document.getElementById('results-area'),
    averageScoreDisplay: document.getElementById('average-score'),
    statsPanel: document.getElementById('stats-panel'),
    statsEquation: document.getElementById('stats-equation'),
    statsClosest: document.getElementById('stats-closest'),
    closeRoomBtn: document.getElementById('close-room-btn'),
    spectatorsPanel: document.getElementById('spectators-panel'),
    spectatorsList: document.getElementById('spectators-list'),
    deckArea: document.querySelector('.deck-area')
};

export const screens = {
    login: document.getElementById('login-screen'),
    game: document.getElementById('game-screen'),
    setup: document.getElementById('setup-screen')
};

export function showScreen(screenId) {
    Object.values(screens).forEach(s => { if (s) s.classList.remove('active'); });
    if (screens[screenId]) {
        screens[screenId].classList.add('active');
    }
}

export function renderDeck(onCardSelect) {
    elements.cardsContainer.innerHTML = '';
    POKER_CARDS.forEach(val => {
        const card = document.createElement('div');
        card.className = 'poker-card';
        card.innerText = val;
        card.dataset.value = val;
        card.addEventListener('click', () => onCardSelect(val));
        elements.cardsContainer.appendChild(card);
    });
}

export function updateDeckSelection(myVote, isRevealed) {
    if (isRevealed) {
        document.querySelectorAll('.poker-card').forEach(c => c.classList.remove('selected'));
        return;
    }
    document.querySelectorAll('.poker-card').forEach(c => {
        if (c.dataset.value === myVote) {
            c.classList.add('selected');
        } else {
            c.classList.remove('selected');
        }
    });
}

export function renderPlayers(playersData, isRevealed, animate = false) {
    elements.playersContainer.innerHTML = '';
    elements.spectatorsList.innerHTML = '';

    const allPlayers = Object.values(playersData).sort((a, b) => a.joinedAt - b.joinedAt);
    if (allPlayers.length === 0) return;

    const activePlayers = allPlayers.filter(p => p.role !== 'spectator');
    const spectators = allPlayers.filter(p => p.role === 'spectator');

    if (spectators.length > 0) {
        elements.spectatorsPanel.classList.remove('hidden');
        spectators.forEach(spec => {
            const li = document.createElement('li');
            li.innerText = spec.name || 'Anonymous';
            elements.spectatorsList.appendChild(li);
        });
    } else {
        elements.spectatorsPanel.classList.add('hidden');
    }

    activePlayers.forEach((player, index) => {
        const el = document.createElement('div');
        el.className = 'player';

        const card = document.createElement('div');
        card.className = 'player-card';

        if (player.vote) {
            if (isRevealed) {
                if (animate) {
                    card.classList.add('has-voted');
                    card.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
                    setTimeout(() => {
                        card.classList.remove('has-voted');
                        card.classList.add('revealed');
                        card.innerText = player.vote;
                    }, index * 150 + 100);
                } else {
                    card.classList.add('revealed');
                    card.innerText = player.vote;
                }
            } else {
                card.classList.add('has-voted');
                card.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
            }
        } else {
            if (isRevealed) {
                if (animate) {
                    setTimeout(() => {
                        card.classList.add('revealed');
                        card.innerText = '😟';
                    }, index * 150 + 100);
                } else {
                    card.classList.add('revealed');
                    card.innerText = '😟';
                }
            }
        }

        const name = document.createElement('div');
        name.className = 'player-name';
        name.innerText = player.name || 'Anonymous';

        el.appendChild(card);
        el.appendChild(name);
        elements.playersContainer.appendChild(el);
    });
}
