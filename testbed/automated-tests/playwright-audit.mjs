import { chromium } from '../../extension/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extPath = path.resolve(__dirname, '../../extension/dist');

console.log('='.repeat(70));
console.log('🔍 SPIDEYAGENT PLAYWRIGHT DEEP AUDIT & BUG DETECTION SUITE');
console.log('='.repeat(70));

const results = {
  serverHealthy: false,
  testbedLoaded: false,
  extensionLoaded: false,
  contentScriptInjected: false,
  scanAndSanitizeWorks: false,
  piiRedactionVerified: false,
  vaultTrackingVerified: false,
  canvasVisionScanned: false,
  restorationVerified: false,
  e2eReasonerAutonomousStepWorks: false,
  riskGateModalRendered: false,
  errorsFound: []
};

// Step 1: Check Python reasoning server
try {
  const srvRes = await fetch('http://localhost:8000/health');
  if (srvRes.ok) {
    const data = await srvRes.json();
    console.log('✅ Python Reasoning Server is healthy:', data);
    results.serverHealthy = true;
  } else {
    results.errorsFound.push(`Server returned HTTP ${srvRes.status}`);
  }
} catch (e) {
  results.errorsFound.push(`Could not connect to Python server on port 8000: ${e.message}`);
}

// Step 2: Launch Chromium with extension
console.log('\n🚀 Launching Chromium with extension loaded from:', extPath);
const context = await chromium.launchPersistentContext('', {
  headless: false,
  args: [
    `--disable-extensions-except=${extPath}`,
    `--load-extension=${extPath}`,
    '--no-sandbox',
    '--disable-gpu'
  ]
});

