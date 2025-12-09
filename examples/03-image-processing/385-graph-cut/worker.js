// Graph Cut Worker
// Implements a simplified Graph Cut using Max-Flow Min-Cut algorithm.
// Since a full Push-Relabel or Boykov-Kolmogorov max-flow on a pixel-grid graph
// is very heavy for JS (millions of edges), we will implement a simplified version
// or use a smaller grid scaling, or a simpler approximation like Iterated Conditional Modes (ICM)
// or simply Min-Cut on a smaller resolution.

// Let's implement a standard Max-Flow (Edmonds-Karp or Push-Relabel) on the graph.
// Nodes: Pixels + Source (S) + Sink (T).
// Edges:
//   - S -> Pixel: High capacity if marked foreground.
//   - Pixel -> T: High capacity if marked background.
//   - Pixel <-> Neighbor: Capacity based on color similarity.

// To make it performant:
// 1. Downsample if large? (Already limited to 200x200 in main.js, so ~40k nodes, ~160k edges)
// 2. 40k nodes is still heavy for Edmonds-Karp (BFS). Push-Relabel is better.
// 3. Simple BFS (Edmonds-Karp) might be too slow if many augmenting paths.

self.onmessage = function(e) {
    const { imageData, markers } = e.data;
    const { width, height, data } = imageData;
    const numPixels = width * height;

    try {
        const startTime = performance.now();

        self.postMessage({ type: 'progress', progress: 5, message: '建構圖形...' });

        // Graph Construction
        // We need an adjacency list with capacities.
        // Node indices: 0..N-1 are pixels. N is Source, N+1 is Sink.
        const S = numPixels;
        const T = numPixels + 1;
        const totalNodes = numPixels + 2;

        // Using a flat array for edges might be better for memory, but list is easier.
        // Let's use simple object/array based adjacency for readability first.
        // Optimization: TypedArrays for edges.
        // Forward Edge: [to, capacity, flow, reverse_edge_index]

        // Since max degree is small (4 neighbors + S/T), we can use a compact representation.
        // But for generic MaxFlow, we need to handle residual graph.

        // Let's use a simplified approach:
        // We will store graph as:
        // head[u] = first_edge_index
        // next[edge_index] = next_edge_index
        // to[edge_index] = v
        // cap[edge_index] = capacity

        // Estimate max edges:
        // N nodes. Each has 4 neighbors -> 4 edges * 2 (undirected) = 8 edges per node?
        // Plus S->u or u->T.
        // Total edges approx 5 * N * 2 (reverse edges).
        const MAX_EDGES = numPixels * 12; // safe upper bound

        const head = new Int32Array(totalNodes).fill(-1);
        const nextEdge = new Int32Array(MAX_EDGES);
        const toNode = new Int32Array(MAX_EDGES);
        const capacity = new Float32Array(MAX_EDGES);
        let edgeCount = 0;

        function addEdge(u, v, cap) {
            // Forward
            toNode[edgeCount] = v;
            capacity[edgeCount] = cap;
            nextEdge[edgeCount] = head[u];
            head[u] = edgeCount;
            edgeCount++;

            // Backward (residual, init 0 capacity)
            toNode[edgeCount] = u;
            capacity[edgeCount] = 0; // standard residual graph logic
            // Wait, for undirected graph cut (pixel neighbors), capacity is same both ways.
            // But max flow formulation uses directed edges.
            // For neighbors u-v with similarity w:
            // u->v cap w, v->u cap w.
            // Residuals start at 0? No, if we push flow u->v, we increase residual v->u.
            // Standard construction: Add directed edge u->v with cap C, and v->u with cap C.
            // Each of these needs a residual reverse edge with 0 cap.
            // Actually simpler: u->v (cap C), v->u (cap C).
            // Residuals are implicit: res_cap(u,v) = cap(u,v) - flow(u,v).
            // flow(v,u) = -flow(u,v).
            // Here we stick to: stored capacity is residual capacity.
            // If we push flow u->v, we decrease cap(u,v) and increase cap(v,u).

            nextEdge[edgeCount] = head[v];
            head[v] = edgeCount;
            edgeCount++;
        }

        // Helper to add bi-directional edge with same capacity
        function addBiEdge(u, v, cap) {
            // u -> v
            toNode[edgeCount] = v;
            capacity[edgeCount] = cap;
            nextEdge[edgeCount] = head[u];
            head[u] = edgeCount;
            edgeCount++;

            // v -> u
            toNode[edgeCount] = u;
            capacity[edgeCount] = cap;
            nextEdge[edgeCount] = head[v];
            head[v] = edgeCount;
            edgeCount++;
        }

        const MAX_CAP = 1000000;

        // Build Edges
        for (let y = 0; y < height; y++) {
             if (y % 20 === 0) self.postMessage({ type: 'progress', progress: 5 + (y/height)*15, message: '建構圖形...' });

            for (let x = 0; x < width; x++) {
                const u = y * width + x;
                const marker = markers[u];

                // T-links (Terminal links)
                if (marker === 1) { // Foreground -> Connect S to u with infinite cap
                    addEdge(S, u, MAX_CAP);
                } else if (marker === 2) { // Background -> Connect u to T with infinite cap
                    addEdge(u, T, MAX_CAP);
                }

                // N-links (Neighbor links) based on color similarity
                // Down neighbor
                if (y < height - 1) {
                    const v = (y + 1) * width + x;
                    const w = colorSimilarity(data, u, v);
                    addBiEdge(u, v, w);
                }
                // Right neighbor
                if (x < width - 1) {
                    const v = y * width + (x + 1);
                    const w = colorSimilarity(data, u, v);
                    addBiEdge(u, v, w);
                }
            }
        }

        self.postMessage({ type: 'progress', progress: 20, message: '計算最小割 (Max Flow)...' });

        // Dinic's Algorithm (Level Graph + DFS)
        const level = new Int32Array(totalNodes);
        const q = new Int32Array(totalNodes); // queue

        function bfs() {
            level.fill(-1);
            level[S] = 0;
            let qHead = 0;
            let qTail = 0;
            q[qTail++] = S;

            while (qHead < qTail) {
                const u = q[qHead++];
                for (let e = head[u]; e !== -1; e = nextEdge[e]) {
                    const v = toNode[e];
                    if (capacity[e] > 0.001 && level[v] < 0) { // Check residual capacity
                        level[v] = level[u] + 1;
                        q[qTail++] = v;
                    }
                }
            }
            return level[T] >= 0;
        }

        function dfs(u, flow, ptr) {
            if (u === T || flow === 0) return flow;

            for (let e = ptr[u]; e !== -1; e = nextEdge[e]) {
                ptr[u] = e; // Update current edge pointer
                const v = toNode[e];
                if (level[v] === level[u] + 1 && capacity[e] > 0.001) {
                    const pushed = dfs(v, Math.min(flow, capacity[e]), ptr);
                    if (pushed > 0) {
                        capacity[e] -= pushed;
                        capacity[e ^ 1] += pushed; // Reverse edge is adjacent index (0,1), (2,3)...
                        return pushed;
                    }
                }
            }
            return 0;
        }

        let maxFlow = 0;
        let iter = 0;

        while (bfs()) {
            iter++;
            if (iter % 5 === 0) self.postMessage({ type: 'progress', progress: 20 + Math.min(70, iter), message: `迭代優化中 (${iter})...` });

            // Current arc array to avoid scanning edges multiple times
            const ptr = new Int32Array(head);

            while (true) {
                const pushed = dfs(S, Infinity, ptr);
                if (pushed === 0) break;
                maxFlow += pushed;
            }
        }

        self.postMessage({ type: 'progress', progress: 95, message: '生成遮罩...' });

        // Construct min-cut mask
        // Run BFS/DFS from S on residual graph. Reachable nodes are Source-set (Foreground).
        const mask = new Uint8Array(numPixels);
        const visited = new Uint8Array(totalNodes);
        const queue = [S];
        visited[S] = 1;

        while (queue.length > 0) {
            const u = queue.pop();
            if (u < numPixels) mask[u] = 1; // It's a pixel node

            for (let e = head[u]; e !== -1; e = nextEdge[e]) {
                const v = toNode[e];
                if (!visited[v] && capacity[e] > 0.001) {
                    visited[v] = 1;
                    queue.push(v);
                }
            }
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: { mask: mask },
            executionTime: (endTime - startTime).toFixed(2)
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};

function colorSimilarity(data, idx1, idx2) {
    // Basic weight function: exp( - dist^2 / (2*sigma^2) ) / dist_spatial
    // Since dist_spatial is 1 (neighbors), we ignore it.
    // Sigma is noise parameter.

    const r1 = data[idx1 * 4], g1 = data[idx1 * 4 + 1], b1 = data[idx1 * 4 + 2];
    const r2 = data[idx2 * 4], g2 = data[idx2 * 4 + 1], b2 = data[idx2 * 4 + 2];

    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;

    const distSq = dr*dr + dg*dg + db*db;
    const sigmaSq = 30 * 30; // Roughly sigma=30

    // Weight should be high for similar colors, low for different
    // Add a base small constant to avoid 0 capacity (ensure graph connectivity)
    // Scale factor to make numbers reasonable for float32
    return 100 * Math.exp(-distSq / (2 * sigmaSq)) + 0.1;
}
