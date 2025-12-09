# Example 992: Autoencoder Neural Network

This example builds and trains a simple Autoencoder Neural Network from scratch inside a Web Worker.

## Description

An Autoencoder is a type of neural network used to learn efficient data codings in an unsupervised manner. It learns to compress the input into a lower-dimensional latent space (Bottleneck) and then reconstruct the output from this representation.
- **Worker Thread**: Implements a mini deep learning framework (Forward/Backward propagation, Gradient Descent) to train the network to reconstruct a sine wave pattern.
- **Main Thread**: Visualizes the original input curve vs. the network's reconstructed output in real-time as training progresses.

## Features

- **From Scratch Implementation**: No external ML libraries; pure JavaScript matrix math.
- **Real-time Training Visualization**: Watch the network "learn" to fit the curve.
- **Configurable Architecture**: Change input dimension and bottleneck size to see how compression affects quality.
- **Offloaded Training**: High-frequency gradient updates run in the background.

## Usage

1. Open `index.html`.
2. Select "Input Dimension" (resolution of the wave).
3. Select "Bottleneck Dimension" (how much to compress the data). A value of 2 forces the network to learn a very compact representation.
4. Click "Start Training".
5. Observe the purple line (Reconstructed) slowly aligning with the grey line (Original) as the Loss decreases.
