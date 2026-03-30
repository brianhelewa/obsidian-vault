# Prompt for Claude Opus Research: Update PPA Spec Document

> **Instructions:** Copy everything below the line into Claude Opus Research as a single prompt. Attach the file `20251105-HELE-01-PRV1-Spec.docx` to the conversation. The figures document (`20251105-HELE-01-PRV1-Figs.docx`) will be updated separately after the spec is finalized.

---

## TASK

You are a patent drafting specialist. I need you to **update and enhance** my provisional patent application specification (attached: `20251105-HELE-01-PRV1-Spec.docx`) for a mobile wound assessment system called MediMorphAI.

The current draft was written in November 2025. Since then, the software implementation has advanced significantly. I need the spec updated to reflect what is actually built, while preserving the existing patent structure, claim numbering, and prose style. The figures document will be updated separately after this spec is finalized — for now, add `[NEW FIGURE NEEDED]` placeholders where new figures should go, and note which existing figures need updates.

**Output the complete updated specification as a single document**, preserving the original formatting conventions (paragraph numbering, section headers, claim structure). Mark all new or substantially changed content with `[NEW]` or `[UPDATED]` in brackets at the start of the paragraph so I can track changes.

---

## WHAT TO PRESERVE

- Title: "MOBILE WOUND ASSESSMENT SYSTEM WITH THREE-DIMENSIONAL RECONSTRUCTION AND AUTOMATED CLINICAL DOCUMENTATION"
- Patent structure: Cross-Reference, Federal Sponsorship, Introduction, Summary, Drawings, Detailed Description, Abbreviations/Definitions, Examples, Claims, Abstract
- Existing independent claims 1, 25, and 50 (system, method, device) — modify only to strengthen
- Patent prose style (formal, "may comprise", "according to aspects of the present disclosure", etc.)
- All existing figure references (FIG. 1 through FIG. 13) — note where updates are needed but don't remove references
- Prophetic example language (present tense per patent convention)

---

## WHAT TO UPDATE/ADD

### 1. FILL PLACEHOLDER NOTES

The spec has two explicit `[Note to draft:]` placeholders:

**A. Paragraph ~48 (Abbreviations & Definitions section):** The note says "This section should be completed if there are potentially multiple interpretations of terms of art." The definitions at paras 51-64 exist but are incomplete. **Add the following new definitions** in the same style as existing ones:

- **Capture Quality Assessment:** The process of evaluating image quality attributes including blur, glare, lighting uniformity, contrast, and exposure prior to wound analysis processing. The capture quality assessment assigns a quality grade from Grade A (excellent, overall score ≥0.85) through Grade F (fail, overall score <0.30) based on weighted scoring of individual quality checks.
- **Wound Bed Preparation (WBP) Score:** A clinical classification system that categorizes wound bed status into Class A (granulation only, ≤0.5% slough), Class B (less than 50% slough), Class C (50% or greater slough), and Class D (eschar/necrosis present at ≥0.1%), used to guide treatment decisions.
- **TIME Framework:** A structured wound assessment framework evaluating four domains: Tissue type (computed from segmentation), Infection status (clinician-entered), Moisture balance (clinician-entered), and Edge advancement (computed as proxy from epithelial tissue percentage).
- **TEXAS Classification:** A diabetic wound classification system comprising depth grade (0-3 based on wound depth), infection grade (A-D), and ischemia grade (0-3), providing standardized wound staging.
- **Smart Mask Fusion:** A method for combining machine-learning-based segmentation predictions with color-based segmentation masks using intersection-over-union (IoU) comparison and adaptive fusion policy selection to produce an optimized wound boundary mask.
- **Safety Guardrails:** Automated text processing controls applied to AI-generated clinical documentation that detect and sanitize forbidden clinical terms, enforce required disclaimers, and prevent generation of diagnostic or prescriptive language.
- **Synthetic Wound Model:** A computationally generated wound sample comprising RGB image, ground truth depth map, ground truth tissue labels, and wound mask, created using heightfield generation, tissue assignment, and physically-based rendering for training and validation purposes.
- **Depth Correction Factor:** A scaling coefficient (default 0.45) applied to monocular depth estimates to compensate for systematic overestimation of wound volume by approximately 2.2x, calibratable via ground truth comparison.
- **Quality Assurance Gate:** An automated validation checkpoint that evaluates processing outputs against configurable thresholds for mask quality, tissue composition sanity, depth data integrity, and measurement consistency, producing pass/warn/fail status flags.
- **Run Manifest:** A structured metadata record associated with each wound assessment session documenting processing parameters, stage completion status, output file paths, and quality metrics.

