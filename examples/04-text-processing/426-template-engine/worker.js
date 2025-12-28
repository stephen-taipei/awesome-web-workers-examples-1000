self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'RENDER') render(payload.template, payload.data);
};

function render(template, dataStr) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Parsing data...' } });

    let data;
    try {
        data = JSON.parse(dataStr);
    } catch (e) {
        self.postMessage({ type: 'ERROR', payload: { message: 'Invalid JSON' } });
        return;
    }

    self.postMessage({ type: 'PROGRESS', payload: { percent: 60, message: 'Rendering template...' } });

    let result = template;

    // Handle {{#each items}}...{{/each}}
    result = result.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, key, content) => {
        const arr = data[key];
        if (!Array.isArray(arr)) return '';
        return arr.map(item => {
            let itemContent = content;
            itemContent = itemContent.replace(/\{\{this\.(\w+)\}\}/g, (m, prop) => item[prop] !== undefined ? item[prop] : '');
            itemContent = itemContent.replace(/\{\{this\}\}/g, item);
            return itemContent;
        }).join('');
    });

    // Handle simple {{variable}}
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] !== undefined ? data[key] : match;
    });

    // Handle nested {{object.property}}
    result = result.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, obj, prop) => {
        return data[obj] && data[obj][prop] !== undefined ? data[obj][prop] : match;
    });

    self.postMessage({
        type: 'RESULT',
        payload: { result, duration: performance.now() - startTime }
    });
}
