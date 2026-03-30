# Run Folder Schema v1.0

This document describes the structure of a Z-Stamp pipeline run folder.

## Directory Structure

```
runs/<run_id>/
├── preprocessed.png          # Preprocessed input image
├── mask.png                  # Stage 3 wound mask (may be overwritten by ML)
├── mask_stage3.png           # Backup of Stage 3 mask (if ML differs)
├── depth_rel.tiff            # Relative depth map
├── depth_confidence.tiff     # Depth confidence map
├── calibration.json          # Calibration data (if detected)
├── metadata.json             # Full pipeline metadata
│
└── outputs/                  # Viewer-facing artifacts
    ├── wound_mask_final.png  # CANONICAL: The ONE mask used everywhere
    ├── run_manifest.json     # CANONICAL: Complete run manifest
    ├── depth_stats.json      # CANONICAL: Depth statistics
    ├── mesh.ply              # 3D mesh
    ├── mesh_meta.json        # Mesh metadata
    ├── metrics.json          # Wound metrics
    ├── confidence.png        # Confidence visualization
    │
    ├── masks/                # Individual tissue masks
    │   ├── wound.png
    │   ├── periwound.png
    │   ├── granulation.png
    │   ├── slough.png
    │   ├── eschar.png
    │   └── epithelial.png
    │
    └── ml_debug/             # ML debug artifacts (if --debug-artifacts)
        ├── coverage_metrics.json
        ├── mask_comparison.png
        ├── final_mask_overlay.png
        ├── ml_wound_mask.png
        ├── external_mask.png
        └── final_wound_mask.png
```

## Canonical Files

These files serve as the **single source of truth** for the run:

### wound_mask_final.png

The canonical wound mask used by:
- Mesh generation
- Metrics calculation
- Viewer display

Binary mask (0 or 255), PNG format.

### run_manifest.json

Complete run manifest with all decisions and references:

```json
{
  "version": "1.0",
  "run_id": "ml_test_new",
  "timestamp": "2026-01-23T12:00:00Z",
  "backend": "ml",
  "stages_completed": ["preprocess", "calibrate", "segment", "depth", "tissue", "mesh", "metrics"],

  "canonical_files": {
    "wound_mask": "wound_mask_final.png",
    "depth_stats": "depth_stats.json",
    "mesh": "mesh.ply",
    "metrics": "metrics.json"
  },

  "mask_decision": {
    "final_area_px": 79884,
    "fusion_policy": "ml_only",
    "fusion_metrics": {
      "policy": "ml_only",
      "ml_mask_area_px": 78396,
      "external_mask_area_px": 31259,
      "final_mask_area_px": 79884,
      "coverage_ratio": 2.51,
      "iou": 0.39,
      "reason": "High IoU (0.92) - masks agree, using ML for precision"
    }
  },

  "depth_info": {
    "has_depth": true,
    "calibrated": false,
    "scale_mm_per_px": 1.0
  },

  "config": {
    "mesh_stride": 4,
    "mesh_z_scale": 50.0,
    "mesh_color_mode": "tissue",
    "mesh_smoothing": "bilateral"
  },

  "tissue_summary": {
    "backend": "ml",
    "tissue_types": ["granulation", "slough", "eschar", "epithelial"]
  }
}
```

### depth_stats.json

Depth statistics with calibration info:

```json
{
  "scale_source": "relative_only",
  "scale_mm_per_px": 1.0,
  "calibrated": false,
  "unit": "relative",
  "stats": {
    "min": 0.003,
    "max": 0.982,
    "mean": 0.344,
    "std": 0.215,
    "median": 0.301,
    "nan_count": 0,
    "valid_pixels": 79884
  },
  "confidence_note": "Depth values are relative unless calibration marker detected"
}
```

When calibrated:
```json
{
  "scale_source": "calibration_marker",
  "scale_mm_per_px": 0.25,
  "calibrated": true,
  "unit": "mm",
  "stats": {
    "min": 0.003,
    "max": 0.982,
    "mean": 0.344,
    "min_mm": 0.00075,
    "max_mm": 0.2455,
    "mean_mm": 0.086
  }
}
```

## Smart Mask Fusion Policy

The ML backend uses a smart fusion policy to combine ML predictions with external (Stage 3) masks:

| Condition | Policy | Rationale |
|-----------|--------|-----------|
| IoU >= 0.7 | `ml_only` | Masks agree well, use ML for precision |
| Coverage < 0.5 | `union` | ML under-predicts, preserve external coverage |
| Coverage > 1.5 | `intersection` | ML over-predicts, clamp to external |
| Otherwise | `union` | Conservative default |

Where:
- **Coverage** = ML mask area / External mask area
- **IoU** = Intersection / Union

## How to Run

### Windows PowerShell

```powershell
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Run pipeline with ML backend
python -m zstamp run --image data/synth/sample_0000/preprocessed.png --out runs/ml_test_new --backend ml --debug-artifacts

# Launch viewer
python -m zstamp preview --run runs/ml_test_new
```

### Git Bash

```bash
# Activate virtual environment
source .venv/Scripts/activate

# Run pipeline with ML backend
python -m zstamp run --image data/synth/sample_0000/preprocessed.png --out runs/ml_test_new --backend ml --debug-artifacts

# Launch viewer
python -m zstamp preview --run runs/ml_test_new
```

### Combined (run + auto-open viewer)

```bash
python -m zstamp run --image data/synth/sample_0000/preprocessed.png --out runs/ml_test_new --backend ml --debug-artifacts --preview
```
