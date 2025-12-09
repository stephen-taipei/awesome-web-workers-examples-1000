// Speculative Execution - Web Worker
// Implements multiple algorithms that race against each other

let shouldStop = false;

self.onmessage = function(e) {
    const { action, problemType, algorithm, data } = e.data;

    if (action === 'stop') {
        shouldStop = true;
        return;
    }

    shouldStop = false;

    switch (problemType) {
        case 'sort':
            runSortAlgorithm(algorithm, data);
            break;
        case 'search':
            runSearchAlgorithm(algorithm, data);
            break;
        case 'path':
            runPathAlgorithm(algorithm, data);
            break;
    }
};

// ============== SORTING ALGORITHMS ==============

function runSortAlgorithm(algorithm, data) {
    const arr = data.array.slice(); // Copy array
    const startTime = performance.now();

    let result;
    switch (algorithm) {
        case 'quicksort':
            result = quickSort(arr, 0, arr.length - 1);
            break;
        case 'mergesort':
            result = mergeSort(arr);
            break;
        case 'heapsort':
            result = heapSort(arr);
            break;
    }

    if (shouldStop) {
        self.postMessage({ type: 'cancelled', algorithm });
        return;
    }

    const endTime = performance.now();
    self.postMessage({
        type: 'result',
        algorithm,
        executionTime: endTime - startTime,
        checksum: result.slice(0, 10).join(',')
    });
}

function quickSort(arr, low, high) {
    const stack = [[low, high]];
    let progress = 0;
    const totalOps = arr.length;

    while (stack.length > 0) {
        if (shouldStop) return arr;

        const [l, h] = stack.pop();
        if (l < h) {
            const pivot = arr[h];
            let i = l - 1;

            for (let j = l; j < h; j++) {
                if (arr[j] <= pivot) {
                    i++;
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                }
            }
            [arr[i + 1], arr[h]] = [arr[h], arr[i + 1]];
            const p = i + 1;

            stack.push([l, p - 1]);
            stack.push([p + 1, h]);

            progress++;
            if (progress % 1000 === 0) {
                self.postMessage({
                    type: 'progress',
                    algorithm: 'quicksort',
                    percent: Math.min(95, Math.round((progress / totalOps) * 100))
                });
            }
        }
    }
    return arr;
}

function mergeSort(arr) {
    const n = arr.length;
    const aux = new Array(n);
    let progress = 0;

    for (let size = 1; size < n; size *= 2) {
        if (shouldStop) return arr;

        for (let leftStart = 0; leftStart < n; leftStart += 2 * size) {
            const mid = Math.min(leftStart + size - 1, n - 1);
            const rightEnd = Math.min(leftStart + 2 * size - 1, n - 1);

            merge(arr, aux, leftStart, mid, rightEnd);
        }

        progress++;
        self.postMessage({
            type: 'progress',
            algorithm: 'mergesort',
            percent: Math.min(95, Math.round((progress / Math.log2(n)) * 100))
        });
    }
    return arr;
}

function merge(arr, aux, left, mid, right) {
    for (let i = left; i <= right; i++) aux[i] = arr[i];

    let i = left, j = mid + 1;
    for (let k = left; k <= right; k++) {
        if (i > mid) arr[k] = aux[j++];
        else if (j > right) arr[k] = aux[i++];
        else if (aux[j] < aux[i]) arr[k] = aux[j++];
        else arr[k] = aux[i++];
    }
}

function heapSort(arr) {
    const n = arr.length;

    // Build max heap
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
        if (shouldStop) return arr;
        heapify(arr, n, i);
    }

    self.postMessage({ type: 'progress', algorithm: 'heapsort', percent: 40 });

    // Extract elements from heap
    for (let i = n - 1; i > 0; i--) {
        if (shouldStop) return arr;

        [arr[0], arr[i]] = [arr[i], arr[0]];
        heapify(arr, i, 0);

        if (i % 10000 === 0) {
            self.postMessage({
                type: 'progress',
                algorithm: 'heapsort',
                percent: 40 + Math.round(((n - i) / n) * 55)
            });
        }
    }
    return arr;
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

// ============== SEARCH ALGORITHMS ==============

