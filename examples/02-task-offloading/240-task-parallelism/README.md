# 240 - Task Parallelism

## Overview
This example demonstrates **Task Parallelism** using Web Workers, where different, independent tasks execute concurrently across multiple workers. Unlike data parallelism (same operation on different data), task parallelism handles heterogeneous tasks - each worker performs a distinct computation type.

## Features
- Execute 4 different task types in parallel
- Compare parallel vs sequential execution
- Real-time progress tracking for each task
- Visual execution timeline
- Performance metrics (speedup, efficiency)

## Task Types

| Task | Description | Complexity |
|------|-------------|------------|
| **A: Primes** | Sieve of Eratosthenes | O(n log log n) |
| **B: Matrix** | Matrix multiplication | O(n³) |
| **C: Fibonacci** | Big number sequence | O(n) with string ops |
| **D: Text** | Word frequency analysis | O(n) |

## Technical Specifications

| Property | Value |
|----------|-------|
| Worker Type | Dedicated Workers (multiple) |
| Communication | postMessage |
| Pattern | Task Parallelism |
| Difficulty | Intermediate |

## File Structure
```
240-task-parallelism/
├── index.html      # Main page with task configuration
├── main.js         # Orchestrates parallel/sequential execution
├── worker.js       # Handles all task types
├── style.css       # Responsive styling
└── README.md       # Documentation
```

## Usage

### Running Locally
```bash
# Navigate to example directory
cd examples/02-task-offloading/240-task-parallelism

# Serve with any HTTP server
npx serve .
# or
python -m http.server 8000
```

### Operation
1. Configure task parameters (prime limit, matrix size, etc.)
2. Click "Run Tasks in Parallel" to execute all tasks concurrently
3. Click "Run Tasks Sequentially" to execute one after another
4. Compare execution times and speedup

## Worker Communication

### Message Format (Main → Worker)
```javascript
{
    taskType: 'primes' | 'matrix' | 'fibonacci' | 'text',
    params: {
        // Task-specific parameters
        limit: number,    // for primes
        size: number,     // for matrix
        count: number,    // for fibonacci
        length: number    // for text
    }
}
```

### Message Format (Worker → Main)
```javascript
// Progress update
{
    type: 'progress',
    taskType: string,
    percent: number
}

// Result
{
    type: 'result',
    taskType: string,
    result: object,
    executionTime: number
}
```

## Performance Characteristics

### Theoretical Speedup
```
Speedup = T_sequential / T_parallel
        = (T_A + T_B + T_C + T_D) / max(T_A, T_B, T_C, T_D)
```

### Efficiency
```
Efficiency = Speedup / num_workers × 100%
```

With 4 workers and balanced tasks:
- Maximum speedup: 4x
- Maximum efficiency: 100%

### Real-World Factors
- Task imbalance (longest task dominates)
- Worker creation overhead
- Memory bandwidth limitations
- Browser thread scheduling

## Key Concepts

### Task Parallelism vs Data Parallelism
```
Data Parallel:   Same function, different data
                 [Worker1: f(d1)] [Worker2: f(d2)] [Worker3: f(d3)]

Task Parallel:   Different functions, independent execution
                 [Worker1: TaskA()] [Worker2: TaskB()] [Worker3: TaskC()]
```

### Benefits
1. **Resource Utilization**: All cores working on different tasks
2. **Reduced Latency**: Total time ≈ max(task times) not sum
3. **Independent Failure**: One task failure doesn't block others
4. **Natural Fit**: For heterogeneous workloads

### Considerations
- Task dependencies must be managed
- Load balancing is task-dependent
- Communication overhead per worker
- Memory usage scales with workers

## Browser Support
- Chrome 4+
- Firefox 3.5+
- Safari 4+
- Edge 12+

## Related Examples
- #238 - Data Parallelism
- #241 - Speculative Execution
- #242 - Batch Parallelism
- #243 - Pipeline Parallelism
