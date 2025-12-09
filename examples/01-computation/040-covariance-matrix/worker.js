/**
 * Web Worker: Covariance Matrix Calculator
 *
 * Calculates covariance matrix for multivariate data,
 * measuring how variables change together.
 */

self.onmessage = function(e) {
    const { type, data, variables } = e.data;
    const startTime = performance.now();

    try {
        let result;
        switch (type) {
            case 'pairwise':
                result = calculatePairwiseCovariance(data.x, data.y);
                break;
            case 'matrix':
                result = calculateCovarianceMatrix(variables);
                break;
            case 'generate':
                result = generateAndCalculate(e.data.count, e.data.numVars, e.data.correlation);
                break;
            default:
                throw new Error('Unknown calculation type');
        }

        self.postMessage({
            type: 'result',
            calculationType: type,
            result,
            executionTime: (performance.now() - startTime).toFixed(2)
        });
    } catch (error) {
        self.postMessage({ type: 'error', message: error.message });
    }
};

/**
 * Calculate covariance between two variables
 */
function calculatePairwiseCovariance(x, y) {
    const n = x.length;
    if (n !== y.length) throw new Error('Arrays must have same length');
    if (n < 2) throw new Error('Need at least 2 data points');

    // Calculate means
    let sumX = 0, sumY = 0;
    for (let i = 0; i < n; i++) {
        sumX += x[i];
        sumY += y[i];
    }
    const meanX = sumX / n;
    const meanY = sumY / n;

    // Calculate covariance and variances
    let covXY = 0, varX = 0, varY = 0;
    for (let i = 0; i < n; i++) {
        const devX = x[i] - meanX;
        const devY = y[i] - meanY;
        covXY += devX * devY;
        varX += devX * devX;
        varY += devY * devY;

        if (i % 1000000 === 0 && i > 0) {
            self.postMessage({ type: 'progress', percentage: Math.floor((i / n) * 80) });
        }
    }

    const populationCov = covXY / n;
    const sampleCov = covXY / (n - 1);
    const stdX = Math.sqrt(varX / n);
    const stdY = Math.sqrt(varY / n);
    const correlation = stdX * stdY !== 0 ? populationCov / (stdX * stdY) : 0;

    return {
        populationCovariance: populationCov,
        sampleCovariance: sampleCov,
        correlation,
        meanX,
        meanY,
        stdDevX: stdX,
        stdDevY: stdY,
        varianceX: varX / n,
        varianceY: varY / n,
        n,
        interpretation: interpretCovariance(populationCov, correlation),
        relationship: getRelationship(correlation)
    };
}

/**
 * Calculate full covariance matrix for multiple variables
 */
function calculateCovarianceMatrix(variables) {
    const numVars = variables.length;
    if (numVars < 2) throw new Error('Need at least 2 variables');

    const n = variables[0].length;
    for (const v of variables) {
        if (v.length !== n) throw new Error('All variables must have same length');
    }
    if (n < 2) throw new Error('Need at least 2 data points');

    // Calculate means
    const means = variables.map(v => {
        let sum = 0;
        for (const val of v) sum += val;
        return sum / n;
    });

    self.postMessage({ type: 'progress', percentage: 20 });

    // Calculate covariance matrix
    const covMatrix = [];
    const corrMatrix = [];
    const stdDevs = [];

    // First calculate variances (diagonal)
    for (let i = 0; i < numVars; i++) {
        let variance = 0;
        for (let k = 0; k < n; k++) {
            const dev = variables[i][k] - means[i];
            variance += dev * dev;
        }
        stdDevs.push(Math.sqrt(variance / n));
    }

    self.postMessage({ type: 'progress', percentage: 40 });

    // Calculate full matrix
    for (let i = 0; i < numVars; i++) {
        covMatrix[i] = [];
        corrMatrix[i] = [];

        for (let j = 0; j < numVars; j++) {
            let cov = 0;
            for (let k = 0; k < n; k++) {
                cov += (variables[i][k] - means[i]) * (variables[j][k] - means[j]);
            }
            covMatrix[i][j] = cov / n;

            // Correlation
            if (stdDevs[i] !== 0 && stdDevs[j] !== 0) {
                corrMatrix[i][j] = covMatrix[i][j] / (stdDevs[i] * stdDevs[j]);
            } else {
                corrMatrix[i][j] = i === j ? 1 : 0;
            }
        }

        self.postMessage({
            type: 'progress',
            percentage: 40 + Math.floor((i / numVars) * 50)
        });
    }

    // Calculate eigenvalues (for 2x2 matrix)
    let eigenvalues = null;
    if (numVars === 2) {
        eigenvalues = calculate2x2Eigenvalues(covMatrix);
    }

    return {
        covarianceMatrix: covMatrix,
        correlationMatrix: corrMatrix,
        means,
        standardDeviations: stdDevs,
        variances: stdDevs.map(s => s * s),
        numVariables: numVars,
        n,
        eigenvalues,
        determinant: numVars === 2 ? calculate2x2Determinant(covMatrix) : null,
        trace: calculateTrace(covMatrix),
        isPositiveDefinite: checkPositiveDefinite(covMatrix, numVars)
    };
}

