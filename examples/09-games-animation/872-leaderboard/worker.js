let leaderboard = [];

self.onmessage = function(e) {
    const { action, name, score } = e.data;

    if (action === 'add') {
        leaderboard.push({ name, score, timestamp: Date.now() });
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 10);
    }

    self.postMessage({ leaderboard: leaderboard.slice(0, 10) });
};
