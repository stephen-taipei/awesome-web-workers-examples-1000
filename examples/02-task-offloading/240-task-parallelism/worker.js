// Task Parallelism - Web Worker
// Handles different heterogeneous tasks in parallel

self.onmessage = function(e) {
    const { taskType, params } = e.data;

    switch (taskType) {
        case 'primes':
            computePrimes(params);
            break;
        case 'matrix':
            computeMatrix(params);
            break;
        case 'fibonacci':
            computeFibonacci(params);
            break;
        case 'text':
            analyzeText(params);
            break;
        default:
            self.postMessage({ type: 'error', message: 'Unknown task type' });
    }
};

// Task A: Prime number calculation using Sieve of Eratosthenes
function computePrimes(params) {
    const { limit } = params;
    const startTime = performance.now();

    const sieve = new Uint8Array(limit + 1);
    const primes = [];

    // Report initial progress
    self.postMessage({ type: 'progress', taskType: 'primes', percent: 0 });

    // Sieve of Eratosthenes
    for (let i = 2; i <= limit; i++) {
        if (!sieve[i]) {
            primes.push(i);
            for (let j = i * i; j <= limit; j += i) {
                sieve[j] = 1;
            }
        }

        // Progress report every 10%
        if (i % Math.floor(limit / 10) === 0) {
            self.postMessage({
                type: 'progress',
                taskType: 'primes',
                percent: Math.round((i / limit) * 100)
            });
        }
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        taskType: 'primes',
        result: {
            count: primes.length,
            firstTen: primes.slice(0, 10),
            lastTen: primes.slice(-10)
        },
        executionTime: endTime - startTime
    });
}

// Task B: Matrix multiplication
function computeMatrix(params) {
    const { size } = params;
    const startTime = performance.now();

    // Generate random matrices
    const A = [];
    const B = [];
    for (let i = 0; i < size; i++) {
        A[i] = [];
        B[i] = [];
        for (let j = 0; j < size; j++) {
            A[i][j] = Math.random() * 10;
            B[i][j] = Math.random() * 10;
        }
    }

    self.postMessage({ type: 'progress', taskType: 'matrix', percent: 10 });

    // Matrix multiplication C = A * B
    const C = [];
    for (let i = 0; i < size; i++) {
        C[i] = [];
        for (let j = 0; j < size; j++) {
            let sum = 0;
            for (let k = 0; k < size; k++) {
                sum += A[i][k] * B[k][j];
            }
            C[i][j] = sum;
        }

        // Progress report
        if (i % Math.floor(size / 10) === 0) {
            self.postMessage({
                type: 'progress',
                taskType: 'matrix',
                percent: 10 + Math.round((i / size) * 90)
            });
        }
    }

    // Compute checksum (sum of all elements)
    let checksum = 0;
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            checksum += C[i][j];
        }
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        taskType: 'matrix',
        result: {
            checksum: checksum.toFixed(2),
            dimensions: `${size}x${size}`
        },
        executionTime: endTime - startTime
    });
}

// Task C: Fibonacci sequence with big number handling
function computeFibonacci(params) {
    const { count } = params;
    const startTime = performance.now();

    // Using string-based arithmetic for large numbers
    const fibs = ['0', '1'];

    self.postMessage({ type: 'progress', taskType: 'fibonacci', percent: 0 });

    for (let i = 2; i < count; i++) {
        fibs.push(addBigNumbers(fibs[i - 1], fibs[i - 2]));

        // Progress report
        if (i % Math.floor(count / 10) === 0) {
            self.postMessage({
                type: 'progress',
                taskType: 'fibonacci',
                percent: Math.round((i / count) * 100)
            });
        }
    }

    // Sum of digits in the last number
    const lastFib = fibs[fibs.length - 1];
    let digitSum = 0;
    for (let char of lastFib) {
        digitSum += parseInt(char);
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        taskType: 'fibonacci',
        result: {
            count: count,
            lastFibDigits: lastFib.length,
            digitSum: digitSum
        },
        executionTime: endTime - startTime
    });
}

// Helper: Add two large numbers as strings
function addBigNumbers(a, b) {
    let result = '';
    let carry = 0;
    let i = a.length - 1;
    let j = b.length - 1;

    while (i >= 0 || j >= 0 || carry) {
        const digitA = i >= 0 ? parseInt(a[i]) : 0;
        const digitB = j >= 0 ? parseInt(b[j]) : 0;
        const sum = digitA + digitB + carry;
        result = (sum % 10) + result;
        carry = Math.floor(sum / 10);
        i--;
        j--;
    }

    return result;
}

// Task D: Text analysis
function analyzeText(params) {
    const { length } = params;
    const startTime = performance.now();

    // Generate random text
    const words = ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog',
        'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing',
        'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'labore', 'magna',
        'aliqua', 'enim', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation',
        'ullamco', 'laboris', 'nisi', 'aliquip', 'commodo', 'consequat'];

    let text = '';
    while (text.length < length) {
        text += words[Math.floor(Math.random() * words.length)] + ' ';
    }
    text = text.substring(0, length);

    self.postMessage({ type: 'progress', taskType: 'text', percent: 30 });

    // Word frequency analysis
    const wordFreq = {};
    const textWords = text.split(/\s+/);

    for (let i = 0; i < textWords.length; i++) {
        const word = textWords[i].toLowerCase();
        if (word) {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        }

        if (i % Math.floor(textWords.length / 5) === 0) {
            self.postMessage({
                type: 'progress',
                taskType: 'text',
                percent: 30 + Math.round((i / textWords.length) * 50)
            });
        }
    }

    // Find most common words
    const sortedWords = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    self.postMessage({ type: 'progress', taskType: 'text', percent: 90 });

    // Character analysis
    let charCount = {};
    for (let char of text) {
        if (char !== ' ') {
            charCount[char] = (charCount[char] || 0) + 1;
        }
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        taskType: 'text',
        result: {
            wordCount: textWords.filter(w => w).length,
            uniqueWords: Object.keys(wordFreq).length,
            topWords: sortedWords,
            charTypes: Object.keys(charCount).length
        },
        executionTime: endTime - startTime
    });
}
