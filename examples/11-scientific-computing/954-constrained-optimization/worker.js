// Penalty Method Optimization Worker

self.onmessage = async function(e) {
    const { command, rho: initRho, lr } = e.data;

    if (command === 'start') {
        // Start point
        let x = -2.0;
        let y = -2.0;
        let rho = initRho; // Penalty parameter
        
        const maxOuterIter = 20; // Steps to increase penalty
        const maxInnerIter = 100; // Gradient descent steps per penalty
        
        // Target Function: f(x,y) = (x-2)^2 + (y-2)^2
        // Constraint: g(x,y) = x^2 + y^2 - 1 <= 0
        // Penalty Function: P(x,y) = f(x,y) + rho * max(0, g(x,y))^2
        
        for (let k = 0; k < maxOuterIter; k++) {
            // Inner Loop: Minimize P(x,y) for fixed rho
            for (let i = 0; i < maxInnerIter; i++) {
                // Gradients
                // df/dx = 2(x-2)
                // dg/dx = 2x
                
                const g_val = x*x + y*y - 1;
                const violation = Math.max(0, g_val); // 0 if satisfied
                
                // d(violation^2)/dx = 2 * violation * dg/dx
                // if satisfied, grad is 0.
                
                const gradP_x = 2*(x - 2) + (g_val > 0 ? rho * 2 * g_val * (2*x) : 0);
                const gradP_y = 2*(y - 2) + (g_val > 0 ? rho * 2 * g_val * (2*y) : 0);
                
                // Update
                x -= lr * gradP_x;
                y -= lr * gradP_y;
                
                // Report
                if (i % 10 === 0) {
                    self.postMessage({
                        type: 'step',
                        data: {
                            iter: k * maxInnerIter + i,
                            pos: {x, y},
                            cost: (x-2)**2 + (y-2)**2, // Original objective cost
                            penaltyWeight: rho
                        }
                    });
                    await new Promise(r => setTimeout(r, 10));
                }
            }
            
            // Increase penalty to force constraint satisfaction
            rho *= 2.0;
        }
        
        self.postMessage({ type: 'done' });
    }
};
