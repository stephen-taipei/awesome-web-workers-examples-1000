/**
 * #608 Port Transfer Worker
 * Worker that can receive and use transferred ports
 */

let workerId = null;
const peers = new Map(); // peerId -> port

self.onmessage = function(e) {
    const { type, data } = e.data;

    switch (type) {
        case 'init':
            workerId = data.id;
            log('Initialized');
            break;

        case 'addPort':
            const port = e.ports[0];
            peers.set(data.peerId, port);

            port.onmessage = (event) => {
                self.postMessage({
                    type: 'received',
                    data: {
                        from: event.data.from,
                        message: event.data.message
                    }
                });
            };
            port.start();

            log(`Port connected to Worker ${data.peerId}`);
            break;

        case 'sendTo':
            const peerPort = peers.get(data.peerId);
            if (peerPort) {
                peerPort.postMessage({
                    from: workerId,
                    message: data.message
                });
                log(`Sent to Worker ${data.peerId}`);
            } else {
                log(`No connection to Worker ${data.peerId}`);
            }
            break;
    }
};

function log(message) {
    self.postMessage({
        type: 'log',
        data: { message }
    });
}
