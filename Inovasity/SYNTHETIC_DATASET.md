# Synthetic Chronic Wound Dataset Generator

This document describes the synthetic wound dataset generation system in MediMorph AI / Z-Stamp.

## Overview

The synthetic dataset generator creates physically consistent chronic wound samples with:
- **RGB wound photo** (phone-like render)
- **Ground-truth depth map** (same resolution as RGB)
- **Ground-truth tissue label map** (granulation/slough/eschar/epithelial)
- **Wound mask**
- **Metadata JSON** describing all generation parameters

The key innovation is a **3D-first approach**: we generate a heightfield (depth map) first, then derive all other outputs from it. This ensures geometric consistency between the depth, RGB rendering, and tissue distribution.

## Quick Start

### Generate a single sample

```bash
# Generate one synthetic wound with ground truth
zstamp synth-single --out runs/synth_test --preset chronic_complex --seed 42

# View the result
zstamp preview --run runs/synth_test
```

### Generate a dataset (batch)

```bash
# Generate 50 samples for training
zstamp synth-dataset --out data/synth_train --n 50 --preset chronic_complex --seed 12345

# View samples in multi-run mode
zstamp preview --runs-dir data/synth_train
```

### Evaluate against ground truth

```bash
# Run the pipeline on a synthetic sample, then evaluate
zstamp evaluate --run runs/synth_test --verbose
```

## Architecture

The synthetic generation follows this pipeline:

```
1. Heightfield Generation
   └─> depth_raw (float32, 0-1)
   └─> mask (uint8, 0/255)

2. Depth Smoothing (removes ridge artifacts)
   └─> depth_smoothed

3. Tissue Distribution (based on depth + position)
   └─> tissue_labels (uint8, 0-4)
   └─> tissue_masks (per-class binary masks)

4. RGB Rendering (Lambertian shading + tissue colors)
   └─> RGB image (uint8, H×W×3)

5. Mesh Generation (from smoothed depth)
   └─> mesh.ply (tissue-colored)
```

## Presets

### `chronic_complex` (default)
Simulates a complex chronic wound:
- Deep central crater (0.6-0.7 max depth)
- Edge roll (raised wound margins)
- 2 tunneling extensions
- Irregular wound boundary
- Mixed tissue types (eschar center, slough ring, granulation, epithelial edges)

### `chronic_simple`
Simpler chronic wound:
- Moderate depth crater (0.4 max)
- Minimal edge roll
- No tunneling
- More regular boundary

### `pressure_ulcer`
Deep pressure injury:
- Very deep crater (0.8 max)
- Significant undermining (3 tunnels)
- Heavy eschar/slough distribution

### `healing`
Wound in healing phase:
- Shallow depth (0.2 max)
- Prominent edge roll (epithelialization)
- Mostly granulation tissue
- Wide epithelial margins

## Generated Files

Each synthetic sample creates this structure:

```
sample_directory/
├── preprocessed.png      # RGB wound image
├── mask.png              # Binary wound mask
├── depth_rel.tiff        # Smoothed depth map (for meshing)
├── metadata.json         # Generation parameters
├── ground_truth/
│   ├── depth_gt.tiff     # Raw depth (before smoothing)
│   ├── tissue_labels.png # Label indices (0-4)
│   └── depth_visualization.png  # Colorized depth preview
└── outputs/
    ├── mesh.ply          # 3D mesh (tissue-colored)
    ├── mesh_meta.json    # Mesh metadata
    ├── metrics.json      # Computed measurements
    ├── tissue_analysis.json  # Tissue percentages
    └── masks/
        ├── wound.png
        ├── periwound.png
        ├── granulation.png
        ├── slough.png
        ├── eschar.png
        └── epithelial.png
```

## Depth Smoothing

The generator includes edge-preserving smoothing to remove ridge artifacts:

```python
from zstamp.synth import smooth_depth, edge_preserving_smooth

# Available methods
smooth_depth(depth, mask, method="edge_aware", strength=1.0)
smooth_depth(depth, mask, method="bilateral", strength=1.0)
smooth_depth(depth, mask, method="gaussian", strength=1.0)
smooth_depth(depth, mask, method="median", strength=1.0)
```

Recommended: `edge_aware` with `strength=1.0` and `iterations=2`

### Smoothing Parameters

| Parameter | Description | Range |
|-----------|-------------|-------|
| `method` | Smoothing algorithm | "edge_aware", "bilateral", "gaussian", "median" |
| `strength` | Amount of smoothing | 0.5 (light) to 2.0 (heavy) |
| `iterations` | Number of passes | 1-3 recommended |

## Tissue Distribution

Tissue types are assigned based on depth and position following clinical patterns:

| Tissue | Location | Clinical Meaning |
|--------|----------|------------------|
| **Eschar** (3) | Deep central regions | Necrotic tissue |
| **Slough** (2) | Transitional zones | Dead tissue to debride |
| **Granulation** (1) | Mid-depth areas | Healthy healing tissue |
| **Epithelial** (4) | Wound edges | Re-epithelialization |

