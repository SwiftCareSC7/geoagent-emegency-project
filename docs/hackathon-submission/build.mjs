// Renders pitch.html and report.html to A4 PDFs with the repo's Playwright Chromium.
// Usage: node docs/hackathon-submission/build.mjs <outDir> [--markers]
//   --markers  adds hidden page markers so toc-pages.py can find each chapter's page.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.argv[2] || join(here, 'out'));
const markers = process.argv.includes('--markers');
const sub = JSON.parse(readFileSync(join(here, 'submission.json'), 'utf8'));
const tocPages = existsSync(join(here, '.build/toc-pages.json'))
  ? JSON.parse(readFileSync(join(here, '.build/toc-pages.json'), 'utf8')) : {};

const PLACEHOLDERS = {
  TEAM_NAME: '[ENTER TEAM NAME]',
  MEMBER_1: '[TEAM MEMBER 1 — FULL NAME]',
  MEMBER_2: '[TEAM MEMBER 2 — FULL NAME]',
  MEMBER_3: '[TEAM MEMBER 3 — FULL NAME]',
  MEMBER_4: '[TEAM MEMBER 4 — FULL NAME]',
  WEBSITE_URL: '[PASTE WEBSITE URL HERE]',
  VIDEO_URL: '[PASTE GOOGLE DRIVE VIDEO LINK HERE]',
};
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const fill = (html) => html
  .replace(/\{\{(TEAM_NAME|MEMBER_[1-4]|WEBSITE_URL|VIDEO_URL)\}\}/g, (_, k) => {
    const v = String(sub[k] || '').trim();
    if (!v) return `<span class="ph">${PLACEHOLDERS[k]}</span>`;
    // Only real http(s) links become clickable.
    return /_URL$/.test(k) && /^https?:\/\//.test(v) ? `<a href="${esc(v)}">${esc(v)}</a>` : esc(v);
  })
  .replace(/\{\{PG:([\w-]+)\}\}/g, (_, id) => tocPages[id] ?? '–')
  .replace(/<!--MK:([\w-]+)-->/g, (_, id) => markers
    ? `<span style="position:absolute;font-size:2px;color:transparent">@@${id}@@</span>` : '');

mkdirSync(join(here, '.build'), { recursive: true });
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
for (const [src, out] of [['pitch.html', 'SwiftCare-GeoAgent-Hackathon-Pitch.pdf'], ['report.html', 'SwiftCare-GeoAgent-Technical-Report.pdf']]) {
  const built = join(here, '.build', src);
  writeFileSync(built, fill(readFileSync(join(here, src), 'utf8')).replace('href="styles.css"', `href="${join(here, 'styles.css')}"`));
  const page = await browser.newPage();
  await page.goto('file://' + built, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: join(outDir, out), preferCSSPageSize: true, printBackground: true });
  await page.close();
  console.log('wrote', join(outDir, out));
}
await browser.close();
