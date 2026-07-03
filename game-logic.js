import { POKER_CARDS } from './config.js?v=2';

export function calculateAverage(playersData) {
    let sum = 0;
    let count = 0;
    let equationParts = [];

    Object.values(playersData).forEach(p => {
        if (p.role !== 'spectator' && p.vote && p.vote !== '?') {
            const val = parseFloat(p.vote);
            if (!isNaN(val)) {
                sum += val;
                count++;
                equationParts.push(val);
            }
        }
    });

    if (count > 0) {
        const average = sum / count;
        return { sum, count, average, equationParts };
    }
    return null;
}

export function getClosestFibonacci(average) {
    const fibs = [0.5, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
    let closest = fibs[0];
    let minDiff = Math.abs(average - closest);
    
    for (let i = 1; i < fibs.length; i++) {
        const diff = Math.abs(average - fibs[i]);
        if (diff < minDiff) {
            minDiff = diff;
            closest = fibs[i];
        } else if (diff === minDiff) {
            closest = Math.max(closest, fibs[i]);
        }
    }
    return closest;
}

export function checkAutoRevealCondition(playersData) {
    const activePlayers = Object.values(playersData).filter(p => p.role !== 'spectator');
    if (activePlayers.length >= 2 && activePlayers.every(p => p.vote != null)) {
        return true;
    }
    return false;
}
