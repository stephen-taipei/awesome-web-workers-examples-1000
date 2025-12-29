/**
 * Noise Terrain - Web Worker
 * Simplex noise implementation
 */

// Simplex noise implementation
class SimplexNoise {
    constructor(seed) {
        this.p = new Uint8Array(512);
        this.perm = new Uint8Array(512);

        const random = this.seededRandom(seed);

        for (let i = 0; i < 256; i++) {
            this.p[i] = i;
        }

        for (let i = 255; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [this.p[i], this.p[j]] = [this.p[j], this.p[i]];
        }

        for (let i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
        }
    }

    seededRandom(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    noise2D(x, y) {
        const F2 = 0.5 * (Math.sqrt(3) - 1);
        const G2 = (3 - Math.sqrt(3)) / 6;

        const s = (x + y) * F2;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);

        const t = (i + j) * G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = x - X0;
        const y0 = y - Y0;

        let i1, j1;
        if (x0 > y0) { i1 = 1; j1 = 0; }
        else { i1 = 0; j1 = 1; }

        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2 * G2;
        const y2 = y0 - 1 + 2 * G2;

        const ii = i & 255;
        const jj = j & 255;

        const grad = [
            [1, 1], [-1, 1], [1, -1], [-1, -1],
            [1, 0], [-1, 0], [0, 1], [0, -1]
        ];

        const gi0 = this.perm[ii + this.perm[jj]] % 8;
        const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 8;
        const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 8;

        let n0 = 0, n1 = 0, n2 = 0;

        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 >= 0) {
            t0 *= t0;
            n0 = t0 * t0 * (grad[gi0][0] * x0 + grad[gi0][1] * y0);
        }

        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) {
            t1 *= t1;
            n1 = t1 * t1 * (grad[gi1][0] * x1 + grad[gi1][1] * y1);
        }

        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 >= 0) {
            t2 *= t2;
            n2 = t2 * t2 * (grad[gi2][0] * x2 + grad[gi2][1] * y2);
        }

        return 70 * (n0 + n1 + n2);
    }
}

self.onmessage = function(event) {
    const { type, payload } = event.data;

    if (type === 'GENERATE') {
        const startTime = performance.now();
        const heightmap = generateNoiseTerrain(payload);
        const endTime = performance.now();

        self.postMessage({
            type: 'COMPLETE',
            payload: {
                heightmap,
                seed: payload.seed,
                time: endTime - startTime
            }
        });
    }
};

function generateNoiseTerrain(config) {
    const { width, height, scale, octaves, persistence, seed } = config;
    const noise = new SimplexNoise(seed);
    const heightmap = new Float32Array(width * height);

    let maxAmp = 0;
    let amp = 1;

    for (let o = 0; o < octaves; o++) {
        maxAmp += amp;
        amp *= persistence;
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let value = 0;
            amp = 1;
            let freq = 1;

            for (let o = 0; o < octaves; o++) {
                const nx = x / scale * freq;
                const ny = y / scale * freq;
                value += noise.noise2D(nx, ny) * amp;
                amp *= persistence;
                freq *= 2;
            }

            heightmap[y * width + x] = (value / maxAmp + 1) / 2;
        }
    }

    return heightmap;
}