function runSearchAlgorithm(algorithm, data) {
    const { text, pattern } = data;
    const startTime = performance.now();

    let result;
    switch (algorithm) {
        case 'naive':
            result = naiveSearch(text, pattern);
            break;
        case 'kmp':
            result = kmpSearch(text, pattern);
            break;
        case 'boyermoore':
            result = boyerMooreSearch(text, pattern);
            break;
    }

    if (shouldStop) {
        self.postMessage({ type: 'cancelled', algorithm });
        return;
    }

    const endTime = performance.now();
    self.postMessage({
        type: 'result',
        algorithm,
        executionTime: endTime - startTime,
        matches: result.length,
        firstMatch: result[0] || -1
    });
}

function naiveSearch(text, pattern) {
    const matches = [];
    const n = text.length;
    const m = pattern.length;

    for (let i = 0; i <= n - m; i++) {
        if (shouldStop) return matches;

        let j;
        for (j = 0; j < m; j++) {
            if (text[i + j] !== pattern[j]) break;
        }
        if (j === m) matches.push(i);

        if (i % 50000 === 0) {
            self.postMessage({
                type: 'progress',
                algorithm: 'naive',
                percent: Math.round((i / (n - m)) * 100)
            });
        }
    }
    return matches;
}

function kmpSearch(text, pattern) {
    const matches = [];
    const n = text.length;
    const m = pattern.length;

    // Build failure function
    const failure = new Array(m).fill(0);
    let k = 0;
    for (let i = 1; i < m; i++) {
        while (k > 0 && pattern[k] !== pattern[i]) k = failure[k - 1];
        if (pattern[k] === pattern[i]) k++;
        failure[i] = k;
    }

    self.postMessage({ type: 'progress', algorithm: 'kmp', percent: 10 });

    // Search
    let j = 0;
    for (let i = 0; i < n; i++) {
        if (shouldStop) return matches;

        while (j > 0 && pattern[j] !== text[i]) j = failure[j - 1];
        if (pattern[j] === text[i]) j++;
        if (j === m) {
            matches.push(i - m + 1);
            j = failure[j - 1];
        }

        if (i % 50000 === 0) {
            self.postMessage({
                type: 'progress',
                algorithm: 'kmp',
                percent: 10 + Math.round((i / n) * 90)
            });
        }
    }
    return matches;
}

function boyerMooreSearch(text, pattern) {
    const matches = [];
    const n = text.length;
    const m = pattern.length;

    // Bad character table
    const badChar = {};
    for (let i = 0; i < m - 1; i++) {
        badChar[pattern[i]] = m - 1 - i;
    }

    self.postMessage({ type: 'progress', algorithm: 'boyermoore', percent: 5 });

    let i = m - 1;
    while (i < n) {
        if (shouldStop) return matches;

        let j = m - 1;
        while (j >= 0 && text[i] === pattern[j]) {
            i--;
            j--;
        }

        if (j < 0) {
            matches.push(i + 1);
            i += m + 1;
        } else {
            const shift = badChar[text[i]] || m;
            i += Math.max(1, shift);
        }

        if (matches.length % 100 === 0 || i % 50000 === 0) {
            self.postMessage({
                type: 'progress',
                algorithm: 'boyermoore',
                percent: 5 + Math.round((i / n) * 95)
            });
        }
    }
    return matches;
}

// ============== PATHFINDING ALGORITHMS ==============

function runPathAlgorithm(algorithm, data) {
    const { grid, start, end } = data;
    const startTime = performance.now();

    let result;
    switch (algorithm) {
        case 'dijkstra':
            result = dijkstra(grid, start, end);
            break;
        case 'astar':
            result = astar(grid, start, end);
            break;
        case 'bfs':
            result = bfs(grid, start, end);
            break;
    }

    if (shouldStop) {
        self.postMessage({ type: 'cancelled', algorithm });
        return;
    }

    const endTime = performance.now();
    self.postMessage({
        type: 'result',
        algorithm,
        executionTime: endTime - startTime,
        pathLength: result.path.length,
        nodesExplored: result.explored
    });
}

