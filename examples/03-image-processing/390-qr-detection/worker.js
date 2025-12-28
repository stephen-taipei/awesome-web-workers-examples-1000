self.onmessage = function(e) {
    const { imageData } = e.data;
    const { width, height, data } = imageData;

    // Convert to binary (black/white)
    const binary = new Uint8Array(width * height);
    const threshold = 128;

    for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        binary[i / 4] = gray < threshold ? 1 : 0;
    }

    // Find finder patterns (1:1:3:1:1 ratio pattern)
    const patterns = [];

    // Scan horizontally
    for (let y = 0; y < height; y++) {
        const runs = [];
        let currentColor = binary[y * width];
        let runLength = 1;

        for (let x = 1; x < width; x++) {
            const idx = y * width + x;
            if (binary[idx] === currentColor) {
                runLength++;
            } else {
                runs.push({ color: currentColor, length: runLength, start: x - runLength });
                currentColor = binary[idx];
                runLength = 1;
            }
        }
        runs.push({ color: currentColor, length: runLength, start: width - runLength });

        // Check for 1:1:3:1:1 pattern
        for (let i = 0; i <= runs.length - 5; i++) {
            if (runs[i].color === 1 && // black
                runs[i + 1].color === 0 && // white
                runs[i + 2].color === 1 && // black (center)
                runs[i + 3].color === 0 && // white
                runs[i + 4].color === 1) { // black

                const unit = (runs[i].length + runs[i + 1].length + runs[i + 2].length +
                             runs[i + 3].length + runs[i + 4].length) / 7;

                const ratio1 = runs[i].length / unit;
                const ratio2 = runs[i + 1].length / unit;
                const ratio3 = runs[i + 2].length / unit;
                const ratio4 = runs[i + 3].length / unit;
                const ratio5 = runs[i + 4].length / unit;

                // Check if ratios match 1:1:3:1:1
                if (Math.abs(ratio1 - 1) < 0.5 &&
                    Math.abs(ratio2 - 1) < 0.5 &&
                    Math.abs(ratio3 - 3) < 1 &&
                    Math.abs(ratio4 - 1) < 0.5 &&
                    Math.abs(ratio5 - 1) < 0.5) {

                    const centerX = runs[i + 2].start + runs[i + 2].length / 2;
                    const size = unit * 7;

                    // Verify vertically
                    if (verifyVertical(binary, width, height, centerX, y, size)) {
                        patterns.push({
                            x: centerX,
                            y: y,
                            size: size
                        });
                    }
                }
            }
        }
    }

    // Remove duplicate patterns (nearby detections)
    const uniquePatterns = [];
    for (const p of patterns) {
        let isDuplicate = false;
        for (const u of uniquePatterns) {
            const dist = Math.sqrt(Math.pow(p.x - u.x, 2) + Math.pow(p.y - u.y, 2));
            if (dist < p.size) {
                isDuplicate = true;
                break;
            }
        }
        if (!isDuplicate) {
            uniquePatterns.push(p);
        }
    }

    // Create output image
    const output = new Uint8ClampedArray(data);

    // Draw detected patterns
    for (const p of uniquePatterns) {
        const halfSize = Math.floor(p.size / 2);
        const x0 = Math.max(0, Math.floor(p.x - halfSize));
        const y0 = Math.max(0, Math.floor(p.y - halfSize));
        const x1 = Math.min(width - 1, Math.floor(p.x + halfSize));
        const y1 = Math.min(height - 1, Math.floor(p.y + halfSize));

        // Draw rectangle
        for (let x = x0; x <= x1; x++) {
            setPixel(output, width, x, y0, 0, 255, 0);
            setPixel(output, width, x, y1, 0, 255, 0);
        }
        for (let y = y0; y <= y1; y++) {
            setPixel(output, width, x0, y, 0, 255, 0);
            setPixel(output, width, x1, y, 0, 255, 0);
        }

        // Draw center cross
        for (let d = -3; d <= 3; d++) {
            setPixel(output, width, Math.floor(p.x) + d, Math.floor(p.y), 255, 0, 0);
            setPixel(output, width, Math.floor(p.x), Math.floor(p.y) + d, 255, 0, 0);
        }
    }

    self.postMessage({
        imageData: new ImageData(output, width, height),
        patterns: uniquePatterns.length
    });
};

function setPixel(data, width, x, y, r, g, b) {
    const idx = (y * width + x) * 4;
    data[idx] = r;
    data[idx + 1] = g;
    data[idx + 2] = b;
}

function verifyVertical(binary, width, height, centerX, centerY, expectedSize) {
    const x = Math.floor(centerX);
    if (x < 0 || x >= width) return false;

    // Count vertical runs
    const runs = [];
    let startY = Math.max(0, Math.floor(centerY - expectedSize));
    let endY = Math.min(height - 1, Math.floor(centerY + expectedSize));

    let currentColor = binary[startY * width + x];
    let runLength = 1;

    for (let y = startY + 1; y <= endY; y++) {
        const idx = y * width + x;
        if (binary[idx] === currentColor) {
            runLength++;
        } else {
            runs.push({ color: currentColor, length: runLength });
            currentColor = binary[idx];
            runLength = 1;
        }
    }
    runs.push({ color: currentColor, length: runLength });

    // Look for 1:1:3:1:1 pattern in vertical direction
    for (let i = 0; i <= runs.length - 5; i++) {
        if (runs[i].color === 1 &&
            runs[i + 1].color === 0 &&
            runs[i + 2].color === 1 &&
            runs[i + 3].color === 0 &&
            runs[i + 4].color === 1) {

            const unit = (runs[i].length + runs[i + 1].length + runs[i + 2].length +
                         runs[i + 3].length + runs[i + 4].length) / 7;

            const ratio3 = runs[i + 2].length / unit;

            if (Math.abs(ratio3 - 3) < 1.5) {
                return true;
            }
        }
    }

    return false;
}
