self.onmessage = function(e) {
    const iniString = e.data.ini;
    const startTime = performance.now();

    try {
        const result = parseINI(iniString);
        const endTime = performance.now();

        self.postMessage({
            json: result,
            time: endTime - startTime
        });
    } catch (err) {
        self.postMessage({
            error: err.toString(),
            time: performance.now() - startTime
        });
    }
};

function parseINI(text) {
    const result = {};
    let currentSection = result;

    const lines = text.split(/\r\n|\n|\r/);

    for (let line of lines) {
        line = line.trim();

        // Skip empty lines and comments
        if (!line || line.startsWith(';') || line.startsWith('#')) continue;

        // Section header [section]
        if (line.startsWith('[') && line.endsWith(']')) {
            const sectionName = line.slice(1, -1).trim();
            result[sectionName] = {};
            currentSection = result[sectionName];
        }
        // Key = Value
        else if (line.includes('=')) {
            const parts = line.split('=');
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();

            currentSection[key] = parseValue(value);
        }
    }

    return result;
}

function parseValue(val) {
    // Remove quotes if present
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        return val.slice(1, -1);
    }

    if (val.toLowerCase() === 'true') return true;
    if (val.toLowerCase() === 'false') return false;
    if (!isNaN(Number(val)) && val !== '') return Number(val);

    return val;
}
