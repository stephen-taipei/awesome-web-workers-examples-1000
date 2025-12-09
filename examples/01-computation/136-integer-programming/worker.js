// Integer Programming - Branch and Bound Web Worker

self.onmessage = function(e) {
    const { problem, branchStrategy, maxNodes } = e.data;
    solveBranchAndBound(problem, branchStrategy, maxNodes);
};

function solveBranchAndBound(problem, branchStrategy, maxNodes) {
    const { c, A, b, maximize } = problem;
    const startTime = performance.now();

    let bestSolution = null;
    let bestValue = maximize ? -Infinity : Infinity;
    let lpRelaxation = null;

    const tree = [];
    let nodesExplored = 0;
    let nodesPruned = 0;

    // Priority queue (nodes to explore)
    const queue = [];

    // Root node - solve LP relaxation
    const rootResult = solveLP(c, A, b, [], maximize);
    lpRelaxation = rootResult.value;

    const rootNode = {
        id: 0,
        parentId: -1,
        constraints: [],
        lpSolution: rootResult.solution,
        lpValue: rootResult.value,
        status: rootResult.status,
        depth: 0,
        branchVar: -1,
        branchDir: ''
    };

    tree.push(rootNode);

    if (rootResult.status === 'optimal') {
        if (isInteger(rootResult.solution)) {
            bestSolution = rootResult.solution;
            bestValue = rootResult.value;
            rootNode.nodeType = 'optimal';
        } else {
            rootNode.nodeType = 'branch';
            queue.push(rootNode);
        }
    } else {
        rootNode.nodeType = 'infeasible';
    }

    // Branch and Bound loop
    while (queue.length > 0 && nodesExplored < maxNodes) {
        // Select node (best-first search for maximization)
        queue.sort((a, b) => maximize ? b.lpValue - a.lpValue : a.lpValue - b.lpValue);
        const node = queue.shift();
        nodesExplored++;

        // Pruning check
        if (maximize && node.lpValue <= bestValue) {
            nodesPruned++;
            node.nodeType = 'pruned';
            continue;
        }
        if (!maximize && node.lpValue >= bestValue) {
            nodesPruned++;
            node.nodeType = 'pruned';
            continue;
        }

        // Find variable to branch on
        const branchIdx = selectBranchVariable(node.lpSolution, c, branchStrategy);
        if (branchIdx === -1) continue;

        const branchVal = node.lpSolution[branchIdx];

        // Create child nodes
        // Left branch: x_i <= floor(v)
        const leftConstraint = { varIdx: branchIdx, type: 'le', value: Math.floor(branchVal) };
        const leftConstraints = [...node.constraints, leftConstraint];
        const leftResult = solveLP(c, A, b, leftConstraints, maximize);

        const leftNode = {
            id: tree.length,
            parentId: node.id,
            constraints: leftConstraints,
            lpSolution: leftResult.solution,
            lpValue: leftResult.value,
            status: leftResult.status,
            depth: node.depth + 1,
            branchVar: branchIdx,
            branchDir: `x${branchIdx + 1} <= ${Math.floor(branchVal)}`
        };

        tree.push(leftNode);

        if (leftResult.status === 'optimal') {
            if (isInteger(leftResult.solution)) {
                if ((maximize && leftResult.value > bestValue) || (!maximize && leftResult.value < bestValue)) {
                    bestSolution = leftResult.solution;
                    bestValue = leftResult.value;
                }
                leftNode.nodeType = 'integer';
            } else if ((maximize && leftResult.value > bestValue) || (!maximize && leftResult.value < bestValue)) {
                leftNode.nodeType = 'branch';
                queue.push(leftNode);
            } else {
                leftNode.nodeType = 'pruned';
                nodesPruned++;
            }
        } else {
            leftNode.nodeType = 'infeasible';
        }

        // Right branch: x_i >= ceil(v)
        const rightConstraint = { varIdx: branchIdx, type: 'ge', value: Math.ceil(branchVal) };
        const rightConstraints = [...node.constraints, rightConstraint];
        const rightResult = solveLP(c, A, b, rightConstraints, maximize);

        const rightNode = {
            id: tree.length,
            parentId: node.id,
            constraints: rightConstraints,
            lpSolution: rightResult.solution,
            lpValue: rightResult.value,
            status: rightResult.status,
            depth: node.depth + 1,
            branchVar: branchIdx,
            branchDir: `x${branchIdx + 1} >= ${Math.ceil(branchVal)}`
        };

        tree.push(rightNode);

        if (rightResult.status === 'optimal') {
            if (isInteger(rightResult.solution)) {
                if ((maximize && rightResult.value > bestValue) || (!maximize && rightResult.value < bestValue)) {
                    bestSolution = rightResult.solution;
                    bestValue = rightResult.value;
                }
                rightNode.nodeType = 'integer';
            } else if ((maximize && rightResult.value > bestValue) || (!maximize && rightResult.value < bestValue)) {
                rightNode.nodeType = 'branch';
                queue.push(rightNode);
            } else {
                rightNode.nodeType = 'pruned';
                nodesPruned++;
            }
        } else {
            rightNode.nodeType = 'infeasible';
        }

        // Progress update
        if (nodesExplored % 10 === 0) {
            self.postMessage({
                type: 'progress',
                nodesExplored,
                bestValue: bestValue === -Infinity || bestValue === Infinity ? null : bestValue,
                percent: Math.min(100, Math.round((nodesExplored / maxNodes) * 100))
            });
        }
    }

    // Calculate integrality gap
    let gap = 0;
    if (bestSolution && lpRelaxation !== null && Math.abs(lpRelaxation) > 1e-10) {
        gap = Math.abs(lpRelaxation - bestValue) / Math.abs(lpRelaxation) * 100;
    }

    self.postMessage({
        type: 'result',
        status: bestSolution ? 'optimal' : 'infeasible',
        solution: bestSolution,
        optimalValue: bestValue === -Infinity || bestValue === Infinity ? null : bestValue,
        lpRelaxation,
        gap,
        nodesExplored,
        nodesPruned,
        tree,
        problem,
        executionTime: performance.now() - startTime
    });
}

