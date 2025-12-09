// Fork-Join Pattern - Web Worker

self.onmessage = function(e) {
    const { taskId, taskType, data } = e.data;

    let result;

    switch (taskType) {
        case 'arraySum':
            result = computeArraySum(data);
            break;
        case 'mergeSort':
            result = computeMergeSort(data);
            break;
        case 'primeCount':
            result = computePrimeCount(data);
            break;
        case 'matrixMult':
            result = computeMatrixBlock(data);
            break;
        default:
            result = null;
    }

    self.postMessage({ taskId, result });
};

function computeArraySum(arr) {
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
        sum += arr[i];
    }
    return sum;
}

function computeMergeSort(arr) {
    if (arr.length <= 1) return arr;

    const sorted = arr.slice();
    mergeSort(sorted, 0, sorted.length - 1);
    return sorted;
}

function mergeSort(arr, left, right) {
    if (left >= right) return;

    const mid = Math.floor((left + right) / 2);
    mergeSort(arr, left, mid);
    mergeSort(arr, mid + 1, right);
    merge(arr, left, mid, right);
}

function merge(arr, left, mid, right) {
    const temp = [];
    let i = left, j = mid + 1;

    while (i <= mid && j <= right) {
        if (arr[i] <= arr[j]) {
            temp.push(arr[i++]);
        } else {
            temp.push(arr[j++]);
        }
    }

    while (i <= mid) temp.push(arr[i++]);
    while (j <= right) temp.push(arr[j++]);

    for (let k = 0; k < temp.length; k++) {
        arr[left + k] = temp[k];
    }
}

function computePrimeCount(data) {
    const { start, end } = data;
    let count = 0;

    for (let n = start; n <= end; n++) {
        if (isPrime(n)) {
            count++;
        }
    }

    return count;
}

function isPrime(n) {
    if (n < 2) return false;
    if (n === 2) return true;
    if (n % 2 === 0) return false;

    const sqrt = Math.sqrt(n);
    for (let i = 3; i <= sqrt; i += 2) {
        if (n % i === 0) return false;
    }

    return true;
}

function computeMatrixBlock(data) {
    const { A, B, startRow, endRow, startCol, endCol, dim } = data;

    const result = [];

    for (let i = startRow; i < endRow; i++) {
        const row = [];
        for (let j = startCol; j < endCol; j++) {
            let sum = 0;
            for (let k = 0; k < dim; k++) {
                sum += A[i][k] * B[k][j];
            }
            row.push(sum);
        }
        result.push(row);
    }

    return {
        startRow,
        startCol,
        data: result
    };
}
