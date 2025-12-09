self.onmessage = function(e) {
    const { size } = e.data;
    const results = [];
    let start, end;

    // Create a large array for testing
    const arr = new Int32Array(size);
    for (let i = 0; i < size; i++) arr[i] = i;

    // 1. Standard for loop
    let sum = 0;
    start = performance.now();
    for (let i = 0; i < size; i++) {
        sum += arr[i];
    }
    end = performance.now();
    results.push({ name: 'for (standard)', time: end - start });
    self.postMessage({ type: 'progress', percent: 20 });

    // 2. while loop
    sum = 0;
    let i = 0;
    start = performance.now();
    while (i < size) {
        sum += arr[i];
        i++;
    }
    end = performance.now();
    results.push({ name: 'while', time: end - start });
    self.postMessage({ type: 'progress', percent: 40 });

    // 3. for...of
    sum = 0;
    start = performance.now();
    for (const val of arr) {
        sum += val;
    }
    end = performance.now();
    results.push({ name: 'for...of', time: end - start });
    self.postMessage({ type: 'progress', percent: 60 });

    // 4. Array.prototype.forEach (TypedArray forEach)
    sum = 0;
    start = performance.now();
    arr.forEach((val) => {
        sum += val;
    });
    end = performance.now();
    results.push({ name: 'forEach', time: end - start });
    self.postMessage({ type: 'progress', percent: 80 });

    // 5. reduce
    start = performance.now();
    arr.reduce((acc, val) => acc + val, 0);
    end = performance.now();
    results.push({ name: 'reduce', time: end - start });

    self.postMessage({ type: 'complete', results });
};
