/**
 * Web Worker: PDE Solver
 * Numerical methods for Partial Differential Equations
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'heat1d':
                result = solveHeat1D(data.nx, data.nt, data.alpha, data.dx, data.dt, data.initial, data.boundary);
                break;
            case 'heat2d':
                result = solveHeat2D(data.nx, data.ny, data.iterations, data.alpha, data.initial);
                break;
            case 'wave1d':
                result = solveWave1D(data.nx, data.nt, data.c, data.dx, data.dt, data.initial, data.initialVelocity);
                break;
            case 'laplace':
                result = solveLaplace(data.nx, data.ny, data.boundary, data.tolerance, data.maxIterations);
                break;
            case 'poisson':
                result = solvePoisson(data.nx, data.ny, data.source, data.boundary, data.tolerance, data.maxIterations);
                break;
            case 'advection':
                result = solveAdvection(data.nx, data.nt, data.velocity, data.dx, data.dt, data.initial);
                break;
            default:
                throw new Error('Unknown PDE type');
        }

        const executionTime = (performance.now() - startTime).toFixed(2);
        self.postMessage({ type: 'result', calculationType: type, result, executionTime });
    } catch (error) {
        self.postMessage({ type: 'error', message: error.message });
    }
};

/**
 * 1D Heat Equation: ∂u/∂t = α ∂²u/∂x²
 * Using explicit FTCS (Forward Time Central Space) scheme
 */
function solveHeat1D(nx, nt, alpha, dx, dt, initialType, boundaryType) {
    // Stability condition: r = α*dt/dx² ≤ 0.5
    const r = alpha * dt / (dx * dx);
    if (r > 0.5) {
        throw new Error(`Stability violated: r = ${r.toFixed(3)} > 0.5. Reduce dt or increase dx.`);
    }

    // Initialize grid
    let u = new Array(nx).fill(0);
    let uNew = new Array(nx).fill(0);

    // Set initial condition
    for (let i = 0; i < nx; i++) {
        const x = i * dx;
        switch (initialType) {
            case 'sine':
                u[i] = Math.sin(Math.PI * x / (nx * dx));
                break;
            case 'gaussian':
                const center = nx * dx / 2;
                u[i] = Math.exp(-((x - center) * (x - center)) / (0.1 * nx * dx));
                break;
            case 'step':
                u[i] = (i >= nx / 4 && i < 3 * nx / 4) ? 1 : 0;
                break;
            default:
                u[i] = Math.sin(Math.PI * x / (nx * dx));
        }
    }

    // Store snapshots
    const snapshots = [u.slice()];
    const snapshotInterval = Math.floor(nt / 10);

    self.postMessage({ type: 'progress', percentage: 10 });

    // Time stepping
    for (let n = 0; n < nt; n++) {
        // Interior points
        for (let i = 1; i < nx - 1; i++) {
            uNew[i] = u[i] + r * (u[i + 1] - 2 * u[i] + u[i - 1]);
        }

        // Boundary conditions
        switch (boundaryType) {
            case 'dirichlet':
                uNew[0] = 0;
                uNew[nx - 1] = 0;
                break;
            case 'neumann':
                uNew[0] = uNew[1];
                uNew[nx - 1] = uNew[nx - 2];
                break;
            case 'periodic':
                uNew[0] = u[0] + r * (u[1] - 2 * u[0] + u[nx - 2]);
                uNew[nx - 1] = uNew[0];
                break;
        }

        // Swap arrays
        [u, uNew] = [uNew, u];

        // Store snapshots
        if ((n + 1) % snapshotInterval === 0) {
            snapshots.push(u.slice());
        }

        if (n % Math.floor(nt / 10) === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((n / nt) * 80)
            });
        }
    }

    snapshots.push(u.slice());

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: '1D Heat Equation (FTCS)',
        equation: '∂u/∂t = α ∂²u/∂x²',
        scheme: 'Explicit Forward Time Central Space',
        stability: `r = α×dt/dx² = ${r.toFixed(4)} ≤ 0.5`,
        snapshots: snapshots,
        finalSolution: u,
        nx: nx,
        nt: nt,
        dx: dx,
        dt: dt,
        alpha: alpha,
        initialCondition: initialType,
        boundaryCondition: boundaryType
    };
}

/**
 * 2D Heat Equation using explicit scheme
 */
