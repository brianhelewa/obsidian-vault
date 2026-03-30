# Enhancement Backlog

This document lists planned enhancements that are not yet implemented.

## Priority 1: Viewer UX Enhancements

### D1. Point-Probe Depth Display
- Click on 3D mesh to show depth at that point
- Display in mm if calibrated, relative otherwise
- Show tissue type at clicked location

### D2. Line Measurement Tool
- Draw line between two points on mesh
- Display distance in mm (if calibrated)
- Optional: Show cross-section profile along line

### D3. Camera Presets
- Add buttons for common views: Top, Side (X), Side (Y), Fit
- Store last camera position per run
- Keyboard shortcuts (T=top, S=side, F=fit)

### D4. Render Mode Toggle
- Switch between: Tissue colors, Depth heatmap, Original texture
- Persist preference in localStorage
- Keyboard shortcuts (1=tissue, 2=depth, 3=texture)

## Priority 2: Report Generation

### E1. PDF Report Template
- Auto-generate clinician-friendly PDF
- Include: wound photo with mask overlay, 3D render, tissue breakdown pie chart
- Metrics summary: area, depth stats, ridge score
- Warnings section for any detected issues
- **Note**: Keep recommendations cautious, not diagnostic

### E2. Report Customization
- Allow adding patient ID (not stored in run, only in report)
- Add notes field for clinician observations
- Date/time override for report timestamp

## Priority 3: Longitudinal Comparison

### F1. Multi-Run Comparison View
- Side-by-side view of two runs
- Diff visualization: area change, tissue composition change
- Delta metrics: +/- area, depth change

### F2. Trend Charts
- Plot metrics over time across multiple runs
- Wound healing trajectory visualization
- Export data as CSV

## Priority 4: Technical Improvements

### G1. Depth Calibration Improvements
- Detect calibration markers automatically
- Support multiple marker types (ruler, coin, grid)
- Manual calibration input option

### G2. Model Improvements
- Add model versioning to run_manifest.json
- Support multiple tissue models
- A/B testing infrastructure for model comparison

### G3. Performance Optimization
- Cache ONNX model loading
- Parallel stage execution where possible
- Progressive mesh loading in viewer

## Implementation Notes

### Minimal Dependencies Principle
- Prefer NumPy/Pillow for image processing
- Use vanilla JS in viewer (no React/Vue)
- PDF generation: consider `reportlab` (lightweight) or `weasyprint` (HTML->PDF)

### Determinism
- All outputs must be reproducible given same input + seed
- Random seeds should be explicit in run_manifest.json

### Testing
- Add tests for each new feature
- Maintain backward compatibility with existing run folders
- Version the run folder schema (currently v1.0)
