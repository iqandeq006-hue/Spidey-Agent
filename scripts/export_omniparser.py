import os
import sys
import urllib.request
from ultralytics import YOLO

def main():
    print("=" * 60)
    print("Microsoft OmniParser v2.0 Icon Detector: Download & ONNX Exporter")
    print("=" * 60)

    models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "extension", "public", "models"))
    os.makedirs(models_dir, exist_ok=True)

    pt_path = os.path.join(models_dir, "omniparser_icon_detect.pt")
    onnx_target = os.path.join(models_dir, "omniparser_icon_detect.onnx")

    hf_url = "https://huggingface.co/microsoft/OmniParser-v2.0/resolve/main/icon_detect/model.pt"

    if not os.path.exists(pt_path) or os.path.getsize(pt_path) < 1000000:
        print(f"Downloading OmniParser icon detector weights from:\n{hf_url}")
        print("Saving to:", pt_path)

        def report(block_num, block_size, total_size):
            downloaded = block_num * block_size
            if total_size > 0:
                percent = min(100.0, downloaded * 100.0 / total_size)
                if block_num % 100 == 0:
                    print(f"  Progress: {percent:.1f}% ({downloaded // (1024*1024)}MB / {total_size // (1024*1024)}MB)")

        urllib.request.urlretrieve(hf_url, pt_path, reporthook=report)
        print("Download complete! File size:", os.path.getsize(pt_path), "bytes")
    else:
        print("PyTorch model already cached at:", pt_path)

    print("\nLoading model in Ultralytics YOLO engine...")
    model = YOLO(pt_path)

    print("Exporting to ONNX format (imgsz=640, simplify=True)...")
    exported_path = model.export(
        format="onnx",
        imgsz=640,
        dynamic=False,
        simplify=True
    )
    print("Export finished! Exported file:", exported_path)

    if os.path.exists(exported_path) and exported_path != onnx_target:
        if os.path.exists(onnx_target):
            os.remove(onnx_target)
        os.rename(exported_path, onnx_target)
        print("Renamed exported file to:", onnx_target)

    # Clean up the .pt file to save disk space
    if os.path.exists(pt_path):
        os.remove(pt_path)
        print("Cleaned up temporary .pt file.")

    final_size = os.path.getsize(onnx_target)
    print(f"\nSUCCESS! ONNX Model ready at: {onnx_target} ({final_size // (1024*1024)} MB)")

if __name__ == "__main__":
    main()
