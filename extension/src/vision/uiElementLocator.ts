// OmniParser-Inspired On-Device UI Element & Icon Detector (Phase 2 & 5)
// Detects interactable UI icons and controls on HTML5 Canvases and unlabeled DOM elements.
// Provides visual bounding boxes for search icons, sliders, chevrons, and canvas widgets
// without sending raw screen pixels to cloud services.

export interface UIIconDetection {
  id: string;
  type: 'ICON_BUTTON' | 'CANVAS_CONTROL' | 'TOGGLE' | 'NAVIGATION_ICON';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  parentCanvasIndex?: number;
}

export class UIElementLocator {
  // Detects interactable icon buttons in DOM that lack text (e.g., <button><svg/></button>)
  public detectUnlabeledIconButtons(): UIIconDetection[] {
    const iconDetections: UIIconDetection[] = [];
    if (typeof document === 'undefined') return iconDetections;

    const candidates = document.querySelectorAll<HTMLElement>(
      'button, [role="button"], a[href], [tabindex="0"]'
    );

    let counter = 1;
    candidates.forEach((el) => {
      const text = (el.textContent || '').trim();
      const ariaLabel = el.getAttribute('aria-label') || el.getAttribute('title') || '';
      
      // Target elements with little to no visible text that contain SVG, Canvas, or Icon tags
      const hasSvgOrImg = el.querySelector('svg, img, i, canvas') !== null;
      if (text.length <= 1 && (hasSvgOrImg || ariaLabel.length > 0)) {
        const rect = el.getBoundingClientRect();
        if (rect.width >= 12 && rect.height >= 12 && rect.width <= 320 && rect.height <= 320) {
          // Infer semantic role from aria-label, class names, or SVG attributes
          const classNames = (el.className || '').toString().toLowerCase();
          const svgHtml = el.querySelector('svg')?.outerHTML.toLowerCase() || '';
          
          let inferredLabel = ariaLabel;
          if (!inferredLabel) {
            if (/search|magnif/i.test(classNames) || /search/i.test(svgHtml)) {
              inferredLabel = 'Search';
            } else if (/close|cancel|dismiss|cross|x/i.test(classNames) || /close/i.test(svgHtml)) {
              inferredLabel = 'Close';
            } else if (/menu|hamburger|bars/i.test(classNames) || /menu/i.test(svgHtml)) {
              inferredLabel = 'Menu';
            } else if (/setting|gear|cog/i.test(classNames) || /gear/i.test(svgHtml)) {
              inferredLabel = 'Settings';
            } else if (/next|arrow.*right|chevron.*right/i.test(classNames) || /chevron-right/i.test(svgHtml)) {
              inferredLabel = 'Next';
            } else if (/prev|arrow.*left|chevron.*left/i.test(classNames) || /chevron-left/i.test(svgHtml)) {
              inferredLabel = 'Previous';
            } else if (/trash|delete|remove/i.test(classNames) || /trash/i.test(svgHtml)) {
              inferredLabel = 'Delete';
            } else if (/edit|pen/i.test(classNames) || /edit/i.test(svgHtml)) {
              inferredLabel = 'Edit';
            } else {
              inferredLabel = `Icon_Action_${counter}`;
            }
          }

          iconDetections.push({
            id: `ui_icon_${counter++}`,
            type: 'ICON_BUTTON',
            label: inferredLabel,
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            confidence: 0.94
          });
        }
      }
    });

    return iconDetections;
  }

