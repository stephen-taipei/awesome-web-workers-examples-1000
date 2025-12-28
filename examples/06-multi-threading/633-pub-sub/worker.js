/**
 * #633 Pub-Sub Worker
 */
let subscribedTopics = [];

self.onmessage = function(e) {
    if (e.data.type === 'subscribe') {
        subscribedTopics = e.data.topics;
    } else if (e.data.type === 'message') {
        if (subscribedTopics.includes(e.data.topic)) {
            self.postMessage({ type: 'received', topic: e.data.topic, message: e.data.message });
        }
    }
};
