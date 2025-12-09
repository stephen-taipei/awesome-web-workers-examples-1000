// worker.js

// Octree Node Class
class OctreeNode {
    constructor(level, parent) {
        this.color = { r: 0, g: 0, b: 0 };
        this.pixelCount = 0;
        this.paletteIndex = 0;
        this.children = new Array(8).fill(null);
        this.level = level;
        this.parent = parent;
        this.isLeaf = false;
    }

    get isLeaf() {
        return this._isLeaf;
    }

    set isLeaf(val) {
        this._isLeaf = val;
    }

    addColor(r, g, b) {
        this.color.r += r;
        this.color.g += g;
        this.color.b += b;
        this.pixelCount++;
    }

    get leafNodes() {
        let leafCount = 0;
        if (this.isLeaf) return 1;
        for (let i = 0; i < 8; i++) {
            if (this.children[i]) {
                leafCount += this.children[i].leafNodes;
            }
        }
        return leafCount;
    }
}

// Octree Class
class Octree {
    constructor(maxColors) {
        this.levels = new Array(7).fill(0).map(() => []); // Levels 0-7, though mostly use 0-7
        this.root = new OctreeNode(0, null);
        this.leafCount = 0;
        this.maxColors = maxColors;
    }

    addColor(r, g, b) {
        let node = this.root;
        for (let level = 0; level < 8; level++) {
            const index = this.getColorIndexForLevel(r, g, b, level);
            if (!node.children[index]) {
                node.children[index] = new OctreeNode(level + 1, node);
            }
            node = node.children[index];
        }

        if (!node.isLeaf) {
            node.isLeaf = true;
            this.leafCount++;
            this.levels[7].push(node); // Track leaf nodes
        }

        node.addColor(r, g, b);

        // This standard octree implementation adds colors then prunes.
        // However, standard adding usually means we go deep.
        // For quantization, we often add colors and if leaves > maxColors, we reduce.
        // Let's implement reduction on the fly or after pass.
        // On-the-fly reduction is usually better for memory.

        // Tracking "reducible" nodes is key.
        // Reducible nodes are parents of leaf nodes.
        // Actually, simplest is to track nodes at each level.
        // When we need to reduce, find the deepest level with nodes and merge their children.
    }

    // Better insertion tracking for reduction
    insert(r, g, b) {
        let node = this.root;
        for (let level = 0; level < 8; level++) {
            const index = this.getColorIndexForLevel(r, g, b, level);

            if (!node.children[index]) {
                const newNode = new OctreeNode(level + 1, node);
                node.children[index] = newNode;

                // Track nodes by level for reduction
                // We track nodes that are NOT leaves yet, but could be merge targets (parents of leaves)
                // Actually we track all nodes.
                if (level < 7) {
                     // We don't need to track level 8 (depth 8) as they are always leaves
                     // Actually let's just add color to leaf
                }
            }
            node = node.children[index];
        }

        if (!node.isLeaf) {
            node.isLeaf = true;
            this.leafCount++;
        }
        node.addColor(r, g, b);
    }

    // Efficient Implementation with Reduction
    // We will use a slightly different approach:
    // Insert color. If color creates new leaf, check maxColors.
    // If > maxColors, reduce.

    buildFromPixels(pixels) {
        // First pass: just insert all unique colors? No, that consumes too much memory.
        // We must reduce while building.

        // To support "reduce while building", we need to know which nodes are "reducible".
        // A node is reducible if it is not a leaf but has children.
        // We want to reduce from bottom up (deepest level).

        this.reducibleNodes = new Array(8).fill(0).map(() => []);

        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i+1];
            const b = pixels[i+2];
            this.insertColor(r, g, b);

