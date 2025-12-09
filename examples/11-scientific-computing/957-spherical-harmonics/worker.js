// Spherical Harmonics Worker

self.onmessage = function(e) {
    const { command, l, m, res } = e.data;

    if (command === 'compute') {
        try {
            const start = performance.now();
            const vertices = [];

            // Grid over theta (0 to PI) and phi (0 to 2PI)
            for (let i = 0; i <= res; i++) {
                const theta = (i / res) * Math.PI; // 0 .. PI
                
                for (let j = 0; j <= res * 2; j++) {
                    const phi = (j / (res * 2)) * 2 * Math.PI; // 0 .. 2PI
                    
                    // Calculate Spherical Harmonic Y_l^m(theta, phi)
                    // Y_l^m = N * P_l^m(cos theta) * e^(i * m * phi)
                    // We visualize the magnitude |Re(Y)| to deform the sphere
                    // r = |Re(Y_l^m)|
                    
                    const legendre = associatedLegendre(l, m, Math.cos(theta));
                    const normalization = Math.sqrt(((2*l + 1)/(4*Math.PI)) * (factorial(l-m)/factorial(l+m)));
                    
                    // Real part of e^(im*phi) is cos(m*phi)
                    const Y = normalization * legendre * Math.cos(m * phi);
                    
                    // Radius: usually |Y| or |Re(Y)|^2.
                    // Standard visualization: r = |Re(Y)|
                    const r = Math.abs(Y); 
                    
                    // Convert spherical to cartesian
                    const x = r * Math.sin(theta) * Math.cos(phi);
                    const y = r * Math.sin(theta) * Math.sin(phi);
                    const z = r * Math.cos(theta);
                    
                    vertices.push({ x, y, z, val: Y });
                }
            }

            const end = performance.now();

            self.postMessage({
                type: 'result',
                data: {
                    vertices,
                    duration: (end - start).toFixed(2)
                }
            });

        } catch (err) {
            self.postMessage({ type: 'error', data: err.message });
        }
    }
};

// Helper: Associated Legendre Polynomial P_l^m(x)
function associatedLegendre(l, m, x) {
    if (m > l) return 0;
    
    // Compute P_m^m(x)
    let pmm = 1.0;
    if (m > 0) {
        const somx2 = Math.sqrt((1.0 - x) * (1.0 + x));
        let fact = 1.0;
        for (let i = 1; i <= m; i++) {
            pmm *= -fact * somx2;
            fact += 2.0;
        }
    }
    
    if (l === m) return pmm;
    
    // Compute P_{m+1}^m(x)
    let pmmp1 = x * (2.0 * m + 1.0) * pmm;
    if (l === m + 1) return pmmp1;
    
    // Compute P_l^m(x)
    let pll = 0.0;
    for (let ll = m + 2; ll <= l; ll++) {
        pll = ((2.0 * ll - 1.0) * x * pmmp1 - (ll + m - 1.0) * pmm) / (ll - m);
        pmm = pmmp1;
        pmmp1 = pll;
    }
    return pll;
}

function factorial(n) {
    let res = 1;
    for(let i=2; i<=n; i++) res *= i;
    return res;
}
