// Random Forest Implementation

let trainData = [];
let forest = [];

class DecisionTree {
    constructor(maxDepth) {
        this.maxDepth = maxDepth;
        this.tree = null;
    }

    fit(data) {
        this.tree = this.buildTree(data, 0);
    }

    buildTree(data, depth) {
        const labels = data.map(d => d.label);
        const uniqueLabels = [...new Set(labels)];
        
        // Leaf node conditions
        if (uniqueLabels.length === 1 || depth >= this.maxDepth || data.length < 2) {
            // Return most common label
            const counts = {};
            let maxCount = -1, bestLabel = uniqueLabels[0];
            for(let l of labels) {
                counts[l] = (counts[l] || 0) + 1;
                if(counts[l] > maxCount) { maxCount = counts[l]; bestLabel = l; }
            }
            return { isLeaf: true, label: bestLabel };
        }

        // Find best split
        let bestSplit = { gini: Infinity };
        const features = ['x', 'y'];
        
        // Random feature selection (sqrt(features))
        // Here we only have 2 features, so usually pick 1 or use both. Let's use both.
        
        for (let feature of features) {
            // Sort by feature
            data.sort((a, b) => a[feature] - b[feature]);
            
            for (let i = 0; i < data.length - 1; i++) {
                // Split point
                const splitVal = (data[i][feature] + data[i+1][feature]) / 2;
                
                const left = [], right = [];
                for (let d of data) {
                    if (d[feature] < splitVal) left.push(d);
                    else right.push(d);
                }
                
                // Calc Gini
                const gini = this.calcGini(left, right);
                
                if (gini < bestSplit.gini) {
                    bestSplit = { gini, feature, splitVal, left, right };
                }
            }
        }
        
        return {
            isLeaf: false,
            feature: bestSplit.feature,
            splitVal: bestSplit.splitVal,
            left: this.buildTree(bestSplit.left, depth + 1),
            right: this.buildTree(bestSplit.right, depth + 1)
        };
    }

    calcGini(left, right) {
        const total = left.length + right.length;
        
        const giniImp = (group) => {
            if (group.length === 0) return 0;
            const counts = {};
            for (let d of group) counts[d.label] = (counts[d.label] || 0) + 1;
            let sumSq = 0;
            for (let l in counts) sumSq += (counts[l] / group.length) ** 2;
            return 1 - sumSq;
        };
        
        return (left.length / total) * giniImp(left) + (right.length / total) * giniImp(right);
    }

    predict(point) {
        let node = this.tree;
        while (!node.isLeaf) {
            if (point[node.feature] < node.splitVal) {
                node = node.left;
            } else {
                node = node.right;
            }
        }
        return node.label;
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
        const { nTrees, maxDepth } = e.data;
        forest = [];
        
        for (let i = 0; i < nTrees; i++) {
            // Bootstrap Sample (Bagging)
            const sample = [];
            for(let j=0; j<trainData.length; j++) {
                sample.push(trainData[Math.floor(Math.random() * trainData.length)]);
            }
            
            const tree = new DecisionTree(maxDepth);
            tree.fit(sample);
            forest.push(tree);
            
            if (i % 2 === 0) self.postMessage({ type: 'progress', data: { treesBuilt: i + 1 } });
        }
        
        // Calculate Accuracy on Train Data (OOB is better but simple accuracy here)
        let correct = 0;
        for (let p of trainData) {
            if (predictForest(p) === p.label) correct++;
        }
        const accuracy = correct / trainData.length;
        
        // Generate Heatmap
        const gridSize = 50;
        const heatmap = new Uint8Array(gridSize * gridSize);
        // Need bounds
        // Canvas is 500x500 usually
        const w = 500; // Assuming fixed for grid gen
        const h = 500;
        
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const px = x / gridSize * w;
                const py = y / gridSize * h;
                heatmap[y * gridSize + x] = predictForest({ x: px, y: py });
            }
        }

        self.postMessage({
            type: 'result',
            data: {
                accuracy,
                heatmap,
                gridSize
            }
        });
    }
};

function predictForest(point) {
    const votes = {};
    for (let tree of forest) {
        const label = tree.predict(point);
        votes[label] = (votes[label] || 0) + 1;
    }
    let maxVotes = -1, bestLabel = -1;
    for (let l in votes) {
        if (votes[l] > maxVotes) {
            maxVotes = votes[l];
            bestLabel = parseInt(l);
        }
    }
    return bestLabel;
}

function generateData(w, h) {
    const data = [];
    // Generate 3 random blobs
    for (let k = 0; k < 3; k++) {
        const cx = Math.random() * w;
        const cy = Math.random() * h;
        for (let i = 0; i < 20; i++) {
            // Gaussian
            const u = 1 - Math.random();
            const v = Math.random();
            const z1 = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            const z2 = Math.sqrt(-2.0 * Math.log(u)) * Math.sin(2.0 * Math.PI * v);
            
            data.push({
                x: cx + z1 * 30,
                y: cy + z2 * 30,
                label: k
            });
        }
    }
    return data;
}
