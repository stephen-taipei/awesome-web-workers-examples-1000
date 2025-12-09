// Watershed Worker
// Implements Marker-Controlled Watershed Transform
// Using a priority queue based immersion simulation

self.onmessage = function(e) {
    const { imageData, markers } = e.data;
    const { width, height, data } = imageData;

    try {
        const startTime = performance.now();

        self.postMessage({ type: 'progress', progress: 10, message: '計算梯度...' });

        // 1. Compute Gradient Magnitude (Sobel)
        const gradientMap = new Float32Array(width * height);
        const gray = new Float32Array(width * height);

        // Convert to grayscale
        for (let i = 0; i < width * height; i++) {
            gray[i] = data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114;
        }

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                // Sobel X
                const gx =
                    -1 * gray[(y-1)*width + (x-1)] + 1 * gray[(y-1)*width + (x+1)] +
                    -2 * gray[(y)*width + (x-1)]   + 2 * gray[(y)*width + (x+1)] +
                    -1 * gray[(y+1)*width + (x-1)] + 1 * gray[(y+1)*width + (x+1)];

                // Sobel Y
                const gy =
                    -1 * gray[(y-1)*width + (x-1)] - 2 * gray[(y-1)*width + (x)] - 1 * gray[(y-1)*width + (x+1)] +
                     1 * gray[(y+1)*width + (x-1)] + 2 * gray[(y+1)*width + (x)] + 1 * gray[(y+1)*width + (x+1)];

                gradientMap[y*width + x] = Math.sqrt(gx*gx + gy*gy);
            }
        }

        // 2. Initialize Priority Queue with Markers
        self.postMessage({ type: 'progress', progress: 30, message: '初始化佇列...' });

        // Priority Queue implementation (Min-Heap based on gradient value)
        const pq = new PriorityQueue();
        const labels = new Int32Array(markers); // Copy markers
        const isQueued = new Uint8Array(width * height); // Avoid duplicates in PQ? Actually standard watershed uses distance or gradient

        // Pre-process: put neighbors of markers into PQ
        // Actually, typical implementation:
        // Put all marker pixels into PQ with priority = gradient at that pixel.
        // Wait, standard algorithm:
        // 1. Markers get their label.
        // 2. Add all neighbors of markers to PQ.

        // Let's iterate all pixels. If it is a marker > 0, check 4-neighbors.
        // If a neighbor is 0 (unlabeled), add neighbor to PQ.

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (labels[idx] > 0) {
                    // Check neighbors
                    const neighbors = getNeighbors(x, y, width, height);
                    for (const nIdx of neighbors) {
                        if (labels[nIdx] === 0 && isQueued[nIdx] === 0) {
                            pq.push({ idx: nIdx, cost: gradientMap[nIdx] });
                            isQueued[nIdx] = 1; // Mark as in queue
                        }
                    }
                }
            }
        }

        self.postMessage({ type: 'progress', progress: 40, message: '執行分水嶺泛洪...' });

        let processed = 0;
        const totalPixels = width * height;

        while (!pq.isEmpty()) {
            processed++;
            if (processed % 10000 === 0) {
                 // Roughly estimate progress?
                 // It's hard to know max PQ ops, but maybe relate to unlabeled count
                 // Just linear visual progress
                 const p = 40 + Math.min(50, (processed / (totalPixels/2)) * 50);
                 self.postMessage({ type: 'progress', progress: p, message: '分水嶺運算中...' });
            }

            const current = pq.pop();
            const idx = current.idx;

            // Check neighbors to determine label
            const neighbors = getNeighbors(idx % width, Math.floor(idx / width), width, height);
            let selectedLabel = 0;

            // If it's watershed line (we might handle this later, or just assign to first found label)
            // Look at labeled neighbors
            for (const nIdx of neighbors) {
                if (labels[nIdx] > 0) {
                    if (selectedLabel === 0) {
                        selectedLabel = labels[nIdx];
                    } else if (selectedLabel !== labels[nIdx]) {
                        // Conflict! This is a watershed line.
                        // For simple segmentation, we might just merge or mark as boundary (0)
                        // Here we adopt the label of the first neighbor (simple flooding)
                        // Or we mark as boundary. OpenCV marks boundary as -1.
                        // Let's stick to simple region growing: first come first serve.
                    }
                }
            }

            if (selectedLabel > 0) {
                labels[idx] = selectedLabel;

                // Add unlabeled neighbors to PQ
                for (const nIdx of neighbors) {
                    if (labels[nIdx] === 0 && isQueued[nIdx] === 0) {
                        pq.push({ idx: nIdx, cost: gradientMap[nIdx] });
                        isQueued[nIdx] = 1;
                    }
                }
            }
        }

        self.postMessage({ type: 'progress', progress: 95, message: '完成...' });

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: { labels: labels },
            executionTime: (endTime - startTime).toFixed(2)
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};

function getNeighbors(x, y, width, height) {
    const n = [];
    if (x > 0) n.push(y * width + (x - 1));
    if (x < width - 1) n.push(y * width + (x + 1));
    if (y > 0) n.push((y - 1) * width + x);
    if (y < height - 1) n.push((y + 1) * width + x);
    return n;
}

// Simple Min Priority Queue
class PriorityQueue {
    constructor() {
        this.heap = [];
    }

    push(item) {
        this.heap.push(item);
        this.bubbleUp(this.heap.length - 1);
    }

    pop() {
        if (this.heap.length === 0) return null;
        const top = this.heap[0];
        const bottom = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = bottom;
            this.bubbleDown(0);
        }
        return top;
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    bubbleUp(i) {
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (this.heap[parent].cost <= this.heap[i].cost) break;
            [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
            i = parent;
        }
    }

    bubbleDown(i) {
        while (true) {
            const left = 2 * i + 1;
            const right = 2 * i + 2;
            let smallest = i;

            if (left < this.heap.length && this.heap[left].cost < this.heap[smallest].cost) {
                smallest = left;
            }
            if (right < this.heap.length && this.heap[right].cost < this.heap[smallest].cost) {
                smallest = right;
            }

            if (smallest === i) break;

            [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
            i = smallest;
        }
    }
}
