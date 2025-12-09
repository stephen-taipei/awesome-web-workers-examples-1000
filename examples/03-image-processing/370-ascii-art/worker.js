self.onmessage = function(e) {
    const { imageData, params } = e.data;
    const startTime = performance.now();

    const { width, height, data } = imageData;
    const { charset, invert } = params;

    // Char sets ordered from dark to light (or light to dark depending on convention)
    // Standard convention: '@' is dark (lots of ink), '.' is light.
    // So if background is black (terminal), '@' is bright?
    // In our CSS, background is black, color is white.
    // So '@' (more pixels) appears brighter (more white pixels).
    // So Density -> Brightness.

    // Density maps: Low density (space) -> High density (@)
    const charSets = {
        standard:  ' .:-=+*#%@', // 10 levels
        simple:    ' .+#',
        blocks:    ' ░▒▓█',
        binary:    ' 01',
        matrix:    ' ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ123457890:.' // Pseudo matrix
    };

    let chars = charSets[charset] || charSets.standard;
    if (invert) {
        chars = chars.split('').reverse().join('');
    }

    let output = '';

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx+1];
            const b = data[idx+2];
            // Alpha is ignored

            // Calc brightness
            const avg = (r + g + b) / 3;
            // Or luminance: 0.299r + 0.587g + 0.114b

            // Map 0-255 to 0-(len-1)
            const charIdx = Math.floor((avg / 255) * (chars.length - 1));

            output += chars[charIdx];
        }
        output += '\n';
    }

    const endTime = performance.now();
    self.postMessage({
        type: 'result',
        text: output,
        time: endTime - startTime
    });
};
