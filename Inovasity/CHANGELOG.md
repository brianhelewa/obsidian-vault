# Changelog

All notable changes to MediMorphAI are documented in this file.

## [2.8.0] - 2026-02-09

### Added
- **Enhanced Morphological Cleanup** for synthetic segmentation
  - Aggressive closing (5 iterations) to fill small gaps
  - Largest connected component extraction to remove noise specs
  - Small hole filling (up to 500px) for cleaner masks

### Fixed
- **Mesh Holes**: Black holes in 3D model now filled with improved morphological cleanup
- **Report Generation**: Fixed multi-run mode to generate correct report for selected run
- **Red Specs on Brown Skin**: Largest component extraction removes isolated artifacts
- **Preview Server**: Added missing `__main__` entry point for CLI execution

### Changed
- **Slough Detection**: Widened HSV thresholds (H: 15-70, S: 30-220, V: 70-240)
- **Synthetic Segmentation**: Widened HSV thresholds (H: 0-15/165-180, S: 80-255)
- **Export Functions**: Now use `currentRunId` instead of potentially stale `runInfo`

### Improved
- Ridge scores improved from 0.19-0.57 to 0.10-0.12 (much smoother meshes)
- Tissue distribution now includes slough detection
- Multi-run viewer correctly generates reports for selected run

## [2.7.0] - 2026-02-09

### Added
- **Pipeline Analytics Module** (`src/zstamp/analytics/`)
  - Ground truth comparison utilities for validation
  - Quality metrics tracking across runs
  - Automated accuracy computation and recommendations

- **Synthetic Mode Enhancements**
  - Stronger smoothing defaults for 3D printed models (strength=2.0, iterations=3)
  - Dedicated volume correction factor for synthetic models
  - Improved segmentation with strict HSV thresholds for synthetic wounds

- **Ground Truth Support**
  - Load and display ground truth volumes in viewer
  - Compare estimated vs known measurements
  - Display accuracy metrics in viewer UI

### Fixed
- **Generate Report 404 Error**: Report endpoint now supports multi-run mode with run ID parameter
- **Synthetic Model Volume Overestimation**: Added separate correction factor (0.25) for synthetic models
- **3D Mesh Noise**: Enhanced bilateral smoothing for smoother mesh surfaces

### Changed
- Pipeline now auto-detects synthetic mode and applies enhanced smoothing
- Report generation includes run ID for multi-run viewer compatibility
- Export functions pass current run context

## [2.6.0] - 2026-01-23

### Added
- Synthetic mode (`--synthetic` flag) for 3D printed wound models
- ArUco marker exclusion from depth and mesh stages
- Edge expansion control for synthetic segmentation
- Multi-run viewer with run selector dropdown

### Fixed
- Depth inversion issue (wounds appeared as bumps instead of cavities)
- ArUco markers appearing in 3D mesh
- QA Unicode display bug on Windows

### Changed
- Improved tissue analysis thresholds for brown skin tones
- Enhanced mask coverage calculations

## [2.5.0] - 2026-01-15

### Added
- Clinical scales (WBP, TIME, TEXAS) in reports
- AI-powered clinical narrative generation
- Risk assessment scoring
- ICD-10 code suggestions

### Fixed
- Volume calculation accuracy improvements
- Depth normalization edge cases

## [2.4.0] - 2026-01-10

### Added
- Mesh color modes (image vs tissue-based coloring)
- Depth smoothing options (bilateral, guided, gaussian, median)
- Enhanced QA gates with tissue sanity checks

### Changed
- Adaptive z-scale for mesh depth visualization
- Improved confidence mapping

## [2.3.0] - 2026-01-05

### Added
- Ground truth directory support for training data
- Depth Anything V2 integration (optional AI depth)
- ONNX Runtime support for model inference

### Fixed
- Cross-platform path handling
- Memory optimization for large images

---

## Pipeline Architecture

```
INPUT IMAGE
    |
    v
[PREPROCESS] -> preprocessed.png
    |
    v
[CALIBRATE] -> calibration.json, marker_mask
    |
    v
[SEGMENT] -> mask.png (marker excluded)
    |
    v
[DEPTH] -> depth_rel.tiff (marker flattened)
    |
    v
[TISSUE] -> tissue_analysis.json, tissue masks
    |
    v
[MESH] -> mesh.ply (marker vertices skipped)
    |
    v
[METRICS] -> metrics.json, depth_stats.json
    |
    v
[CLINICAL] -> clinical_scales.json
    |
    v
[QA] -> qa_report.json
```

## Quality Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| QA Grade | Overall quality (A-F) | A or B |
| Volume Error | vs ground truth | < 15% |
| Ridge Score | Mesh smoothness | < 0.3 |
| Calibration | ArUco detection | Confidence > 0.7 |

## Validation Results

| Model | Ground Truth | Estimated | Error |
|-------|--------------|-----------|-------|
| Light Skin (verification_test2) | TBD | 19,702 mm³ | -- |
| Brown Skin (brown_skin_v3) | 6,486 mm³ | 26,123 mm³ | ~300% |

**Note**: Brown skin model shows significant overestimation. Synthetic mode volume correction factor being tuned.