**B. Paragraph ~436 (Examples section):** The note says "In prophetic examples, USE THE PRESENT TENSE. We need to add the protocols." Update the existing 3 examples with more specific protocols (see Section 6 below) and add 2 new examples.

---

### 2. NEW DETAILED DESCRIPTION SECTIONS

Add the following **new sections** to the Detailed Description, after the existing content and before the Examples section. Use the same formal patent prose style. Each section should be 4-8 paragraphs.

#### Section: Capture Quality Assessment and Image Validation

Describe the implemented capture QC system. Reference `[NEW FIG. 14 — Capture Quality Assessment Workflow]`.

**Technical details to include:**
- Blur detection via Laplacian variance (kernel [[0,1,0],[1,-4,1],[0,1,0]]). Threshold: variance < 100 = blurry, > 500 = sharp.
- Glare detection: saturated pixel counting (brightness > 250 on 0-255 scale). Threshold: > 5% = excessive, > 2% = warning.
- Lighting uniformity: 4×4 grid division, std/mean of cell brightness. Threshold: > 0.4 = uneven, < 0.2 = good.
- Contrast: 5th-95th percentile dynamic range. Minimum 50, good ≥ 150.
- Exposure: ideal mean brightness 80-180, acceptable 50-200.
- Weighted scoring: blur 0.25, sharpness 0.20, glare 0.20, uniformity 0.15, contrast 0.10, exposure 0.10.
- Grading: A (≥0.85), B (≥0.70), C (≥0.50), D (≥0.30), F (<0.30).
- Gate logic: Grade D or F triggers recapture recommendation before processing continues.

#### Section: Clinical Wound Classification Scales

Describe the automated clinical classification system. Reference `[NEW FIG. 15 — Clinical Classification Workflow]`.

**Technical details to include:**

**WBP (Wound Bed Preparation):**
- Priority-ordered decision logic:
  1. If eschar ≥ 0.1% → Class D (necrosis present)
  2. If slough ≤ 0.5% AND granulation > 0 → Class A (granulation only)
  3. If slough < 50% → Class B
  4. Else → Class C (≥50% slough)

**TIME Framework:**
- T (Tissue) — COMPUTED from segmentation percentages:
  - eschar > 20% → "Necrotic (Black)"
  - eschar > 5% → "Mixed Necrotic"
  - slough > 50% → "Sloughy (Yellow)"
  - slough > 20% → "Mixed Slough/Granulation"
  - granulation > 50% → "Granulating (Red)"
  - epithelial > 30% → "Epithelializing (Pink)"
  - else → "Mixed"
- I (Infection) — requires clinician input
- M (Moisture) — requires clinician input
- E (Edge) — computed proxy from epithelial %:
  - > 20% → "Advancing"
  - > 10% → "Stable"
  - > 0% → "Minimal epithelialization"
  - else → "Not advancing"

**TEXAS Classification:**
- Depth grades from relative depth: Grade 0 (max < 0.2), Grade 1 (max < 0.4), Grade 2 (max < 0.7), Grade 2-3 (max ≥ 0.7)
- Infection and ischemia grades require clinician input

#### Section: Smart Mask Fusion for Wound Boundary Optimization

Describe the novel mask fusion technique. Reference `[NEW FIG. 16 — Smart Mask Fusion Workflow]`.

**Technical details to include:**
- Two parallel segmentation paths: ML-based (ONNX U-Net inference) and color-based (HSV thresholding)
- IoU computation between ML mask and color-based mask
- Coverage ratio = ML mask area / color-based mask area
- Fusion policy decision tree:
  - IoU ≥ 0.85 AND coverage ratio 0.8-1.2 → ML_ONLY (high agreement)
  - Coverage ratio < 0.5 → UNION (ML under-predicts, combine both)
  - Coverage ratio > 1.5 → INTERSECTION (ML over-predicts, take overlap)
  - Default → UNION (conservative)
- Edge-aware expansion: 40-pixel radius beyond mask boundary, minimum saturation threshold of 12 (HSV)
- Morphological post-processing: closing (kernel 5), dilation (kernel 2), largest-component selection (threshold 85%)
- Minimum area safeguard: if ML mask < 10% of color mask area, fall back to color mask

#### Section: Artificial Intelligence Safety Guardrails for Clinical Documentation

Describe the LLM safety system. Reference `[NEW FIG. 17 — LLM Safety Guardrail Workflow]`.

