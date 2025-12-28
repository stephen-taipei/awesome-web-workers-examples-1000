// Simplex noise implementation
class SimplexNoise {
    constructor(seed = Math.random() * 1000) {
        this.p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) this.p[i] = i;
        for (let i = 255; i > 0; i--) {
            seed = (seed * 16807) % 2147483647;
            const j = seed % (i + 1);
            [this.p[i], this.p[j]] = [this.p[j], this.p[i]];
        }
        this.perm = new Uint8Array(512);
        for (let i = 0; i < 512; i++) this.perm[i] = this.p[i & 255];
    }

    noise2D(x, y) {
        const F2 = 0.5 * (Math.sqrt(3) - 1);
        const G2 = (3 - Math.sqrt(3)) / 6;
        const grad = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];

        const s = (x + y) * F2;
        const i = Math.floor(x + s), j = Math.floor(y + s);
        const t = (i + j) * G2;
        const X0 = i - t, Y0 = j - t;
        const x0 = x - X0, y0 = y - Y0;

        const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
        const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;

        const ii = i & 255, jj = j & 255;

        let n0 = 0, n1 = 0, n2 = 0;
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 > 0) {
            t0 *= t0;
            const gi0 = this.perm[ii + this.perm[jj]] % 8;
            n0 = t0 * t0 * (grad[gi0][0] * x0 + grad[gi0][1] * y0);
        }
        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 > 0) {
            t1 *= t1;
            const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 8;
            n1 = t1 * t1 * (grad[gi1][0] * x1 + grad[gi1][1] * y1);
        }
        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 > 0) {
            t2 *= t2;
            const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 8;
            n2 = t2 * t2 * (grad[gi2][0] * x2 + grad[gi2][1] * y2);
        }

        return 70 * (n0 + n1 + n2);
    }
}

self.onmessage = function(e) {
    const { width, height, scale, type } = e.data;
    const output = new Uint8ClampedArray(width * height * 4);
    const noise = new SimplexNoise();

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const nx = x / scale, ny = y / scale;
            let value = (noise.noise2D(nx, ny) + 1) * 0.5;
            value = Math.floor(value * 255);
            const idx = (y * width + x) * 4;
            output[idx] = output[idx + 1] = output[idx + 2] = value;
            output[idx + 3] = 255;
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