function selectBranchVariable(solution, c, strategy) {
    let bestIdx = -1;

    switch (strategy) {
        case 'mostFractional':
            let maxFrac = 0;
            for (let i = 0; i < solution.length; i++) {
                const frac = Math.abs(solution[i] - Math.round(solution[i]));
                if (frac > 1e-6 && Math.abs(frac - 0.5) < Math.abs(maxFrac - 0.5)) {
                    maxFrac = frac;
                    bestIdx = i;
                }
            }
            break;

        case 'firstFractional':
            for (let i = 0; i < solution.length; i++) {
                const frac = Math.abs(solution[i] - Math.round(solution[i]));
                if (frac > 1e-6) {
                    bestIdx = i;
                    break;
                }
            }
            break;

        case 'maxCoefficient':
            let maxScore = -Infinity;
            for (let i = 0; i < solution.length; i++) {
                const frac = Math.abs(solution[i] - Math.round(solution[i]));
                if (frac > 1e-6) {
                    const score = Math.abs(c[i]) * frac;
                    if (score > maxScore) {
                        maxScore = score;
                        bestIdx = i;
                    }
                }
            }
            break;
    }

    return bestIdx;
}

function isInteger(solution, tol = 1e-6) {
    return solution.every(v => Math.abs(v - Math.round(v)) < tol);
}

// Simple LP solver using revised simplex
function solveLP(c, A, b, extraConstraints, maximize) {
    const m = A.length + extraConstraints.length;
    const n = c.length;

    // Build extended problem
    const extA = [];
    const extB = [];

    // Original constraints
    for (let i = 0; i < A.length; i++) {
        extA.push([...A[i]]);
        extB.push(b[i]);
    }

    // Extra branching constraints
    for (const constraint of extraConstraints) {
        const row = new Array(n).fill(0);
        if (constraint.type === 'le') {
            row[constraint.varIdx] = 1;
            extA.push(row);
            extB.push(constraint.value);
        } else if (constraint.type === 'ge') {
            row[constraint.varIdx] = -1;
            extA.push(row);
            extB.push(-constraint.value);
        }
    }

    // Simplex method
    return simplex(c, extA, extB, maximize);
}

function simplex(c, A, b, maximize) {
    const m = A.length;
    const n = c.length;
    const numVars = n + m;

    // Create tableau
    const tableau = [];
    for (let i = 0; i < m; i++) {
        const row = [...A[i]];
        for (let j = 0; j < m; j++) {
            row.push(i === j ? 1 : 0);
        }
        row.push(b[i]);
        tableau.push(row);
    }

    // Objective row
    const objRow = c.map(ci => maximize ? -ci : ci);
    for (let j = 0; j < m; j++) objRow.push(0);
    objRow.push(0);
    tableau.push(objRow);

    // Basic variables
    const basic = [];
    for (let i = 0; i < m; i++) basic.push(n + i);

    // Check for negative RHS and handle
    for (let i = 0; i < m; i++) {
        if (tableau[i][numVars] < -1e-10) {
            // Multiply row by -1
            for (let j = 0; j <= numVars; j++) {
                tableau[i][j] *= -1;
            }
        }
    }

    const maxIter = 100;
    for (let iter = 0; iter < maxIter; iter++) {
        // Find entering variable
        let entering = -1;
        let minVal = -1e-10;
        for (let j = 0; j < numVars; j++) {
            if (tableau[m][j] < minVal) {
                minVal = tableau[m][j];
                entering = j;
            }
        }

        if (entering === -1) {
            // Optimal
            const solution = new Array(n).fill(0);
            for (let i = 0; i < m; i++) {
                if (basic[i] < n) {
                    solution[basic[i]] = tableau[i][numVars];
                }
            }
            const value = maximize ? -tableau[m][numVars] : tableau[m][numVars];
            return { status: 'optimal', solution, value };
        }

        // Find leaving variable
        let leaving = -1;
        let minRatio = Infinity;
        for (let i = 0; i < m; i++) {
            if (tableau[i][entering] > 1e-10) {
                const ratio = tableau[i][numVars] / tableau[i][entering];
                if (ratio >= -1e-10 && ratio < minRatio) {
                    minRatio = ratio;
                    leaving = i;
                }
            }
        }

        if (leaving === -1) {
            return { status: 'unbounded', solution: null, value: maximize ? Infinity : -Infinity };
        }

        // Pivot
        const pivot = tableau[leaving][entering];
        for (let j = 0; j <= numVars; j++) {
            tableau[leaving][j] /= pivot;
        }
        for (let i = 0; i <= m; i++) {
            if (i !== leaving) {
                const factor = tableau[i][entering];
                for (let j = 0; j <= numVars; j++) {
                    tableau[i][j] -= factor * tableau[leaving][j];
                }
            }
        }
        basic[leaving] = entering;
    }

    return { status: 'max_iterations', solution: null, value: null };
}