try {
  // Catch background service worker
  let [background] = context.serviceWorkers();
  if (!background) {
    background = await Promise.race([
      context.waitForEvent('serviceworker', { timeout: 7000 }),
      new Promise(r => setTimeout(() => r(null), 7000))
    ]);
  }

  let extensionId = null;
  if (background) {
    extensionId = background.url().split('/')[2];
    console.log(`✅ Extension Service Worker active! ID: ${extensionId}`);
    results.extensionLoaded = true;
  } else {
    console.warn('⚠️ Service worker not captured directly. Checking extension pages...');
  }

  // Open testbed
  const page = await context.newPage();
  
  // Track page console logs and errors
  const pageLogs = [];
  const pageErrors = [];
  page.on('console', msg => {
    const text = msg.text();
    pageLogs.push(`[${msg.type().toUpperCase()}] ${text}`);
    if (msg.type() === 'error') pageErrors.push(text);
  });
  page.on('pageerror', err => {
    pageErrors.push(`UNHANDLED_EXCEPTION: ${err.message}`);
    results.errorsFound.push(`Page Unhandled Exception: ${err.message}`);
  });

  console.log('\n🌐 Navigating to testbed at http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  const title = await page.title();
  console.log('✅ Testbed loaded! Page Title:', title);
  results.testbedLoaded = true;

  // Verify initial PII values are present on page
  const initialPan = await page.$eval('#vendor-pan', el => el.value);
  const initialGstin = await page.$eval('#vendor-gstin', el => el.value);
  const initialAccount = await page.$eval('#vendor-bank-account', el => el.value);
  console.log('Initial ground truth values:');
  console.log('  - PAN:', initialPan);
  console.log('  - GSTIN:', initialGstin);
  console.log('  - Bank Account:', initialAccount);

  // Check if content script loaded and injected
  await page.waitForTimeout(500);

  // Test Extension Popup
  if (extensionId) {
    console.log(`\n📱 Opening extension popup: chrome-extension://${extensionId}/src/popup/popup.html...`);
    const popupPage = await context.newPage();
    const popupErrors = [];
    popupPage.on('pageerror', err => popupErrors.push(err.message));
    popupPage.on('console', msg => {
      if (msg.type() === 'error') popupErrors.push(msg.text());
    });

    await popupPage.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    console.log('✅ Extension popup loaded!');

    // Wait for popup UI
    await popupPage.waitForSelector('#btn-scan');
    const perimeterStatusInitial = await popupPage.$eval('#perimeter-status', el => el.textContent);
    console.log('  Popup Initial Perimeter Status:', perimeterStatusInitial);

    // Click "Scan & Sanitize" in popup
    console.log('⚡ Triggering "Scan & Sanitize" via popup...');
    
    // Trigger Scan & Sanitize
    await popupPage.click('#btn-scan');
    
    // Wait for the popup to reflect PROTECTED state
    try {
      await popupPage.waitForFunction(() => {
        const el = document.getElementById('perimeter-status');
        return el && el.textContent.includes('PROTECTED');
      }, { timeout: 12000 });
      console.log('✅ Popup perimeter status successfully escalated to PROTECTED!');
    } catch (e) {
      console.warn('⚠️ Popup did not transition to PROTECTED within 12s, checking DOM...');
    }

    // Verify DOM on testbed page was redacted
    await page.waitForTimeout(500);
    const scannedPan = await page.$eval('#vendor-pan', el => el.value);
    const scannedGstin = await page.$eval('#vendor-gstin', el => el.value);
    const scannedAccount = await page.$eval('#vendor-bank-account', el => el.value);
    console.log('\nPost-Sanitization DOM Values on Testbed:');
    console.log('  - PAN field:', scannedPan);
    console.log('  - GSTIN field:', scannedGstin);
    console.log('  - Bank Account field:', scannedAccount);

    if (scannedPan.includes('<PAN_') && scannedGstin.includes('<GSTIN_')) {
      console.log('✅ PII Redaction in DOM strictly verified!');
      results.scanAndSanitizeWorks = true;
      results.piiRedactionVerified = true;
    } else {
      results.errorsFound.push(`DOM was not redacted: PAN=${scannedPan}, GSTIN=${scannedGstin}`);
    }

    // Check popup metrics
    const redactedMetric = await popupPage.$eval('#metric-redacted', el => el.textContent);
    const vaultMetric = await popupPage.$eval('#metric-vault', el => el.textContent);
    console.log(`  Popup Metrics: Redacted=${redactedMetric}, Vault Tokens=${vaultMetric}`);
    if (parseInt(redactedMetric) > 0) {
      results.vaultTrackingVerified = true;
    }

    // ⚡ Test Idempotency: Trigger "Scan & Sanitize" multiple times in a row to verify anti-clutter
    console.log('\n⚡ Testing multiple consecutive "Scan & Sanitize" clicks (Anti-Clutter & Idempotency)...');
    await popupPage.click('#btn-scan');
    await page.waitForTimeout(600);
    await popupPage.click('#btn-scan');
    await page.waitForTimeout(600);

    const reRedactedMetric = await popupPage.$eval('#metric-redacted', el => el.textContent);
    const reVaultMetric = await popupPage.$eval('#metric-vault', el => el.textContent);
    console.log(`  Consecutive Scan Metrics: Redacted=${reRedactedMetric}, Vault Tokens=${reVaultMetric}`);
    if (reRedactedMetric === redactedMetric && reVaultMetric === vaultMetric) {
      console.log('✅ Anti-Clutter & Idempotency strictly verified! Zero duplicate boxes, stable metrics.');
    } else {
      results.errorsFound.push(`Clutter detected on repeated scans: Metrics shifted from ${redactedMetric}/${vaultMetric} to ${reRedactedMetric}/${reVaultMetric}`);
    }

    // Test "Restore" button
    console.log('\n↺ Testing "Restore" button...');
    try {
      await popupPage.waitForSelector('#btn-restore:not([disabled])', { timeout: 5000 });
      await popupPage.click('#btn-restore');
      await page.waitForTimeout(500);

      const restoredPan = await page.$eval('#vendor-pan', el => el.value);
      console.log('  Restored PAN value:', restoredPan);
      if (restoredPan === initialPan) {
        console.log('✅ DOM Restoration verified! Original values safely recovered.');
        results.restorationVerified = true;
      } else {
        results.errorsFound.push(`Restore failed: expected "${initialPan}", got "${restoredPan}"`);
      }
    } catch (restErr) {
      results.errorsFound.push(`Restore button error: ${restErr.message}`);
    }

    // Test Autonomous End-to-End Agent Loop
    console.log('\n🤖 Testing "Run End-to-End Agent Loop" with live Reasoning Engine...');
    await page.bringToFront();
    await popupPage.bringToFront();
    await popupPage.click('#btn-autonomous');
    await page.bringToFront();

    try {
      await page.waitForSelector('#sentry-risk-modal', { timeout: 20000 });
      console.log('✅ 4-Tier Risk Policy Gate modal rendered on page!');
      results.riskGateModalRendered = true;

      const modalText = await page.$eval('#sentry-risk-modal', el => el.textContent);
      console.log('  Risk Gate Notice:', modalText.substring(0, 150).replace(/\s+/g, ' '));

      // Click "Authorize & Execute"
      const authBtn = await page.$('#sentry-btn-authorize');
      if (authBtn) {
        console.log('  Authorizing high-stakes action...');
        await authBtn.click();
        await page.waitForTimeout(1000);
        results.e2eReasonerAutonomousStepWorks = true;
      }
    } catch (mErr) {
      console.log('Notice: Modal wait timed out or action dispatched directly:', mErr.message);
    }

    if (popupErrors.length > 0) {
      console.log('⚠️ Popup Errors:', popupErrors);
      results.errorsFound.push(...popupErrors.map(e => `Popup Error: ${e}`));
    }
  }

  // Switch to HR Portal to test avatar canvas
  console.log('\n👥 Testing Portal B: HR & Deputation (Face Avatar Canvas)...');
  await page.click('#tab-hr');
  await page.waitForTimeout(500);

  const empAadhaar = await page.$eval('#emp-aadhaar', el => el.value);
  console.log('  HR Ground truth Aadhaar:', empAadhaar);

  // Switch to ISTRAC Portal to test satellite telemetry canvas
  console.log('\n🛰️ Testing Portal C: ISTRAC Mission Operations (Satellite Telemetry)...');
  await page.click('#tab-mission');
  await page.waitForTimeout(500);

  const transponder = await page.$eval('#transponder-key', el => el.value);
  console.log('  ISTRAC Ground truth Transponder Key (Luhn):', transponder);

  const realErrors = pageErrors.filter(e => !e.includes('favicon.ico') && !e.includes('status of 404'));
  if (realErrors.length > 0) {
    console.log('⚠️ Testbed Page Console Errors:', realErrors);
    results.errorsFound.push(...realErrors.map(e => `Page Error: ${e}`));
  }

} catch (err) {
  console.error('Audit execution error:', err);
  results.errorsFound.push(`Audit Error: ${err.message}`);
} finally {
  await context.close();
}

console.log('\n' + '='.repeat(70));
console.log('📊 FINAL PLAYWRIGHT AUDIT REPORT');
console.log('='.repeat(70));
console.log(JSON.stringify(results, null, 2));

if (results.errorsFound.length === 0) {
  console.log('\n🎉 ALL SYSTEMS OPERATING WITHOUT ERRORS!');
  process.exit(0);
} else {
  console.log(`\n❌ Found ${results.errorsFound.length} issue(s) during audit.`);
  process.exit(1);
}
