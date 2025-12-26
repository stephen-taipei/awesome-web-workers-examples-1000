self.onmessage = function(e) {
    const { text, mode } = e.data;
    const start = performance.now();

    let result = text;

    if (mode === 'trim') {
        // Trim each line
        result = text.split('\n').map(line => line.trim()).join('\n');
    } else if (mode === 'single-space') {
        // Replace multiple spaces with single space
        result = text.replace(/ +/g, ' ');
    } else if (mode === 'tab-to-space') {
        // Convert tabs to 4 spaces
        result = text.replace(/\t/g, '    ');
    } else if (mode === 'space-to-tab') {
        // Convert 4 spaces to tabs
        result = text.replace(/    /g, '\t');
    }

    const end = performance.now();
    self.postMessage({ result, time: end - start });
};