**Technical details to include:**
- Three severity tiers of forbidden terms:
  - **Critical (always blocked):** "diagnos", "prescri", "this patient has", "you have", "you should", "must be treated", "requires treatment", "needs surgery", "needs amputation", "is infected", "is septic", "has gangrene", "go to the er", "emergency room", "call 911", "seek immediate"
  - **High severity (blocked):** "infected wound", "septic", "gangrene", "necrotizing", "osteomyelitis", "cellulitis confirmed", "start antibiotics", "apply medication", "prognosis is", "will heal in", "healing time"
  - **Medium severity (allowed with warning):** "appears infected", "may be infected", "signs of infection", "recommend consulting"
- Certainty markers flagged as violations: "definitely", "certainly", "clearly infected", "obviously", "undoubtedly"
- Required disclaimers (at least one must appear): "investigational", "clinician verification", "not medical advice", "professional review"
- Sanitization replacements: e.g., "is infected" → "shows signs that may warrant clinical evaluation for infection"; "diagnos" → "[assessment - requires clinician verification]"; "you should" → "a clinician may consider"
- Deterministic fallback: when no LLM is available, system generates structured clinical notes deterministically from tissue percentages and clinical scale computations, including WBP interpretation, watchout flags, clinician questions, and documentation templates

#### Section: Depth Estimation from Single-Image Analysis

Describe the software-based depth estimation. Reference `[NEW FIG. 19 — Depth Estimation Decision Tree]`.

**Technical details to include:**
- Primary: AI-based depth estimation (Depth Anything V2 neural network model)
- Fallback: shading-based depth estimation from image luminance gradients
- Depth correction factor: 0.45 (monocular depth overestimates volume by ~2.2x)
- Configurable via environment variable
- Depth quality grades: A (AI model), B (shading with valid contrast), C (radial fallback), D (unavailable)
- Marker exclusion: calibration marker regions flattened to skin level with confidence = 1.0
- Calibration modes: RELATIVE_ONLY, MARKER_CALIBRATED (ArUco/checkerboard), LIDAR_MEASURED (iPhone depth), SFM_RECONSTRUCTED (multi-view), MODEL_ESTIMATED (ML-trained)
- Confidence thresholds: Grade A confidence > 0.9, Grade B > 0.75, Grade C > 0.5, metric claims require > 0.6

#### Section: Quality Assurance Gates and Output Validation

Describe the QA system. Reference existing processing workflow figures.

**Technical details to include:**
- Mask quality checks: minimum 100 pixels, maximum 50% coverage, hole ratio < 10%, circularity threshold < 20
- Tissue sanity: percentages sum to 100% ± 1.0 tolerance
- Depth sanity: NaN ratio < 10% in masked region, spike detection at ±3σ
- Result flags: is_valid, needs_review, block_metric_claims, recapture_recommended
- Tissue mask subset validation: all tissue pixels within wound mask, < 1% uncovered wound pixels

#### Section: Synthetic Wound Data Generation for Training and Validation

Describe the synthetic data pipeline. Reference `[NEW FIG. 18 — Synthetic Data Generation Pipeline]`.

**Technical details to include:**
- Presets: chronic_complex, chronic_simple, pressure_ulcer, healing
- Pipeline: heightfield generation → outlier clamping (2nd-98th percentile) → edge-aware depth smoothing → normalization to [0,1] → tissue label generation → RGB rendering with configurable light direction and noise
- Output per sample: RGB image (512×512), ground truth depth, ground truth tissue labels, wound mask, metadata
- Evaluation: depth MAE/RMSE, tissue IoU/Dice coefficient, confusion matrix
- Use case: enables ML training and pipeline accuracy validation without requiring clinical wound images

#### Section: Interactive Three-Dimensional Viewer and Clinical Dashboard

Describe the web-based viewer. Reference `[NEW FIG. 20 — Viewer/Dashboard UI Layout]`.

**Technical details to include:**
- Three.js-based 3D mesh rendering with orbit controls
- Three render modes: Tissue colors (granulation red, slough yellow, eschar black, epithelial pink), Depth heatmap (jet colormap blue-to-red), Original image texture
- Camera presets: Top, Side X, Side Y, Auto-fit
- Measurement tools: point probe (XYZ coordinates), line measure (distance between two points)
- Overlay toggles: mask outline, tissue overlay, confidence heatmap, calibration marker, invalid regions
- Analytics panel: QC grade, clinical scales (WBP/TIME/TEXAS), clinical warnings, tissue composition bar chart, metrics cards (area, perimeter, volume, depth), calibration details
- Depth legend with color gradient and units (relative or metric)

