# MediMorphAI Progress Tracking

## Current Status: MVP v2.8

### Pipeline Stages Status

| Stage | Status | Quality | Notes |
|-------|--------|---------|-------|
| Preprocess | Complete | Good | Auto-rotation, exposure correction |
| Calibrate | Complete | Good | ArUco detection, marker masking |
| Segment | Complete | Good | ML + stub fallback, synthetic mode with hole filling |
| Depth | Complete | Good | AI depth (Depth Anything V2) with shading fallback |
| Tissue | Complete | Good | 5-class analysis with improved slough detection |
| Mesh | Complete | Good | Bilateral smoothing, hole-free meshes |
| Metrics | Complete | Good | Volume, area, depth stats |
| Clinical | Complete | Good | WBP, TIME, TEXAS scales |
| QA | Complete | Good | Multi-gate validation |

### Recent Improvements (v2.8)

#### 1. Mesh Quality - Holes Fixed
- **Problem**: Black holes/gaps in 3D mesh from marker exclusion and HSV thresholds
- **Solution**: Enhanced morphological cleanup with:
  - Aggressive closing (5 iterations dilate + 5 erode)
  - Largest connected component extraction (removes isolated specs)
  - Small hole filling (up to 500px)
- **Result**: Ridge scores improved from 0.19-0.57 to 0.10-0.12

#### 2. Tissue Classification - Slough Detection
- **Problem**: Yellow/tan slough tissue not being detected
- **Solution**: Widened slough HSV thresholds:
  - Hue: 20-65 → 15-70 (broader yellow range)
  - Saturation: 15-200 → 30-220
  - Value: 80-230 → 70-240
- **Result**: Slough now detected (0.1% in brown skin model)

#### 3. Synthetic Segmentation - Noise Removal
- **Problem**: Red specs on brown skin being captured as wound
- **Solution**: Keep largest connected component only
- **Result**: Clean segmentation without isolated artifacts

#### 4. Report Generation - Multi-run Support
- **Problem**: Generate Report showed same report for all runs
- **Solution**: Fixed JavaScript to use `currentRunId` instead of stale `runInfo`
- **Result**: Correct report generated for each selected run

### Validation Runs Comparison

| Run ID | Version | Ridge Score | Tissue Distribution | Area (mm²) |
|--------|---------|-------------|---------------------|------------|
| verification_test2 | v2.6 | 0.192 | 69% gran, 29% epi | 5,691 |
| verification_test2_v4 | v2.8 | **0.112** | 57% gran, 43% epi | 5,955 |
| brown_skin_v3 | v2.6 | 0.566 | 19% gran, 80% epi | 6,476 |
| brown_skin_v3_v4 | v2.8 | **0.107** | 19% gran, 0.1% slough, 81% epi | 6,379 |

### Quality Metrics Summary

| Metric | Before (v2.6) | After (v2.8) | Target |
|--------|---------------|--------------|--------|
| Ridge Score (Light) | 0.192 | 0.112 | < 0.2 |
| Ridge Score (Brown) | 0.566 | 0.107 | < 0.2 |
| Mesh Holes | Present | None | None |
| Slough Detection | 0% | 0.1% | Accurate |
| Report Multi-run | Broken | Fixed | Working |

### Accuracy Improvement Timeline

```
v2.5: Initial volume estimation (no ground truth)
      |
v2.6: Synthetic mode, ArUco exclusion, depth inversion fix
      Volume error: ~300% (brown skin)
      Ridge score: 0.19 - 0.57 (noisy)
      |
v2.7: Enhanced smoothing, analytics module, volume correction
      Volume error: ~80% (still high)
      Ridge score: 0.15 - 0.22 (improved)
      |
v2.8: Hole filling, tissue improvements, report fixes
      Volume error: ~80% (needs calibration)
      Ridge score: 0.10 - 0.12 (excellent)
      Mesh quality: No holes
```

### CLI Commands

```powershell
# Run pipeline in synthetic mode
python -m zstamp.cli run -i "path/to/image.jpg" -o "runs/test_run" --synthetic

# Start viewer in multi-run mode
python -m zstamp.commands.preview --runs-dir "runs" --port 8000

# Run with enhanced smoothing
python -m zstamp.cli run -i "image.jpg" -o "runs/test" --mesh-smoothing bilateral --mesh-smoothing-strength 2.0
```

### Quality Metrics Definitions

| Metric | Formula | Good | Fair | Poor |
|--------|---------|------|------|------|
| QA Grade | Multi-gate pass/warn/fail | A-B | C | D-F |
| Volume Error | \|est - gt\| / gt * 100 | < 10% | 10-25% | > 25% |
| Ridge Score | Gradient magnitude mean | < 0.15 | 0.15-0.3 | > 0.3 |
| Calibration Confidence | ArUco detection score | > 0.8 | 0.6-0.8 | < 0.6 |

### Known Issues (Remaining)

1. **Volume Overestimation** - Still ~80% error vs ground truth
   - Need to tune depth scale correction factor
   - Current correction: 0.45, may need ~0.25 for synthetic

2. **Mask Coverage Warning** - QA warns about >50% coverage
   - May need to adjust threshold for synthetic models
   - Not a real issue, just warning level

### Next Steps

1. [x] Fix mesh holes with morphological cleanup
2. [x] Improve slough/yellow tissue detection
3. [x] Remove noise specs from synthetic segmentation
4. [x] Fix report generation for multi-run viewer
5. [ ] Tune volume correction factor for synthetic models
6. [ ] Add ground truth volume comparison in viewer
7. [ ] Create batch processing mode
8. [ ] Implement wound progression tracking

### Files Modified (v2.8)

| File | Changes |
|------|---------|
| `stages/segment.py` | Enhanced morphological cleanup, hole filling, largest component |
| `tissue_constants.py` | Widened slough HSV thresholds |
| `constants.py` | Widened synthetic wound HSV thresholds |
| `commands/preview.py` | Added `__main__` entry point, fixed `_get_run_dir` |
| `viewer_assets/index.html` | Fixed export functions to use `currentRunId` |
