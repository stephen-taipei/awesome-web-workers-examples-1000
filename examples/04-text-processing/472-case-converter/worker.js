self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'CONVERT') convert(payload.text, payload.caseType);
};

function convert(text, caseType) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Converting...' } });

    const converters = {
        upper: toUpperCase,
        lower: toLowerCase,
        title: toTitleCase,
        sentence: toSentenceCase,
        camel: toCamelCase,
        pascal: toPascalCase,
        snake: toSnakeCase,
        kebab: toKebabCase,
        constant: toConstantCase,
        toggle: toToggleCase
    };

    const result = converters[caseType] ? converters[caseType](text) : text;

    // Generate all case conversions
    const allCases = {};
    for (const [name, fn] of Object.entries(converters)) {
        allCases[name] = fn(text);
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            original: text,
            result,
            caseType,
            allCases,
            duration: performance.now() - startTime
        }
    });
}

function toUpperCase(str) {
    return str.toUpperCase();
}

function toLowerCase(str) {
    return str.toLowerCase();
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function toSentenceCase(str) {
    return str.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase());
}

function getWords(str) {
    return str.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(/\s+/);
}

function toCamelCase(str) {
    const words = getWords(str);
    return words.map((w, i) => {
        const lower = w.toLowerCase();
        return i === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    }).join('');
}

function toPascalCase(str) {
    const words = getWords(str);
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
}

function toSnakeCase(str) {
    const words = getWords(str);
    return words.map(w => w.toLowerCase()).join('_');
}

function toKebabCase(str) {
    const words = getWords(str);
    return words.map(w => w.toLowerCase()).join('-');
}

function toConstantCase(str) {
    const words = getWords(str);
    return words.map(w => w.toUpperCase()).join('_');
}

function toToggleCase(str) {
    return [...str].map(c => {
        if (c === c.toUpperCase()) return c.toLowerCase();
        if (c === c.toLowerCase()) return c.toUpperCase();
        return c;
    }).join('');
}
