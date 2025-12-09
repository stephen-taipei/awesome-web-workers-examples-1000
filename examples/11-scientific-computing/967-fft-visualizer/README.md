# Example 967: FFT Signal Analyzer

This example performs a **Fast Fourier Transform (FFT)** on a synthetic signal inside a Web Worker.

## Description

The Fourier Transform decomposes a function of time (a signal) into its constituent frequencies. This is fundamental in signal processing, audio analysis, and image compression.
- **Worker Thread**: 
    1. Generates a time-domain signal composed of two sine waves with added random noise.
    2. Executes the **Cooley-Tukey FFT** algorithm (Radix-2) to transform the signal into the frequency domain.
    3. Calculates the magnitude spectrum.
- **Main Thread**: Displays the original waveform and the resulting frequency spectrum bar chart.

## Features

- **Signal Generation**: Mix frequencies and noise dynamically.
- **Custom FFT Implementation**: A raw implementation of the iterative Cooley-Tukey algorithm without external libraries.
- **Visualization**: See how hidden frequencies in a noisy wave appear clearly as peaks in the spectrum.

## Usage

1. Open `index.html`.
2. Adjust the sliders for "Freq 1" and "Freq 2".
3. Increase "Noise Level" to hide the clean waves.
4. Click "Generate & Analyze".
5. The bottom chart will show peaks corresponding exactly to the selected frequencies, demonstrating the power of FFT to extract signal from noise.