---

### 3. UPDATE EXISTING SECTIONS

**FIG. 6 / Method 600 (AI Processing):** Add a step between 602 and 603 for tissue classification (not just segmentation). Add smart mask fusion step after segmentation. Note: `[FIG. 6 NEEDS UPDATE]`.

**FIG. 7 / Method 700 (LLM Documentation):** Add safety guardrail processing step before output. Add deterministic fallback path when LLM unavailable. Note: `[FIG. 7 NEEDS UPDATE]`.

**FIG. 13 / Method 1300 (Complete System):** Add capture QC step after 1302, clinical scales step after 1303, safety guardrails step within 1304. Note: `[FIG. 13 NEEDS UPDATE]`.

**FIG. 1 (System Overview):** Note that the diagram should be updated to show capture QC, clinical scales engine, and safety guardrails as labeled components. Note: `[FIG. 1 NEEDS UPDATE]`.

**Tissue composition section (around paras 141-143):** Update to include the 4-tissue classification system (granulation, slough, eschar, epithelial) with specific HSV ranges:
- Granulation: H [0-20, 160-180], S [130-255], V [50-180] — deep red
- Slough: H [15-70], S [30-220], V [70-240] — yellow/tan
- Eschar: H [any], S [0-20], V [5-25] — achromatic dark/black
- Epithelial: H [0-45, 150-180], S [15-180], V [50-255] — pink/brown
- Classification priority order: epithelial → eschar → slough → granulation

**Mesh generation section (around paras 154-157):** Add mesh smoothing algorithms:
- Bilateral filter (edge-preserving, default): kernel radius = max(2, 3×strength), spatial σ = 5.0×strength, range σ = 0.1×strength
- Guided filter, Gaussian, median alternatives
- Default parameters: strength 1.0, iterations 2
- Adaptive z-scale: target max depth = 20% of mask width, clamped [50, 500]

**Metrics section (around paras 158-165):** Add specific computation methods:
- Area: pixel count × (scale mm/px)²
- Perimeter: boundary pixel counting (4-neighbor connectivity) × scale
- Volume: area × mean_depth × depth_scale × correction_factor (0.45)
- Ridge score: mesh roughness metric from depth map texture
- Uncertainty bounds: derived from calibration confidence

---

### 4. NEW DRAWINGS REFERENCES

Add the following drawing descriptions to the DRAWINGS section (after para 40). These will be created as figures later:

- FIG. 14 — Capture Quality Assessment Workflow: flowchart showing image input → blur check → glare check → lighting check → contrast check → exposure check → weighted scoring → grade assignment (A-F) → pass/recapture decision
- FIG. 15 — Clinical Wound Classification Workflow: flowchart showing tissue percentages → WBP classification (A-D) → TIME framework assessment (T computed, I/M clinician input, E proxy) → TEXAS classification → clinical scales output
- FIG. 16 — Smart Mask Fusion Workflow: flowchart showing parallel ML segmentation and color-based segmentation → IoU computation → coverage ratio → policy selection (ML_ONLY/UNION/INTERSECTION) → edge expansion → morphological cleanup → final mask
- FIG. 17 — LLM Safety Guardrail Workflow: flowchart showing raw LLM output → critical term scan → high severity scan → medium severity scan → certainty marker check → sanitization replacements → disclaimer verification → safe output / rejection
- FIG. 18 — Synthetic Data Generation Pipeline: flowchart showing preset selection → heightfield generation → outlier clamping → depth smoothing → normalization → tissue assignment → RGB rendering → ground truth output bundle
- FIG. 19 — Depth Estimation Decision Tree: flowchart showing input image → AI model available? → (Yes: Depth Anything V2 / No: shading-based fallback) → marker detection → calibration mode selection → depth correction (×0.45) → metric depth output
- FIG. 20 — Viewer/Dashboard UI Layout: annotated wireframe showing 3D viewport (left) with render mode controls, measurement tools, overlays; analytics panel (right) with QC grade, clinical scales, tissue chart, metrics cards, depth legend

---

### 5. NEW CLAIMS

Add the following dependent claims. Maintain the existing numbering convention (claims 1-69 exist; start new claims at 70).

