self.onmessage = async function(e) {
    if (e.data.type === 'START') await runBenchmark(e.data.payload.param);
};

class ConnectionPool {
    constructor(size) {
        this.connections = Array.from({ length: size }, (_, i) => ({ id: i, busy: false }));
    }
    async acquire() {
        const conn = this.connections.find(c => !c.busy);
        if (conn) { conn.busy = true; return conn; }
        await new Promise(r => setTimeout(r, 1));
        return this.acquire();
    }
    release(conn) { conn.busy = false; }
}

async function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    const pool = new ConnectionPool(5);
    let completed = 0;
    
    sendProgress(25, 'Processing requests...');
    const start = performance.now();
    const tasks = [];
    
    for (let i = 0; i < Math.min(iterations, 100); i++) {
        tasks.push((async () => {
            const conn = await pool.acquire();
            await new Promise(r => setTimeout(r, 1));
            pool.release(conn);
            completed++;
        })());
    }
    
    await Promise.all(tasks);
    const time = performance.now() - start;
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: {
        'Requests': completed,
        'Pool Size': 5,
        'Total Time': time.toFixed(2) + ' ms',
        'Avg Latency': (time / completed).toFixed(2) + ' ms'
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
