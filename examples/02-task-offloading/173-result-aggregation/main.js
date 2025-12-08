// Main Thread

const generateBtn = document.getElementById('generate-btn');
const processBtn = document.getElementById('process-btn');
const textSizeSelect = document.getElementById('text-size');
const workerCountSelect = document.getElementById('worker-count');
const statusDiv = document.getElementById('status');
const workerStatusContainer = document.getElementById('worker-status-container');
const topWordsDiv = document.getElementById('top-words');

const genTimeDiv = document.getElementById('gen-time');
const procTimeDiv = document.getElementById('proc-time');
const aggTimeDiv = document.getElementById('agg-time');
const uniqueCountDiv = document.getElementById('unique-count');

let generatedText = '';
let workers = [];

generateBtn.addEventListener('click', generateTextData);
processBtn.addEventListener('click', startProcessing);

function generateTextData() {
    const size = parseInt(textSizeSelect.value);
    statusDiv.textContent = `Generating ${size.toLocaleString()} words...`;
    generateBtn.disabled = true;
    processBtn.disabled = true;

    // Use setTimeout to allow UI to update
    setTimeout(() => {
        const start = performance.now();

        // Simple vocabulary
        const vocabulary = [
            "apple", "banana", "cherry", "date", "elderberry", "fig", "grape", "honeydew",
            "kiwi", "lemon", "mango", "nectarine", "orange", "papaya", "quince", "raspberry",
            "strawberry", "tangerine", "ugli", "vanilla", "watermelon", "xigua", "yam", "zucchini",
            "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with", "he", "as", "you", "do", "at"
        ];

        // Generate array of random words then join
        const words = new Array(size);
        for(let i=0; i<size; i++) {
            words[i] = vocabulary[Math.floor(Math.random() * vocabulary.length)];
        }
        generatedText = words.join(" ");

        const end = performance.now();
        genTimeDiv.textContent = (end - start).toFixed(2) + ' ms';

        statusDiv.textContent = 'Text generated. Ready to process.';
        generateBtn.disabled = false;
        processBtn.disabled = false;
    }, 50);
}

function startProcessing() {
    if (!generatedText) return;

    const workerCount = parseInt(workerCountSelect.value);

    statusDiv.textContent = `Distributing tasks to ${workerCount} workers...`;
    processBtn.disabled = true;
    generateBtn.disabled = true;

    // Reset stats
    procTimeDiv.textContent = '- ms';
    aggTimeDiv.textContent = '- ms';
    uniqueCountDiv.textContent = '-';
    topWordsDiv.innerHTML = '';
    workerStatusContainer.innerHTML = '';

    // Initialize workers
    workers.forEach(w => w.terminate());
    workers = [];

    // Split text for workers
    // Note: Simple split by length might cut words in half.
    // A robust solution finds the nearest space.
    const chunkSize = Math.ceil(generatedText.length / workerCount);
    const chunks = [];
    let currentPos = 0;

    for (let i = 0; i < workerCount; i++) {
        let endPos = currentPos + chunkSize;
        if (i === workerCount - 1) {
            endPos = generatedText.length;
        } else {
            // Adjust endPos to not break a word
            while (endPos < generatedText.length && generatedText[endPos] !== ' ') {
                endPos++;
            }
        }

        chunks.push(generatedText.substring(currentPos, endPos));
        currentPos = endPos + 1; // Skip the space
    }

    const processStart = performance.now();
    let completedCount = 0;
    const partialResults = [];

    for (let i = 0; i < workerCount; i++) {
        // Create UI for worker
        const workerBox = document.createElement('div');
        workerBox.className = 'worker-box active';
        workerBox.id = `worker-box-${i}`;
        workerBox.textContent = `Worker ${i+1}: Processing...`;
        workerStatusContainer.appendChild(workerBox);

        const worker = new Worker('worker.js');
        workers.push(worker);

        worker.onmessage = function(e) {
            const { type, data } = e.data;
            if (type === 'result') {
                partialResults.push(data);
                completedCount++;

                document.getElementById(`worker-box-${i}`).className = 'worker-box done';
                document.getElementById(`worker-box-${i}`).textContent = `Worker ${i+1}: Done`;

                if (completedCount === workerCount) {
                    const processEnd = performance.now();
                    procTimeDiv.textContent = (processEnd - processStart).toFixed(2) + ' ms';

                    aggregateResults(partialResults);

                    workers.forEach(w => w.terminate());
                    workers = [];
                    processBtn.disabled = false;
                    generateBtn.disabled = false;
                }
            }
        };

        worker.postMessage({ text: chunks[i] });
    }
}

function aggregateResults(results) {
    statusDiv.textContent = 'Aggregating results...';
    const start = performance.now();

    // Merge strategy: Combine all maps into one
    const finalCounts = new Map();

    for (const result of results) {
        // result is a Map object serialized (or similar structure)
        // Since Map isn't directly serializable in some contexts without conversion,
        // usually we pass array of entries or object.
        // Let's assume worker sends a plain object or Map (structured clone handles Map in modern browsers)

        if (result instanceof Map) {
            for (const [word, count] of result) {
                finalCounts.set(word, (finalCounts.get(word) || 0) + count);
            }
        } else {
             // Fallback if it's an object
             for (const word in result) {
                 finalCounts.set(word, (finalCounts.get(word) || 0) + result[word]);
             }
        }
    }

    const end = performance.now();
    aggTimeDiv.textContent = (end - start).toFixed(2) + ' ms';
    uniqueCountDiv.textContent = finalCounts.size;
    statusDiv.textContent = 'Completed!';

    // Display Top 10
    const sorted = Array.from(finalCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

    topWordsDiv.innerHTML = sorted.map(([word, count]) =>
        `<div class="word-tag">${word} <span>${count}</span></div>`
    ).join('');
}
