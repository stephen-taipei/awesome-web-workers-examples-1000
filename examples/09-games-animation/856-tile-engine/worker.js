/**
 * Tile Engine - Web Worker
 * Generates procedural tile map
 */
self.onmessage = function(e) {
    if (e.data.type === 'GENERATE') {
        const { width, height } = e.data.payload;
        const tiles = new Uint8Array(width * height);

        // Simple noise-based terrain
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) + Math.sin(x * 0.05 + y * 0.05);
                let tile;
                if (noise < -0.5) tile = 0; // Water
                else if (noise < 0) tile = 1; // Grass
                else if (noise < 0.3) tile = 2; // Dirt
                else if (noise < 0.6) tile = 3; // Stone
                else tile = 4; // Sand

                // Random features
                if (Math.random() > 0.98) tile = 5; // Rock

                tiles[y * width + x] = tile;
            }
        }

        self.postMessage({ type: 'MAP', payload: { tiles: Array.from(tiles) } });
    }
};
