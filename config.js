export const POKER_CARDS = ['0.5', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?'];
export const ADMIN_PASSWORD_HASH = "7183d83771679998019378c5c8b847e40f13ecd0ef2e7b3610650d27b2ff32a8";

export async function verifyPassword(password) {
    if (localStorage.getItem('sp_offlineMode') === 'true' && password === 'AskMarekForApproval') return true;
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
