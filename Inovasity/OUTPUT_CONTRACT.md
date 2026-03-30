# Z-Stamp Pipeline Output Contract

Each stage writes artifacts to a run directory following this contract.

## Directory Structure

```
runs/<run_id>/
  ├── metadata.json              # Run metadata (includes all stage results)
  ├── preprocessed.png           # Stage 1: preprocessed image (internal)
  ├── calibration.json           # Stage 2: calibration data (internal)
  ├── mask.png                   # Stage 3: binary segmentation mask (internal)
  ├── depth_rel.tiff             # Stage 4: relative depth map (internal)
  ├── depth_confidence.tiff      # Stage 4: confidence map (internal)
  └── outputs/                   # Viewer-facing artifacts
      ├── mesh.ply               # Stage 5: 3D mesh with vertex colors
      ├── mesh_meta.json         # Stage 5: mesh metadata
      ├── tissue_analysis.json   # Stage 6: tissue classification
      ├── confidence.png         # Stage 6: tissue confidence heatmap
      ├── masks/                 # Stage 6: individual tissue masks
      │   ├── wound.png          # Binary wound mask
      │   ├── periwound.png      # Binary periwound mask
      │   ├── granulation.png    # Binary granulation mask
      │   ├── slough.png         # Binary slough mask
      │   ├── eschar.png         # Binary eschar mask
      │   └── epithelial.png     # Binary epithelial mask
      ├── metrics.json           # Stage 7: computed wound metrics
      └── report.html            # Stage 8: final report (future)
```

**Note:** Internal processing artifacts (preprocessed image, calibration, masks, depth TIFFs) are stored in the run root directory. Viewer-facing artifacts (mesh, tissue analysis, metrics) are stored in the `outputs/` subdirectory per the viewer contract.

## Artifact Specifications

### metadata.json
```json
{
  "run_id": "string",
  "timestamp": "ISO8601",
  "backend": "mvp|model",
  "stages_completed": ["preprocess", "calibrate", ...],
  "config": {}
}
```

### calibration.json
```json
{
  "scale_mm_per_px": 0.1,
  "depth_scale_source": "relative_only|calibration_marker|model_trained",
  "confidence": 0.0-1.0
}
```

### depth_rel.tiff
- Format: TIFF, float32
- Values: Relative depth (arbitrary units)
- Background: 0.0

### depth_confidence.tiff
- Format: TIFF, float32
- Values: 0.0 (no confidence) to 1.0 (high confidence)

### mask.png
- Format: PNG, uint8
- Values: 0 (background), 255 (foreground)

### metrics.json (Stage 7, in outputs/)
```json
{
  "area_px": 7841,
  "area_mm2": 123.45,
  "perimeter_px": 350,
  "perimeter_mm": 67.89,
  "volume_relative": 234.56,
  "max_depth_relative": 5.67,
  "mean_depth_relative": 2.34,
  "scale_mm_per_px": 0.1,
  "notes": "Depth and volume are relative-only in MVP (no absolute scale)"
}
```

### mesh.ply (Stage 5)
- Format: ASCII PLY (Polygon File Format)
- Contains: vertices with positions (x, y, z) and colors (r, g, b)
- Faces: Triangles defined by vertex indices
- Coordinate system:
  - X: horizontal (image column)
  - Y: vertical (flipped, negative = down)
  - Z: depth (scaled relative depth)

### mesh_meta.json (Stage 5, optional)
```json
{
  "mesh_file": "mesh.ply",
  "mesh_meta_file": "mesh_meta.json",
  "stride": 4,
  "z_scale": 50.0,
  "vertex_count": 1234,
  "face_count": 2345,
  "notes": "Depth is relative-only in MVP"
}
```

### tissue_analysis.json (Stage 6)
```json
{
  "backend": "stub|sam",
  "tissue_types": {
    "granulation": {
      "percentage": 30.5,
      "area_px": 1234
    },
    "slough": {
      "percentage": 20.0,
      "area_px": 800
    },
    "eschar": {
      "percentage": 10.0,
      "area_px": 400
    },
    "epithelial": {
      "percentage": 5.0,
      "area_px": 200
    }
  },
  "confidence_stats": {
    "mean": 0.85,
    "std": 0.12,
    "min": 0.45,
    "max": 1.0
  },
  "masks_available": [
    "wound.png",
    "periwound.png",
    "granulation.png",
    "slough.png",
    "eschar.png",
    "epithelial.png"
  ]
}
```

### confidence.png (Stage 6)
- Format: PNG, uint8
- Values: Confidence heatmap (0-255, normalized from 0.0-1.0)
- Shows per-pixel confidence for tissue classification

### masks/*.png (Stage 6)
- Format: PNG, uint8
- Values: 0 (background), 255 (foreground)
- Individual binary masks for each tissue type and region
