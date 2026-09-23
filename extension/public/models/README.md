# SentryAgent On-Device Neural Vision Models

This directory contains the compiled, standalone ONNX neural network models executed on-device inside the user's browser via `onnxruntime-web` (WebGPU execution provider with WASM SIMD fallback). Zero bytes of raw pixels or frames ever egress from the device.

---

## 1. BlazeFace ONNX (`blazeface.onnx`)

- **Model Type:** Real-Time Facial Biometrics Detection Network
- **File Size:** 535,842 bytes (~536 KB)
- **Runtime:** `onnxruntime-web` (WebGPU / WASM)
- **Input Specification:** 
  - Tensor: `Float32Array[1, 3, 128, 128]`
  - Normalization: RGB pixels normalized to $[-1.0, 1.0]$: $\frac{pixel - 127.5}{127.5}$
- **Output Specification:**
  - `selectedBoxes`: Bounding boxes normalized to $[0, 1]$ in mathematically verified order:
    $$\begin{bmatrix} x_{min} & y_{min} & x_{max} & y_{max} \end{bmatrix}$$
  - Graph Features: Anchor decoding and Non-Maximum Suppression (NMS) baked directly into graph nodes.
- **Secondary Post-Processing:** Secondary IoU NMS (threshold = 0.35) applied in TypeScript to eliminate multi-scale anchor overlap.
- **Role in SentryAgent:** Detects faces on employee badges, passport scans, and ID avatar canvases. Triggers in-place pixel burning of solid blackout blocks.

---

## 2. DBNet Text Detection ONNX (`ocr-det.onnx`)

- **Model Type:** Differentiable Binarization Real-Time Text-Region Detection Network
- **File Size:** 4,745,517 bytes (~4.75 MB)
- **Runtime:** `onnxruntime-web` (WebGPU / WASM)
- **Input Specification:**
  - Tensor: `Float32Array[1, 3, H, W]` where $H$ and $W$ are padded/scaled to multiples of 32.
  - Normalization: ImageNet channel-wise normalization:
    - Mean: `[0.485, 0.456, 0.406]`
    - Std: `[0.229, 0.224, 0.225]`
- **Output Specification:**
  - Output Name: `sigmoid_0.tmp_0`
  - Shape: Probability heatmap $[1, 1, H, W]$ where values $\in [0, 1]$ indicate probability of text presence.
- **Multi-Region Connected-Component Labeling (CCL):**
  - Uses an 8-connectivity Breadth-First Search (BFS) over active pixels ($>0.35$ confidence, minimum cluster size $\ge 8$ pixels).
  - Tightly segments **isolated text clusters** into individual bounding boxes (e.g. separating a signature on the left from a date on the right), preserving the unredacted whitespace in between.
- **Role in SentryAgent:** Localizes non-DOM text regions (digital signature pads, scanned blueprints, stamped document canvases).

---

## Benchmark Performance
- **BlazeFace Execution Time:** ~2.1 ms (WebGPU) / ~4.8 ms (WASM SIMD)
- **DBNet Execution Time:** ~6.9 ms (WebGPU) / ~14.2 ms (WASM SIMD)
- **Combined Dual-Model Latency:** **~9.01 ms** total on modern hardware