**Under independent claim 1 (system):**
- Claim 70: The system of claim 1, further comprising a capture quality assessment module configured to evaluate image quality attributes including blur, glare, lighting uniformity, contrast, and exposure, and assign a quality grade from Grade A through Grade F based on weighted scoring.
- Claim 71: The system of claim 70, wherein the capture quality assessment module is configured to recommend image recapture when the quality grade is below a configurable threshold.
- Claim 72: The system of claim 1, further comprising a clinical wound classification module configured to automatically compute a Wound Bed Preparation score, a TIME framework assessment, and a TEXAS classification from wound segmentation data and depth measurements.
- Claim 73: The system of claim 72, wherein the Wound Bed Preparation score classifies wound bed status into one of Class A, Class B, Class C, or Class D based on tissue composition percentages with priority-ordered decision logic.
- Claim 74: The system of claim 1, wherein the artificial intelligence algorithms comprise a smart mask fusion module configured to combine machine-learning-based segmentation with color-based segmentation using intersection-over-union comparison and adaptive fusion policy selection.
- Claim 75: The system of claim 74, wherein the adaptive fusion policy selection comprises selecting from ML-only, union, intersection, or external-only fusion policies based on IoU threshold and coverage ratio between segmentation outputs.
- Claim 76: The system of claim 12, further comprising safety guardrail processing configured to detect and sanitize forbidden clinical terms in AI-generated documentation, enforce required disclaimers, and prevent generation of diagnostic or prescriptive language.
- Claim 77: The system of claim 76, wherein the safety guardrail processing comprises multi-tier severity classification of forbidden terms including critical terms that are always blocked and medium-severity terms that are allowed with warnings.
- Claim 78: The system of claim 12, further comprising a deterministic clinical note generation module configured to generate structured clinical documentation from wound assessment data without requiring a large language model.
- Claim 79: The system of claim 1, further comprising a quality assurance gate module configured to validate processing outputs against configurable thresholds for mask quality, tissue composition sanity, depth data integrity, and measurement consistency.
- Claim 80: The system of claim 1, further comprising a synthetic wound generation module configured to generate training data comprising RGB images, ground truth depth maps, ground truth tissue labels, and wound masks using heightfield generation and physically-based rendering.
- Claim 81: The system of claim 1, wherein the mobile device is configured to estimate wound depth from a single image using an AI depth estimation model with a shading-based fallback when the AI model is unavailable.
- Claim 82: The system of claim 81, wherein the depth estimation applies a depth correction factor to compensate for systematic overestimation by monocular depth estimation.

**Under independent claim 25 (method):**
- Claim 83: The method of claim 25, further comprising a step of performing capture quality assessment on the multimodal imaging data prior to processing, including evaluating blur, glare, lighting uniformity, contrast, and exposure.
- Claim 84: The method of claim 25, further comprising a step of computing clinical wound classification scales including a Wound Bed Preparation score, a TIME framework assessment, and a TEXAS classification from the wound segmentation and measurement data.
- Claim 85: The method of claim 25, further comprising a step of performing smart mask fusion by combining machine-learning-based segmentation with color-based segmentation using intersection-over-union comparison to select an adaptive fusion policy.
- Claim 86: The method of claim 32, further comprising a step of applying safety guardrails to AI-generated clinical documentation by scanning for forbidden clinical terms, applying sanitization replacements, and verifying presence of required disclaimers.
- Claim 87: The method of claim 25, further comprising a step of validating processing outputs through quality assurance gates that check mask quality, tissue composition sanity, depth data integrity, and measurement consistency.

**Under independent claim 50 (device):**
- Claim 88: The device of claim 50, further comprising a capture quality assessment module configured to evaluate image blur via Laplacian variance, glare via saturated pixel detection, and lighting uniformity via grid-based brightness analysis.
- Claim 89: The device of claim 50, wherein the onboard compute unit is further configured to compute clinical wound classification scales from tissue segmentation output.
- Claim 90: The device of claim 50, further comprising safety guardrail processing for AI-generated clinical text, the safety guardrail processing configured to detect forbidden diagnostic and prescriptive terms and enforce required investigational-use disclaimers.

---

### 6. EXAMPLES UPDATES

**Update Example 1 (Multimodal Imaging and 3D Reconstruction):**
Add these specific protocol details:
- Depth estimation using Depth Anything V2 neural network with shading-based fallback
- Depth correction factor of 0.45 applied to compensate for monocular overestimation
- Mesh generation: stride-4 downsampling, adaptive z-scale (target 20% of mask width, clamped 50-500)
- Bilateral smoothing: strength 1.0, 2 iterations, edge-preserving with spatial σ = 5.0, range σ = 0.1
- Calibration via ArUco or checkerboard fiducial markers for metric scale

