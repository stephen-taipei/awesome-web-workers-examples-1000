# Text Generation (Web Worker Example #496)

Generates random text using a Markov Chain model trained on user input.

## How it works

1.  **Training**: The worker tokenizes the input text into words. It then builds a frequency map (Markov Chain) where the key is a sequence of N words (the "state") and the value is a list of possible next words.
2.  **Generation**:
    *   Starts with a random N-gram from the text.
    *   Looks up the current state in the chain.
    *   Randomly selects the next word from the list of possibilities.
    *   Updates the state by sliding the window (removing first word, adding new word).
    *   Repeats until the desired length is reached.

## Usage

1.  Paste a large corpus of text (e.g., a book chapter).
2.  Select the Markov Order (1 = random words, 2 = plausible pairs, 3 = coherent phrases).
3.  Click "Generate Text".
