# SSML Generation (Web Worker Example #499)

Converts plain text into Speech Synthesis Markup Language (SSML).

## How it works

1.  **Parsing**: Splits text into paragraphs and sentences.
2.  **Tagging**: Wraps content in `<speak>`, `<p>`, and `<s>` tags.
3.  **Prosody**: Applies global `rate` (speed) and `pitch` attributes using the `<prosody>` tag.
4.  **Escaping**: Ensures special characters (<, >, &, ", ') are XML-safe.

## Usage

1.  Enter text to be spoken.
2.  Select desired speed and pitch.
3.  Click "Generate SSML".
