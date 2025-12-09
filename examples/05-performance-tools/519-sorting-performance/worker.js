self.onmessage = function(e) {
    const { algorithm, size } = e.data;

    // Generate data
    const array = new Float32Array(size);
    for (let i = 0; i < size; i++) {
        array[i] = Math.random();
    }

    const startTime = performance.now();

    if (algorithm === 'native') {
        array.sort();
    } else if (algorithm === 'quick') {
        quickSort(array, 0, array.length - 1);
    } else if (algorithm === 'bubble') {
        bubbleSort(array);
    }

    const endTime = performance.now();

    self.postMessage({
        duration: endTime - startTime,
        algorithm: algorithm
    });
};

function quickSort(arr, left, right) {
    if (left < right) {
        const pivotIndex = partition(arr, left, right);
        quickSort(arr, left, pivotIndex - 1);
        quickSort(arr, pivotIndex + 1, right);
    }
}

function partition(arr, left, right) {
    const pivot = arr[right];
    let i = left - 1;
    for (let j = left; j < right; j++) {
        if (arr[j] < pivot) {
            i++;
            const temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
    }
    const temp = arr[i + 1];
    arr[i + 1] = arr[right];
    arr[right] = temp;
    return i + 1;
}

function bubbleSort(arr) {
    const len = arr.length;
    for (let i = 0; i < len; i++) {
        for (let j = 0; j < len - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                const temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}
