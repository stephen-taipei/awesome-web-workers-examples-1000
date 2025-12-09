# 242 - Batch Parallelism

## Overview
This example demonstrates **Batch Parallelism** using Web Workers - a technique where multiple small tasks are grouped into batches for efficient parallel processing. Batching reduces scheduling overhead, communication costs, and improves throughput.

## Features
- Batch vs Individual processing comparison
- Configurable batch sizes and worker counts
- Real-time throughput visualization
- Multiple task types (image, data, math)
- Performance metrics and speedup calculation

## Task Types

| Task | Description | Simulation |
|------|-------------|------------|
| **Image Processing** | Blur filter operations | Convolution-like computations |
| **Data Transformation** | JSON-like operations | Serialization/hashing simulation |
| **Math Calculations** | Complex math ops | Trigonometric/exponential functions |

## Technical Specifications

| Property | Value |
|----------|-------|
| Worker Type | Dedicated Worker Pool |
| Communication | postMessage (batched) |
| Pattern | Batch Parallelism |
| Difficulty | Intermediate |

## File Structure
```
242-batch-parallelism/
├── index.html      # Configuration and visualization UI
├── main.js         # Batch orchestration and work distribution
├── worker.js       # Batch and individual processing
├── style.css       # Dashboard-style styling
└── README.md       # Documentation
```

## Usage

### Running Locally
```bash
cd examples/02-task-offloading/242-batch-parallelism
npx serve .
```

### Operation
1. Configure total items, workers, and batch size
2. Click "Run Batch Processing" for batched execution
3. Click "Run Individual Processing" for comparison
4. Compare throughput and overhead metrics

## Worker Communication

### Batch Mode (Main → Worker)
```javascript
{
    mode: 'batch',
    taskType: 'imageProcess' | 'dataTransform' | 'calculation',
    items: Array,
    complexity: 'light' | 'medium' | 'heavy',
    batchId: number,
    workerId: number
}
```

### Individual Mode (Main → Worker)
```javascript
{
    mode: 'individual',
    taskType: string,
    items: Array,
    complexity: string,
    workerId: number
}
```

### Response (Worker → Main)
```javascript
// Batch complete
{
    type: 'batchComplete',
    workerId: number,
    batchId: number,
    itemCount: number,
    processingTime: number
}

// Individual item complete
{
    type: 'itemComplete',
    workerId: number,
    itemIndex: number,
    result: any,
    itemTime: number
}
```

## Batch Processing Theory

### Overhead Components
```
Per-message overhead:
- postMessage serialization
- Message queue handling
- Context switching
- Worker scheduling

Individual: N items → N messages → N × overhead
Batch: N items → (N/B) batches → (N/B) × overhead
```

### Optimal Batch Size
```
Too small (B=1): Maximum overhead, like individual
Too large (B=N): Poor load balancing, one worker does all
Optimal: B ≈ N / (K × 2-4) where K = worker count
```

### Trade-offs

| Factor | Small Batches | Large Batches |
|--------|---------------|---------------|
| Overhead | Higher | Lower |
| Load Balance | Better | Worse |
| Responsiveness | Better | Worse |
| Memory | Lower | Higher |

## Performance Metrics

### Throughput
```
Throughput = Items_processed / Time_elapsed
Unit: items/second
```

### Overhead Estimation
```
Overhead% = (Total_time - Processing_time) / Total_time × 100
```

### Speedup
```
Speedup = Individual_time / Batch_time
```

## Configuration Guidelines

| Scenario | Batch Size | Workers |
|----------|------------|---------|
| Light tasks, many items | Large (100+) | CPU cores |
| Heavy tasks, few items | Small (10-20) | CPU cores |
| Mixed workload | Medium (50) | CPU cores - 1 |
| Memory constrained | Small | Fewer workers |

## Real-World Applications
- Image processing pipelines
- Data ETL operations
- Bulk API requests
- Log processing
- Machine learning inference

## Browser Support
- Chrome 4+
- Firefox 3.5+
- Safari 4+
- Edge 12+

## Related Examples
- #240 - Task Parallelism
- #241 - Speculative Execution
- #243 - Pipeline Parallelism
