/**
 * #632 CSP Channel Worker
 */
let role, port;

self.onmessage = function(e) {
    if (e.data.type === 'init') {
        role = e.data.role;
        port = e.data.port;
        port.onmessage = handleChannelMessage;
    } else if (e.data.type === 'start') {
        if (role === 'producer') produce();
    }
};

function handleChannelMessage(e) {
    if (role === 'consumer') {
        self.postMessage({ message: `Received: ${e.data}` });
    }
}

function produce() {
    for (let i = 1; i <= 5; i++) {
        setTimeout(() => {
            const value = Math.floor(Math.random() * 100);
            port.postMessage(value);
            self.postMessage({ message: `Sent: ${value}` });
        }, i * 500);
    }
}
