import fs from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';
import { OUT } from './tour-kit';

// Title and section cards for the tour video, in the game's paper-and-ink style (Nunito, from the app's own fonts).
const FONT = path.resolve('node_modules/@fontsource/nunito/files');
const face = (weight: number) =>
  `@font-face{font-family:Nunito;font-weight:${weight};src:url('file://${FONT}/nunito-latin-${weight}-normal.woff2') format('woff2');}`;

const page = (body: string, width = 1440, height = 900) => `<!doctype html><html><head><meta charset="utf-8"><style>
${face(700)}${face(800)}${face(900)}
html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden}
body{font-family:Nunito,system-ui,sans-serif;color:#2f2a22;background:linear-gradient(180deg,#8cc7df 0%,#cfe6e8 42%,#f6e8c8 72%);display:flex;align-items:center;justify-content:center}
.card{background:#fffaf0;border:3px solid #e3d2ad;border-radius:32px;box-shadow:0 5px 0 #e3d2ad,0 30px 60px -30px rgba(60,40,10,.6);padding:48px 64px;max-width:980px}
h1{font-weight:900;font-size:76px;margin:0;letter-spacing:-1px}
h2{font-weight:900;font-size:44px;margin:0}
p{font-weight:700;font-size:26px;color:#6b604f;margin:14px 0 0}
ul{margin:26px 0 0;padding:0;list-style:none;columns:2;column-gap:48px}
li{font-weight:800;font-size:22px;margin:0 0 12px;break-inside:avoid}
li::before{content:'';display:inline-block;width:14px;height:14px;border-radius:4px;background:#3f7d4e;margin-right:12px;transform:rotate(45deg)}
.hills{position:fixed;left:0;right:0;bottom:0;height:220px;background:radial-gradient(120% 100% at 30% 100%,#8ca95b 60%,transparent 61%),radial-gradient(120% 100% at 80% 100%,#a2bc6c 60%,transparent 61%)}
</style></head><body><div class="hills"></div>${body}</body></html>`;

const CARDS: Record<string, string> = {
  title: `<div class="card"><h1>Mastery Grove</h1><p>A 3D forest where every question on a worksheet is a tree. Feature tour, version 2.</p><ul>
    <li>Answer stones and the fox</li><li>Byte, the Gemini tutor</li><li>Hands-on cake and bridge</li><li>Bridges built by learning</li>
    <li>Mia: teach it back</li><li>Memory checks next session</li><li>The teacher view</li><li>Reading worlds</li>
    <li>Grow a forest from a photo</li><li>Class rooms and phones</li></ul></div>`,
  class: `<div class="card"><h2>Play together</h2><p>Aisha and Wei Jie join the teacher’s class room on their own laptops. They see each other in the forest, the teacher sees them on the roster, and a quest from the teacher reaches both.</p></div>`,
  classCorner: `<div class="card" style="padding:28px 36px;max-width:560px"><h2 style="font-size:34px">Class room</h2><p style="font-size:21px">Top: Aisha and Wei Jie, each on their own device. Left: the teacher’s view, live.</p></div>`,
  end: `<div class="card"><h1>Mastery Grove</h1><p>Built by Afshal Gulam, Roshan Premil and Sophie Cloué.<br>github.com/AfshalG/mastery-grove</p></div>`,
};

test('tour cards', async ({ browser }) => {
  const dir = path.join(OUT, 'cards');
  fs.mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  for (const [name, body] of Object.entries(CARDS)) {
    const [w, h] = name === 'classCorner' ? [720, 450] : [1440, 900];
    await p.setViewportSize({ width: w, height: h });
    const file = path.join(dir, `${name}.html`);
    fs.writeFileSync(file, page(body, w, h));
    await p.goto(`file://${file}`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(dir, `${name}.png`) });
  }
  // The phone clip sits on the sky, with a caption beside it.
  await p.setViewportSize({ width: 1440, height: 900 });
  const phoneFile = path.join(dir, 'phone-bg.html');
  fs.writeFileSync(
    phoneFile,
    page(
      `<div class="card" style="position:fixed;left:70px;top:50%;transform:translateY(-50%);max-width:470px;padding:36px 40px"><h2>On a phone</h2><p>The same forest, made for thumbs: questions come up as a sheet with the stones above, missions fold into one line, and a pad to walk.</p></div>`,
    ),
  );
  await p.goto(`file://${phoneFile}`);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(dir, 'phone-bg.png') });
  await ctx.close();
});
