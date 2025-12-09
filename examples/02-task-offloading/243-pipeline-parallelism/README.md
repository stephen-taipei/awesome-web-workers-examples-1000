# 243 - Pipeline Parallelism

## Overview
This example demonstrates **Pipeline Parallelism** using Web Workers - a technique where work is divided into sequential stages, with each stage running in parallel on different data items. Like an assembly line, this achieves continuous throughput through overlapping execution.

## Features
- Multi-stage pipeline visualization
- Pipeline vs Sequential comparison
- Real-time throughput monitoring
- Stage-by-stage timing analysis
- Three pipeline types (image, ETL, text)

## Pipeline Types

### Image Processing Pipeline
| Stage | Operation | Description |
|-------|-----------|-------------|
| **Load** | Decode image | Load and decode image data |
| **Resize** | Scale dimensions | Resize to target dimensions |
| **Filter** | Apply effects | Apply blur, sharpen, etc. |
| **Encode** | Compress output | Encode to JPEG/PNG |

### Data ETL Pipeline
| Stage | Operation | Description |
|-------|-----------|-------------|
| **Extract** | Read source | Extract from data source |
| **Validate** | Check records | Validate against rules |
| **Transform** | Convert format | Transform data structure |
| **Load** | Write target | Load to destination |

### Text Processing Pipeline
| Stage | Operation | Description |
|-------|-----------|-------------|
| **Tokenize** | Split text | Break into tokens |
| **Normalize** | Clean tokens | Lowercase, remove punctuation |
| **Analyze** | Extract info | Sentiment, entities |
| **Index** | Build index | Create searchable index |

## Technical Specifications

| Property | Value |
|----------|-------|
| Worker Type | Dedicated Workers (per stage) |
| Communication | postMessage (stage handoff) |
| Pattern | Pipeline Parallelism |
| Difficulty | Advanced |

## File Structure
```
243-pipeline-parallelism/
├── index.html      # Pipeline visualization UI
├── main.js         # Pipeline orchestration
├── worker.js       # Stage processing logic
├── style.css       # Pipeline-themed styling
└── README.md       # Documentation
```

## Usage

### Running Locally
```bash
cd examples/02-task-offloading/243-pipeline-parallelism
npx serve .
```

### Operation
1. Select pipeline type
2. Configure item count and stage delay
3. Click "Run Pipeline" for pipelined execution
4. Click "Run Sequential" for comparison
5. Compare throughput and latency

## Worker Communication

### Stage Processing (Main → Worker)
```javascript
{
    stage: 'load' | 'resize' | etc.,
    stageIndex: number,
    item: { id: number, ... },
    pipelineType: string,
    stageDelay: number
}
```

### Stage Complete (Worker → Main)
```javascript
{
    type: 'stageComplete',
    stageIndex: number,
    stage: string,
    itemId: number,
    result: object,
    processingTime: number
}
```

## Pipeline Theory

### Sequential vs Pipeline Processing
```
Sequential (N items, S stages, T per stage):
Time = N × S × T
Item 1: [S1][S2][S3][S4]
Item 2:                 [S1][S2][S3][S4]
Item 3:                                 [S1][S2][S3][S4]

Pipeline (overlapping):
Time = (N + S - 1) × T
Item 1: [S1][S2][S3][S4]
Item 2:     [S1][S2][S3][S4]
Item 3:         [S1][S2][S3][S4]
```

### Performance Metrics

**Latency** (time for one item):
```
Latency = S × T_stage
```

**Throughput** (items per second):
```
Sequential: 1 / (S × T_stage)
Pipeline (steady): 1 / T_stage
```

**Speedup**:
```
Speedup = (N × S × T) / ((N + S - 1) × T)
        ≈ S when N >> S
```

### Pipeline Characteristics

| Property | Value |
|----------|-------|
| Fill time | (S-1) × T_stage |
| Drain time | (S-1) × T_stage |
| Steady state | After S-1 items |
| Max throughput | 1 item per T_stage |

## Trade-offs

### Benefits
- High throughput for many items
- Efficient resource utilization
- Natural for staged workflows
- Continuous output stream

### Costs
- Higher latency for single item
- Pipeline fill/drain overhead
- Complexity in error handling
- Stage balancing challenges

## Optimal Usage

### Best for:
- Large number of items (N >> S)
- Uniform stage processing times
- Independent items
- Stream processing

### Avoid when:
- Few items (overhead dominates)
- Highly variable stage times
- Strong item dependencies
- Low latency required

## Stage Balancing

For optimal throughput, balance stage times:
```
Throughput limited by slowest stage

Unbalanced: [100ms][200ms][100ms] → 200ms/item
Balanced:   [133ms][133ms][133ms] → 133ms/item
```

## Real-World Applications
- Video encoding (decode → process → encode)
- Data pipelines (ETL workflows)
- Compiler phases (parse → analyze → generate)
- Image processing (filters, transformations)
- Network packet processing

## Browser Support
- Chrome 4+
- Firefox 3.5+
- Safari 4+
- Edge 12+

## Related Examples
- #240 - Task Parallelism
- #241 - Speculative Execution
- #242 - Batch Parallelism
