// GrabCut Worker
// A simplified version of GrabCut algorithm (Iterative Graph Cut with GMM)
// Note: Full GrabCut involves:
// 1. Initial GMM learning from rect (Outside=BG, Inside=Unknown/ProbFG)
// 2. Iterative:
//    a. Assign GMM components to pixels
//    b. Learn GMM parameters from assignments
//    c. Build Graph (N-links + T-links from GMM probabilities)
//    d. Min-Cut
// This is extremely compute intensive for JS. We will implement a simplified version.

// Simplified approach:
// 1. Color statistics (Mean/Covariance) for Inside Rect vs Outside Rect.
// 2. Build graph where T-links are weighted by Mahalanobis distance to FG/BG color models.
// 3. Min-Cut.
// 4. (Optional) Re-estimate color models based on result and repeat.

self.onmessage = function(e) {
    const { imageData, rect, iterations } = e.data;
    const { width, height, data } = imageData;
    const numPixels = width * height;

    try {
        const startTime = performance.now();

        // 0. Initial Mask
        // 0: BG, 1: FG, 2: Prob_BG, 3: Prob_FG
        // Initial: Outside rect = BG (0), Inside rect = Prob_FG (3)
        const mask = new Uint8Array(numPixels);
        for (let i = 0; i < numPixels; i++) {
            const y = Math.floor(i / width);
            const x = i % width;
            if (x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h) {
                mask[i] = 3; // Prob_FG
            } else {
                mask[i] = 0; // BG
            }
        }

        let currentMask = new Uint8Array(mask);

        // Loop iterations
        for (let iter = 0; iter < iterations; iter++) {
            self.postMessage({ type: 'progress', progress: (iter / iterations) * 100, message: `迭代 ${iter+1}/${iterations}...` });

            // 1. Learn Color Models (Simple Gaussian for FG and BG)
            // Ideally GMM (5 components), but let's stick to single Gaussian for performance/simplicity in this demo
            const bgStats = computeStats(data, currentMask, [0, 2]); // BG or Prob_BG
            const fgStats = computeStats(data, currentMask, [1, 3]); // FG or Prob_FG

            // 2. Build Graph
            // Similar to GraphCut but T-links capacities depend on -log(prob)
            // N-links depend on color gradients
            const graph = buildGraph(data, width, height, bgStats, fgStats, mask); // Uses initial hard constraints too

            // 3. Min-Cut
            const newMask = computeMinCut(graph, width, height);

            // 4. Update Mask
            // Keep hard constraints: if initial mask was 0 (BG), it stays 0.
            // If it was 3 (Prob_FG), it becomes 3 (Prob_FG) if cut says FG, or 2 (Prob_BG) if cut says BG.
            for (let i = 0; i < numPixels; i++) {
                if (mask[i] === 0) {
                    currentMask[i] = 0;
                } else { // Inside rect
                    currentMask[i] = newMask[i] === 1 ? 3 : 2;
                }
            }
        }

        self.postMessage({ type: 'progress', progress: 100, message: '完成...' });

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: { mask: currentMask },
            executionTime: (endTime - startTime).toFixed(2)
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};

function computeStats(data, mask, targetLabels) {
    let sumR=0, sumG=0, sumB=0;
    let count=0;

    for (let i = 0; i < mask.length; i++) {
        if (targetLabels.includes(mask[i])) {
            sumR += data[i*4];
            sumG += data[i*4+1];
            sumB += data[i*4+2];
            count++;
        }
    }

    if (count === 0) return { mean: [0,0,0], invCov: [[1,0,0],[0,1,0],[0,0,1]], det: 1 };

    const mean = [sumR/count, sumG/count, sumB/count];

    // Covariance
    let cRR=0, cRG=0, cRB=0, cGG=0, cGB=0, cBB=0;

    for (let i = 0; i < mask.length; i++) {
        if (targetLabels.includes(mask[i])) {
            const dr = data[i*4] - mean[0];
            const dg = data[i*4+1] - mean[1];
            const db = data[i*4+2] - mean[2];

            cRR += dr*dr; cRG += dr*dg; cRB += dr*db;
            cGG += dg*dg; cGB += dg*db;
            cBB += db*db;
        }
    }

    const cov = [
        [cRR/count, cRG/count, cRB/count],
        [cRG/count, cGG/count, cGB/count],
        [cRB/count, cGB/count, cBB/count]
    ];

    // Inverse Covariance (Simplified: Assume diagonal for speed/stability if singular)
    // Determinant
    const det = cov[0][0]*(cov[1][1]*cov[2][2] - cov[1][2]*cov[2][1]) -
                cov[0][1]*(cov[1][0]*cov[2][2] - cov[1][2]*cov[2][0]) +
                cov[0][2]*(cov[1][0]*cov[2][1] - cov[1][1]*cov[2][0]);

    if (Math.abs(det) < 1e-5) {
        // Fallback to identity scaled
        return { mean, invCov: [[0.01,0,0],[0,0.01,0],[0,0,0.01]], det: 1 };
    }

    // Adj / det
    const invDet = 1/det;
    const invCov = [
        [ (cov[1][1]*cov[2][2] - cov[1][2]*cov[2][1])*invDet, -(cov[0][1]*cov[2][2] - cov[0][2]*cov[2][1])*invDet,  (cov[0][1]*cov[1][2] - cov[0][2]*cov[1][1])*invDet ],
        [-(cov[1][0]*cov[2][2] - cov[1][2]*cov[2][0])*invDet,  (cov[0][0]*cov[2][2] - cov[0][2]*cov[2][0])*invDet, -(cov[0][0]*cov[1][2] - cov[0][2]*cov[1][0])*invDet ],
        [ (cov[1][0]*cov[2][1] - cov[1][1]*cov[2][0])*invDet, -(cov[0][0]*cov[2][1] - cov[0][2]*cov[2][0])*invDet,  (cov[0][0]*cov[1][1] - cov[0][1]*cov[1][0])*invDet ]
    ];

    return { mean, invCov, det };
}

function calcProb(color, stats) {
    const dr = color[0] - stats.mean[0];
    const dg = color[1] - stats.mean[1];
    const db = color[2] - stats.mean[2];

    // (x-u)T * InvCov * (x-u)
    const dist =
        dr * (stats.invCov[0][0]*dr + stats.invCov[0][1]*dg + stats.invCov[0][2]*db) +
        dg * (stats.invCov[1][0]*dr + stats.invCov[1][1]*dg + stats.invCov[1][2]*db) +
        db * (stats.invCov[2][0]*dr + stats.invCov[2][1]*dg + stats.invCov[2][2]*db);

    return -Math.log(Math.max(1e-10, (1 / Math.sqrt(stats.det)) * Math.exp(-0.5 * dist)));
}

// Reusing Graph Cut Logic from 385 (simplified)
function buildGraph(data, width, height, bgStats, fgStats, hardMask) {
    const numPixels = width * height;
    const S = numPixels;
    const T = numPixels + 1;

    // Adjacency lists
    const head = new Int32Array(numPixels + 2).fill(-1);
    const edges = []; // { to, cap, rev }

    function addEdge(u, v, cap) {
        edges.push({ to: v, cap: cap, rev: -1, next: head[u] });
        head[u] = edges.length - 1;

        edges.push({ to: u, cap: 0, rev: head[u], next: head[v] }); // Residual
        head[v] = edges.length - 1;
        edges[head[u]].rev = head[v];

        // Undirected N-links logic handled by adding two directed edges or bi-directional
        // Here we implement directed flow graph.
    }

    function addBiEdge(u, v, cap) {
         // u -> v
        edges.push({ to: v, cap: cap, rev: -1, next: head[u] });
        head[u] = edges.length - 1;

        // v -> u (capacity also cap, residual starts at 0? No, this is graph construction)
        // In undirected graph cut, edges are undirected. In max flow, we model undirected edge (u,v) with cap C
        // as directed u->v cap C AND v->u cap C.
        edges.push({ to: u, cap: cap, rev: head[u], next: head[v] });
        head[v] = edges.length - 1;
        edges[head[u]].rev = head[v];
    }

    const MAX_CAP = 1000000;
    const GAMMA = 50; // Weight for N-links vs T-links

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const u = y * width + x;

            // T-links
            // D_bg(u) = -log p(u|bg) -> Capacity S->u (if cut, u is in T (BG))
            // D_fg(u) = -log p(u|fg) -> Capacity u->T (if cut, u is in S (FG))
            // Wait, standard:
            // S (Object), T (Background).
            // Edge S->u cap is "how likely u is Object".
            // Edge u->T cap is "how likely u is Background".
            // If u is Object, we want to cut u->T. So u->T cap should be D_bg (penalty for being BG).
            // If u is Background, we want to cut S->u. So S->u cap should be D_fg (penalty for being FG).

            const color = [data[u*4], data[u*4+1], data[u*4+2]];

            let fromS = 0;
            let toT = 0;

            if (hardMask[u] === 0) { // Hard BG
                fromS = 0;
                toT = MAX_CAP;
            } else if (hardMask[u] === 1) { // Hard FG (not used in rect selection usually, but supported)
                fromS = MAX_CAP;
                toT = 0;
            } else { // Prob region
                fromS = calcProb(color, bgStats); // Penalty for being FG (cut S->u? No wait.)
                toT = calcProb(color, fgStats);   // Penalty for being BG

                // Let's re-verify:
                // Min Cut minimizes sum of cut edges.
                // If u is kept in S-set (Object), we cut u->T. Cost = capacity(u->T).
                // Cost should be "Penalty of assigning u to S". No.
                // Cost is "Penalty of assigning u to T" (since we cut u->T to keep it in S).
                // Wait.
                // S = Object, T = Background.
                // If u in S, cut edge is u->T. Cost = cap(u->T).
                // If u in T, cut edge is S->u. Cost = cap(S->u).
                // We want high probability of Object => Low cost to keep in S => High cost to cut u->T? No.
                // If Prob(Object) is high, -log(Prob(Object)) is low.
                // We want to minimize Energy E = Data + Smoothness.
                // Data term: D(u, label).
                // If label=1 (Obj), cost D(u,1).
                // If label=0 (Bg), cost D(u,0).
                // We map:
                // cap(S->u) = D(u, 0) (Penalty for being BG).
                // cap(u->T) = D(u, 1) (Penalty for being FG).
                // If we cut S->u, u goes to T (BG), we pay D(u,0). Correct.
                // If we cut u->T, u goes to S (FG), we pay D(u,1). Correct.

                fromS = calcProb(color, bgStats); // -log P(bg)
                toT = calcProb(color, fgStats);   // -log P(fg)
            }

            addEdge(S, u, fromS);
            addEdge(u, T, toT);

            // N-links
            // Simple 4-connectivity
            if (x < width - 1) {
                const v = y * width + (x + 1);
                const w = colorDiff(data, u, v, GAMMA);
                addBiEdge(u, v, w);
            }
            if (y < height - 1) {
                const v = (y + 1) * width + x;
                const w = colorDiff(data, u, v, GAMMA);
                addBiEdge(u, v, w);
            }
        }
    }

    return { head, edges, S, T, numPixels };
}