            let loopCount = 0;
            while (this.leafCount > this.maxColors) {
                const reduced = this.reduce();
                // If reduce failed to reduce anything (e.g. only nodes with 1 child),
                // we might get stuck if we don't pick another node.
                // But reduce() pops a node. So next call picks next node.
                // If we run out of nodes, reduce() returns 0 and we break?
                // But if leafCount > maxColors and we can't reduce, we are in trouble.
                // This implies all nodes have 1 child (leaves just moved up).
                // Eventually we reach root.

                // If we processed all reducible nodes and still leafCount > maxColors?
                // reduce() checks reducibleNodes.length. If empty, returns 0.
                if (reduced === 0 && this.areListsEmpty()) {
                    break;
                }

                // Safety break
                loopCount++;
                if (loopCount > 1000) break;
            }
        }
    }

    areListsEmpty() {
        for(let i=1; i<8; i++) {
            if (this.reducibleNodes[i].length > 0) return false;
        }
        return true;
    }

    insertColor(r, g, b) {
        let node = this.root;
        for (let level = 0; level < 8; level++) {
            const index = this.getColorIndexForLevel(r, g, b, level);
            if (!node.children[index]) {
                const newNode = new OctreeNode(level + 1, node);
                node.children[index] = newNode;
                if (level < 7) {
                    this.reducibleNodes[level + 1].push(newNode); // Push to next level's list
                }
            }
            node = node.children[index];
        }

        if (!node.isLeaf) {
            node.isLeaf = true;
            this.leafCount++;
        }

        node.addColor(r, g, b);
    }

    getColorIndexForLevel(r, g, b, level) {
        const mask = 0x80 >> level;
        let index = 0;
        if (r & mask) index |= 4;
        if (g & mask) index |= 2;
        if (b & mask) index |= 1;
        return index;
    }

    reduce() {
        // Find the deepest level that has reducible nodes

        let level = 7;
        while (level > 0 && this.reducibleNodes[level].length === 0) {
            level--;
        }

        if (level === 0) return 0; // Can't reduce root? Or root is empty?

        const nodes = this.reducibleNodes[level];
        const node = nodes.pop();

        // If node is already a leaf (e.g., from previous reduction of parent? No, we reduce from bottom)
        // If we reduce parent, parent becomes leaf. Children (which were here) are detached.
        // So we might pop a detached node. Detached node is likely still "linked" from reducibleNodes array.
        // But since it's detached from tree, does it matter?
        // Yes, it doesn't affect the active tree's leaf count if we reduce a detached node.
        // So we must ensure node is part of the tree?
        // Or simpler: detached nodes don't matter. But we shouldn't count them for leafCount reduction if they aren't part of active tree.
        // Actually, if we reduce from bottom up strictly, we shouldn't encounter detached nodes at the current reduction level.
        // Example: Reduce level 7. All children are level 8 (leaves).
        // Reduce level 6. Children are level 7 (which are now leaves if they were reduced? No, they are nodes).

        if (node.isLeaf) {
            // It is already a leaf. Reducing it doesn't make sense?
            // This happens if it was previously reduced?
            // But we only add to reducibleNodes when creating.
            // If we reduce it, we set isLeaf = true.
            // So if we pick it again?
            // We popped it, so we won't pick it again.
            // So this check is likely redundant but safe.
            return 0;
        }

        // Merge children to this node
        let r = 0, g = 0, b = 0, count = 0, childrenLeaves = 0;

        for (let i = 0; i < 8; i++) {
            const child = node.children[i];
            if (child) {
                // If child is not a leaf, we are reducing a node whose children are not leaves?
                // But we reduce from bottom up.
                // If level 7, children are level 8 (leaves).
                // If level 6, children are level 7.
                // If level 7 list is empty, it means all level 7 nodes in list are processed.
                // But processing a level 7 node makes it a leaf.
                // So if we process level 6, its children (level 7) SHOULD be leaves now.
                // UNLESS there's a level 7 node that was never in reducibleNodes? No, all created nodes are added.
                // So yes, children should be leaves.

                // One edge case: what if child is null? (Already handled)

                // Calculate leaf contribution
                if (child.isLeaf) {
                    childrenLeaves++;
                } else {
                     // This shouldn't happen if we strictly reduce from bottom.
                     // But if it does, we use recursive count?
                     childrenLeaves += child.leafNodes;
                }

                r += child.color.r;
                g += child.color.g;
                b += child.color.b;
                count += child.pixelCount;
                node.children[i] = null; // Remove link

            }
        }

        node.isLeaf = true;
        node.color.r = r;
        node.color.g = g;
        node.color.b = b;
        node.pixelCount = count;

        // Update leaf count
        // We removed `childrenLeaves` leaves and added 1 leaf (the node itself)
        this.leafCount = this.leafCount - childrenLeaves + 1;
        return childrenLeaves - 1; // Return reduction amount
    }

    makePalette() {
        const palette = [];
        let paletteIndex = 0;

        // Traverse to find leaves
        const traverse = (node) => {
            if (node.isLeaf) {
                const r = Math.round(node.color.r / node.pixelCount);
                const g = Math.round(node.color.g / node.pixelCount);
                const b = Math.round(node.color.b / node.pixelCount);
                palette.push({ r, g, b });
                node.paletteIndex = paletteIndex++;
                return;
            }
            for (let i = 0; i < 8; i++) {
                if (node.children[i]) traverse(node.children[i]);
            }
        };

        traverse(this.root);
        return palette;
    }

    getPaletteIndex(r, g, b) {
        let node = this.root;
        for (let level = 0; level < 8; level++) {
            if (node.isLeaf) break; // Found representative
            const index = this.getColorIndexForLevel(r, g, b, level);
            if (node.children[index]) {
                node = node.children[index];
            } else {
                // Should not happen if built correctly from this pixel
                // But if quantifying new pixel, might need nearest?
                // For this algorithm (quantizing image to its own palette), we assume exact path or nearest leaf.
                // Because we reduced, path stops at leaf.
                break;
            }
        }
        return node.paletteIndex;
    }
}


self.onmessage = function(e) {
    const { imageData, maxColors } = e.data;

    try {
        const startTime = performance.now();
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        self.postMessage({ type: 'progress', data: 10 });

        // 1. Build Octree
        const octree = new Octree(maxColors);
        octree.buildFromPixels(data);

        self.postMessage({ type: 'progress', data: 60 });

        // 2. Build Palette
        const palette = octree.makePalette();

        self.postMessage({ type: 'progress', data: 70 });

        // 3. Map pixels
        const newData = new Uint8ClampedArray(data.length);

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];

            const paletteIdx = octree.getPaletteIndex(r, g, b);
            const color = palette[paletteIdx];

            newData[i] = color.r;
            newData[i+1] = color.g;
            newData[i+2] = color.b;
            newData[i+3] = data[i+3]; // Alpha
        }

        self.postMessage({ type: 'progress', data: 90 });

        // Count original colors
        const colorSet = new Set();
        for (let i = 0; i < data.length; i += 4) {
            colorSet.add((data[i] << 16) | (data[i+1] << 8) | data[i+2]);
        }

        const newImageData = new ImageData(newData, width, height);
        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                imageData: newImageData,
                time: endTime - startTime,
                originalColorCount: colorSet.size,
                finalColorCount: palette.length
            }
        });

    } catch (error) {
        self.postMessage({ type: 'error', message: error.message });
    }
};
