self.onmessage = function(e) {
    const { size } = e.data;
    const results = [];
    let start, end;

    // 1. Allocation
    start = performance.now();
    const standardArr = new Array(size);
    end = performance.now();
    results.push({ test: 'Allocation', type: 'Array', time: end - start });

    start = performance.now();
    const typedArr = new Int32Array(size);
    end = performance.now();
    results.push({ test: 'Allocation', type: 'Int32Array', time: end - start });

    self.postMessage({ type: 'progress', percent: 20 });

    // 2. Write (Sequential)
    start = performance.now();
    for (let i = 0; i < size; i++) {
        standardArr[i] = i;
    }
    end = performance.now();
    results.push({ test: 'Write (Sequential)', type: 'Array', time: end - start });

    start = performance.now();
    for (let i = 0; i < size; i++) {
        typedArr[i] = i;
    }
    end = performance.now();
    results.push({ test: 'Write (Sequential)', type: 'Int32Array', time: end - start });

    self.postMessage({ type: 'progress', percent: 40 });

    // 3. Read (Summation)
    let sum = 0;
    start = performance.now();
    for (let i = 0; i < size; i++) {
        sum += standardArr[i];
    }
    end = performance.now();
    results.push({ test: 'Read (Summation)', type: 'Array', time: end - start });

    sum = 0;
    start = performance.now();
    for (let i = 0; i < size; i++) {
        sum += typedArr[i];
    }
    end = performance.now();
    results.push({ test: 'Read (Summation)', type: 'Int32Array', time: end - start });

    self.postMessage({ type: 'progress', percent: 60 });

    // 4. Random Access Write
    // Generate random indices once to be fair
    const indices = new Int32Array(Math.min(size, 1000000)); // Test up to 1M ops
    for(let i=0; i<indices.length; i++) indices[i] = Math.floor(Math.random() * size);

    start = performance.now();
    for (let i = 0; i < indices.length; i++) {
        standardArr[indices[i]] = i;
    }
    end = performance.now();
    results.push({ test: 'Random Write', type: 'Array', time: end - start });

    start = performance.now();
    for (let i = 0; i < indices.length; i++) {
        typedArr[indices[i]] = i;
    }
    end = performance.now();
    results.push({ test: 'Random Write', type: 'Int32Array', time: end - start });

    self.postMessage({ type: 'progress', percent: 80 });

    // 5. Native Methods (Map/Filter vs TypedArray methods)
    // TypedArrays map returns a new TypedArray

    start = performance.now();
    standardArr.map(x => x * 2);
    end = performance.now();
    results.push({ test: 'Map (*2)', type: 'Array', time: end - start });

    start = performance.now();
    typedArr.map(x => x * 2);
    end = performance.now();
    results.push({ test: 'Map (*2)', type: 'Int32Array', time: end - start });

    self.postMessage({ type: 'complete', results });
};
