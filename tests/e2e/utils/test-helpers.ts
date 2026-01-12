import type { Page, Locator } from '@playwright/test';

/**
 * Test helper utilities for E2E tests
 */

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for element to be visible and stable
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout = 10000
): Promise<Locator> {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout });
  return element;
}

/**
 * Fill form field with wait
 */
export async function fillField(
  page: Page,
  selector: string,
  value: string
): Promise<void> {
  const field = await waitForElement(page, selector);
  await field.fill(value);
}

/**
 * Click button and wait for navigation or response
 */
export async function clickAndWait(
  page: Page,
  selector: string,
  waitForUrl?: string | RegExp
): Promise<void> {
  const button = await waitForElement(page, selector);

  if (waitForUrl) {
    await Promise.all([page.waitForURL(waitForUrl), button.click()]);
  } else {
    await button.click();
  }
}

/**
 * Wait for toast/notification message
 */
export async function waitForNotification(
  page: Page,
  text: string,
  timeout = 5000
): Promise<void> {
  await page.getByText(text).waitFor({ state: 'visible', timeout });
}

/**
 * Wait for API request to complete
 */
export async function waitForApiRequest(
  page: Page,
  urlPattern: string | RegExp,
  method = 'GET'
): Promise<any> {
  const response = await page.waitForResponse(
    (response) =>
      (typeof urlPattern === 'string'
        ? response.url().includes(urlPattern)
        : urlPattern.test(response.url())) && response.request().method() === method
  );
  return response.json();
}

/**
 * Type text with realistic delays (for collaborative editing tests)
 */
export async function typeWithDelay(
  element: Locator,
  text: string,
  delayMs = 50
): Promise<void> {
  for (const char of text) {
    await element.type(char, { delay: delayMs });
  }
}

/**
 * Select text in editor
 */
export async function selectTextInEditor(
  page: Page,
  editorSelector: string,
  startOffset: number,
  endOffset: number
): Promise<void> {
  await page.evaluate(
    ({ selector, start, end }) => {
      const editor = document.querySelector(selector) as HTMLTextAreaElement;
      if (editor) {
        editor.focus();
        editor.setSelectionRange(start, end);
        // Dispatch selection change event
        editor.dispatchEvent(new Event('select', { bubbles: true }));
      }
    },
    { selector: editorSelector, start: startOffset, end: endOffset }
  );
}

/**
 * Get selected text from editor
 */
export async function getSelectedText(
  page: Page,
  editorSelector: string
): Promise<string> {
  return page.evaluate((selector) => {
    const editor = document.querySelector(selector) as HTMLTextAreaElement;
    if (editor) {
      return editor.value.substring(editor.selectionStart, editor.selectionEnd);
    }
    return '';
  }, editorSelector);
}

/**
 * Get editor content
 */
export async function getEditorContent(
  page: Page,
  editorSelector: string
): Promise<string> {
  return page.evaluate((selector) => {
    const editor = document.querySelector(selector) as HTMLTextAreaElement;
    return editor?.value || '';
  }, editorSelector);
}

/**
 * Set editor content (for test setup)
 */
export async function setEditorContent(
  page: Page,
  editorSelector: string,
  content: string
): Promise<void> {
  await page.evaluate(
    ({ selector, text }) => {
      const editor = document.querySelector(selector) as HTMLTextAreaElement;
      if (editor) {
        editor.value = text;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      }
    },
    { selector: editorSelector, text: content }
  );
}

/**
 * Wait for WebSocket connection
 */
export async function waitForWebSocketConnection(
  page: Page,
  timeout = 10000
): Promise<void> {
  await page.waitForFunction(
    () => {
      // Check for connection status indicator or WebSocket ready state
      const statusEl = document.querySelector('[data-testid="connection-status"]');
      return statusEl?.textContent?.includes('Connected');
    },
    { timeout }
  );
}

/**
 * Simulate user presence (for multi-user tests)
 */
export async function simulateUserPresence(
  page: Page,
  username: string,
  color: string
): Promise<void> {
  // This would interact with the Yjs awareness API
  await page.evaluate(
    ({ name, userColor }) => {
      // Access the Yjs provider if available
      const provider = (window as any).__yjsProvider;
      if (provider?.awareness) {
        provider.awareness.setLocalStateField('user', {
          name,
          color: userColor,
        });
      }
    },
    { name: username, userColor: color }
  );
}

/**
 * Take screenshot with timestamp
 */
export async function takeTimestampedScreenshot(
  page: Page,
  name: string
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `playwright-report/screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Debug helper - pause test and open inspector
 */
export async function debugPause(page: Page): Promise<void> {
  await page.pause();
}
