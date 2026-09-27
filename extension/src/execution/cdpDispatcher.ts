// Option A: Chrome DevTools Protocol (CDP) Hardware-Level Dispatcher
// Executes trusted clicks, scrolls, and keystrokes directly inside Chrome via chrome.debugger.
// Bypasses website bot protections, works on HTML5 canvases, and requires ZERO external servers or Playwright!
// Gracefully falls back to synthetic DOM dispatch if debugger API is inactive.

export class CDPDispatcher {
  private attachedTabs: Set<number> = new Set();

  // Attach chrome.debugger to target tab if available
  public async ensureAttached(tabId: number): Promise<boolean> {
    if (this.attachedTabs.has(tabId)) return true;
    if (typeof chrome === 'undefined' || !chrome.debugger) {
      console.warn('[CDPDispatcher] chrome.debugger unavailable in this context. Using synthetic dispatch fallback.');
      return false;
    }

    try {
      await chrome.debugger.attach({ tabId }, '1.3');
      this.attachedTabs.add(tabId);
      console.log(`[CDPDispatcher] Attached CDP protocol to tab [${tabId}]`);
      return true;
    } catch (err: any) {
      if (err?.message?.includes('already attached')) {
        this.attachedTabs.add(tabId);
        return true;
      }
      console.warn(`[CDPDispatcher] Failed to attach debugger to tab [${tabId}]:`, err?.message || err);
      return false;
    }
  }

  // Detach debugger when session concludes
  public async detachTab(tabId: number): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.debugger && this.attachedTabs.has(tabId)) {
      try {
        await chrome.debugger.detach({ tabId });
        this.attachedTabs.delete(tabId);
        console.log(`[CDPDispatcher] Detached CDP protocol from tab [${tabId}]`);
      } catch (err) {
        // ignore
      }
    }
  }

  // Hardware Mouse Click at exact screen coordinates (x, y)
  public async hardwareClick(tabId: number, x: number, y: number, fallbackElement?: HTMLElement): Promise<boolean> {
    const isAttached = await this.ensureAttached(tabId);

    if (isAttached && typeof chrome !== 'undefined' && chrome.debugger) {
      try {
        // 1. Mouse Move to coordinate
        await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          x,
          y
        });

        // 2. Mouse Press
        await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
          type: 'mousePressed',
          x,
          y,
          button: 'left',
          clickCount: 1
        });

        // 3. Mouse Release
        await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
          type: 'mouseReleased',
          x,
          y,
          button: 'left'
        });

        console.log(`[CDPDispatcher] Hardware mouse click dispatched at (${x}, ${y}) via CDP.`);
        return true;
      } catch (err) {
        console.warn('[CDPDispatcher] CDP click failed. Falling back to synthetic dispatch:', err);
      }
    }

    // Fallback: Synthetic DOM Dispatch
    if (fallbackElement) {
      fallbackElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      fallbackElement.click();
      fallbackElement.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
      console.log(`[CDPDispatcher] Fallback synthetic click executed on element.`);
      return true;
    }

    return false;
  }

  // Hardware Keyboard Typing character-by-character
  public async hardwareType(tabId: number, text: string, fallbackElement?: HTMLElement): Promise<boolean> {
    const isAttached = await this.ensureAttached(tabId);

    if (isAttached && typeof chrome !== 'undefined' && chrome.debugger) {
      try {
        for (const char of text) {
          await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
            type: 'keyDown',
            text: char,
            unmodifiedText: char
          });
          await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
            type: 'keyUp'
          });
        }
        console.log(`[CDPDispatcher] Hardware keystrokes typed successfully via CDP.`);
        return true;
      } catch (err) {
        console.warn('[CDPDispatcher] CDP typing failed. Falling back to synthetic dispatch:', err);
      }
    }

    // Fallback: Synthetic Input Dispatch
    if (fallbackElement && 'value' in fallbackElement) {
      (fallbackElement as HTMLInputElement).value = text;
      fallbackElement.dispatchEvent(new Event('input', { bubbles: true }));
      fallbackElement.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    return false;
  }

  // Hardware Key Press (e.g. 'Enter', 'Escape', 'Tab')
  public async hardwareKey(tabId: number, key: string, fallbackElement?: HTMLElement): Promise<boolean> {
    const isAttached = await this.ensureAttached(tabId);

    if (isAttached && typeof chrome !== 'undefined' && chrome.debugger) {
      try {
        await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
          type: 'keyDown',
          key,
          code: key
        });
        await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
          type: 'keyUp',
          key,
          code: key
        });
        console.log(`[CDPDispatcher] Hardware key [${key}] dispatched via CDP.`);
        return true;
      } catch (err) {
        console.warn(`[CDPDispatcher] CDP key [${key}] failed:`, err);
      }
    }

    if (fallbackElement) {
      fallbackElement.dispatchEvent(new KeyboardEvent('keydown', { key, code: key, bubbles: true }));
      fallbackElement.dispatchEvent(new KeyboardEvent('keyup', { key, code: key, bubbles: true }));
      return true;
    }

    return false;
  }
}

export const cdpDispatcherInstance = new CDPDispatcher();
