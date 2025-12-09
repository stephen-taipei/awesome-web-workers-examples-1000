# Function Call Overhead Benchmark (Web Worker Example #507)

This example measures the relative cost of different ways to invoke functions in JavaScript.

## Features

-   **Tests**: Direct function calls, Object methods, Closures, `Function.prototype.call`, and `Function.prototype.apply`.
-   **Configurable**: Number of iterations.

## Insights

-   **Direct Calls** and **Object Methods** are usually highly optimized by the JIT compiler (inline caching).
-   **Closures** are also very fast but might involve context lookup.
-   **`call`** and **`apply`** historically had significant overhead, though modern engines have optimized them heavily. `apply` usually remains slower than `call` if arguments need to be packed/unpacked from arrays.
