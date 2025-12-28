/**
 * #635 Observer Worker
 */
let id;

self.onmessage = function(e) {
    if (e.data.type === 'init') {
        id = e.data.id;
    } else if (e.data.type === 'notify') {
        // Process the notification
        const processed = e.data.value * (id + 1);
        self.postMessage({ value: e.data.value, processed });
    }
};