function solveHeat2D(nx, ny, iterations, alpha, initialType) {
    const dx = 1.0 / (nx - 1);
    const dy = 1.0 / (ny - 1);
    const dt = 0.25 * Math.min(dx * dx, dy * dy) / alpha;
    const rx = alpha * dt / (dx * dx);
    const ry = alpha * dt / (dy * dy);

    // Initialize grid
    let u = [];
    for (let i = 0; i < nx; i++) {
        u[i] = new Array(ny).fill(0);
    }

    // Set initial condition
    for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
            const x = i * dx;
            const y = j * dy;
            switch (initialType) {
                case 'gaussian':
                    u[i][j] = Math.exp(-50 * ((x - 0.5) * (x - 0.5) + (y - 0.5) * (y - 0.5)));
                    break;
                case 'sine':
                    u[i][j] = Math.sin(Math.PI * x) * Math.sin(Math.PI * y);
                    break;
                case 'hotspot':
                    u[i][j] = (i > nx / 3 && i < 2 * nx / 3 && j > ny / 3 && j < 2 * ny / 3) ? 1 : 0;
                    break;
            }
        }
    }

    const snapshots = [u.map(row => row.slice())];

    self.postMessage({ type: 'progress', percentage: 10 });

    // Time stepping
    for (let n = 0; n < iterations; n++) {
        const uNew = u.map(row => row.slice());

        for (let i = 1; i < nx - 1; i++) {
            for (let j = 1; j < ny - 1; j++) {
                uNew[i][j] = u[i][j] +
                    rx * (u[i + 1][j] - 2 * u[i][j] + u[i - 1][j]) +
                    ry * (u[i][j + 1] - 2 * u[i][j] + u[i][j - 1]);
            }
        }

        u = uNew;

        if ((n + 1) % Math.floor(iterations / 5) === 0) {
            snapshots.push(u.map(row => row.slice()));
        }

        if (n % Math.floor(iterations / 10) === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((n / iterations) * 80)
            });
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: '2D Heat Equation (Explicit)',
        equation: '∂u/∂t = α(∂²u/∂x² + ∂²u/∂y²)',
        snapshots: snapshots,
        finalSolution: u,
        nx: nx,
        ny: ny,
        iterations: iterations,
        alpha: alpha
    };
}

/**
 * 1D Wave Equation: ∂²u/∂t² = c² ∂²u/∂x²
 * Using explicit CTCS (Central Time Central Space) scheme
 */
function solveWave1D(nx, nt, c, dx, dt, initialType, hasInitialVelocity) {
    // Courant number: C = c*dt/dx ≤ 1
    const C = c * dt / dx;
    const C2 = C * C;

    if (C > 1) {
        throw new Error(`CFL condition violated: C = ${C.toFixed(3)} > 1. Reduce dt or increase dx.`);
    }

    // Initialize grids
    let uPrev = new Array(nx).fill(0);
    let u = new Array(nx).fill(0);
    let uNext = new Array(nx).fill(0);

    // Set initial displacement
    for (let i = 0; i < nx; i++) {
        const x = i * dx;
        const L = nx * dx;
        switch (initialType) {
            case 'pluck':
                // Triangular pluck
                const mid = L / 2;
                if (x < mid) {
                    u[i] = 2 * x / L;
                } else {
                    u[i] = 2 * (L - x) / L;
                }
                break;
            case 'sine':
                u[i] = Math.sin(Math.PI * x / L);
                break;
            case 'gaussian':
                const center = L / 2;
                u[i] = Math.exp(-((x - center) * (x - center)) / (0.01 * L * L));
                break;
        }
    }

    // First time step (with or without initial velocity)
    for (let i = 1; i < nx - 1; i++) {
        if (hasInitialVelocity) {
            // With initial velocity (e.g., hammer strike)
            const v0 = 0.5;
            uPrev[i] = u[i] - v0 * dt;
        } else {
            // Zero initial velocity
            uPrev[i] = u[i] + 0.5 * C2 * (u[i + 1] - 2 * u[i] + u[i - 1]);
        }
    }

    const snapshots = [u.slice()];
    const snapshotInterval = Math.floor(nt / 20);

    self.postMessage({ type: 'progress', percentage: 10 });

    // Time stepping
    for (let n = 0; n < nt; n++) {
        // Interior points
        for (let i = 1; i < nx - 1; i++) {
            uNext[i] = 2 * u[i] - uPrev[i] + C2 * (u[i + 1] - 2 * u[i] + u[i - 1]);
        }

        // Fixed boundary conditions
        uNext[0] = 0;
        uNext[nx - 1] = 0;

        // Rotate arrays
        [uPrev, u, uNext] = [u, uNext, uPrev];

        if ((n + 1) % snapshotInterval === 0) {
            snapshots.push(u.slice());
        }

        if (n % Math.floor(nt / 10) === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((n / nt) * 80)
            });
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: '1D Wave Equation (CTCS)',
        equation: '∂²u/∂t² = c² ∂²u/∂x²',
        scheme: 'Explicit Central Time Central Space',
        stability: `Courant number C = c×dt/dx = ${C.toFixed(4)} ≤ 1`,
        snapshots: snapshots,
        finalSolution: u,
        nx: nx,
        nt: nt,
        dx: dx,
        dt: dt,
        waveSpeed: c,
        initialCondition: initialType
    };
}

