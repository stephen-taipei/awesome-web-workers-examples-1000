# Phone Formatting (Web Worker Example #479)

Standardizes phone numbers into common formats.

## How it works

1.  **Cleaning**: Removes all non-numeric characters from input lines.
2.  **Parsing**: Detects 10-digit numbers (North American Numbering Plan).
3.  **Formatting**: Applies templates:
    *   **US**: `(XXX) XXX-XXXX`
    *   **E.164**: `+1XXXXXXXXXX`
    *   **Dot**: `XXX.XXX.XXXX`
    *   **International**: `+1 XXX XXX XXXX`

## Usage

1.  Enter a list of phone numbers (mixed formats allowed).
2.  Select desired output format.
3.  Click "Format Numbers".
