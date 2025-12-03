/**
 * Web Worker for Vector Space analysis
 * Computes basis, dimension, rank, nullspace using row reduction
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let A, m, n;

        if (data.generate) {
            m = data.rows;
            n = data.cols;
            A = generateMatrix(m, n, data.matrixType);
        } else {
            A = data.A.slice();
            m = data.m;
            n = data.n;
        }

        let result;

        switch (type) {
            case 'all':
                result = computeAll(A, m, n);
                break;
            case 'rref':
                result = computeRREF(A, m, n);
                break;
            case 'rank':
                result = computeRankNullity(A, m, n);
                break;
            case 'basis':
                result = computeColumnBasis(A, m, n);
                break;
            case 'nullspace':
                result = computeNullspace(A, m, n);
                break;
            case 'rowspace':
                result = computeRowspace(A, m, n);
                break;
            default:
                throw new Error('Unknown operation: ' + type);
        }

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            algorithm: type,
            result,
            executionTime
        });
    } catch (error) {
        self.postMessage({
            type: 'error',
            message: error.message
        });
    }
};

function reportProgress(percent) {
    self.postMessage({ type: 'progress', percentage: Math.round(percent) });
}

// Matrix generation
function generateMatrix(m, n, matrixType) {
    const A = [];

    switch (matrixType) {
        case 'random':
            for (let i = 0; i < m; i++) {
                const row = [];
                for (let j = 0; j < n; j++) {
                    row.push(Math.random() * 10 - 5);
                }
                A.push(row);
            }
            break;

        case 'rankDeficient':
            // Create rank-deficient matrix
            const rank = Math.floor(Math.min(m, n) / 2);
            const base = [];
            for (let i = 0; i < rank; i++) {
                const row = [];
                for (let j = 0; j < n; j++) {
                    row.push(Math.random() * 6 - 3);
                }
                base.push(row);
            }
            for (let i = 0; i < m; i++) {
                const row = [];
                const baseIdx = i % rank;
                const scale = 0.5 + Math.random() * 2;
                for (let j = 0; j < n; j++) {
                    row.push(scale * base[baseIdx][j] + (Math.random() - 0.5) * 0.001);
                }
                A.push(row);
            }
            break;

        case 'sparse':
            for (let i = 0; i < m; i++) {
                const row = [];
                for (let j = 0; j < n; j++) {
                    row.push(Math.random() < 0.3 ? Math.random() * 10 - 5 : 0);
                }
                A.push(row);
            }
            break;

        case 'integer':
            for (let i = 0; i < m; i++) {
                const row = [];
                for (let j = 0; j < n; j++) {
                    row.push(Math.floor(Math.random() * 21) - 10);
                }
                A.push(row);
            }
            break;

        default:
            for (let i = 0; i < m; i++) {
                const row = [];
                for (let j = 0; j < n; j++) {
                    row.push(Math.random() * 10 - 5);
                }
                A.push(row);
            }
    }

    return A;
}

// Deep copy matrix
function copyMatrix(A) {
    return A.map(row => row.slice());
}

// Tolerance for zero comparison
const TOL = 1e-10;

/**
 * Compute Row Reduced Echelon Form (RREF)
 * Returns RREF matrix and pivot positions
 */
function rref(A, m, n) {
    const R = copyMatrix(A);
    const pivots = []; // [row, col] pairs
    let pivotRow = 0;

    for (let col = 0; col < n && pivotRow < m; col++) {
        // Find pivot
        let maxVal = Math.abs(R[pivotRow][col]);
        let maxRow = pivotRow;

        for (let row = pivotRow + 1; row < m; row++) {
            if (Math.abs(R[row][col]) > maxVal) {
                maxVal = Math.abs(R[row][col]);
                maxRow = row;
            }
        }

        if (maxVal < TOL) {
            // No pivot in this column
            continue;
        }

        // Swap rows
        if (maxRow !== pivotRow) {
            [R[pivotRow], R[maxRow]] = [R[maxRow], R[pivotRow]];
        }

        // Scale pivot row
        const pivot = R[pivotRow][col];
        for (let j = 0; j < n; j++) {
            R[pivotRow][j] /= pivot;
        }

        // Eliminate other rows
        for (let row = 0; row < m; row++) {
            if (row !== pivotRow && Math.abs(R[row][col]) > TOL) {
                const factor = R[row][col];
                for (let j = 0; j < n; j++) {
                    R[row][j] -= factor * R[pivotRow][j];
                }
            }
        }

        pivots.push([pivotRow, col]);
        pivotRow++;

        if (col % 10 === 0) {
            reportProgress(10 + 60 * col / n);
        }
    }

    // Clean up small values
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            if (Math.abs(R[i][j]) < TOL) {
                R[i][j] = 0;
            }
        }
    }

    return { rref: R, pivots };
}

function computeRREF(A, m, n) {
    reportProgress(10);

    const { rref: R, pivots } = rref(A, m, n);

    reportProgress(100);

    const pivotCols = pivots.map(p => p[1]);

    return {
        operation: 'Row Reduced Echelon Form',
        description: 'Gaussian elimination to RREF',
        inputSize: `${m}×${n}`,
        rank: pivots.length,
        pivotColumns: pivotCols,
        rrefMatrix: R,
        inputMatrix: getSubmatrix(A, m, n, 6),
        outputMatrix: getSubmatrix(R, m, n, 6)
    };
}