Label indices in `tissue_labels.png`:
- 0 = Background (outside wound)
- 1 = Granulation (red)
- 2 = Slough (amber)
- 3 = Eschar (dark/black)
- 4 = Epithelial (pink)

## Evaluation

The evaluation module computes:

### Depth Metrics
- **MAE**: Mean Absolute Error
- **RMSE**: Root Mean Square Error
- **Correlation**: Pearson correlation coefficient
- **Scale-Invariant Error**: For depth maps with different scales
- **Relative Error**: Mean relative error

### Tissue Metrics
- **Overall Accuracy**: Pixel-wise classification accuracy
- **Mean IoU**: Average Intersection over Union
- **Per-Class**: IoU, Precision, Recall, F1 for each tissue type

### Example Output

```
============================================================
SYNTHETIC WOUND EVALUATION REPORT
============================================================

Run: runs/synth_test
Ground Truth: runs/synth_test/ground_truth

--- DEPTH EVALUATION ---
  MAE:                    0.0312
  RMSE:                   0.0487
  Correlation:            0.9876
  Scale-Invariant Error:  0.0234
  Relative Error:         0.0856
  Pixels Evaluated:       89432

--- TISSUE EVALUATION ---
  Overall Accuracy:  94.2%
  Mean IoU:          78.6%

  Per-Class Metrics:
  Tissue       IoU     Precision    Recall      F1     Support
  --------------------------------------------------------
  granulation  82.3%      89.4%     91.2%    90.3%      45231
  slough       71.2%      78.9%     88.4%    83.4%      22156
  eschar       85.1%      92.3%     91.5%    91.9%       8943
  epithelial   76.0%      81.2%     90.8%    85.7%      13102
```

## Python API

### Single Sample Generation

```python
from zstamp.synth import ChronicWoundGenerator, SyntheticSampleConfig

config = SyntheticSampleConfig(
    size=(512, 512),
    heightfield_preset="chronic_complex",
    tissue_preset="chronic_complex",
    smoothing_method="edge_aware",
    smoothing_strength=1.0,
    seed=42,
)

generator = ChronicWoundGenerator(config)
sample = generator.generate()

# Access outputs
rgb = sample["rgb"]              # (H, W, 3) uint8
depth = sample["depth_smoothed"] # (H, W) float32
labels = sample["tissue_labels"] # (H, W) uint8
mask = sample["mask"]            # (H, W) uint8

# Save to directory
metadata = generator.save_sample(sample, Path("runs/my_sample"))
```

### Batch Generation

```python
from zstamp.synth import generate_chronic_dataset

results = generate_chronic_dataset(
    output_dir=Path("data/synth_train"),
    n=50,
    preset="chronic_complex",
    size=(512, 512),
    seed=12345,
)

# results is a list of metadata dicts, one per sample
```

### Evaluation

```python
from zstamp.synth import evaluate_run, print_evaluation_report

results = evaluate_run(Path("runs/synth_test"))
print_evaluation_report(results, verbose=True)
```

## Viewer Integration

The Z-Stamp viewer automatically detects synthetic samples and shows a "Ground Truth" section:

1. **GT Depth**: Colorized ground-truth depth map
2. **GT Tissue**: Color-coded tissue labels
3. **Compare**: Side-by-side predicted vs ground truth

To enable: simply generate a sample with ground truth and open in the viewer.

## Reproducibility

All generation is deterministic when a seed is provided:

```bash
# These will produce identical outputs
zstamp synth-single --out run1 --preset chronic_complex --seed 42
zstamp synth-single --out run2 --preset chronic_complex --seed 42
```

The seed controls:
- Wound boundary irregularity
- Depth surface noise
- Tissue boundary noise
- RGB rendering noise

## Use Cases

### Training ML Models
Generate large datasets for training depth estimation or tissue classification models:

```bash
zstamp synth-dataset --out data/train --n 1000 --preset chronic_complex --seed 1
zstamp synth-dataset --out data/val --n 100 --preset chronic_complex --seed 2
```

### Validating Pipeline Accuracy
Run the real pipeline on synthetic data and evaluate:

```bash
# Generate sample
zstamp synth-single --out runs/test_001 --seed 42

# Run evaluation
zstamp evaluate --run runs/test_001 --output eval_results.json
```

### Testing Viewer Features
Generate diverse samples to test visualization:

```bash
for preset in chronic_complex pressure_ulcer healing; do
    zstamp synth-single --out runs/${preset}_demo --preset $preset --seed 1
done
zstamp preview --runs-dir runs
```

## Limitations

- RGB rendering uses simplified Lambertian shading (not photorealistic)
- Tissue distributions are idealized based on clinical patterns
- No simulation of artifacts like glare, blur, or partial occlusion
- Depth values are relative (no absolute mm calibration)

For photorealistic rendering, consider using Blender with the heightfield as displacement.
