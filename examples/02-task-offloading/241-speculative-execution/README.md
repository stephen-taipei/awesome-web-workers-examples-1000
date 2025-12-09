# 241 - Speculative Execution

## Overview
This example demonstrates **Speculative Execution** using Web Workers - a technique where multiple algorithms race to solve the same problem, with the first result winning and others being cancelled. This hedges against worst-case algorithm performance.

## Features
- Race multiple algorithms simultaneously
- Automatic cancellation of slower algorithms
- Real-time race visualization
- Performance comparison analysis
- Three problem types: Sorting, Searching, Pathfinding

## Algorithm Options

### Sorting (Array)
| Algorithm | Best | Average | Worst | Space |
|-----------|------|---------|-------|-------|
| Quick Sort | O(n log n) | O(n log n) | O(n²) | O(log n) |
| Merge Sort | O(n log n) | O(n log n) | O(n log n) | O(n) |
| Heap Sort | O(n log n) | O(n log n) | O(n log n) | O(1) |

### Pattern Search (Text)
| Algorithm | Preprocessing | Search | Best Case |
|-----------|---------------|--------|-----------|
| Naive | None | O(nm) | O(n) |
| KMP | O(m) | O(n) | O(n) |
| Boyer-Moore | O(m + σ) | O(nm) | O(n/m) |

### Pathfinding (Grid)
| Algorithm | Time | Space | Optimal |
|-----------|------|-------|---------|
| Dijkstra | O(V log V) | O(V) | Yes |
| A* | O(E) | O(V) | Yes* |
| BFS | O(V + E) | O(V) | Unweighted |

## Technical Specifications

| Property | Value |
|----------|-------|
| Worker Type | Dedicated Workers (multiple) |
| Communication | postMessage + cancellation |
| Pattern | Speculative Execution |
| Difficulty | Advanced |

## File Structure
```
241-speculative-execution/
├── index.html      # Race visualization UI
├── main.js         # Race orchestration
├── worker.js       # Algorithm implementations
├── style.css       # Racing theme styling
└── README.md       # Documentation
```

## Usage

### Running Locally
```bash
cd examples/02-task-offloading/241-speculative-execution
npx serve .
```

### Operation
1. Select problem type (sort/search/path)
2. Adjust data size
3. Check algorithms to race
4. Click "Run Speculative" to race all selected
5. Or "Run Single Best" to run one algorithm

## Worker Communication

### Start Race (Main → Worker)
```javascript
{
    problemType: 'sort' | 'search' | 'path',
    algorithm: 'quicksort' | 'mergesort' | etc.,
    data: { /* problem-specific data */ }
}
```

### Cancel (Main → Worker)
```javascript
{ action: 'stop' }
```

### Progress (Worker → Main)
```javascript
{
    type: 'progress',
    algorithm: string,
    percent: number
}
```

### Result (Worker → Main)
```javascript
{
    type: 'result',
    algorithm: string,
    executionTime: number,
    // problem-specific results
}
```

## Speculative Execution Strategy

### Traditional Approach
```
Try Algorithm A
If slow → Try Algorithm B
If slow → Try Algorithm C
Total latency: T_A + T_B + T_C (worst case)
```

### Speculative Approach
```
Start all simultaneously:
[Worker 1: Algorithm A] ─┐
[Worker 2: Algorithm B] ─┼─→ First wins!
[Worker 3: Algorithm C] ─┘

Total latency: min(T_A, T_B, T_C)
```

### Trade-offs

**Benefits:**
- Reduced tail latency
- Hedges against worst-case scenarios
- Predictable response times

**Costs:**
- Higher resource usage
- Wasted computation
- More complex coordination

### When to Use
- Algorithm performance is unpredictable
- Latency is more important than throughput
- Resources are available
- Different algorithms excel for different inputs

## Performance Characteristics

### Latency Improvement
```
Speedup = max(T_1, T_2, ..., T_n) / min(T_1, T_2, ..., T_n)
```

### Resource Cost
```
Cost = Σ(T_i) for all started algorithms
```

### Efficiency
```
Efficiency = min(T_i) / Σ(T_i) × 100%
```

## Real-World Applications
- Database query optimization (multiple plans)
- Network requests (multiple servers)
- Search engines (multiple indexes)
- Machine learning (multiple models)

## Browser Support
- Chrome 4+
- Firefox 3.5+
- Safari 4+
- Edge 12+

## Related Examples
- #240 - Task Parallelism
- #242 - Batch Parallelism
- #243 - Pipeline Parallelism
