/**
 * #625 Exchanger Worker
 */
let id, port, value = 0;

self.onmessage = function(e) {
    if (e.data.type === 'init') {
        id = e.data.id;
        port = e.data.port;
        port.onmessage = (ev) => {
            const received = ev.data;
            self.postMessage({ type: 'exchanged', sent: value, received });
            value = received;
            self.postMessage({ type: 'update', value });
        };
    } else if (e.data.type === 'start') {
        runExchanges();
    }
};

function runExchanges() {
    for (let i = 0; i < 5; i++) {
        value = Math.floor(Math.random() * 100);
        self.postMessage({ type: 'update', value });
        port.postMessage(value);
        const delay = 500 + Math.random() * 500;
        const start = performance.now();
        while (performance.now() - start < delay) {}
    }
}
