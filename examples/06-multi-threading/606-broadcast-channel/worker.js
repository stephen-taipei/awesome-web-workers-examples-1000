/**
 * #606 Broadcast Channel Worker
 * Worker that participates in broadcast channel
 */

let channel = null;
let workerId = null;

self.onmessage = function(e) {
    const { type, data } = e.data;

    switch (type) {
        case 'init':
            workerId = data.workerId;
            channel = new BroadcastChannel(data.channelName);

            channel.onmessage = (event) => {
                // Worker received broadcast - could process it
                console.log(`Worker ${workerId} received:`, event.data);
            };

            self.postMessage({ type: 'ready', data: { workerId } });
            break;

        case 'broadcast':
            if (channel) {
                channel.postMessage({
                    from: `worker-${workerId}`,
                    message: data.message,
                    type: 'worker',
                    timestamp: Date.now()
                });
            }
            break;
    }
};