**Update Example 2 (AI-Powered Clinical Documentation):**
Add these specific protocol details:
- Safety guardrail processing with 3-tier forbidden term detection (critical: always blocked; high: blocked; medium: warned)
- Required disclaimer enforcement (at least one of: "investigational", "clinician verification", "not medical advice", "professional review")
- Deterministic fallback: generates structured notes without LLM using tissue percentages → WBP/TIME/TEXAS computation → watchout flags → clinician questions → documentation template
- LLM configuration: temperature 0.3, max tokens 1024, system prompt with safety constraints

**Update Example 3 (Secure Processing):** Keep as prophetic; minor language updates for consistency.

**Add Example 4 (NEW): Synthetic Dataset Validation**
A synthetic wound dataset is generated using the heightfield-based generator with four presets (chronic_complex, chronic_simple, pressure_ulcer, healing). Each sample comprises a 512×512 RGB image, ground truth depth map, ground truth tissue labels, and wound mask. The generation pipeline applies edge-aware depth smoothing (bilateral filter, strength 1.0, 2 iterations) and outlier clamping (2nd-98th percentile). RGB rendering uses configurable light direction and additive noise (intensity 0.1). Pipeline outputs are compared against ground truth using depth MAE/RMSE, tissue IoU and Dice coefficient, and confusion matrix analysis. Expected results demonstrate depth estimation accuracy within specified tolerances and tissue classification performance suitable for clinical documentation assistance. [Write this in full prophetic-example patent prose, present tense, ~3 paragraphs.]

**Add Example 5 (NEW): Clinical Wound Classification**
Wound assessment data from various wound types is processed through the clinical classification system. Tissue composition percentages computed from AI segmentation are input to the Wound Bed Preparation scoring algorithm, which applies priority-ordered decision logic: eschar ≥ 0.1% triggers Class D, slough ≤ 0.5% with granulation > 0% yields Class A, slough < 50% yields Class B, otherwise Class C. The TIME framework assessment computes Tissue status from segmentation (e.g., eschar > 20% = "Necrotic"), Edge status as a proxy from epithelial percentage (> 20% = "Advancing"), while Infection and Moisture domains are flagged for clinician input. The TEXAS classification derives depth grade from relative depth measurements (max depth < 0.2 = Grade 0 superficial through max depth ≥ 0.7 = Grade 2-3 deep). Quality assurance gates validate that tissue percentages sum to 100% ± 1.0 tolerance. Expected results demonstrate automated clinical classification consistent with manual clinician staging for wound bed preparation assessment. [Write this in full prophetic-example patent prose, present tense, ~3 paragraphs.]

---

### 7. UPDATE ABSTRACT

Expand the abstract to mention capture quality assessment, clinical wound classification scales (WBP, TIME, TEXAS), safety guardrails for AI-generated documentation, and smart mask fusion. Keep under 150 words per patent convention.

---

### 8. UPDATE SUMMARY

Expand the Summary section (paras 17-24) to add:
- A paragraph covering the capture quality assessment capability
- A paragraph covering the clinical wound classification scales
- A paragraph covering the safety guardrails for AI-generated documentation
- Brief mention of smart mask fusion, synthetic data generation, and QA gates

---

## FORMATTING REQUIREMENTS

1. Use **patent paragraph numbering** (sequential, in brackets: [0001], [0002], etc.) — match the existing style in the document
2. Every new section should begin with "Referring to FIG. X" or "According to aspects of the present disclosure"
3. Use "may comprise", "may include", "may be configured to" language — avoid definitive "comprises" in the description (save definitive language for claims)
4. Each section should end with: "Those skilled in the art will recognize that various modifications and variations can be made to [topic] without departing from the spirit and scope of the [feature]. The [components] may be adapted for different [use cases] based on specific requirements."
5. Claims use definitive language: "comprising", "configured to", "wherein"
6. Mark every new/changed paragraph with `[NEW]` or `[UPDATED]` prefix
7. Maintain consistent reference numbering for methods (e.g., method 1400, steps 1401-1407 for new FIG. 14)
8. Keep the document as a **single continuous specification** — do not split into multiple files

## FIGURE TRACKING

At the end of the document, add a section called "FIGURE UPDATE TRACKER" that lists:
- Which existing figures (1-13) need updates and what changes
- Which new figures (14-20) need to be created and brief descriptions of what each should depict
- This tracker is for my reference only and will be removed from the final filing

---

**Produce the complete updated specification now.**
