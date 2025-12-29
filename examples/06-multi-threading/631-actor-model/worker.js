/**
 * #631 Actor Worker
 */
let name = '', state = 0;

self.onmessage = function(e) {
    const { type } = e.data;
    switch (type) {
        case 'init':
            name = e.data.name;
            self.postMessage({ message: 'Actor initialized', state });
            break;
        case 'increment':
            state++;
            self.postMessage({ message: `Incremented to ${state}`, state });
            break;
        case 'add':
            state += e.data.value;
            self.postMessage({ message: `Added ${e.data.value}, now ${state}`, state });
            break;
        case 'print':
            self.postMessage({ message: `Printing: "${e.data.text}"`, state });
            break;
    }
};
