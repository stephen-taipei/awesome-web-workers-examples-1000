/**
 * #607 Message Channel Worker
 * Worker with MessagePort for direct peer communication
 */

let workerId = null;
let peerPort = null;
let peerId = null;
let pingPongCount = 0;
let pingPongTarget = 0;

self.onmessage = function(e) {
    const { type, data } = e.data;

    switch (type) {
        case 'init':
            workerId = data.id;
            break;

        case 'setPort':
            // Receive transferred port
            peerPort = e.ports[0];
            peerId = data.peerId;

            peerPort.onmessage = handlePeerMessage;
            peerPort.start();
            break;

        case 'sendToPeer':
            if (peerPort) {
                peerPort.postMessage({
                    type: 'message',
                    from: workerId,
                    data: data.message
                });
                log(`Sent to ${peerId}: ${data.message}`);
            }
            break;

        case 'startPingPong':
            pingPongCount = 0;
            pingPongTarget = data.count;
            // Start ping
            if (peerPort) {
                peerPort.postMessage({
                    type: 'ping',
                    count: 0
                });
                log('Started ping-pong');
            }
            break;
    }
};

function handlePeerMessage(e) {
    const { type, from, data, count } = e.data;

    switch (type) {
        case 'message':
            log(`Received from ${from}: ${data}`);
            self.postMessage({ type: 'received' });
            break;

        case 'ping':
            // Respond with pong
            peerPort.postMessage({
                type: 'pong',
                count: count + 1
            });
            self.postMessage({ type: 'received' });
            if (count % 20 === 0) {
                log(`Received ping #${count}`);
            }
            break;

        case 'pong':
            self.postMessage({ type: 'received' });
            if (count < pingPongTarget) {
                // Continue ping-pong
                peerPort.postMessage({
                    type: 'ping',
                    count
                });
            } else {
                log(`Ping-pong complete: ${count} exchanges`);
                self.postMessage({ type: 'pong-complete' });
            }
            break;
    }
}

function log(message) {
    self.postMessage({
        type: 'log',
        data: { message }
    });
}