/**
 * Calculate 2x2 matrix eigenvalues
 */
function calculate2x2Eigenvalues(matrix) {
    const a = matrix[0][0];
    const b = matrix[0][1];
    const c = matrix[1][0];
    const d = matrix[1][1];

    const trace = a + d;
    const det = a * d - b * c;
    const discriminant = trace * trace - 4 * det;

    if (discriminant < 0) return { real: [trace / 2, trace / 2], complex: true };

    const sqrtDisc = Math.sqrt(discriminant);
    return {
        lambda1: (trace + sqrtDisc) / 2,
        lambda2: (trace - sqrtDisc) / 2,
        complex: false
    };
}

/**
 * Calculate 2x2 determinant
 */
function calculate2x2Determinant(matrix) {
    return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
}

/**
 * Calculate matrix trace
 */
function calculateTrace(matrix) {
    let trace = 0;
    for (let i = 0; i < matrix.length; i++) {
        trace += matrix[i][i];
    }
    return trace;
}

/**
 * Check if matrix is positive definite (simplified check)
 */
function checkPositiveDefinite(matrix, n) {
    // Check all diagonal elements are positive
    for (let i = 0; i < n; i++) {
        if (matrix[i][i] <= 0) return false;
    }

    // For 2x2, check determinant > 0
    if (n === 2) {
        return calculate2x2Determinant(matrix) > 0;
    }

    return true; // Simplified for larger matrices
}

/**
 * Interpret covariance value
 */
function interpretCovariance(cov, corr) {
    const absCorr = Math.abs(corr);
    let strength;

    if (absCorr < 0.1) strength = 'negligible';
    else if (absCorr < 0.3) strength = 'weak';
    else if (absCorr < 0.5) strength = 'moderate';
    else if (absCorr < 0.7) strength = 'strong';
    else strength = 'very strong';

    const direction = cov > 0 ? 'positive' : cov < 0 ? 'negative' : 'no';

    return `${strength} ${direction} relationship (r = ${corr.toFixed(4)})`;
}

/**
 * Get relationship type
 */
function getRelationship(corr) {
    if (Math.abs(corr) < 0.1) return 'No Relationship';
    if (corr > 0) return 'Positive';
    return 'Negative';
}

/**
 * Generate correlated random data
 */
function generateAndCalculate(count, numVars, targetCorrelation) {
    const variables = [];

    // Generate first variable (standard normal)
    const var1 = [];
    for (let i = 0; i < count; i++) {
        const u1 = Math.random();
        const u2 = Math.random();
        var1.push(Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2));

        if (i % 100000 === 0 && i > 0) {
            self.postMessage({ type: 'progress', percentage: Math.floor((i / count) * 30) });
        }
    }
    variables.push(var1);

    // Generate correlated variables
    for (let v = 1; v < numVars; v++) {
        const varN = [];
        const rho = targetCorrelation * (1 - (v - 1) * 0.1); // Decrease correlation for each var

        for (let i = 0; i < count; i++) {
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

            // Create correlated variable
            varN.push(rho * var1[i] + Math.sqrt(1 - rho * rho) * z);

            if (i % 100000 === 0 && i > 0) {
                self.postMessage({
                    type: 'progress',
                    percentage: 30 + Math.floor((v / numVars) * 20) + Math.floor((i / count) * 10)
                });
            }
        }
        variables.push(varN);
    }

    const result = calculateCovarianceMatrix(variables);

    return {
        ...result,
        generated: count,
        targetCorrelation,
        samples: variables.map(v => v.slice(0, 5).map(x => x.toFixed(4)))
    };
}
