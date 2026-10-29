import { existsSync } from 'node:fs';
import { chromium } from '@playwright/test';

/**
 * Launch Chromium for QA / rendering. Uses CHROMIUM_PATH, then Playwright's own
 * managed browser, then the preinstalled /opt/pw-browsers/chromium.
 */
export async function launch(opts = {}) {
  const candidates = [process.env.CHROMIUM_PATH, undefined, '/opt/pw-browsers/chromium'];
  let lastErr;
  for (const executablePath of candidates) {
    if (executablePath && !existsSync(executablePath)) continue;
    try {
      return await chromium.launch({ executablePath, args: ['--font-render-hinting=none', '--disable-lcd-text'], ...opts });
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}