/**
 * Laplace Equation: ∇²u = 0
 * Using iterative Gauss-Seidel method
 */
function solveLaplace(nx, ny, boundaryType, tolerance, maxIterations) {
    const dx = 1.0 / (nx - 1);
    const dy = 1.0 / (ny - 1);

    // Initialize grid
    let u = [];
    for (let i = 0; i < nx; i++) {
        u[i] = new Array(ny).fill(0);
    }

    // Set boundary conditions
    for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
            const x = i * dx;
            const y = j * dy;

            switch (boundaryType) {
                case 'heated_plate':
                    // Top hot, others cold
                    if (j === ny - 1) u[i][j] = 100;
                    else if (i === 0 || i === nx - 1 || j === 0) u[i][j] = 0;
                    break;
                case 'sine_boundary':
                    if (j === ny - 1) u[i][j] = Math.sin(Math.PI * x);
                    else if (i === 0 || i === nx - 1 || j === 0) u[i][j] = 0;
                    break;
                case 'mixed':
                    if (j === ny - 1) u[i][j] = 100 * x;
                    else if (j === 0) u[i][j] = 0;
                    else if (i === 0) u[i][j] = 0;
                    else if (i === nx - 1) u[i][j] = 100 * y;
                    break;
            }
        }
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    // Gauss-Seidel iteration
    let converged = false;
    let iterations = 0;
    const residuals = [];

    for (let iter = 0; iter < maxIterations; iter++) {
        let maxDiff = 0;

        for (let i = 1; i < nx - 1; i++) {
            for (let j = 1; j < ny - 1; j++) {
                const uOld = u[i][j];
                u[i][j] = 0.25 * (u[i + 1][j] + u[i - 1][j] + u[i][j + 1] + u[i][j - 1]);
                maxDiff = Math.max(maxDiff, Math.abs(u[i][j] - uOld));
            }
        }

        residuals.push(maxDiff);
        iterations = iter + 1;

        if (maxDiff < tolerance) {
            converged = true;
            break;
        }

        if (iter % Math.floor(maxIterations / 10) === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((iter / maxIterations) * 80)
            });
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Laplace Equation (Gauss-Seidel)',
        equation: '∇²u = ∂²u/∂x² + ∂²u/∂y² = 0',
        solution: u,
        converged: converged,
        iterations: iterations,
        finalResidual: residuals[residuals.length - 1],
        residuals: residuals.filter((_, i) => i % Math.ceil(residuals.length / 50) === 0),
        nx: nx,
        ny: ny,
        boundaryCondition: boundaryType
    };
}

/**
 * Poisson Equation: ∇²u = f(x,y)
 * Using iterative Gauss-Seidel method
 */