function dijkstra(grid, start, end) {
    const rows = grid.length;
    const cols = grid[0].length;
    const dist = Array(rows).fill(null).map(() => Array(cols).fill(Infinity));
    const visited = Array(rows).fill(null).map(() => Array(cols).fill(false));
    const parent = Array(rows).fill(null).map(() => Array(cols).fill(null));

    dist[start[0]][start[1]] = 0;
    const pq = [[0, start[0], start[1]]];
    let explored = 0;

    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];

    while (pq.length > 0) {
        if (shouldStop) return { path: [], explored };

        pq.sort((a, b) => a[0] - b[0]);
        const [d, r, c] = pq.shift();

        if (visited[r][c]) continue;
        visited[r][c] = true;
        explored++;

        if (r === end[0] && c === end[1]) break;

        for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc] && grid[nr][nc] !== 1) {
                const newDist = d + 1;
                if (newDist < dist[nr][nc]) {
                    dist[nr][nc] = newDist;
                    parent[nr][nc] = [r, c];
                    pq.push([newDist, nr, nc]);
                }
            }
        }

        if (explored % 1000 === 0) {
            self.postMessage({
                type: 'progress',
                algorithm: 'dijkstra',
                percent: Math.min(95, Math.round((explored / (rows * cols)) * 100))
            });
        }
    }

    const path = reconstructPath(parent, start, end);
    return { path, explored };
}

function astar(grid, start, end) {
    const rows = grid.length;
    const cols = grid[0].length;

    const heuristic = (r, c) => Math.abs(r - end[0]) + Math.abs(c - end[1]);

    const gScore = Array(rows).fill(null).map(() => Array(cols).fill(Infinity));
    const fScore = Array(rows).fill(null).map(() => Array(cols).fill(Infinity));
    const visited = Array(rows).fill(null).map(() => Array(cols).fill(false));
    const parent = Array(rows).fill(null).map(() => Array(cols).fill(null));

    gScore[start[0]][start[1]] = 0;
    fScore[start[0]][start[1]] = heuristic(start[0], start[1]);

    const openSet = [[fScore[start[0]][start[1]], start[0], start[1]]];
    let explored = 0;

    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];

    while (openSet.length > 0) {
        if (shouldStop) return { path: [], explored };

        openSet.sort((a, b) => a[0] - b[0]);
        const [, r, c] = openSet.shift();

        if (r === end[0] && c === end[1]) break;

        if (visited[r][c]) continue;
        visited[r][c] = true;
        explored++;

        for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc] && grid[nr][nc] !== 1) {
                const tentativeG = gScore[r][c] + 1;
                if (tentativeG < gScore[nr][nc]) {
                    parent[nr][nc] = [r, c];
                    gScore[nr][nc] = tentativeG;
                    fScore[nr][nc] = tentativeG + heuristic(nr, nc);
                    openSet.push([fScore[nr][nc], nr, nc]);
                }
            }
        }

        if (explored % 1000 === 0) {
            self.postMessage({
                type: 'progress',
                algorithm: 'astar',
                percent: Math.min(95, Math.round((explored / (rows * cols)) * 100))
            });
        }
    }

    const path = reconstructPath(parent, start, end);
    return { path, explored };
}

function bfs(grid, start, end) {
    const rows = grid.length;
    const cols = grid[0].length;
    const visited = Array(rows).fill(null).map(() => Array(cols).fill(false));
    const parent = Array(rows).fill(null).map(() => Array(cols).fill(null));

    const queue = [start];
    visited[start[0]][start[1]] = true;
    let explored = 0;

    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];

    while (queue.length > 0) {
        if (shouldStop) return { path: [], explored };

        const [r, c] = queue.shift();
        explored++;

        if (r === end[0] && c === end[1]) break;

        for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc] && grid[nr][nc] !== 1) {
                visited[nr][nc] = true;
                parent[nr][nc] = [r, c];
                queue.push([nr, nc]);
            }
        }

        if (explored % 1000 === 0) {
            self.postMessage({
                type: 'progress',
                algorithm: 'bfs',
                percent: Math.min(95, Math.round((explored / (rows * cols)) * 100))
            });
        }
    }

    const path = reconstructPath(parent, start, end);
    return { path, explored };
}

function reconstructPath(parent, start, end) {
    const path = [];
    let current = end;

    while (current && (current[0] !== start[0] || current[1] !== start[1])) {
        path.unshift(current);
        current = parent[current[0]][current[1]];
    }

    if (current) path.unshift(start);
    return path;
}
