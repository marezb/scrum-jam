const expect = (actual) => ({
    to: {
        equal: (expected) => { if (actual !== expected) throw new Error(`Expected ${expected} but got ${actual}`); },
        be: {
            true: (() => { if (actual !== true) throw new Error(`Expected true but got ${actual}`); }),
            false: (() => { if (actual !== false) throw new Error(`Expected false but got ${actual}`); }),
            null: (() => { if (actual !== null) throw new Error(`Expected null but got ${actual}`); }),
        },
        include: (expected) => { if (!actual.includes(expected)) throw new Error(`Expected ${actual} to include ${expected}`); }
    }
});

// Create iframe container for isolation
const iframe = document.createElement('iframe');
iframe.style.width = '1000px';
iframe.style.height = '800px';
iframe.style.position = 'absolute';
iframe.style.left = '-9999px';
document.body.appendChild(iframe);

function loadApp(url) {
    return new Promise((resolve) => {
        iframe.src = url;
        iframe.onload = () => {
            setTimeout(() => resolve(iframe.contentWindow), 500); // wait for init to complete
        };
    });
}

describe('Scrum Poker E2E & Unit Tests', function() {
    this.timeout(10000); 

    afterEach(() => {
        iframe.src = 'about:blank';
    });

    it('1. Poprawne logowanie - powinno zalogować z poprawnym hasłem', async () => {
        localStorage.setItem('sp_offlineMode', 'true');
        const win = await loadApp('index.html');
        const doc = win.document;
        
        // Fill form
        doc.getElementById('player-name').value = 'TestUser';
        doc.getElementById('room-id').value = 'TEST_LOGIN';
        doc.getElementById('room-password').value = 'AskMarekForApproval';
        
        // Submit
        doc.getElementById('join-form').dispatchEvent(new win.Event('submit'));
        await new Promise(r => setTimeout(r, 200));
        
        expect(doc.getElementById('game-screen').classList.contains('active')).to.be.true();
        expect(doc.getElementById('display-room-id').innerText.length > 5).to.be.true();
    });

    it('1b. Niepoprawne logowanie - powinno odrzucić ze złym hasłem', async () => {
        localStorage.setItem('sp_offlineMode', 'true');
        const win = await loadApp('index.html');
        const doc = win.document;
        
        // Setup alert spy
        let alertCalled = false;
        win.alert = (msg) => { alertCalled = true; };
        
        doc.getElementById('player-name').value = 'Hacker';
        doc.getElementById('room-password').value = 'WrongPassword';
        
        doc.getElementById('join-form').dispatchEvent(new win.Event('submit'));
        await new Promise(r => setTimeout(r, 200));
        
        expect(alertCalled).to.be.true();
        expect(doc.getElementById('game-screen').classList.contains('active')).to.be.false();
    });

    it('2. Dołączanie z linku jako widz - powinno zapamiętać imię i ukryć karty', async () => {
        localStorage.clear();
        localStorage.setItem('sp_offlineMode', 'true');
        const win = await loadApp('index.html?room=VIEWER_ROOM');
        const doc = win.document;
        
        doc.getElementById('player-name').value = 'Widz';
        doc.getElementById('spectator-mode').checked = true;
        
        doc.getElementById('join-form').dispatchEvent(new win.Event('submit'));
        await new Promise(r => setTimeout(r, 200));
        
        expect(doc.getElementById('spectators-list').innerHTML).to.include('Widz');
        expect(doc.querySelector('.deck-area').classList.contains('hidden')).to.be.true();
    });

    it('3. Poprawne wyliczanie punktów (średnia i Fibonacci)', async () => {
        localStorage.setItem('sp_offlineMode', 'true');
        localStorage.setItem('sp_playerName', 'Marek');
        localStorage.setItem('sp_roomPassword', 'AskMarekForApproval');
        
        const updatedWin = await loadApp('index.html?room=CALC_ROOM');
        const updatedDoc = updatedWin.document;
        
        const exports = updatedWin.__TEST_EXPORTS__;
        expect(exports !== undefined).to.be.true();
        
        exports.setPlayersData({
            'p1': { name: 'Alice', vote: '3', role: 'player' },
            'p2': { name: 'Bob', vote: '5', role: 'player' },
            'p3': { name: 'Charlie', vote: '8', role: 'player' },
            'p4': { name: 'Dave', vote: '?', role: 'player' }, // Should be ignored
            'spec': { name: 'Eve', vote: '100', role: 'spectator' } // Should be ignored
        });
        
        exports.setIsRevealed(true);
        exports.calculateResults();
        
        // Math: (3 + 5 + 8) / 3 = 16 / 3 = 5.33 -> 5.3 (toFixed(1))
        // Closest fibonacci to 5.3 is 5
        expect(updatedDoc.getElementById('average-score').innerText).to.equal('5');
        const statsHtml = updatedDoc.getElementById('stats-equation').innerHTML;
        expect(statsHtml).to.include('3 + 5 + 8 = 16');
        expect(statsHtml).to.include('16 / 3 = 5.3');
    });

    it('4. Stres test dla 20 graczy - powinno wyrenderować i wyliczyć wynik', async () => {
        localStorage.setItem('sp_offlineMode', 'true');
        localStorage.setItem('sp_playerName', 'Marek');
        localStorage.setItem('sp_roomPassword', 'AskMarekForApproval');
        
        const updatedWin = await loadApp('index.html?room=STRESS_ROOM');
        const updatedDoc = updatedWin.document;
        const exports = updatedWin.__TEST_EXPORTS__;
        
        // Generate 20 players
        const mockData = {};
        for(let i=0; i<20; i++) {
            mockData[`player_${i}`] = {
                name: `Bot ${i}`,
                vote: i % 2 === 0 ? '8' : '13',
                role: 'player'
            };
        }
        exports.setPlayersData(mockData);
        exports.setIsRevealed(true);
        exports.calculateResults();
        exports.renderPlayers(false); // No animation needed for test
        
        const playersRendered = updatedDoc.querySelectorAll('.player-card').length;
        expect(playersRendered).to.equal(20);
        
        // Avg: (8*10 + 13*10) / 20 = 210 / 20 = 10.5
        // Dist to 8 = 2.5, Dist to 13 = 2.5
        // Depending on logic, it picks 8 or 13.
        const avgScore = updatedDoc.getElementById('average-score').innerText;
        expect(['8', '13']).to.include(avgScore);
    });

    it('5. RenderPlayers - przypisuje kolor pastelowy odpowiednim kartom', async () => {
        localStorage.setItem('sp_offlineMode', 'true');
        const win = await loadApp('index.html?room=COLOR_ROOM');
        const exports = win.__TEST_EXPORTS__;
        
        exports.setPlayersData({
            'p1': { name: 'Alice', vote: '8', role: 'player' },
            'p2': { name: 'Bob', vote: '89', role: 'player' },
            'p3': { name: 'Charlie', vote: '?', role: 'player' }
        });
        exports.setIsRevealed(true);
        exports.renderPlayers(false);
        
        const cards = win.document.querySelectorAll('.player-card');
        expect(cards.length).to.equal(3);
        
        // 8 is green (#caffbf), 89 is blue (#bde0fe), ? is default (no inline style)
        expect(cards[0].style.backgroundColor).to.include('rgb(202, 255, 191)'); // #caffbf
        expect(cards[1].style.backgroundColor).to.include('rgb(189, 224, 254)'); // #bde0fe
        expect(cards[2].style.backgroundColor).to.equal('');
    });

    it('6. Unanimous vote triggers confetti', async () => {
        localStorage.setItem('sp_offlineMode', 'true');
        const win = await loadApp('index.html?room=CONFETTI_ROOM');
        const exports = win.__TEST_EXPORTS__;
        
        let confettiCalled = 0;
        win.confetti = () => { confettiCalled++; };
        
        exports.setPlayersData({
            'p1': { name: 'Alice', vote: '21', role: 'player' },
            'p2': { name: 'Bob', vote: '21', role: 'player' }
        });
        
        exports.calculateResults();
        
        // The loop schedules 5 timeouts, but they run later. We just check if confetti exists in win.
        // To test it fully we'd need to mock setTimeout or wait 3s.
        // For unit test, we just check if it was attached.
        // Wait, handleCalculateResults calls setTimeout. Let's just wait 100ms and see if it fired at least once.
        await new Promise(r => setTimeout(r, 100));
        expect(confettiCalled > 0).to.be.true();
    });

    it('7. RenderHistory poprawnie generuje liste w panelu', async () => {
        const win = await loadApp('index.html?room=HISTORY_ROOM');
        const exports = win.__TEST_EXPORTS__;
        
        const fakeHistory = {
            'key1': { score: '13', timestamp: 1000 },
            'key2': { score: '34', timestamp: 2000 }
        };
        
        exports.renderHistory(fakeHistory);
        
        const historyList = win.document.getElementById('history-list');
        const items = historyList.querySelectorAll('li');
        expect(items.length).to.equal(2);
        
        expect(items[0].innerText).to.include('Round 1');
        expect(items[0].innerText).to.include('13');
        expect(items[1].innerText).to.include('Round 2');
        expect(items[1].innerText).to.include('34');
        
        const historyPanel = win.document.getElementById('history-panel');
        expect(historyPanel.classList.contains('hidden')).to.be.false();
    });
});

// Run Mocha after all scripts loaded
setTimeout(() => {
    mocha.run();
}, 500);
