/**
 * #509 Sorting Benchmark - Worker Thread
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;
    if (type === 'START') runBenchmark(payload.size);
};

function runBenchmark(size) {
    sendProgress(0, 'Generating random array...');
    const original = Array.from({ length: size }, () => Math.random() * 1000000);

    // Native sort
    sendProgress(10, 'Testing native sort...');
    let arr = [...original];
    const nativeStart = performance.now();
    arr.sort((a, b) => a - b);
    const nativeTime = performance.now() - nativeStart;

    // Quick sort
    sendProgress(30, 'Testing quick sort...');
    arr = [...original];
    const quickStart = performance.now();
    quickSort(arr, 0, arr.length - 1);
    const quickTime = performance.now() - quickStart;

    // Merge sort
    sendProgress(55, 'Testing merge sort...');
    arr = [...original];
    const mergeStart = performance.now();
    mergeSort(arr);
    const mergeTime = performance.now() - mergeStart;

    // Heap sort
    sendProgress(80, 'Testing heap sort...');
    arr = [...original];
    const heapStart = performance.now();
    heapSort(arr);
    const heapTime = performance.now() - heapStart;

    const times = { native: nativeTime, quick: quickTime, merge: mergeTime, heap: heapTime };
    const fastest = Object.entries(times).sort((a, b) => a[1] - b[1])[0][0];

    sendProgress(100, 'Benchmark complete');

    self.postMessage({
        type: 'RESULT',
        payload: { size, nativeTime, quickTime, mergeTime, heapTime, fastest }
    });
}

function quickSort(arr, low, high) {
    if (low < high) {
        const pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}

function partition(arr, low, high) {
    const pivot = arr[high];
    let i = low - 1;
    for (let j = low; j < high; j++) {
        if (arr[j] < pivot) {
            i++;
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
    return i + 1;
}

function mergeSort(arr) {
    if (arr.length <= 1) return arr;
    const mid = Math.floor(arr.length / 2);
    const left = mergeSort(arr.slice(0, mid));
    const right = mergeSort(arr.slice(mid));
    return merge(left, right, arr);
}

function merge(left, right, arr) {
    let i = 0, j = 0, k = 0;
    while (i < left.length && j < right.length) {
        arr[k++] = left[i] < right[j] ? left[i++] : right[j++];
    }
    while (i < left.length) arr[k++] = left[i++];
    while (j < right.length) arr[k++] = right[j++];
    return arr;
}

function heapSort(arr) {
    const n = arr.length;
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) heapify(arr, n, i);
    for (let i = n - 1; i > 0; i--) {
        [arr[0], arr[i]] = [arr[i], arr[0]];
        heapify(arr, i, 0);
    }
}

function heapify(arr, n, i) {
    let largest = i;
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    if (left < n && arr[left] > arr[largest]) largest = left;
    if (right < n && arr[right] > arr[largest]) largest = right;
    if (largest !== i) {
        [arr[i], arr[largest]] = [arr[largest], arr[i]];
        heapify(arr, n, largest);
    }
}

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}
