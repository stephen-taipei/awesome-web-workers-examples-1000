self.onmessage = function(e) {
    const { size, complexity } = e.data;
    const results = [];

    // 1. Generate Object
    const obj = generateObject(complexity, size);

    // 2. Stringify (Serialization)
    let start = performance.now();
    const jsonString = JSON.stringify(obj);
    let end = performance.now();
    results.push({ op: 'JSON.stringify', size: jsonString.length, time: end - start });
    self.postMessage({ type: 'progress', percent: 50 });

    // 3. Parse (Deserialization)
    start = performance.now();
    JSON.parse(jsonString);
    end = performance.now();
    results.push({ op: 'JSON.parse', size: jsonString.length, time: end - start });

    self.postMessage({ type: 'complete', results });
};

function generateObject(type, size) {
    if (type === 'flat') {
        const obj = {};
        for (let i = 0; i < size; i++) {
            obj[`key_${i}`] = `value_${i}_${Math.random()}`;
        }
        return obj;
    } else if (type === 'array') {
        const arr = [];
        for (let i = 0; i < size; i++) {
            arr.push({
                id: i,
                name: `Item ${i}`,
                active: i % 2 === 0,
                meta: { x: Math.random(), y: Math.random() }
            });
        }
        return arr;
    } else if (type === 'deep') {
        let current = {};
        const root = current;
        // Depth is limited by stack size usually, so keep it reasonable and expand width slightly
        const depth = Math.min(size, 2000);
        for (let i = 0; i < depth; i++) {
            current.next = { value: i, data: "some string data" };
            current = current.next;
        }
        return root;
    }
}
