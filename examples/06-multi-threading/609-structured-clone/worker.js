/**
 * #609 Structured Clone Worker
 * Tests structured clone algorithm
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    if (type === 'echo') {
        try {
            const results = analyzeData(data);
            const endTime = performance.now();

            self.postMessage({
                type: 'result',
                data: {
                    results,
                    timing: endTime - startTime
                }
            });
        } catch (error) {
            self.postMessage({
                type: 'error',
                data: { message: error.message }
            });
        }
    }
};

function analyzeData(data) {
    const results = {};

    for (const [key, value] of Object.entries(data)) {
        results[key] = {
            type: getTypeName(value),
            value: getDisplayValue(value),
            preserved: checkPreserved(value)
        };
    }

    return results;
}

function getTypeName(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'Array';
    if (value instanceof Date) return 'Date';
    if (value instanceof RegExp) return 'RegExp';
    if (value instanceof Map) return 'Map';
    if (value instanceof Set) return 'Set';
    if (value instanceof Blob) return 'Blob';
    if (value instanceof ArrayBuffer) return 'ArrayBuffer';
    if (value instanceof DataView) return 'DataView';
    if (ArrayBuffer.isView(value)) return value.constructor.name;
    if (typeof value === 'bigint') return 'BigInt';
    if (typeof value === 'object') return 'Object';
    return typeof value;
}

function getDisplayValue(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'bigint') return value.toString() + 'n';
    if (typeof value === 'number') {
        if (Number.isNaN(value)) return 'NaN';
        if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';
        return String(value);
    }
    if (value instanceof Date) return value.toISOString();
    if (value instanceof RegExp) return value.toString();
    if (value instanceof Map) return `Map(${value.size})`;
    if (value instanceof Set) return `Set(${value.size})`;
    if (value instanceof Blob) return `Blob(${value.size} bytes, ${value.type})`;
    if (value instanceof ArrayBuffer) return `ArrayBuffer(${value.byteLength})`;
    if (value instanceof DataView) return `DataView(${value.byteLength})`;
    if (ArrayBuffer.isView(value)) return `${value.constructor.name}[${value.length}]`;
    if (Array.isArray(value)) return JSON.stringify(value).substr(0, 100);
    if (typeof value === 'object') return JSON.stringify(value).substr(0, 100);
    return String(value);
}

function checkPreserved(value) {
    // Check if value type is preserved through structured clone
    if (value === null || value === undefined) return true;
    if (typeof value === 'bigint') return true;
    if (value instanceof Date) return true;
    if (value instanceof RegExp) return true;
    if (value instanceof Map) return true;
    if (value instanceof Set) return true;
    if (value instanceof Blob) return true;
    if (value instanceof ArrayBuffer) return true;
    if (ArrayBuffer.isView(value)) return true;
    if (Array.isArray(value)) return true;
    if (typeof value === 'object') return true;
    return true; // Primitives are always preserved
}
