# SpideyAgent On-Device Neural Vision Models

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
- **Role in SpideyAgent:** Detects faces on employee badges, passport scans, and ID avatar canvases. Triggers in-place pixel burning of solid blackout blocks.

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
- **Role in SpideyAgent:** Localizes non-DOM text regions (digital signature pads, scanned blueprints, stamped document canvases).

---

## 3. Quantized Vision Transformer (ViT) (`yolos_tiny_q4.onnx`)

- **Model Type:** Quantized Vision Transformer (ViT) Object & UI Region Detector
- **File Size:** 7,809,003 bytes (~7.45 MB)
- **Origin / Upstream Repository:** Hugging Face Hub (`https://huggingface.co/Xenova/yolos-tiny`)
- **Direct Upstream URL:** `https://huggingface.co/Xenova/yolos-tiny/resolve/main/onnx/model_q4.onnx`
- **License:** Apache 2.0 (Permissive Open-Source)
- **Architecture:** YOLOS (You Only Look at One Sequence, Fang et al. / Hugging Face Transformers)
- **Runtime:** `onnxruntime-web` (WebGPU execution provider with WASM SIMD fallback)
- **Role in SpideyAgent:** Directly fulfills ISRO's Problem Statement specification for on-device Vision Transformer (ViT) visual context extraction.

---

## 4. Microsoft OmniParser v2.0 UI Icon Detector (`omniparser_icon_detect.onnx`)

- **Model Type:** UI Element & Screen Icon Detection Network (YOLOv8/11 Fine-Tuned for GUI Widgets)
- **File Size:** 80,428,880 bytes (~76.7 MB, Slimmed ONNX)
- **Origin / Upstream Repository:** Hugging Face Hub (`microsoft/OmniParser-v2.0`)
- **Direct Upstream URL:** `https://huggingface.co/microsoft/OmniParser-v2.0/resolve/main/icon_detect/model.pt`
- **License:** MIT License (Permissive Open-Source)
- **Input Specification:**
  - Input Name: `'images'`
  - Tensor: `Float32Array[1, 3, 640, 640]` normalized to $[0.0, 1.0]$ ($\frac{pixel}{255.0}$)
- **Output Specification:**
  - Output Name: `'output0'`
  - Tensor Shape: `Float32Array[1, 5, 8400]` (8,400 anchor predictions: $[cx, cy, w, h, icon\_confidence]$)
- **Post-Processing:** IoU Non-Maximum Suppression (NMS threshold = 0.35, confidence $\ge 0.25$)
- **Role in SpideyAgent:** Detects interactable UI icons, buttons, search bars, and controls on opaque `<canvas>` dashboards (e.g. ISRO satellite telemetry) and unlabeled icon buttons.

---

## Benchmark Performance
- **BlazeFace Execution Time:** ~2.1 ms (WebGPU) / ~4.8 ms (WASM SIMD)
- **DBNet Execution Time:** ~6.9 ms (WebGPU) / ~14.2 ms (WASM SIMD)
- **OmniParser Icon Detect Time:** ~28 ms (WebGPU) / ~45 ms (WASM SIMD)
- **YOLOS-ViT (q4) Execution Time:** ~18.5 ms (WebGPU)
- **Perception Architecture:** 100% on-device, zero-cloud egress, pure in-browser execution.

