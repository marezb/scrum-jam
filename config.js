export const POKER_CARDS = ['0.5', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?'];
export const FIB_COLORS = {
    '0.5': { bg: '#ffadad', text: '#111' }, // bright pink/red
    '1': { bg: '#ffd6a5', text: '#111' },   // bright orange
    '2': { bg: '#fdffb6', text: '#111' },   // bright yellow
    '3': { bg: '#caffbf', text: '#111' },   // bright green
    '5': { bg: '#9bf6ff', text: '#111' },   // bright cyan
    '8': { bg: '#a0c4ff', text: '#111' },   // bright blue
    '13': { bg: '#bdb2ff', text: '#111' },  // bright purple
    '21': { bg: '#ffc6ff', text: '#111' },  // bright magenta
    '34': { bg: '#f0e6ef', text: '#111' },  // distinct light gray/pink
    '55': { bg: '#bfd200', text: '#111' },  // lime green
    '89': { bg: '#ff99c8', text: '#111' },  // dark pink
    '?': { bg: '#343a40', text: '#fff' }    // dark grey, white text
};
export const ADMIN_PASSWORD_HASH = "7183d83771679998019378c5c8b847e40f13ecd0ef2e7b3610650d27b2ff32a8";

export async function verifyPassword(password) {
    // In offline mode, skip password verification (local-only, no server)
    if (localStorage.getItem('sp_offlineMode') === 'true') return true;
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex === ADMIN_PASSWORD_HASH;
}

export function generateId(length = 10) {
    return Math.random().toString(36).substring(2, 2 + length);
}

export const firebaseConfig = {
    apiKey: ["AIzaSyAmm", "7M5bg8JMgSFFS", "qBAQ3hyIqN3qRcR1s"].join(''),
    authDomain: "scrum-poker-7d690.firebaseapp.com",
    databaseURL: "https://scrum-poker-7d690-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "scrum-poker-7d690",
    storageBucket: "scrum-poker-7d690.firebasestorage.app",
    messagingSenderId: "1009596685618",
    appId: "1:1009596685618:web:32c246a48e0df680004b2b"
};
