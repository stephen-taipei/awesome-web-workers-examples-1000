/**
 * #605 Shared Worker
 * SharedWorker for cross-tab communication
 */

const clients = new Map();
let clientIdCounter = 0;
let sharedState = {
    counter: 0,
    lastUpdate: Date.now()
};

self.onconnect = function(e) {
    const port = e.ports[0];
    const clientId = ++clientIdCounter;

    clients.set(clientId, { port, tabId: null });

    port.onmessage = (event) => {
        const { type, data } = event.data;

        switch (type) {
            case 'register':
                clients.get(clientId).tabId = data.tabId;
                port.postMessage({
                    type: 'connected',
                    data: { clientId, totalClients: clients.size }
                });
                // Notify other clients
                broadcastToOthers(clientId, {
                    type: 'client-joined',
                    data: { totalClients: clients.size }
                });
                break;

            case 'broadcast':
                // Send to all clients including sender
                broadcastToAll({
                    type: 'broadcast',
                    data: { from: data.from, message: data.message }
                });
                break;

            case 'increment':
                sharedState.counter++;
                sharedState.lastUpdate = Date.now();
                // Send updated state to all
                broadcastState();
                break;

            case 'getState':
                port.postMessage({
                    type: 'state',
                    data: {
                        counter: sharedState.counter,
                        lastUpdate: sharedState.lastUpdate,
                        clientCount: clients.size
                    }
                });
                break;
        }
    };

    port.onmessageerror = () => {
        removeClient(clientId);
    };

    port.start();
};

function broadcastToAll(message) {
    for (const [, client] of clients) {
        try {
            client.port.postMessage(message);
        } catch (e) {
            // Client disconnected
        }
    }
}

function broadcastToOthers(excludeId, message) {
    for (const [id, client] of clients) {
        if (id !== excludeId) {
            try {
                client.port.postMessage(message);
            } catch (e) {
                // Client disconnected
            }
        }
    }
}

function broadcastState() {
    broadcastToAll({
        type: 'state',
        data: {
            counter: sharedState.counter,
            lastUpdate: sharedState.lastUpdate,
            clientCount: clients.size
        }
    });
}

function removeClient(clientId) {
    clients.delete(clientId);
    broadcastToAll({
        type: 'client-left',
        data: { totalClients: clients.size }
    });
}
