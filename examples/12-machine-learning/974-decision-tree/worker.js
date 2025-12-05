// Decision Tree Classifier (Recursive)

let trainData = [];

class Node {
    constructor(depth) {
        this.depth = depth;
        this.isLeaf = false;
        this.label = null;
        this.feature = null;
        this.threshold = null;
        this.left = null;
        this.right = null;
    }
}

self.onmessage = function(e) {
    const { command } = e.data;

    if (command === 'generate') {
        const { width, height } = e.data;
        trainData = generateData(width, height);
        self.postMessage({ type: 'data', data: trainData });
    }
    else if (command === 'train') {
        const { maxDepth, minSamples, criterion } = e.data;
        
        const root = buildTree(trainData, 0, maxDepth, minSamples, criterion);
        
        // Stats
        const stats = { depth: 0, leaves: 0 };
        getStats(root, stats);
        
        // Accuracy
        let correct = 0;
        for(let p of trainData) {
            if(predict(root, p) === p.label) correct++;
        }
        const accuracy = correct / trainData.length;
        
        // Grid
        const gridSize = 100;
        const heatmap = new Uint8Array(gridSize * gridSize);
        const w = 500; // assuming fixed canvas size mapping
        const h = 500;
        
        for(let y=0; y<gridSize; y++) {
            for(let x=0; x<gridSize; x++) {
                const px = x/gridSize * w;
                const py = y/gridSize * h;
                heatmap[y*gridSize + x] = predict(root, {x:px, y:py});
            }
        }
        
        self.postMessage({
            type: 'result',
            data: {
                stats,
                accuracy,
                heatmap,
                gridSize
            }
        });
    }
};

function generateData(w, h) {
    const data = [];
    const n = 100;
    
    // Generate checkerboard-like or moons
    for(let i=0; i<n; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        
        // Decision function (Circle + Linear)
        const dx = x - w/2;
        const dy = y - h/2;
        const r = Math.sqrt(dx*dx + dy*dy);
        
        let label = 0;
        if (r < w*0.3) label = 1;
        else if (x > w*0.5 && y > h*0.5) label = 1;
        else label = 0;
        
        // Noise
        if(Math.random() < 0.05) label = 1 - label;
        
        data.push({x, y, label});
    }
    return data;
}

function buildTree(data, depth, maxDepth, minSamples, criterion) {
    const node = new Node(depth);
    
    const labels = data.map(d => d.label);
    const counts = [0, 0];
    for(let l of labels) counts[l]++;
    const majority = counts[1] > counts[0] ? 1 : 0;
    
    // Leaf conditions
    if (depth >= maxDepth || data.length < minSamples || counts[0] === 0 || counts[1] === 0) {
        node.isLeaf = true;
        node.label = majority;
        return node;
    }
    
    // Split search
    let bestGain = -Infinity;
    let bestSplit = null;
    const features = ['x', 'y'];
    const currentImpurity = impurity(labels, criterion);
    
    for(let feat of features) {
        // Sort
        data.sort((a, b) => a[feat] - b[feat]);
        
        for(let i=0; i<data.length - 1; i++) {
            if (data[i][feat] === data[i+1][feat]) continue;
            
            const threshold = (data[i][feat] + data[i+1][feat]) / 2;
            const left = data.slice(0, i+1);
            const right = data.slice(i+1);
            
            const pLeft = left.length / data.length;
            const pRight = right.length / data.length;
            
            const impLeft = impurity(left.map(d=>d.label), criterion);
            const impRight = impurity(right.map(d=>d.label), criterion);
            
            const gain = currentImpurity - (pLeft * impLeft + pRight * impRight);
            
            if (gain > bestGain) {
                bestGain = gain;
                bestSplit = { feature: feat, threshold, left, right };
            }
        }
    }
    
    if (bestGain > 0 && bestSplit) {
        node.feature = bestSplit.feature;
        node.threshold = bestSplit.threshold;
        node.left = buildTree(bestSplit.left, depth+1, maxDepth, minSamples, criterion);
        node.right = buildTree(bestSplit.right, depth+1, maxDepth, minSamples, criterion);
    } else {
        node.isLeaf = true;
        node.label = majority;
    }
    
    return node;
}

function impurity(labels, criterion) {
    const n = labels.length;
    if (n === 0) return 0;
    const counts = [0, 0];
    for(let l of labels) counts[l]++;
    const p0 = counts[0] / n;
    const p1 = counts[1] / n;
    
    if (criterion === 'gini') {
        return 1 - (p0*p0 + p1*p1);
    } else { // Entropy
        const log2 = (x) => x === 0 ? 0 : Math.log2(x);
        return -(p0 * log2(p0) + p1 * log2(p1));
    }
}

function predict(node, point) {
    if (node.isLeaf) return node.label;
    if (point[node.feature] < node.threshold) return predict(node.left, point);
    return predict(node.right, point);
}

function getStats(node, stats) {
    if (node.depth > stats.depth) stats.depth = node.depth;
    if (node.isLeaf) {
        stats.leaves++;
    } else {
        getStats(node.left, stats);
        getStats(node.right, stats);
    }
}
