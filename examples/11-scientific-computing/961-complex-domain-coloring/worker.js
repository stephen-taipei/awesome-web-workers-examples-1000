// Complex Arithmetic Helper
class Complex {
    constructor(re, im) {
        this.re = re;
        this.im = im;
    }
    
    static add(a, b) { return new Complex(a.re + b.re, a.im + b.im); }
    static sub(a, b) { return new Complex(a.re - b.re, a.im - b.im); }
    
    static mul(a, b) {
        return new Complex(
            a.re * b.re - a.im * b.im,
            a.re * b.im + a.im * b.re
        );
    }
    
    static div(a, b) {
        const denom = b.re * b.re + b.im * b.im;
        return new Complex(
            (a.re * b.re + a.im * b.im) / denom,
            (a.im * b.re - a.re * b.im) / denom
        );
    }
    
    static sin(z) {
        // sin(x+iy) = sin(x)cosh(y) + i cos(x)sinh(y)
        return new Complex(
            Math.sin(z.re) * Math.cosh(z.im),
            Math.cos(z.re) * Math.sinh(z.im)
        );
    }
    
    static exp(z) {
        // exp(x+iy) = exp(x)(cos y + i sin y)
        const ex = Math.exp(z.re);
        return new Complex(
            ex * Math.cos(z.im),
            ex * Math.sin(z.im)
        );
    }
    
    static inv(z) {
        const denom = z.re * z.re + z.im * z.im;
        return new Complex(z.re / denom, -z.im / denom);
    }
    
    // For z^n (integer)
    pow(n) {
        let r = Math.sqrt(this.re*this.re + this.im*this.im);
        let theta = Math.atan2(this.im, this.re);
        let rn = Math.pow(r, n);
        return new Complex(
            rn * Math.cos(n * theta),
            rn * Math.sin(n * theta)
        );
    }
}

self.onmessage = function(e) {
    const { command, funcType, zoom, width, height } = e.data;

    if (command === 'render') {
        try {
            const start = performance.now();
            const buffer = new ArrayBuffer(width * height * 4);
            const data = new Uint8ClampedArray(buffer);
            
            // Domain range: -4 to 4 (base) / zoom
            const range = 4.0 / zoom;
            const xMin = -range;
            const xMax = range;
            const yMin = -range;
            const yMax = range;
            
            for (let y = 0; y < height; y++) {
                // Map y to Im axis (Inverted: y=0 is top -> Max Im)
                const im = yMax - (y / height) * (yMax - yMin);
                
                for (let x = 0; x < width; x++) {
                    const re = xMin + (x / width) * (xMax - xMin);
                    
                    const z = new Complex(re, im);
                    const w = evalFunc(z, funcType);
                    
                    // Color Mapping
                    // Hue = Argument (Phase)
                    // Brightness/Sat = Magnitude
                    
                    const r = Math.sqrt(w.re*w.re + w.im*w.im);
                    let arg = Math.atan2(w.im, w.re); // -PI to PI
                    
                    // Map arg to 0-360
                    let hue = (arg * 180 / Math.PI);
                    if (hue < 0) hue += 360;
                    
                    // Lightness based on magnitude (logarithmic cyclic stripes for contour effect)
                    // l = 0.5 + 0.2 * sin(10 * log(r))
                    // Or continuous shading
                    
                    // Simple continuous HSV -> RGB
                    // Saturation 100%
                    // Value based on magnitude to show poles/zeros? 
                    // Classic: Value = 1 - 0.5^(r) or similar.
                    // Let's use cyclic lightness to show magnitude contours
                    const val = 0.6 + 0.4 * Math.sin(5 * Math.log(r + 1e-9));
                    
                    const rgb = hsvToRgb(hue, 1.0, val);
                    
                    const idx = (y * width + x) * 4;
                    data[idx] = rgb[0];
                    data[idx+1] = rgb[1];
                    data[idx+2] = rgb[2];
                    data[idx+3] = 255;
                }
            }

            const end = performance.now();

            self.postMessage({
                type: 'result',
                data: {
                    buffer, // Transferable
                    width,
                    height,
                    duration: (end - start).toFixed(2)
                }
            }, [buffer]);

        } catch (error) {
            self.postMessage({ type: 'error', data: error.message });
        }
    }
};

function evalFunc(z, type) {
    // Helper constants
    const one = new Complex(1, 0);
    const two = new Complex(2, 0);
    
    switch (type) {
        case 'z': return z;
        case 'z2': return z.pow(2);
        case 'poly': return Complex.sub(z.pow(3), one); // z^3 - 1
        case 'sin': return Complex.sin(z);
        case 'exp': return Complex.exp(Complex.inv(z)); // Essential singularity at 0
        case 'rat': 
            // (z^2-1)(z-2-i)^2 / (z^2+2+2i)
            const num1 = Complex.sub(z.pow(2), one);
            const shift = new Complex(2, 1);
            const term2 = Complex.sub(z, shift);
            const num2 = term2.pow(2);
            
            const num = Complex.mul(num1, num2);
            
            const denTerm = new Complex(2, 2);
            const den = Complex.add(z.pow(2), denTerm);
            
            return Complex.div(num, den);
        default: return z;
    }
}

function hsvToRgb(h, s, v) {
    let r, g, b;
    let i = Math.floor(h / 60);
    let f = h / 60 - i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
