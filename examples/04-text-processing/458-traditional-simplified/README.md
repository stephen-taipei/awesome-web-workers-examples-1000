# Traditional/Simplified Conversion Example

## Overview
This example demonstrates text conversion between Traditional Chinese (Traditional) and Simplified Chinese (Simplified) using a Web Worker. It relies on a character mapping table.

## Features
- **S2T / T2S**: Supports both directions of conversion.
- **Web Worker**: Performs the character lookup and replacement off the main thread.

## Note
This example includes a **small demonstration dictionary**. It does not cover the full set of Chinese characters (which would require a large data file). It includes common characters and specific examples like "憂鬱的臺灣烏龜" (The Melancholy Taiwan Turtle).

## How to Use
1.  Select the conversion mode (Simplified to Traditional or Traditional to Simplified).
2.  Enter the text to convert.
3.  Click "Convert".