function colorDiff(data, u, v, gamma) {
    const dr = data[u*4] - data[v*4];
    const dg = data[u*4+1] - data[v*4+1];
    const db = data[u*4+2] - data[v*4+2];
    const distSq = dr*dr + dg*dg + db*db;
    const beta = 1/(2*30*30); // simplistic beta
    return gamma * Math.exp(-beta * distSq);
}

function computeMinCut(graph, width, height) {
    const { head, edges, S, T, numPixels } = graph;

    // BFS for augmenting paths
    const level = new Int32Array(numPixels + 2);
    const q = new Int32Array(numPixels + 2);

    function bfs() {
        level.fill(-1);
        level[S] = 0;
        let qh = 0, qt = 0;
        q[qt++] = S;

        while (qh < qt) {
            const u = q[qh++];
            for (let e = head[u]; e !== -1; e = edges[e].next) {
                const v = edges[e].to;
                if (edges[e].cap > 0.001 && level[v] < 0) {
                    level[v] = level[u] + 1;
                    q[qt++] = v;
                }
            }
        }
        return level[T] >= 0;
    }

    function dfs(u, flow, ptr) {
        if (u === T || flow === 0) return flow;
        for (let e = ptr[u]; e !== -1; e = edges[e].next) {
            ptr[u] = e;
            const v = edges[e].to;
            if (level[v] === level[u] + 1 && edges[e].cap > 0.001) {
                const pushed = dfs(v, Math.min(flow, edges[e].cap), ptr);
                if (pushed > 0) {
                    edges[e].cap -= pushed;
                    edges[edges[e].rev].cap += pushed;
                    return pushed;
                }
            }
        }
        return 0;
    }

    // Max Flow
    while (bfs()) {
        const ptr = new Int32Array(head);
        while (true) {
            const pushed = dfs(S, Infinity, ptr);
            if (pushed === 0) break;
        }
    }

    // Min Cut: Reachable from S in residual
    const mask = new Uint8Array(numPixels);
    const visited = new Uint8Array(numPixels + 2);
    const queue = [S];
    visited[S] = 1;

    while (queue.length > 0) {
        const u = queue.pop();
        if (u < numPixels) mask[u] = 1; // 1 = Foreground

        for (let e = head[u]; e !== -1; e = edges[e].next) {
            const v = edges[e].to;
            if (!visited[v] && edges[e].cap > 0.001) {
                visited[v] = 1;
                queue.push(v);
            }
        }
    }

    return mask;
}