function solvePoisson(nx, ny, sourceType, boundaryType, tolerance, maxIterations) {
    const dx = 1.0 / (nx - 1);
    const dy = 1.0 / (ny - 1);
    const dx2 = dx * dx;
    const dy2 = dy * dy;

    // Initialize grid and source
    let u = [];
    let f = [];
    for (let i = 0; i < nx; i++) {
        u[i] = new Array(ny).fill(0);
        f[i] = new Array(ny).fill(0);
    }

    // Set source term
    for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
            const x = i * dx;
            const y = j * dy;

            switch (sourceType) {
                case 'point':
                    // Point source at center
                    if (Math.abs(i - nx / 2) < 2 && Math.abs(j - ny / 2) < 2) {
                        f[i][j] = -100;
                    }
                    break;
                case 'uniform':
                    f[i][j] = -1;
                    break;
                case 'sine':
                    f[i][j] = -2 * Math.PI * Math.PI * Math.sin(Math.PI * x) * Math.sin(Math.PI * y);
                    break;
            }
        }
    }

    // Set boundary conditions
    for (let i = 0; i < nx; i++) {
        u[i][0] = 0;
        u[i][ny - 1] = 0;
    }
    for (let j = 0; j < ny; j++) {
        u[0][j] = 0;
        u[nx - 1][j] = 0;
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    // Gauss-Seidel iteration
    const factor = 2 * (1 / dx2 + 1 / dy2);
    let converged = false;
    let iterations = 0;

    for (let iter = 0; iter < maxIterations; iter++) {
        let maxDiff = 0;

        for (let i = 1; i < nx - 1; i++) {
            for (let j = 1; j < ny - 1; j++) {
                const uOld = u[i][j];
                u[i][j] = ((u[i + 1][j] + u[i - 1][j]) / dx2 +
                          (u[i][j + 1] + u[i][j - 1]) / dy2 -
                          f[i][j]) / factor;
                maxDiff = Math.max(maxDiff, Math.abs(u[i][j] - uOld));
            }
        }

        iterations = iter + 1;

        if (maxDiff < tolerance) {
            converged = true;
            break;
        }

        if (iter % Math.floor(maxIterations / 10) === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((iter / maxIterations) * 80)
            });
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Poisson Equation (Gauss-Seidel)',
        equation: '∇²u = f(x,y)',
        solution: u,
        source: f,
        converged: converged,
        iterations: iterations,
        nx: nx,
        ny: ny,
        sourceType: sourceType
    };
}

/**
 * 1D Advection Equation: ∂u/∂t + v ∂u/∂x = 0
 * Using upwind scheme
 */
function solveAdvection(nx, nt, velocity, dx, dt, initialType) {
    // CFL condition
    const C = Math.abs(velocity) * dt / dx;
    if (C > 1) {
        throw new Error(`CFL condition violated: C = ${C.toFixed(3)} > 1`);
    }

    let u = new Array(nx).fill(0);
    let uNew = new Array(nx).fill(0);

    // Initial condition
    for (let i = 0; i < nx; i++) {
        const x = i * dx;
        const L = nx * dx;
        switch (initialType) {
            case 'gaussian':
                const center = L / 4;
                u[i] = Math.exp(-((x - center) * (x - center)) / (0.01 * L * L));
                break;
            case 'square':
                u[i] = (x > L / 4 && x < L / 2) ? 1 : 0;
                break;
            case 'sine':
                u[i] = Math.sin(4 * Math.PI * x / L);
                break;
        }
    }

    const snapshots = [u.slice()];
    const snapshotInterval = Math.floor(nt / 10);

    self.postMessage({ type: 'progress', percentage: 10 });

    // Time stepping with upwind scheme
    for (let n = 0; n < nt; n++) {
        for (let i = 1; i < nx - 1; i++) {
            if (velocity > 0) {
                // Upwind (backward difference)
                uNew[i] = u[i] - C * (u[i] - u[i - 1]);
            } else {
                // Upwind (forward difference)
                uNew[i] = u[i] - C * (u[i + 1] - u[i]);
            }
        }

        // Periodic boundary
        if (velocity > 0) {
            uNew[0] = u[0] - C * (u[0] - u[nx - 2]);
        } else {
            uNew[0] = u[0] - C * (u[1] - u[0]);
        }
        uNew[nx - 1] = uNew[0];

        [u, uNew] = [uNew, u];

        if ((n + 1) % snapshotInterval === 0) {
            snapshots.push(u.slice());
        }

        if (n % Math.floor(nt / 10) === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((n / nt) * 80)
            });
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: '1D Advection Equation (Upwind)',
        equation: '∂u/∂t + v ∂u/∂x = 0',
        scheme: 'First-order Upwind',
        stability: `CFL number = ${C.toFixed(4)} ≤ 1`,
        snapshots: snapshots,
        finalSolution: u,
        nx: nx,
        nt: nt,
        velocity: velocity,
        dx: dx,
        dt: dt
    };
}
