# Half/Full Width Conversion Example

## Overview
This example demonstrates text conversion between Half-width (standard ASCII) and Full-width characters using a Web Worker.

## Features
- **Half to Full**: Converts characters like `A` to `Ａ`.
- **Full to Half**: Converts characters like `Ａ` to `A`.
- **Space Handling**: Correctly converts standard space (0x20) to ideographic space (0x3000) and vice-versa.
- **Web Worker**: Performs the conversion off the main thread.

## How to Use
1.  Select the conversion mode.
2.  Enter the text to convert.
3.  Click "Convert".