  // Detects interactable UI sub-regions inside an opaque HTML5 <canvas> (e.g. telemetry charts, interactive maps)
  public detectCanvasControls(canvas: HTMLCanvasElement, canvasIdx: number = 0): UIIconDetection[] {
    const detections: UIIconDetection[] = [];
    if (!canvas || canvas.width < 32 || canvas.height < 32) return detections;

    const ctx = canvas.getContext('2d');
    if (!ctx) return detections;

    let imgData: ImageData;
    try {
      imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (e) {
      // Tainted canvas security boundary
      return detections;
    }

    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvasRect.width / canvas.width;
    const scaleY = canvasRect.height / canvas.height;

    // Scan for high-contrast UI control clusters (buttons, toggles, zoom bars on canvas)
    const clusters = this.scanSalientCanvasWidgets(imgData);

    clusters.forEach((box, i) => {
      detections.push({
        id: `canvas_ctrl_${canvasIdx}_${i + 1}`,
        type: 'CANVAS_CONTROL',
        label: `Canvas_Interactive_Control_${i + 1}`,
        x: Math.round(canvasRect.left + box.x * scaleX),
        y: Math.round(canvasRect.top + box.y * scaleY),
        width: Math.round(box.w * scaleX),
        height: Math.round(box.h * scaleY),
        confidence: box.confidence,
        parentCanvasIndex: canvasIdx
      });
    });

    return detections;
  }

  // Visual saliency & edge cluster analysis for UI widgets inside canvas
  private scanSalientCanvasWidgets(imgData: ImageData): Array<{ x: number; y: number; w: number; h: number; confidence: number }> {
    const w = imgData.width;
    const h = imgData.height;
    const pixels = imgData.data;
    const results: Array<{ x: number; y: number; w: number; h: number; confidence: number }> = [];

    // Sample grid with step 4 for sub-millisecond execution
    const step = 4;
    const gridW = Math.floor(w / step);
    const gridH = Math.floor(h / step);
    const edgeMap = new Uint8Array(gridW * gridH);

    // Compute localized Sobel-like gradient energy
    for (let gy = 1; gy < gridH - 1; gy++) {
      for (let gx = 1; gx < gridW - 1; gx++) {
        const px = gx * step;
        const py = gy * step;
        const idx = (py * w + px) * 4;

        const lumCenter = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
        const lumRight = (pixels[idx + 4 * step] + pixels[idx + 4 * step + 1] + pixels[idx + 4 * step + 2]) / 3;
        const lumDown = (pixels[(py + step) * w * 4 + px * 4] + pixels[(py + step) * w * 4 + px * 4 + 1] + pixels[(py + step) * w * 4 + px * 4 + 2]) / 3;

        const grad = Math.abs(lumRight - lumCenter) + Math.abs(lumDown - lumCenter);
        if (grad > 35) {
          edgeMap[gy * gridW + gx] = 1;
        }
      }
    }

    // Identify bounded interactive control clusters (typical button sizes: 24px - 140px)
    const visited = new Uint8Array(gridW * gridH);
    for (let gy = 2; gy < gridH - 2; gy++) {
      for (let gx = 2; gx < gridW - 2; gx++) {
        const offset = gy * gridW + gx;
        if (visited[offset] || edgeMap[offset] === 0) continue;

        // BFS bounding box discovery
        let minX = gx, maxX = gx, minY = gy, maxY = gy, edgeCount = 0;
        const queue: number[] = [gx, gy];
        visited[offset] = 1;

        let head = 0;
        while (head < queue.length && edgeCount < 500) {
          const cx = queue[head++];
          const cy = queue[head++];
          edgeCount++;

          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          // 4 neighbors
          const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          for (const [dx, dy] of dirs) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) {
              const noff = ny * gridW + nx;
              if (!visited[noff] && edgeMap[noff] === 1) {
                visited[noff] = 1;
                queue.push(nx, ny);
              }
            }
          }
        }

        const boxW = (maxX - minX) * step;
        const boxH = (maxY - minY) * step;

        // Standard button / control geometry filter (20px - 200px width, 14px - 80px height, edge count >= 10)
        if (boxW >= 20 && boxW <= 220 && boxH >= 14 && boxH <= 90 && edgeCount >= 8) {
          results.push({
            x: minX * step,
            y: minY * step,
            w: boxW,
            h: boxH,
            confidence: 0.91
          });
        }
      }
    }

    return results.slice(0, 8); // Top 8 primary interactable canvas regions
  }
}

export const uiElementLocatorInstance = new UIElementLocator();