function computeRankNullity(A, m, n) {
    reportProgress(10);

    const { pivots } = rref(A, m, n);
    const rank = pivots.length;
    const nullity = n - rank;

    reportProgress(100);

    return {
        operation: 'Rank & Nullity',
        description: 'rank(A) + nullity(A) = n',
        inputSize: `${m}×${n}`,
        rank,
        nullity,
        numColumns: n,
        rankNullitySum: rank + nullity,
        verified: rank + nullity === n,
        inputMatrix: getSubmatrix(A, m, n, 6)
    };
}

function computeColumnBasis(A, m, n) {
    reportProgress(10);

    const { pivots } = rref(A, m, n);
    const pivotCols = pivots.map(p => p[1]);

    reportProgress(70);

    // Extract pivot columns from original matrix as basis
    const basis = [];
    for (const col of pivotCols) {
        const vec = [];
        for (let i = 0; i < m; i++) {
            vec.push(A[i][col]);
        }
        basis.push(vec);
    }

    reportProgress(100);

    return {
        operation: 'Column Space Basis',
        description: 'Basis for Col(A) = {Ax : x ∈ Rⁿ}',
        inputSize: `${m}×${n}`,
        rank: pivots.length,
        pivotColumns: pivotCols,
        basisVectors: basis,
        dimension: basis.length,
        inputMatrix: getSubmatrix(A, m, n, 6)
    };
}

function computeNullspace(A, m, n) {
    reportProgress(10);

    const { rref: R, pivots } = rref(A, m, n);
    const rank = pivots.length;
    const nullity = n - rank;

    reportProgress(50);

    const pivotCols = new Set(pivots.map(p => p[1]));
    const freeCols = [];
    for (let j = 0; j < n; j++) {
        if (!pivotCols.has(j)) {
            freeCols.push(j);
        }
    }

    // Build nullspace basis
    const nullBasis = [];
    for (const freeCol of freeCols) {
        const vec = new Array(n).fill(0);
        vec[freeCol] = 1;

        // Back-substitute
        for (let i = pivots.length - 1; i >= 0; i--) {
            const [pivotRow, pivotCol] = pivots[i];
            vec[pivotCol] = -R[pivotRow][freeCol];
        }

        nullBasis.push(vec);
    }

    reportProgress(100);

    return {
        operation: 'Null Space Basis',
        description: 'Basis for Null(A) = {x : Ax = 0}',
        inputSize: `${m}×${n}`,
        nullity,
        freeVariables: freeCols,
        basisVectors: nullBasis,
        dimension: nullBasis.length,
        inputMatrix: getSubmatrix(A, m, n, 6)
    };
}

function computeRowspace(A, m, n) {
    reportProgress(10);

    const { rref: R, pivots } = rref(A, m, n);

    reportProgress(70);

    // Non-zero rows of RREF form basis for row space
    const basis = [];
    for (let i = 0; i < pivots.length; i++) {
        basis.push(R[i].slice());
    }

    reportProgress(100);

    return {
        operation: 'Row Space Basis',
        description: 'Basis for Row(A) = Col(Aᵀ)',
        inputSize: `${m}×${n}`,
        rank: pivots.length,
        basisVectors: basis,
        dimension: basis.length,
        inputMatrix: getSubmatrix(A, m, n, 6)
    };
}

function computeAll(A, m, n) {
    reportProgress(5);

    const { rref: R, pivots } = rref(A, m, n);
    const rank = pivots.length;
    const nullity = n - rank;

    reportProgress(30);

    const pivotCols = pivots.map(p => p[1]);
    const pivotColSet = new Set(pivotCols);

    // Column space basis
    const colBasis = [];
    for (const col of pivotCols) {
        const vec = [];
        for (let i = 0; i < m; i++) {
            vec.push(A[i][col]);
        }
        colBasis.push(vec);
    }

    reportProgress(50);

    // Free variables
    const freeCols = [];
    for (let j = 0; j < n; j++) {
        if (!pivotColSet.has(j)) {
            freeCols.push(j);
        }
    }

    // Null space basis
    const nullBasis = [];
    for (const freeCol of freeCols) {
        const vec = new Array(n).fill(0);
        vec[freeCol] = 1;
        for (let i = pivots.length - 1; i >= 0; i--) {
            const [pivotRow, pivotCol] = pivots[i];
            vec[pivotCol] = -R[pivotRow][freeCol];
        }
        nullBasis.push(vec);
    }

    reportProgress(70);

    // Row space basis
    const rowBasis = [];
    for (let i = 0; i < pivots.length; i++) {
        rowBasis.push(R[i].slice());
    }

    reportProgress(100);

    return {
        operation: 'Complete Vector Space Analysis',
        description: 'All properties of the matrix as a linear map',
        inputSize: `${m}×${n}`,
        rank,
        nullity,
        rankNullityVerified: rank + nullity === n,
        pivotColumns: pivotCols,
        freeVariables: freeCols,
        columnSpaceBasis: colBasis,
        nullSpaceBasis: nullBasis,
        rowSpaceBasis: rowBasis,
        rrefMatrix: getSubmatrix(R, m, n, 6),
        inputMatrix: getSubmatrix(A, m, n, 6)
    };
}

function getSubmatrix(A, m, n, maxSize) {
    const displayRows = Math.min(maxSize, m);
    const displayCols = Math.min(maxSize, n);
    const submatrix = [];
    for (let i = 0; i < displayRows; i++) {
        const row = [];
        for (let j = 0; j < displayCols; j++) {
            row.push(A[i][j]);
        }
        submatrix.push(row);
    }
    return submatrix;
}
