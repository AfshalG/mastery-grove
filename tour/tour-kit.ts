// Helpers for recording the feature tour: captions and a visible cursor drawn over the game, and a few moves
// (click with the cursor, type slowly, walk, tap a point in the 3D scene) paced for a viewer.
import fs from 'node:fs';
import path from 'node:path';
import { expect, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';

export const OUT = path.resolve('tour-out');

/** Captions and a cursor, drawn over the page in the game's own paper-and-ink style. Re-injected on every load. */
const OVERLAY = `(() => {
  if (window.__tour) return;
  let root, cap, title, sub, cursor, ripple;
  const ensure = () => {
    if (root && root.isConnected) return;
    root = document.createElement('div');
    root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
    cap = document.createElement('div');
    cap.style.cssText = 'position:absolute;left:50%;bottom:24px;transform:translate(-50%,14px);max-width:min(640px,calc(100vw - 32px));width:max-content;background:#fffaf0;color:#2f2a22;border:2px solid #e3d2ad;border-radius:18px;padding:11px 20px 12px;box-shadow:0 3px 0 #e3d2ad,0 18px 36px -16px rgba(60,40,10,.6);font-family:Nunito,system-ui,sans-serif;opacity:0;transition:opacity .35s ease,transform .35s ease;text-align:center;';
    title = document.createElement('div');
    title.style.cssText = 'font-weight:900;font-size:20px;line-height:1.25;';
    sub = document.createElement('div');
    sub.style.cssText = 'font-weight:700;font-size:15px;line-height:1.35;color:#6b604f;margin-top:3px;';
    cap.append(title, sub);
    cursor = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    cursor.setAttribute('viewBox', '0 0 24 24');
    cursor.setAttribute('width', '30');
    cursor.setAttribute('height', '30');
    cursor.innerHTML = '<path d="M4 2 L 4 19 L 8.6 14.8 L 11.6 21.4 L 14.6 20 L 11.7 13.6 L 18 13.4 Z" fill="#fffaf0" stroke="#2f2a22" stroke-width="1.8" stroke-linejoin="round"/>';
    cursor.style.cssText = 'position:absolute;left:50%;top:60%;transform:translate(-4px,-2px);transition:left .6s cubic-bezier(.3,.7,.2,1),top .6s cubic-bezier(.3,.7,.2,1),opacity .3s;filter:drop-shadow(0 3px 4px rgba(0,0,0,.35));opacity:0;';
    ripple = document.createElement('div');
    ripple.style.cssText = 'position:absolute;width:40px;height:40px;border-radius:50%;border:4px solid #f2c14e;opacity:0;';
    root.append(cap, ripple, cursor);
    document.body.appendChild(root);
  };
  window.__tour = {
    caption(t, s) {
      ensure();
      title.textContent = t;
      sub.textContent = s || '';
      sub.style.display = s ? 'block' : 'none';
      cap.style.opacity = '1';
      cap.style.transform = 'translate(-50%,0)';
    },
    hide() {
      ensure();
      cap.style.opacity = '0';
      cap.style.transform = 'translate(-50%,14px)';
    },
    move(x, y) {
      ensure();
      cursor.style.opacity = '1';
      cursor.style.left = x + 'px';
      cursor.style.top = y + 'px';
    },
    tap(x, y) {
      ensure();
      ripple.style.transition = 'none';
      ripple.style.left = x - 20 + 'px';
      ripple.style.top = y - 20 + 'px';
      ripple.style.opacity = '1';
      ripple.style.transform = 'scale(.35)';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        ripple.style.transition = 'transform .5s ease-out,opacity .5s ease-out';
        ripple.style.transform = 'scale(1.5)';
        ripple.style.opacity = '0';
      }));
    },
    hideCursor() {
      ensure();
      cursor.style.opacity = '0';
    },
  };
})();`;

export class Tour {
  readonly started = Date.now();
  readonly marks: Record<string, number> = {};

  private constructor(
    readonly name: string,
    readonly context: BrowserContext,
    readonly page: Page,
  ) {}

  /** A new browser window whose screen is recorded to tour-out/<name>.webm. */
  static async open(
    browser: Browser,
    name: string,
    options: Parameters<Browser['newContext']>[0] & { videoSize?: { width: number; height: number } },
  ) {
    const { videoSize, ...contextOptions } = options ?? {};
    const size = videoSize ?? contextOptions.viewport ?? { width: 1440, height: 900 };
    fs.mkdirSync(path.join(OUT, name), { recursive: true });
    const context = await browser.newContext({ ...contextOptions, recordVideo: { dir: path.join(OUT, name), size } });
    await context.addInitScript(OVERLAY);
    const page = await context.newPage();
    const tour = new Tour(name, context, page);
    tour.mark('open');
    await page.goto('/?debug=1');
    return tour;
  }

  /** Seconds since recording began, saved alongside the video (for speeding up waits when the video is cut). */
  mark(key: string) {
    this.marks[key] = (Date.now() - this.started) / 1000;
  }

  async finish() {
    const video = this.page.video();
    this.mark('end');
    await this.context.close();
    if (video) await video.saveAs(path.join(OUT, `${this.name}.webm`));
    fs.writeFileSync(path.join(OUT, `${this.name}.marks.json`), JSON.stringify({ started: this.started, marks: this.marks }, null, 2));
  }

  wait(ms: number) {
    return this.page.waitForTimeout(ms);
  }

  /** Prints how far into the take each step starts, so a slow step shows up as a gap. */
  log(what: string) {
    console.log(`[${this.name} ${((Date.now() - this.started) / 1000).toFixed(1)}s] ${what}`);
  }

  async caption(title: string, sub = '', holdMs = 0) {
    this.log(`caption: ${title}`);
    await this.page.evaluate(([t, s]) => (window as any).__tour?.caption(t, s), [title, sub] as const);
    if (holdMs) await this.wait(holdMs);
  }

  async hideCaption() {
    await this.page.evaluate(() => (window as any).__tour?.hide());
  }

  async pointAt(x: number, y: number, settleMs = 650) {
    await this.page.evaluate(([px, py]) => (window as any).__tour?.move(px, py), [x, y] as const);
    await this.wait(settleMs);
  }

  async centre(target: Locator) {
    await target.waitFor({ state: 'visible', timeout: 60_000 });
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box) throw new Error('Nothing to point at');
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  async point(target: Locator, settleMs = 650) {
    const c = await this.centre(target);
    await this.pointAt(c.x, c.y, settleMs);
  }

  /** Moves the drawn cursor there, shows the tap, then clicks for real. */
  async click(target: Locator, afterMs = 450) {
    this.log(`click ${target}`);
    const c = await this.centre(target);
    this.log('  pointing');
    await this.pointAt(c.x, c.y);
    await this.page.evaluate(([px, py]) => (window as any).__tour?.tap(px, py), [c.x, c.y] as const);
    await target.click();
    this.log('  clicked');
    await this.wait(afterMs);
  }

  async clickAt(x: number, y: number, afterMs = 450) {
    await this.pointAt(x, y);
    await this.page.evaluate(([px, py]) => (window as any).__tour?.tap(px, py), [x, y] as const);
    await this.page.mouse.click(x, y);
    await this.wait(afterMs);
  }

  async type(target: Locator, text: string) {
    await this.click(target, 200);
    await target.pressSequentially(text, { delay: 30 });
    await this.wait(400);
  }

  async hold(key: string, ms: number) {
    await this.page.keyboard.down(key);
    await this.wait(ms);
    await this.page.keyboard.up(key);
  }

  state(): Promise<any> {
    return this.page.evaluate(() => (window as any).__mg.store.getState());
  }

  call(fn: string, ...args: unknown[]): Promise<any> {
    return this.page.evaluate(([name, a]) => (window as any).__mg.store.getState()[name as string](...(a as unknown[])), [
      fn,
      args,
    ] as const);
  }

  /** Where a point in the 3D forest is on screen right now. */
  project(p: [number, number, number]): Promise<{ x: number; y: number }> {
    return this.page.evaluate(([x, y, z]) => {
      const { camera, size } = (window as any).__mg.three;
      const v = new camera.position.constructor(x, y, z).project(camera);
      return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height };
    }, p);
  }

  /** Waits until the store says so (or gives up quietly after timeoutMs, so one slow reply never sinks the tour). */
  async until(check: (s: any) => boolean, timeoutMs = 60_000) {
    this.log(`until (up to ${timeoutMs / 1000}s)`);
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      const s = await this.state();
      if (check(s)) return true;
      await this.wait(250);
    }
    return false;
  }

  async canvasReady() {
    await expect(this.page.locator('canvas').first()).toBeVisible({ timeout: 60_000 });
    await this.wait(1500);
  }
}
