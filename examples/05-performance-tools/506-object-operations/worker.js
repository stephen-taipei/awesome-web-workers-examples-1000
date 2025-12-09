self.onmessage = function(e) {
    const { count } = e.data;
    const results = [];
    let start, end;

    // 1. Insertion (Creation)
    const obj = {};
    const map = new Map();
    const keys = [];

    // Generate keys first to be fair
    for(let i=0; i<count; i++) keys.push(`key_${i}`);

    start = performance.now();
    for (let i = 0; i < count; i++) {
        obj[keys[i]] = i;
    }
    end = performance.now();
    results.push({ op: 'Insertion', type: 'Object', time: end - start });

    start = performance.now();
    for (let i = 0; i < count; i++) {
        map.set(keys[i], i);
    }
    end = performance.now();
    results.push({ op: 'Insertion', type: 'Map', time: end - start });

    self.postMessage({ type: 'progress', percent: 33 });

    // 2. Read (Access)
    let sum = 0;
    start = performance.now();
    for (let i = 0; i < count; i++) {
        sum += obj[keys[i]];
    }
    end = performance.now();
    results.push({ op: 'Read', type: 'Object', time: end - start });

    sum = 0;
    start = performance.now();
    for (let i = 0; i < count; i++) {
        sum += map.get(keys[i]);
    }
    end = performance.now();
    results.push({ op: 'Read', type: 'Map', time: end - start });

    self.postMessage({ type: 'progress', percent: 66 });

    // 3. Deletion
    start = performance.now();
    for (let i = 0; i < count; i++) {
        delete obj[keys[i]];
    }
    end = performance.now();
    results.push({ op: 'Deletion', type: 'Object', time: end - start });

    start = performance.now();
    for (let i = 0; i < count; i++) {
        map.delete(keys[i]);
    }
    end = performance.now();
    results.push({ op: 'Deletion', type: 'Map', time: end - start });

    self.postMessage({ type: 'complete', results });
};
