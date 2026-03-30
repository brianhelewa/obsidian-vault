# ML + LLM Enhancement Implementation Plan

## Overview

This plan adds ML integration, improved mesh smoothing, evaluation harness, and optional LLM report generation to the MediMorphAI/Z-Stamp pipeline.

---

## A) Evaluation Harness (Deterministic)

### Files to Create:
- `src/zstamp/evaluation/` (new module)
  - `__init__.py` - exports
  - `eval_run.py` - main evaluation logic (calls synth/evaluation.py utilities)

### Files to Modify:
- `src/zstamp/cli.py` - update `evaluate` command to save `eval.json`
- `src/zstamp/synth/evaluation.py` - add `save_evaluation_report()` to outputs/eval.json
- `src/zstamp/commands/preview.py` - add `/api/eval` endpoint
- `src/zstamp/viewer_assets/index.html` - add Evaluation section
- `src/zstamp/viewer_assets/report.css` - style eval section

### Output:
- `outputs/eval.json` - depth MAE/RMSE/percentiles, tissue IoU/Dice/confusion matrix

---

## B) Reduce "Ridgy Mesh" Artifacts

### Files to Create:
- `src/zstamp/mesh/` (new module)
  - `__init__.py`
  - `smoothing.py` - depth pre-smoothing (bilateral, outlier clamp)
  - `postprocess.py` - laplacian smoothing, normal recomputation, decimation
  - `roughness.py` - mesh roughness/ridge score metric

### Files to Modify:
- `src/zstamp/stages/mesh.py` - integrate smoothing before mesh generation
- `src/zstamp/stages/depth.py` - add optional edge-aware smoothing step
- `src/zstamp/pipeline.py` - add mesh_smoothing config option
- `src/zstamp/stages/metrics.py` - add ridge_score/roughness metric
- `src/zstamp/constants.py` - add MESH_SMOOTHING constants

---

## C) ML Integration (Feature-Flagged)

### Files to Create:
- `src/zstamp/ml/` (new module)
  - `__init__.py`
  - `dataset.py` - DataLoader for synthetic runs directory
  - `model.py` - Small U-Net architecture definition
  - `train.py` - Training script with CLI
  - `export.py` - PyTorch -> ONNX export
  - `inference.py` - ONNX inference wrapper

### Files to Modify:
- `src/zstamp/backends/base.py` - add MLTissueBackend abstract class
- `src/zstamp/backends/ml.py` (new) - ONNX-based tissue classifier
- `src/zstamp/stages/tissue_analysis.py` - add `backend="ml"` option
- `src/zstamp/pipeline.py` - add `--backend ml` flag support
- `src/zstamp/cli.py` - add `train` command
- `src/zstamp/constants.py` - add ML_MODELS_DIR, ONNX_MODEL_FILE

### Outputs:
- `models/tissue_unet.onnx` - exported model
- `confidence_map.png` - per-pixel confidence

---

## D) LLM Report Assistant

### Files to Create:
- `src/zstamp/llm/` (new module)
  - `__init__.py`
  - `report_generator.py` - LLM-based report generation
  - `prompts.py` - System prompts with safety guardrails
  - `client.py` - OpenAI-compatible client (supports local endpoints)

### Files to Modify:
- `src/zstamp/pipeline.py` - add optional `report_llm` stage
- `src/zstamp/cli.py` - add `--llm-report` flag
- `src/zstamp/constants.py` - add LLM_* env var names

### Outputs:
- `outputs/report_summary.md` - LLM-generated summary
- Integration into `report.html`

### Safety:
- Off by default (requires `ZSTAMP_LLM_ENDPOINT` env var)
- Hardcoded "investigational" disclaimer
- No diagnosis/treatment language in prompts

---

## File Plan Summary

### New Files (21 files):
```
src/zstamp/
├── mesh/
│   ├── __init__.py
│   ├── smoothing.py
│   ├── postprocess.py
│   └── roughness.py
├── ml/
│   ├── __init__.py
│   ├── dataset.py
│   ├── model.py
│   ├── train.py
│   ├── export.py
│   └── inference.py
├── llm/
│   ├── __init__.py
│   ├── report_generator.py
│   ├── prompts.py
│   └── client.py
└── backends/
    └── ml.py
```

### Modified Files (12 files):
```
src/zstamp/
├── cli.py
├── pipeline.py
├── constants.py
├── stages/
│   ├── mesh.py
│   ├── depth.py
│   ├── tissue_analysis.py
│   └── metrics.py
├── backends/
│   └── base.py
├── synth/
│   └── evaluation.py
├── commands/
│   └── preview.py
└── viewer_assets/
    ├── index.html
    └── report.css
```

---

## Implementation Order

1. **B: Mesh Smoothing** (foundational, improves quality)
2. **A: Evaluation Harness** (needed to measure improvements)
3. **C: ML Integration** (depends on evaluation for validation)
4. **D: LLM Report** (independent, can be last)

---

## Commands After Implementation

```bash
# Generate synthetic dataset
zstamp synth-dataset --out data/synth --n 100 --preset chronic_complex --seed 42

# Run pipeline on synthetic sample with ML backend
zstamp run --image data/synth/sample_001/preprocessed.png --out runs/ml_test --backend ml

# Evaluate against ground truth
zstamp evaluate --run runs/ml_test --verbose --output runs/ml_test/outputs/eval.json

# Train tissue model on synthetic data
zstamp train --data data/synth --epochs 10 --output models/tissue_unet.onnx

# Preview with evaluation overlay
zstamp preview --run runs/ml_test

# Generate LLM report (requires ZSTAMP_LLM_ENDPOINT)
ZSTAMP_LLM_ENDPOINT=http://localhost:8080 zstamp run --image img.jpg --out runs/test --llm-report
```
