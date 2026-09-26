# Tester: card 2.2 failing checks

- Session: `ses_f22f53a90ffesC0mhCXQhoYfTt`
- Agent: gw-tester
- Model: deepseek/deepseek-flash#max
- Created: 2026-09-26T09:27:45.909Z
- Messages: 24
- Tokens: input 37718, output 12378, reasoning 39833, cache read 1299072, cache write 0
- Cost: $0.040882

---

## User

You are a subagent spawned by another session.
You are the Groundwork tester for this project. Read and follow `.groundwork/roles/tester.md` exactly, in repo `C:\Users\rames\Desktop\calculator-groundwork` (Windows, PowerShell 5.1).

Your card: `.groundwork/cards/2.2-wire-it-up.md` — status `testing`; the behavior was just agreed with the human via `gw-ui-spec`.

Checked facts, so you don't have to rediscover them:
- Engine `src/calc.js`: `createCalculator()` returns `{ display: '0', press(key) }`. `press` accepts `'0'`–`'9'`, `'.'`, `'+'`, `'-'`, `'*'`, `'/'`, `'='`, `'C'`; ignored presses leave `display` unchanged. In a browser it publishes the global `createCalculator` (no module object in the page); Node `require` also works.
- `index.html` today: `#display` (aria-live `polite`, text `0`) and `.keypad` with 17 `<button>`s labeled `0–9 . + − × ÷ = C`. No `<script>` tags yet. `styles.css` exists — this card should not restyle.
- `test/ui-page.test.js` already drives headless Edge over the DevTools protocol using only Node built-ins (`fetch`/`WebSocket`) and loads the page over `file://` — reuse that approach for the wiring checks.
- Baseline: `node --test` is 48/48 before your tests. Test command is `node --test`; no lint/build/dependencies.
- The agreed implementation (human-approved): add `src/ui.js` with per-button listeners; map labels there (`×`→`*`, `÷`→`/`, `−`→`-`); call `press` and write `display` into `#display`. No arithmetic in the UI code. Add the script tags in order `src/calc.js` then `src/ui.js`.

Your job: turn each acceptance criterion on the card into a test that fails now and will pass when the card is done. Save the failing output as evidence in `.groundwork/evidence/2.2/`, link it from the card's Evidence, set the card status to `implementing`, add the History line, and report back with: files created/changed, the exact command, its summary line, and anything the implementer must know. Do not implement the app or change the criteria; if a criterion can't be automated as written, say so in your report instead of dropping it.

## Assistant


<details>
<summary>Reasoning</summary>

```
Let me start by reading the role file and the card as instructed.
```

</details>

<details>
<summary>Tool: read</summary>

```json
{
  "path": "C:\\Users\\rames\\Desktop\\calculator-groundwork\\.groundwork\\roles\\tester.md"
}
```

```
Read file C:\Users\rames\Desktop\calculator-groundwork\.groundwork\roles\tester.md, lines 1-30
1: # Role: Tester
2: 
3: ## Job
4: Turn the current card's acceptance criteria into tests that fail now and will pass when the card is done.
5: 
6: 1. Write one or more tests per acceptance criterion.
7: 2. Run them and confirm they fail **for the right reason** (the feature is missing, not a typo or broken import).
8: 3. Add manual checks only for criteria that can't be automated (for example, how something looks). Don't repeat criteria that a test already covers.
9: 4. For a criterion that only shows in the running app, write a browser check (a script that starts the app with `run`, or the way you worked out if `run` is empty, drives a real or headless browser, and asserts what's on screen). Save it in the repo next to the tests, not in a temp folder, and put the command that reruns it under the card's **How to check**, so the implementer and reviewer rerun the same check.
10: 5. Set the card status to `implementing`.
11: 
12: ## Load
13: Read only these:
14: - `.groundwork/HANDOFF.md`
15: - The current card in `.groundwork/cards/`
16: - The Codebase map in `.groundwork/SPEC.md`, if there is one, then only the files it points to
17: - Existing tests near the code this card touches, to match their style
18: - The project's test and run commands in `.groundwork/config.json`
19: 
20: ## Writes
21: - Test files
22: - The card: status, plus any manual checks
23: - The failing test output, saved to `.groundwork/evidence/<card-id>/`: the command, the summary line and the failures, about 30 lines at most, not the full output
24: - `.groundwork/HANDOFF.md`, when you play every role yourself. As a subagent, put what HANDOFF needs in your report instead; the runner writes it.
25: 
26: ## Must not
27: - Write the implementation, not even a stub that makes a test pass.
28: - Weaken a test to make it easier to pass later.
29: - Write tests that only check a file exists or its source contains some text, just to have something that fails. Test behavior.
30: - Test things the card doesn't ask for. Note extra ideas in HANDOFF instead.
```

</details>

<details>
<summary>Tool: read</summary>

```json
{
  "path": "C:\\Users\\rames\\Desktop\\calculator-groundwork\\.groundwork\\cards\\2.2-wire-it-up.md"
}
```

```
Read file C:\Users\rames\Desktop\calculator-groundwork\.groundwork\cards\2.2-wire-it-up.md, lines 1-33
1: ---
2: id: 2.2
3: title: Wire it up
4: phase: 2
5: status: testing
6: depends_on: [2.1, 1.4]
7: ---
8: ## Goal
9: Clicking the keys drives the engine in `src/calc.js` (from `src/ui.js`): the display updates as you type, results and errors appear, and Clear resets. `src/ui.js` maps button labels to engine keys and renders the engine's display string; it contains no arithmetic.
10: 
11: ## Acceptance criteria
12: - [ ] On the open page, clicking `2 + 3 =` shows `5`; clicking `5 + 3 =` shows `8`, and `=` again shows `11`.
13: - [ ] Clicking `1 . 5 + 2 . 5 =` shows `4` — the decimal and digit buttons all work.
14: - [ ] Clicking `1 ÷ 0 =` shows `Error`; clicking any other key leaves `Error` showing.
15: - [ ] Clicking `C` after the error shows `0`, and the calculator works again.
16: - [ ] Every button press updates the display immediately, so typing shows the current number.
17: - [ ] Pressing Enter or Space on a focused key gives the same display change as clicking it.
18: - [ ] The page has one arithmetic implementation: `src/ui.js` maps labels (`×`→`*`, `÷`→`/`, `−`→`-`), calls `press`, and writes `display` into `#display` — no arithmetic, digit limits, rounding or error rules in the UI code.
19: - [ ] Opening `index.html` loads `src/calc.js` before `src/ui.js`, logs no console errors, and the controls are live on first load.
20: - [ ] At 375/768/1440, updating the display does not wrap it or add a scrollbar.
21: 
22: ## How to check
23: - Run `start index.html` and click the sequences above; the display must match the engine tests' behavior.
24: - Press Tab to a key and use Enter/Space: the same change appears as a click.
25: - Automated: browser-driven checks click real buttons and read `#display`; run `node --test`.
26: - Screenshots of a result and the `Error` state are saved in `.groundwork/evidence/2.2/`.
27: 
28: ## Evidence
29: 
30: ## History
31: 2026-09-26 planned
32: 2026-09-26 gw-ui-spec: behavior agreed with human (thin UI over the engine; label mapping in `src/ui.js`, per-button listeners)
33: 2026-09-26 started (status → testing)
```

</details>

## Assistant


<details>
<summary>Reasoning</summary>

```
Let me read the HANDOFF.md, config.json, SPEC.md codebase map, and the existing test file.
```

</details>

<details>
<summary>Tool: read</summary>

```json
{
  "path": "C:\\Users\\rames\\Desktop\\calculator-groundwork\\.groundwork\\HANDOFF.md"
}
```

```
Read file C:\Users\rames\Desktop\calculator-groundwork\.groundwork\HANDOFF.md, lines 1-12
1: # Handoff
2: 
3: <!-- The current state, overwritten (not appended) at every role change and before stopping.
4:      A fresh session, in any tool or model, should be able to continue from this file plus the current card. -->
5: 
6: - **Phase:** 2 — Browser UI (in progress; phase 1 approved 2026-09-26)
7: - **Current card:** 2.2 Wire it up
8: - **Status:** testing (tester next)
9: - **Last step:** `gw-ui-spec` agreed with the human for 2.2 (2026-09-26), criteria written, card started
10: - **Next step:** tester writes the failing wiring checks into `.groundwork/evidence/2.2/`, then hands to the implementer
11: - **Failing checks:** none — full suite 48/48 at commit 134ed50
12: - **Notes:** Phase-1 caveats and card 2.1 caveats (pointer/touch feel not verified live; checked in headless Edge) are on the cards' Evidence. approvalMode is `per-phase` at the human's request.
```

</details>

<details>
<summary>Tool: read</summary>

```json
{
  "path": "C:\\Users\\rames\\Desktop\\calculator-groundwork\\.groundwork\\config.json"
}
```

```
Read file C:\Users\rames\Desktop\calculator-groundwork\.groundwork\config.json, lines 1-16
1: {
2:   "$schema": "./config.schema.json",
3:   "version": "0.6.2",
4:   "approvalMode": "per-phase",
5:   "experience": "experienced",
6:   "tokenBudget": 2000,
7:   "guards": [],
8:   "commitFormat": "[{id}] {title}",
9:   "commands": {
10:     "install": "",
11:     "test": "node --test",
12:     "lint": "",
13:     "build": "",
14:     "run": "start index.html"
15:   }
16: }
```

</details>

<details>
<summary>Tool: read</summary>

```json
{
  "path": "C:\\Users\\rames\\Desktop\\calculator-groundwork\\test\\ui-page.test.js"
}
```

```
Read file C:\Users\rames\Desktop\calculator-groundwork\test\ui-page.test.js, lines 1-682
1: 'use strict';
2: 
3: const { test, before, after } = require('node:test');
4: const assert = require('node:assert/strict');
5: const { spawn } = require('node:child_process');
6: const fs = require('node:fs');
7: const os = require('node:os');
8: const path = require('node:path');
9: const { pathToFileURL } = require('node:url');
10: 
11: const REPO_ROOT = path.join(__dirname, '..');
12: const INDEX_PATH = path.join(REPO_ROOT, 'index.html');
13: const DISPLAY_SELECTOR = '#display, [data-display], output, .display';
14: const PRESSED_KEY = '7';
15: 
16: const EXPECTED_LABELS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '+', '−', '×', '÷', '=', 'C'];
17: const EXPECTED_ROWS = [
18:   ['C', '÷'],
19:   ['7', '8', '9', '×'],
20:   ['4', '5', '6', '−'],
21:   ['1', '2', '3', '+'],
22:   ['0', '.', '='],
23: ];
24: const ARIA_LABELS = { '÷': 'divide', '×': 'multiply', '−': 'minus', '=': 'equals', 'C': 'clear' };
25: 
26: const KEYSTROKES = {
27:   Tab: { key: 'Tab', code: 'Tab', keyCode: 9, text: null },
28:   Enter: { key: 'Enter', code: 'Enter', keyCode: 13, text: '\r' },
29:   Space: { key: ' ', code: 'Space', keyCode: 32, text: ' ' },
30: };
31: 
32: const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
33: 
34: class Cdp {
35:   constructor(url) {
36:     this.url = url;
37:     this.ws = null;
38:     this.nextId = 0;
39:     this.pending = new Map();
40:     this.listeners = new Map();
41:   }
42: 
43:   async open() {
44:     this.ws = new WebSocket(this.url);
45:     await new Promise((resolve, reject) => {
46:       this.ws.addEventListener('open', resolve, { once: true });
47:       this.ws.addEventListener('error', () => reject(new Error(`Could not open the DevTools websocket at ${this.url}.`)), { once: true });
48:     });
49:     this.ws.addEventListener('message', (event) => this.receive(event.data));
50:     this.ws.addEventListener('close', () => {
51:       for (const { reject } of this.pending.values()) reject(new Error('The DevTools connection closed.'));
52:       this.pending.clear();
53:     });
54:   }
55: 
56:   receive(data) {
57:     let message;
58:     try {
59:       message = JSON.parse(typeof data === 'string' ? data : String(data));
60:     } catch {
61:       return;
62:     }
63:     if (message.id && this.pending.has(message.id)) {
64:       const { resolve, reject } = this.pending.get(message.id);
65:       this.pending.delete(message.id);
66:       if (message.error) reject(new Error(`DevTools error ${message.error.code}: ${message.error.message}`));
67:       else resolve(message.result);
68:     } else if (message.method) {
69:       for (const listener of this.listeners.get(message.method) || []) listener(message.params);
70:     }
71:   }
72: 
73:   send(method, params = {}) {
74:     const id = ++this.nextId;
75:     return new Promise((resolve, reject) => {
76:       this.pending.set(id, { resolve, reject });
77:       this.ws.send(JSON.stringify({ id, method, params }));
78:     });
79:   }
80: 
81:   on(method, listener) {
82:     if (!this.listeners.has(method)) this.listeners.set(method, new Set());
83:     this.listeners.get(method).add(listener);
84:     return () => this.listeners.get(method).delete(listener);
85:   }
86: 
87:   close() {
88:     try {
89:       this.ws.close();
90:     } catch {}
91:   }
92: }
93: 
94: function waitForEvent(client, method, ms) {
95:   return new Promise((resolve, reject) => {
96:     const timer = setTimeout(() => {
97:       off();
98:       reject(new Error(`Timed out after ${ms}ms waiting for ${method}.`));
99:     }, ms);
100:     const off = client.on(method, (params) => {
101:       clearTimeout(timer);
102:       off();
103:       resolve(params);
104:     });
105:   });
106: }
107: 
108: function findBrowser() {
109:   if (process.env.UI_BROWSER) {
110:     assert.ok(fs.existsSync(process.env.UI_BROWSER), `UI_BROWSER points at a missing file: ${process.env.UI_BROWSER}`);
111:     return process.env.UI_BROWSER;
112:   }
113:   const candidates = process.platform === 'win32'
114:     ? [
115:         'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
116:         'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
117:         'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
118:         'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
119:       ]
120:     : [
121:         '/usr/bin/microsoft-edge',
122:         '/usr/bin/google-chrome',
123:         '/usr/bin/chromium',
124:         '/usr/bin/chromium-browser',
125:         '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
126:       ];
127:   const found = candidates.find((candidate) => fs.existsSync(candidate));
128:   assert.ok(found, 'No Chromium browser found for the UI check. Install Edge or Chrome, or set UI_BROWSER to a browser executable.');
129:   return found;
130: }
131: 
132: async function launchBrowser() {
133:   const executable = findBrowser();
134:   const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calc-ui-check-'));
135:   const child = spawn(executable, [
136:     '--headless=new',
137:     '--disable-gpu',
138:     '--no-first-run',
139:     '--no-default-browser-check',
140:     '--disable-extensions',
141:     '--mute-audio',
142:     '--remote-allow-origins=*',
143:     `--user-data-dir=${userDataDir}`,
144:     '--remote-debugging-port=0',
145:     'about:blank',
146:   ], { stdio: 'ignore', windowsHide: true });
147: 
148:   const cleanup = async () => {
149:     try {
150:       child.kill();
151:     } catch {}
152:     await Promise.race([new Promise((resolve) => child.once('exit', resolve)), sleep(3000)]);
153:     for (let attempt = 0; attempt < 10; attempt++) {
154:       try {
155:         fs.rmSync(userDataDir, { recursive: true, force: true });
156:         break;
157:       } catch {
158:         await sleep(300);
159:       }
160:     }
161:   };
162: 
163:   try {
164:     const portFile = path.join(userDataDir, 'DevToolsActivePort');
165:     const deadline = Date.now() + 20000;
166:     let port = 0;
167:     while (Date.now() < deadline) {
168:       if (child.exitCode !== null) throw new Error(`The browser exited before it was ready (code ${child.exitCode}).`);
169:       if (fs.existsSync(portFile)) {
170:         port = Number(fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0].trim());
171:         if (Number.isInteger(port) && port > 0) break;
172:       }
173:       await sleep(100);
174:     }
175:     if (!port) throw new Error('The browser did not report a DevTools port within 20 seconds.');
176: 
177:     let target = null;
178:     while (!target && Date.now() < deadline) {
179:       try {
180:         const response = await fetch(`http://127.0.0.1:${port}/json/list`);
181:         if (response.ok) {
182:           const targets = await response.json();
183:           target = targets.find((candidate) => candidate.type === 'page' && candidate.webSocketDebuggerUrl);
184:         }
185:       } catch {}
186:       if (!target) await sleep(100);
187:     }
188:     if (!target) throw new Error('The browser did not expose a page target for DevTools.');
189: 
190:     const client = new Cdp(target.webSocketDebuggerUrl);
191:     await client.open();
192:     await client.send('Page.enable');
193:     await client.send('Runtime.enable');
194:     return { client, cleanup };
195:   } catch (error) {
196:     await cleanup();
197:     throw error;
198:   }
199: }
200: 
201: let browser = null;
202: let page = null;
203: 
204: before(async () => {
205:   browser = await launchBrowser();
206:   page = browser.client;
207: }, { timeout: 30000 });
208: 
209: after(async () => {
210:   if (browser) await browser.cleanup();
211: });
212: 
213: const PAGE_HELPERS = `(() => {
214:   const normalize = (text) => (text || '').replace(/\\s+/g, ' ').trim();
215:   window.__check = {
216:     display: () => document.querySelector(${JSON.stringify(DISPLAY_SELECTOR)}),
217:     buttons: () => Array.from(document.querySelectorAll('button')),
218:     label: (button) => normalize(button.textContent),
219:     rect: (element) => {
220:       const rect = element.getBoundingClientRect();
221:       return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
222:     },
223:     snapshot: (element) => {
224:       const computed = getComputedStyle(element);
225:       const out = {};
226:       for (const property of computed) {
227:         if (property.startsWith('--')) continue;
228:         out[property] = computed.getPropertyValue(property);
229:       }
230:       return out;
231:     },
232:     lca: (elements) => {
233:       const list = elements.filter(Boolean);
234:       if (!list.length) return null;
235:       let node = list[0];
236:       while (node && !list.every((element) => node.contains(element))) node = node.parentElement;
237:       return node;
238:     },
239:     rows: (items) => {
240:       const sorted = items.slice().sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
241:       const rows = [];
242:       for (const item of sorted) {
243:         const current = rows[rows.length - 1];
244:         if (current && item.rect.top - current[0].rect.top <= item.rect.height / 2) current.push(item);
245:         else rows.push([item]);
246:       }
247:       return rows;
248:     },
249:   };
250: })()`;
251: 
252: async function evaluate(expression) {
253:   const result = await page.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
254:   if (result.exceptionDetails) {
255:     const description = result.exceptionDetails.exception ? result.exceptionDetails.exception.description : result.exceptionDetails.text;
256:     throw new Error(`The page threw while a check ran: ${description}`);
257:   }
258:   return result.result.value;
259: }
260: 
261: async function openPage(width = 800, height = 900) {
262:   assert.ok(fs.existsSync(INDEX_PATH), `index.html not found at ${INDEX_PATH}; the check needs the page this card builds.`);
263:   await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
264:   const loaded = waitForEvent(page, 'Page.loadEventFired', 10000);
265:   const navigation = await page.send('Page.navigate', { url: pathToFileURL(INDEX_PATH).href });
266:   if (navigation && navigation.errorText) {
267:     await loaded.catch(() => {});
268:     throw new Error(`The browser could not load index.html: ${navigation.errorText}.`);
269:   }
270:   await loaded;
271:   await evaluate(PAGE_HELPERS);
272:   await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
273:   return { width, height };
274: }
275: 
276: async function pressKey(name) {
277:   const definition = KEYSTROKES[name];
278:   const common = {
279:     key: definition.key,
280:     code: definition.code,
281:     windowsVirtualKeyCode: definition.keyCode,
282:     nativeVirtualKeyCode: definition.keyCode,
283:   };
284:   const down = { type: definition.text === null ? 'rawKeyDown' : 'keyDown', ...common };
285:   if (definition.text !== null) {
286:     down.text = definition.text;
287:     down.unmodifiedText = definition.text;
288:   }
289:   await page.send('Input.dispatchKeyEvent', down);
290:   await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...common });
291: }
292: 
293: function moveMouse(x, y) {
294:   return page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 });
295: }
296: 
297: function mouseDown(x, y) {
298:   return page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
299: }
300: 
301: function mouseUp(x, y) {
302:   return page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
303: }
304: 
305: function buttonExpression(label) {
306:   return `window.__check.buttons().find((candidate) => window.__check.label(candidate) === ${JSON.stringify(label)})`;
307: }
308: 
309: async function locate(label) {
310:   return evaluate(`(() => {
311:     const button = ${buttonExpression(label)};
312:     if (!button) throw new Error('No button labelled ' + ${JSON.stringify(label)});
313:     button.scrollIntoView({ block: 'center' });
314:     return { rect: window.__check.rect(button), snapshot: window.__check.snapshot(button) };
315:   })()`);
316: }
317: 
318: async function stateOf(label) {
319:   return evaluate(`(() => {
320:     const button = ${buttonExpression(label)};
321:     if (!button) throw new Error('No button labelled ' + ${JSON.stringify(label)});
322:     return { rect: window.__check.rect(button), snapshot: window.__check.snapshot(button) };
323:   })()`);
324: }
325: 
326: async function layoutRects() {
327:   return evaluate(`(() => {
328:     const buttons = window.__check.buttons();
329:     const out = {};
330:     for (const button of buttons) out['key:' + window.__check.label(button)] = window.__check.rect(button);
331:     const display = window.__check.display();
332:     if (display) out.display = window.__check.rect(display);
333:     const pad = window.__check.lca(buttons);
334:     if (pad) out.pad = window.__check.rect(pad);
335:     const shell = window.__check.lca([display].concat(buttons));
336:     if (shell) out.shell = window.__check.rect(shell);
337:     return out;
338:   })()`);
339: }
340: 
341: async function focusedKeyLabel() {
342:   return evaluate(`document.activeElement && document.activeElement.tagName === 'BUTTON' ? window.__check.label(document.activeElement) : null`);
343: }
344: 
345: function diffStyles(beforeSnapshot, afterSnapshot) {
346:   const changes = {};
347:   for (const property of Object.keys(beforeSnapshot)) {
348:     if (beforeSnapshot[property] !== afterSnapshot[property]) {
349:       changes[property] = `${beforeSnapshot[property]} -> ${afterSnapshot[property]}`;
350:     }
351:   }
352:   return changes;
353: }
354: 
355: function movedSince(beforeRects, afterRects) {
356:   const moved = [];
357:   for (const key of Object.keys(beforeRects)) {
358:     if (key === `key:${PRESSED_KEY}`) continue;
359:     const beforeRect = beforeRects[key];
360:     const afterRect = afterRects[key];
361:     if (!afterRect) {
362:       moved.push(key);
363:       continue;
364:     }
365:     const sides = ['left', 'top', 'width', 'height'];
366:     if (sides.some((side) => Math.abs(beforeRect[side] - afterRect[side]) > 0.5)) moved.push(key);
367:   }
368:   return moved;
369: }
370: 
371: async function maybeScreenshot(name) {
372:   const directory = process.env.UI_SHOTS;
373:   if (!directory) return;
374:   const outputDirectory = path.resolve(REPO_ROOT, directory);
375:   fs.mkdirSync(outputDirectory, { recursive: true });
376:   const shot = await page.send('Page.captureScreenshot', { format: 'png' });
377:   fs.writeFileSync(path.join(outputDirectory, `${name}.png`), Buffer.from(shot.data, 'base64'));
378: }
379: 
380: test('the display shows 0, right-aligned, and the page has exactly 17 keys with the expected labels', { timeout: 30000 }, async () => {
381:   await openPage();
382:   const info = await evaluate(`(() => {
383:     const display = window.__check.display();
384:     const buttons = window.__check.buttons();
385:     let rightGap = null;
386:     let visible = false;
387:     if (display) {
388:       const computed = getComputedStyle(display);
389:       const range = document.createRange();
390:       range.selectNodeContents(display);
391:       const textRect = range.getBoundingClientRect();
392:       const displayRect = display.getBoundingClientRect();
393:       rightGap = (displayRect.right - (parseFloat(computed.paddingRight) || 0)) - textRect.right;
394:       visible = displayRect.width > 0 && displayRect.height > 0 && textRect.width > 0;
395:     }
396:     return {
397:       found: !!display,
398:       visible,
399:       text: display ? display.textContent.replace(/\\s+/g, ' ').trim() : null,
400:       labels: buttons.map((button) => window.__check.label(button)),
401:       rightGap,
402:     };
403:   })()`);
404:   assert.ok(info.found, `No display element found. The display should match one of: ${DISPLAY_SELECTOR}.`);
405:   assert.ok(info.visible, 'The display element is not visible.');
406:   assert.equal(info.text, '0', `A new page should show "0" in the display; it shows ${JSON.stringify(info.text)}.`);
407:   assert.equal(info.labels.length, 17, `Expected exactly 17 <button> keys; found ${info.labels.length} (${info.labels.join(' ')}).`);
408:   assert.deepEqual([...info.labels].sort(), [...EXPECTED_LABELS].sort(), `The key labels are wrong. Expected ${EXPECTED_LABELS.join(' ')}; found ${info.labels.join(' ')}.`);
409:   assert.ok(info.rightGap !== null && info.rightGap <= 4, `The "0" is not right-aligned in the display (its right edge is ${info.rightGap === null ? 'unknown' : info.rightGap.toFixed(1)}px from the display edge).`);
410:   assert.ok(info.rightGap >= -4, `The display text overflows to the right by ${(-info.rightGap).toFixed(1)}px.`);
411: });
412: 
413: test('the keypad is a 4-column, 5-row grid in the agreed order, with C spanning 3 and 0 spanning 2', { timeout: 30000 }, async () => {
414:   await openPage();
415:   const grid = await evaluate(`(() => {
416:     const buttons = window.__check.buttons();
417:     const pad = window.__check.lca(buttons);
418:     const computed = pad ? getComputedStyle(pad) : null;
419:     const items = buttons.map((button) => ({ label: window.__check.label(button), rect: window.__check.rect(button) }));
420:     return {
421:       display: computed ? computed.display : null,
422:       columns: computed && computed.gridTemplateColumns !== 'none' ? computed.gridTemplateColumns.split(' ').map(parseFloat) : [],
423:       gap: computed ? (parseFloat(computed.columnGap) || 0) : 0,
424:       paddingLeft: computed ? (parseFloat(computed.paddingLeft) || 0) : 0,
425:       borderLeft: computed ? (parseFloat(computed.borderLeftWidth) || 0) : 0,
426:       padRect: pad ? window.__check.rect(pad) : null,
427:       rows: window.__check.rows(items).map((row) => row.map((item) => item.label)),
428:       items: items.map((item) => ({ label: item.label, left: item.rect.left, right: item.rect.right })),
429:     };
430:   })()`);
431:   assert.ok(grid.padRect, 'No keypad container found: the 17 keys have no common parent.');
432:   assert.equal(grid.display, 'grid', `The keypad should be a CSS grid; its display is ${grid.display}.`);
433:   assert.equal(grid.columns.length, 4, `The keypad should have 4 columns; its grid-template-columns has ${grid.columns.length}.`);
434:   assert.equal(grid.rows.length, 5, `The keypad should have 5 rows; the keys form ${grid.rows.length}.`);
435:   assert.deepEqual(grid.rows, EXPECTED_ROWS, `The keypad rows are wrong. Expected ${JSON.stringify(EXPECTED_ROWS)}; found ${JSON.stringify(grid.rows)}.`);
436: 
437:   const trackStarts = [];
438:   let offset = grid.padRect.left + grid.borderLeft + grid.paddingLeft;
439:   for (const width of grid.columns) {
440:     trackStarts.push(offset);
441:     offset += width + grid.gap;
442:   }
443:   const spans = {};
444:   for (const item of grid.items) {
445:     const start = trackStarts.findIndex((value) => Math.abs(value - item.left) <= 2);
446:     let span = null;
447:     if (start !== -1) {
448:       for (let index = start; index < grid.columns.length; index++) {
449:         const trackEnd = trackStarts[index] + grid.columns[index];
450:         if (Math.abs(trackEnd - item.right) <= 2) {
451:           span = index - start + 1;
452:           break;
453:         }
454:       }
455:     }
456:     spans[item.label] = span;
457:   }
458:   assert.equal(spans['C'], 3, `C should span 3 columns; it spans ${spans['C']}.`);
459:   assert.equal(spans['0'], 2, `0 should span 2 columns; it spans ${spans['0']}.`);
460:   for (const label of ['÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '.', '=']) {
461:     assert.equal(spans[label], 1, `${label} should span 1 column; it spans ${spans[label]}.`);
462:   }
463: });
464: 
465: test('the display text is the largest on the page and fits -1.234567890e-10 on one line at 375px', { timeout: 30000 }, async () => {
466:   await openPage(375, 667);
467:   const info = await evaluate(`(() => {
468:     const display = window.__check.display();
469:     if (!display) throw new Error('no display');
470:     const hasDirectText = (element) => Array.from(element.childNodes).some((node) => node.nodeType === 3 && node.textContent.trim() !== '');
471:     const displaySize = parseFloat(getComputedStyle(display).fontSize);
472:     let maxOther = 0;
473:     let who = null;
474:     for (const element of document.querySelectorAll('body *')) {
475:       if (element === display || display.contains(element)) continue;
476:       if (!hasDirectText(element)) continue;
477:       const size = parseFloat(getComputedStyle(element).fontSize);
478:       if (size > maxOther) {
479:         maxOther = size;
480:         who = element.tagName.toLowerCase() + (element.id ? '#' + element.id : '');
481:       }
482:     }
483:     const range = document.createRange();
484:     display.textContent = '0';
485:     range.selectNodeContents(display);
486:     const shortHeight = range.getBoundingClientRect().height;
487:     display.textContent = '-1.234567890e-10';
488:     range.selectNodeContents(display);
489:     const longRect = range.getBoundingClientRect();
490:     const computed = getComputedStyle(display);
491:     const box = display.getBoundingClientRect();
492:     const contentWidth = box.width - (parseFloat(computed.paddingLeft) || 0) - (parseFloat(computed.paddingRight) || 0) - (parseFloat(computed.borderLeftWidth) || 0) - (parseFloat(computed.borderRightWidth) || 0);
493:     return { displaySize, maxOther, who, shortHeight, longWidth: longRect.width, longHeight: longRect.height, contentWidth };
494:   })()`);
495:   assert.ok(info.displaySize > info.maxOther, `The display text should be the largest on the page: display ${info.displaySize}px vs ${info.maxOther}px (${info.who}).`);
496:   assert.ok(info.longWidth <= info.contentWidth + 1, `"-1.234567890e-10" (16 characters) does not fit the display on one line at 375px: the text is ${Math.round(info.longWidth)}px, the display content is ${Math.round(info.contentWidth)}px wide.`);
497:   assert.ok(info.longHeight <= info.shortHeight + 1, `The display wraps "-1.234567890e-10" onto more than one line at 375px (${Math.round(info.shortHeight)}px tall with "0", ${Math.round(info.longHeight)}px with the long value).`);
498: });
499: 
500: test('at 375px every key is fully visible and there is no horizontal scrolling', { timeout: 30000 }, async () => {
501:   await openPage(375, 667);
502:   const info = await evaluate(`(() => {
503:     const buttons = window.__check.buttons();
504:     const rects = buttons.map((button) => window.__check.rect(button));
505:     const display = window.__check.display();
506:     const displayRect = display ? window.__check.rect(display) : null;
507:     return {
508:       innerWidth: window.innerWidth,
509:       scrollWidth: document.documentElement.scrollWidth,
510:       keysLeft: Math.min(...rects.map((rect) => rect.left)),
511:       keysRight: Math.max(...rects.map((rect) => rect.right)),
512:       zeroSize: rects.filter((rect) => rect.width < 1 || rect.height < 1).length,
513:       displayFits: displayRect ? displayRect.left >= -0.5 && displayRect.right <= window.innerWidth + 0.5 && displayRect.width > 1 : false,
514:     };
515:   })()`);
516:   await maybeScreenshot('375');
517:   assert.ok(info.scrollWidth <= info.innerWidth, `Horizontal scrolling at 375px: document scrollWidth is ${info.scrollWidth}, viewport is ${info.innerWidth}.`);
518:   assert.ok(info.keysLeft >= -0.5 && info.keysRight <= info.innerWidth + 0.5, `At 375px a key is cut off horizontally (keys span ${info.keysLeft.toFixed(1)}..${info.keysRight.toFixed(1)}, viewport 0..${info.innerWidth}).`);
519:   assert.equal(info.zeroSize, 0, 'Some keys render with zero size.');
520:   assert.ok(info.displayFits, 'The display is cut off horizontally at 375px.');
521: });
522: 
523: test('at 768px and 1440px the calculator stays centered and no wider than ~420px, with no horizontal scrolling', { timeout: 30000 }, async () => {
524:   for (const width of [768, 1440]) {
525:     await openPage(width, 900);
526:     const info = await evaluate(`(() => {
527:       const display = window.__check.display();
528:       const buttons = window.__check.buttons();
529:       const shell = window.__check.lca([display].concat(buttons));
530:       const rects = buttons.map((button) => window.__check.rect(button));
531:       return {
532:         innerWidth: window.innerWidth,
533:         scrollWidth: document.documentElement.scrollWidth,
534:         shell: shell ? window.__check.rect(shell) : null,
535:         keysLeft: Math.min(...rects.map((rect) => rect.left)),
536:         keysRight: Math.max(...rects.map((rect) => rect.right)),
537:       };
538:     })()`);
539:     await maybeScreenshot(String(width));
540:     assert.ok(info.shell, `No calculator shell found at ${width}px (a common parent of the display and the keys).`);
541:     assert.ok(info.scrollWidth <= info.innerWidth, `Horizontal scrolling at ${width}px: document scrollWidth is ${info.scrollWidth}, viewport is ${info.innerWidth}.`);
542:     assert.ok(info.shell.width <= 420.5, `At ${width}px the calculator is ${Math.round(info.shell.width)}px wide; it should be capped at ~420px.`);
543:     const centreOffset = Math.abs((info.shell.left + info.shell.right) / 2 - info.innerWidth / 2);
544:     assert.ok(centreOffset <= 4, `At ${width}px the calculator is not centered: its centre is ${centreOffset.toFixed(1)}px from the viewport centre.`);
545:     assert.ok(info.keysLeft >= -0.5 && info.keysRight <= info.innerWidth + 0.5, `At ${width}px a key is cut off horizontally.`);
546:   }
547: });
548: 
549: test('keys have visible hover, pressed and keyboard-focus states, and pressing does not shift the layout', { timeout: 30000 }, async () => {
550:   await openPage();
551:   await page.send('Emulation.setEmulatedMedia', {
552:     features: [{ name: 'hover', value: 'hover' }, { name: 'pointer', value: 'fine' }],
553:   });
554:   await moveMouse(2, 2);
555:   const resting = await locate(PRESSED_KEY);
556:   const before = await layoutRects();
557: 
558:   await moveMouse(resting.rect.left + resting.rect.width / 2, resting.rect.top + resting.rect.height / 2);
559:   await sleep(300);
560:   const hovered = await stateOf(PRESSED_KEY);
561:   const hoverDiff = diffStyles(resting.snapshot, hovered.snapshot);
562:   assert.ok(Object.keys(hoverDiff).length > 0, `The "${PRESSED_KEY}" key shows no hover feedback: nothing changes in its computed style on hover.`);
563: 
564:   await mouseDown(resting.rect.left + resting.rect.width / 2, resting.rect.top + resting.rect.height / 2);
565:   await sleep(300);
566:   const pressed = await stateOf(PRESSED_KEY);
567:   const during = await layoutRects();
568:   await mouseUp(resting.rect.left + resting.rect.width / 2, resting.rect.top + resting.rect.height / 2);
569: 
570:   const pressDiff = diffStyles(hovered.snapshot, pressed.snapshot);
571:   assert.ok(Object.keys(pressDiff).length > 0, `The "${PRESSED_KEY}" key shows no pressed feedback beyond hover: nothing changes in its computed style while the mouse is held down.`);
572: 
573:   const moved = movedSince(before, during);
574:   assert.equal(moved.length, 0, `Pressing "${PRESSED_KEY}" shifts the layout: ${moved.join(', ')} moved.`);
575: 
576:   await moveMouse(2, 2);
577:   await evaluate('document.activeElement && document.activeElement.blur && document.activeElement.blur(); true');
578:   let focused = null;
579:   for (let attempt = 0; attempt < 20 && focused !== PRESSED_KEY; attempt++) {
580:     await pressKey('Tab');
581:     await sleep(20);
582:     focused = await focusedKeyLabel();
583:   }
584:   assert.equal(focused, PRESSED_KEY, `Tab never reached the "${PRESSED_KEY}" key (last focus: ${focused}).`);
585:   await sleep(150);
586:   const focusState = await stateOf(PRESSED_KEY);
587:   const focusDiff = diffStyles(resting.snapshot, focusState.snapshot);
588:   assert.ok(Object.keys(focusDiff).length > 0, `The "${PRESSED_KEY}" key shows no keyboard-focus feedback: nothing changes in its computed style when focused with Tab.`);
589: 
590:   await page.send('Emulation.setEmulatedMedia', { features: [] });
591: });
592: 
593: test('Tab reaches every key in visual order, and Enter/Space activate the focused key', { timeout: 30000 }, async () => {
594:   await openPage();
595:   await evaluate(`window.__clicks = [];
596:     document.addEventListener('click', (event) => {
597:       const button = event.target.closest ? event.target.closest('button') : null;
598:       window.__clicks.push(button ? window.__check.label(button) : (event.target.tagName || '?'));
599:     }, true); true`);
600:   await evaluate('document.activeElement && document.activeElement.blur && document.activeElement.blur(); true');
601: 
602:   const visual = await evaluate(`(() => {
603:     const items = window.__check.buttons().map((button) => ({ label: window.__check.label(button), rect: window.__check.rect(button) }));
604:     return window.__check.rows(items).flat().map((item) => item.label);
605:   })()`);
606: 
607:   const tabbed = [];
608:   for (let step = 0; step < 17; step++) {
609:     await pressKey('Tab');
610:     await sleep(20);
611:     tabbed.push(await focusedKeyLabel());
612:   }
613:   assert.deepEqual(tabbed, visual, `Tab should visit every key in visual order. Visual order: ${visual.join(' ')}. Tab order: ${tabbed.join(' ')}.`);
614: 
615:   await evaluate('document.activeElement && document.activeElement.blur && document.activeElement.blur(); true');
616:   let target = null;
617:   for (let attempt = 0; attempt < 20 && target !== '3'; attempt++) {
618:     await pressKey('Tab');
619:     await sleep(20);
620:     target = await focusedKeyLabel();
621:   }
622:   assert.equal(target, '3', `Could not focus the "3" key with Tab (last focus: ${target}).`);
623: 
624:   await pressKey('Enter');
625:   await sleep(50);
626:   assert.deepEqual(await evaluate('window.__clicks'), ['3'], 'Enter should activate the focused key.');
627:   assert.equal(await focusedKeyLabel(), '3', 'Enter should not move the focus off the key.');
628: 
629:   await pressKey('Tab');
630:   await sleep(20);
631:   const next = await focusedKeyLabel();
632:   assert.ok(next, `Tab should move the focus to another key after "3" (last focus: ${next}).`);
633:   await pressKey('Space');
634:   await sleep(50);
635:   assert.deepEqual(await evaluate('window.__clicks'), ['3', next], `Space should activate the focused key ("${next}").`);
636: });
637: 
638: test('the ÷ × − = C keys have the agreed aria-labels', { timeout: 30000 }, async () => {
639:   await openPage();
640:   const labels = await evaluate(`(() => {
641:     const out = {};
642:     for (const button of window.__check.buttons()) out[window.__check.label(button)] = button.getAttribute('aria-label');
643:     return out;
644:   })()`);
645:   for (const [key, name] of Object.entries(ARIA_LABELS)) {
646:     assert.equal((labels[key] || '').trim().toLowerCase(), name, `The "${key}" key should have aria-label="${name}"; found ${JSON.stringify(labels[key] === undefined ? null : labels[key])}.`);
647:   }
648: });
649: 
650: test('with prefers-reduced-motion: reduce, pressing a key changes colour but does not scale', { timeout: 30000 }, async () => {
651:   await openPage();
652:   await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
653:   await moveMouse(2, 2);
654:   const resting = await locate(PRESSED_KEY);
655:   const x = resting.rect.left + resting.rect.width / 2;
656:   const y = resting.rect.top + resting.rect.height / 2;
657: 
658:   await moveMouse(x, y);
659:   await sleep(300);
660:   const hovered = await stateOf(PRESSED_KEY);
661: 
662:   await mouseDown(x, y);
663:   await sleep(300);
664:   const pressed = await stateOf(PRESSED_KEY);
665:   await mouseUp(x, y);
666:   await page.send('Emulation.setEmulatedMedia', { features: [] });
667: 
668:   const transform = pressed.snapshot.transform;
669:   if (transform !== 'none') {
670:     const matrix = transform.match(/matrix\(([^)]+)\)/);
671:     assert.ok(matrix, `With reduced motion, pressing "${PRESSED_KEY}" must not scale it; computed transform is ${transform}.`);
672:     const parts = matrix[1].split(',').map(parseFloat);
673:     assert.ok(Math.abs(parts[0] - 1) <= 0.001 && Math.abs(parts[3] - 1) <= 0.001, `With reduced motion, pressing "${PRESSED_KEY}" must not scale it; computed transform is ${transform}.`);
674:   }
675: 
676:   const colourProperties = ['background-color', 'color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color'];
677:   const changedColours = colourProperties.filter((property) => pressed.snapshot[property] !== hovered.snapshot[property]);
678:   assert.ok(changedColours.length > 0, `With reduced motion, pressing "${PRESSED_KEY}" should change its colour; background, text and border colours all stay the same as on hover.`);
679: 
680:   const movedOrResized = ['left', 'top', 'width', 'height'].some((side) => Math.abs(hovered.rect[side] - pressed.rect[side]) > 0.5);
681:   assert.equal(movedOrResized, false, `With reduced motion, pressing "${PRESSED_KEY}" should change colour only; its box moved or resized.`);
682: });
```

</details>

## Assistant


<details>
<summary>Reasoning</summary>

```
Now let me read the SPEC Codebase map, and check the current index.html, src/calc.js, src/ui.js (doesn't exist yet), and the evidence dir. Let me also check the card 2.1 and 1.4 maybe not needed. Let me read SPEC.md.
```

</details>

<details>
<summary>Tool: read</summary>

```json
{
  "path": "C:\\Users\\rames\\Desktop\\calculator-groundwork\\.groundwork\\SPEC.md"
}
```

```
Read file C:\Users\rames\Desktop\calculator-groundwork\.groundwork\SPEC.md, lines 1-63
1: # Calculator: Spec
2: 
3: Status: confirmed · Last updated: 2026-09-26
4: 
5: ## Problem
6: The maker wants a small, dependable calculator for everyday arithmetic that runs in a web browser: always at hand, nothing to install, no accounts. This project builds that first version.
7: 
8: ## Users
9: The maker only. A personal tool — no accounts, sharing or public use.
10: 
11: ## Goals
12: - Work as an everyday four-function calculator: enter numbers, do +, −, ×, ÷, see the result, and Clear to start over.
13: - Give correct results for the rules and edge cases in Features below.
14: - Have the arithmetic rules covered by automated tests.
15: 
16: ## Non-goals
17: - Anything beyond the first version: percent, sign flip and scientific functions are listed as later phases under Features.
18: 
19: ## Features
20: 
21: ### Four-function calculator (first version)
22: - Runs in a web browser; numbers and operations are entered with on-screen buttons.
23: - The display shows both the number being typed and the result. It fits up to 10 digits plus a minus sign.
24: - Keys: digits 0–9, decimal point, +, −, ×, ÷, =, Clear.
25: - Clear resets everything: the current number, any pending operation, and the error state.
26: - Chained input calculates as you go: 2 + 3 + shows 5 straight away; then + 4 = shows 9.
27: - Repeated = repeats the last operation: 5 + 3 = shows 8, = again shows 11.
28: - After a result, an operator continues from it (8 then + 2 = shows 10), while typing a digit starts a fresh number.
29: - Pressing a new operator replaces a pending one: 5 + then × means 5 × 3, not 5 + 3.
30: - = with no pending operation leaves the display unchanged (5 then = shows 5).
31: - An operator with no number yet treats it as 0: + 5 = gives 5.
32: - Numbers are typed up to 10 digits; further digit presses are ignored. A typed number has no leading zeros (0 0 5 shows 5), and a decimal point before any digit starts 0 (. 5 makes 0.5). One decimal point per number; extra decimal presses are ignored.
33: - Results are rounded to 10 significant digits, with trailing zeros trimmed: 1 ÷ 3 shows 0.3333333333; 0.1 + 0.2 shows 0.3. Results too large or too small for a plain 10-digit display switch to scientific notation: 1 000 000 000 × 1 000 000 000 shows 1.000000000e18; 1 ÷ 3 000 000 000 shows 3.333333333e-10.
34: - Negative numbers appear only as results (e.g. 0 − 5 = −5), and can be used in the next calculation. There is no ± key in the first version.
35: - Divide by zero: the display shows "Error"; all keys except Clear stop working until Clear is pressed.
36: 
37: ### Later phases
38: - Percent and sign flip (+/−).
39: - Scientific functions: powers, square root, trigonometry.
40: 
41: ## Constraints
42: - Runs in a standard web browser; nothing to install for the user.
43: 
44: ## Codebase map
45: - `index.html` — the page: display and keypad, loads the two scripts.
46: - `styles.css` — layout and styling.
47: - `src/calc.js` — arithmetic engine (pure logic; runs as a browser script and via Node `require`).
48: - `src/ui.js` — connects button clicks to the engine and writes to the display.
49: - `test/calc.test.js` — engine tests; run with `node --test`.
50: - No build step: the app is opened by opening `index.html`.
51: 
52: ## Changes
53: <!-- For an existing project: keep the sections above to a short "what the app does today", and add
54:      one sub-section per change you want, newest last:
55:      ### <change name> (open | planned | done)
56:      - Goal: what's true when it's done
57:      - Rules: how it should behave
58:      - Edge cases: the unusual inputs and states
59:      - Must not break: what works today and has to keep working
60:      New projects can leave this empty; their first version goes under Features. -->
61: 
62: ## Open questions
63: <!-- Anything undecided. Each item should be a specific question someone can answer. -->
```

</details>

<details>
<summary>Tool: read</summary>

```json
{
  "path": "C:\\Users\\rames\\Desktop\\calculator-groundwork\\index.html"
}
```

```
Read file C:\Users\rames\Desktop\calculator-groundwork\index.html, lines 1-33
1: <!DOCTYPE html>
2: <html lang="en">
3: <head>
4:   <meta charset="utf-8">
5:   <meta name="viewport" content="width=device-width, initial-scale=1">
6:   <title>Calculator</title>
7:   <link rel="stylesheet" href="styles.css">
8: </head>
9: <body>
10:   <main class="calculator" aria-label="Calculator">
11:     <div id="display" class="display" aria-live="polite">0</div>
12:     <div class="keypad">
13:       <button type="button" class="key key-span-3" aria-label="clear">C</button>
14:       <button type="button" class="key" aria-label="divide">÷</button>
15:       <button type="button" class="key">7</button>
16:       <button type="button" class="key">8</button>
17:       <button type="button" class="key">9</button>
18:       <button type="button" class="key" aria-label="multiply">×</button>
19:       <button type="button" class="key">4</button>
20:       <button type="button" class="key">5</button>
21:       <button type="button" class="key">6</button>
22:       <button type="button" class="key" aria-label="minus">−</button>
23:       <button type="button" class="key">1</button>
24:       <button type="button" class="key">2</button>
25:       <button type="button" class="key">3</button>
26:       <button type="button" class="key">+</button>
27:       <button type="button" class="key key-span-2">0</button>
28:       <button type="button" class="key">.</button>
29:       <button type="button" class="key" aria-label="equals">=</button>
30:     </div>
31:   </main>
32: </body>
33: </html>
```

</details>

## Assistant


<details>
<summary>Reasoning</summary>

```
Now let me look at src/calc.js to know exactly what createCalculator looks like, and check the test directory, and evidence dir. Also check the card 2.1 for style of evidence, maybe. Let me read the src/calc.js quickly (it might be long). And check .groundwork/evidence/2.2 existence.
```

</details>

<details>
<summary>Tool: read</summary>

```json
{
  "path": "C:\\Users\\rames\\Desktop\\calculator-groundwork\\src\\calc.js"
}
```

```
Read file C:\Users\rames\Desktop\calculator-groundwork\src\calc.js, lines 1-196
1: 'use strict';
2: 
3: (function (root) {
4:   var MAX_DIGITS = 10;
5:   var MIN_PLAIN_EXPONENT = 1 - MAX_DIGITS;
6:   var MAX_PLAIN_EXPONENT = MAX_DIGITS - 1;
7: 
8:   function createCalculator() {
9:     var entry = null;
10:     var accumulator = null;
11:     var pendingOp = null;
12:     var lastOp = null;
13:     var lastOperand = null;
14:     var error = false;
15: 
16:     function digitCount(text) {
17:       return text.replace('.', '').length;
18:     }
19: 
20:     function plainText(value, exponent) {
21:       var text = value.toFixed(MAX_DIGITS - 1 - exponent);
22:       if (text.indexOf('.') !== -1) {
23:         text = text.replace(/0+$/, '').replace(/\.$/, '');
24:       }
25:       return text;
26:     }
27: 
28:     function scientificText(value) {
29:       var parts = value.toPrecision(MAX_DIGITS).split('e');
30:       return parts[0] + 'e' + Number(parts[1]);
31:     }
32: 
33:     function formatNumber(value) {
34:       if (!isFinite(value)) {
35:         return String(value);
36:       }
37:       if (value === 0) {
38:         return '0';
39:       }
40: 
41:       var abs = Math.abs(value);
42:       var exponent = Number(abs.toExponential().split('e')[1]);
43:       var text;
44: 
45:       if (exponent >= MIN_PLAIN_EXPONENT && exponent <= MAX_PLAIN_EXPONENT) {
46:         text = plainText(abs, exponent);
47:         if (Number(text) >= 1e10) {
48:           text = scientificText(abs);
49:         }
50:       } else {
51:         text = scientificText(abs);
52:       }
53: 
54:       return value < 0 ? '-' + text : text;
55:     }
56: 
57:     function currentValue() {
58:       return Number(entry !== null ? entry : calculator.display);
59:     }
60: 
61:     function applyOperator(op, left, right) {
62:       if (op === '+') {
63:         return left + right;
64:       }
65:       if (op === '-') {
66:         return left - right;
67:       }
68:       if (op === '*') {
69:         return left * right;
70:       }
71:       return left / right;
72:     }
73: 
74:     function startFreshEntry(text) {
75:       entry = text;
76:       lastOp = null;
77:       lastOperand = null;
78:       calculator.display = entry;
79:     }
80: 
81:     function enterError() {
82:       error = true;
83:       calculator.display = 'Error';
84:     }
85: 
86:     function pressDigit(digit) {
87:       if (entry === null) {
88:         startFreshEntry(digit);
89:       } else if (entry === '0') {
90:         entry = digit;
91:         calculator.display = entry;
92:       } else if (digitCount(entry) < MAX_DIGITS) {
93:         entry += digit;
94:         calculator.display = entry;
95:       }
96:     }
97: 
98:     function pressPoint() {
99:       if (entry === null) {
100:         startFreshEntry('0.');
101:       } else if (entry.indexOf('.') === -1) {
102:         entry += '.';
103:         calculator.display = entry;
104:       }
105:     }
106: 
107:     function pressOperator(key) {
108:       if (entry !== null) {
109:         var value = Number(entry);
110:         if (pendingOp === '/' && value === 0) {
111:           enterError();
112:           return;
113:         }
114:         accumulator = pendingOp === null ? value : applyOperator(pendingOp, accumulator, value);
115:         calculator.display = formatNumber(accumulator);
116:         entry = null;
117:       } else if (pendingOp === null) {
118:         accumulator = currentValue();
119:       }
120:       pendingOp = key;
121:       lastOp = null;
122:       lastOperand = null;
123:     }
124: 
125:     function pressEquals() {
126:       if (pendingOp !== null) {
127:         var operand = currentValue();
128:         if (pendingOp === '/' && operand === 0) {
129:           enterError();
130:           return;
131:         }
132:         var result = applyOperator(pendingOp, accumulator, operand);
133:         lastOp = pendingOp;
134:         lastOperand = operand;
135:         pendingOp = null;
136:         accumulator = result;
137:         entry = null;
138:         calculator.display = formatNumber(result);
139:       } else if (lastOp !== null) {
140:         var repeat = applyOperator(lastOp, currentValue(), lastOperand);
141:         accumulator = repeat;
142:         entry = null;
143:         calculator.display = formatNumber(repeat);
144:       } else {
145:         entry = null;
146:       }
147:     }
148: 
149:     function reset() {
150:       error = false;
151:       entry = null;
152:       accumulator = null;
153:       pendingOp = null;
154:       lastOp = null;
155:       lastOperand = null;
156:       calculator.display = '0';
157:     }
158: 
159:     var calculator = {
160:       display: '0',
161: 
162:       press: function (key) {
163:         key = String(key);
164: 
165:         if (error) {
166:           if (key === 'C') {
167:             reset();
168:           }
169:           return;
170:         }
171: 
172:         if (key >= '0' && key <= '9') {
173:           pressDigit(key);
174:         } else if (key === '.') {
175:           pressPoint();
176:         } else if (key === '+' || key === '-' || key === '*' || key === '/') {
177:           pressOperator(key);
178:         } else if (key === '=') {
179:           pressEquals();
180:         } else if (key === 'C') {
181:           reset();
182:         }
183:       },
184:     };
185: 
186:     return calculator;
187:   }
188: 
189:   var api = { createCalculator: createCalculator };
190: 
191:   if (typeof module === 'object' && module !== null && module.exports) {
192:     module.exports = api;
193:   } else {
194:     root.createCalculator = createCalculator;
195:   }
196: })(typeof globalThis !== 'undefined' ? globalThis : this);
```

</details>

<details>
<summary>Tool: glob</summary>

```json
{
  "pattern": ".groundwork/evidence/**"
}
```

```
No files found
```

</details>

<details>
<summary>Tool: glob</summary>

```json
{
  "pattern": "test/*.js"
}
```

```
C:\Users\rames\Desktop\calculator-groundwork\test\ui-page.test.js
C:\Users\rames\Desktop\calculator-groundwork\test\operations.test.js
C:\Users\rames\Desktop\calculator-groundwork\test\formatting.test.js
C:\Users\rames\Desktop\calculator-groundwork\test\clear-error.test.js
C:\Users\rames\Desktop\calculator-groundwork\test\calc.test.js
```

</details>

## Assistant


<details>
<summary>Reasoning</summary>

```
The evidence directory glob found nothing — maybe `.groundwork/evidence/` doesn't exist yet. Let me check `.groundwork` structure.

Now I need to design tests for each acceptance criterion:

1. Clicking `2 + 3 =` shows `5`; `5 + 3 =` shows `8`, `=` again shows `11`. — browser test, click real buttons via CDP.
2. Clicking `1 . 5 + 2 . 5 =` shows `4`.
3. Clicking `1 ÷ 0 =` shows `Error`; clicking any other key leaves `Error` showing.
4. Clicking `C` after the error shows `0`, and calculator works again.
5. Every button press updates the display immediately, so typing shows the current number. (Each press updates display immediately — e.g. click `1` → shows `1`, `2` → shows `12`, etc. This is about immediacy not just final outcome. We can assert after each click.)
6. Pressing Enter or Space on a focused key gives same display change as clicking it. — use Tab to focus a key then Enter/Space. But note the existing test `ui-page.test.js` already tests activation via click event capture — but the display change isn't checked. Our test should check actual display effect: focus `5` then Enter → 5. Actually need a fresh page each time.
7. The page has one arithmetic implementation: `src/ui.js` maps labels (`×`→`*`, `÷`→`/`, `−`→`-`), calls `press`, writes `display` into `#display` — no arithmetic/digit limits/rounding/error rules in UI code.
   This is tricky: "no arithmetic in UI code" can't be fully tested automatically in a behavioral sense. But there are behavioral consequences:
   - The UI delegates to engine: results match the engine exactly. We can cross-check by comparing displayed results against an engine instance driven with the same key sequence (e.g., a matrix of sequences including rounding `0.1+0.2 → 0.3`, scientific notation `1e9 × 1e9 → 1.000000000e18`, digit limit typing 11 digits shows 10 digits, etc.). If the UI had its own arithmetic it would likely diverge somewhere; testing a handful of engine-specific behaviors through the UI is the best behavioral proxy.
   - Label mapping can be tested behaviorally: clicking `×`, `÷`, `−` produce engine results that require mapping to `*`, `/`, `-` (e.g. 6 × 7 = 42, 8 ÷ 2 = 4, 5 − 2 = 3). If the mapping was wrong (e.g. passed '×' to press), press would ignore it, so the result would be wrong. So the map is behaviorally tested.
   - "one arithmetic implementation" — hard to assert statically without inspecting source. Role says don't write tests that only check source contains text. Hmm. But there's a behavioral test for "no arithmetic in UI": results exactly match engine across a set of engine-edge sequences. I can also verify that the page doesn't expose a second arithmetic implementation? Not really.
   
   A behavioral approach: drive the page with sequences that exercise engine rules (digit cap, leading zeros, one decimal, rounding, scientific) and compare against the expected engine output computed by running `createCalculator` in Node with the equivalent engine keys. This tests that the display follows the same arithmetic implementation, which is what the criterion is really about. If the UI reimplemented arithmetic with different rules (e.g. round differently), tests fail.

   Also can check behaviorally that UI respects engine state: e.g. `1 ÷ 0 =` error then pressing `5` leaves Error (criterion 3 covers). If UI implemented its own error rules it might still pass. The engine-matrix comparison is the strongest behavioral check.

   Additionally, "no arithmetic in the UI" can be partially checked by verifying `window.createCalculator` is the engine and... hmm, can't inspect source. Could check that `src/ui.js` exists? No, that's a file-existence test — disallowed. But maybe reading the UI source for arithmetic operators is a static check that's explicitly part of the criterion ("`src/ui.js` maps labels, calls `press`, and writes `display` — no arithmetic"). The role says "Write tests that only check a file exists or its source contains some text, just to have something that fails. Test behavior." It says don't write tests that ONLY check file exists or source contains text. A source scan for arithmetic could be considered a policy check, but it's fragile and forbidden-ish. I'll do the behavioral equivalence matrix as the main test for criterion 7 and note the source-level part (no arithmetic) is covered by review/manual inspection. Hmm, but the criterion says the implementation must have that shape. The reviewer can verify. Actually — I could write a test that the page, after wiring, has exactly one engine instance and the displayed values match the engine for a matrix. Also test that UI does not implement rounding by feeding values whose engine formatting is distinctive.

Let me think about what "fails now for the right reason" means: currently index.html has no scripts, so clicking buttons does nothing; display stays '0'. So all browser tests fail because display doesn't change. Good reason.

8. Opening `index.html` loads `src/calc.js` before `src/ui.js`, logs no console errors, controls live on first load.
   - Behavioral: check no console errors (subscribe to Runtime.consoleAPICalled / Runtime.exceptionThrown) and controls live on first load (click a button right after load without any waiting → display changes).
   - "loads calc.js before ui.js": script order can be checked by observing behavior — if ui.js ran before calc.js, ui.js would throw (createCalculator undefined) or the controls wouldn't be live; plus we can check console errors. Alternatively check `document.scripts` order (that's DOM inspection, not source text scan; it's observable page state). Hmm, is checking the order of script elements a behavioral test? The page's DOM is the artifact; checking script src order is inspecting the page, not source text. I think that's acceptable and is what the criterion asks ("loads src/calc.js before src/ui.js"). But is it "testing behavior"? The role says don't write tests that only check a file exists or source contains text "just to have something that fails. Test behavior." Checking that scripts load in order and that the app is live is more meaningful. I could test observably: after load, `window.createCalculator` is a function (calc.js loaded in browser context — it publishes global). And that the UI is live. For order, the strongest behavior test: we can instrument `Page.addScriptToEvaluateOnNewDocument` to record when each script executes? That's complex. Simpler: after load, evaluate `performance.getEntriesByType('resource')` ordering? file:// resources may not appear. Hmm.

   Actually the order requirement is a means to an end: if ui.js ran first, it would fail to bind (createCalculator missing) and controls wouldn't be live / console error. Test: no console errors + controls live immediately after load + `typeof window.createCalculator === 'function'`. That covers order behaviorally. But I can also add a direct check that the `<script>` elements reference calc.js before ui.js — DOM inspection of the page. I think that's reasonable as part of criterion 8 because "loads X before Y" is a page-structure criterion. It's not source-text scanning of a JS file; it's checking the loaded DOM. I'll include it but phrase carefully. Hmm, the tester role says "Test behavior" — script order check is borderline. I'll include both: script src order (page state) and a behavioral "live on first load" + no console errors. If I had to drop one, script order is fine as a static page check. Actually, let me reconsider: could I test execution order behaviorally? I could listen to `DOMContentLoaded`... no. Alternative: check that `document.scripts` order and that after load `window.createCalculator` exists. I'll keep the script-srcs order assertion in the same test as live/no-errors, as the direct requirement.

   - Console errors: subscribe before navigation to `Runtime.consoleAPICalled` (error type) and `Runtime.exceptionThrown`, collect, assert none. Note: file:// pages might log errors unrelated? Baseline page currently has no scripts, so no errors; after wiring, if scripts good, none. Also favicon 404? file:// no favicon fetch error in console usually. Let me be careful: headless Edge with file:// may produce console errors like "Failed to load resource"? For file:// there's no favicon request typically. I'll test and see.

9. At 375/768/1440, updating the display does not wrap it or add a scrollbar.
   - Browser test: set viewport 375 (and 768, 1440), click a sequence producing a long display value (e.g. `-1.234567890e-10` via `1 ÷ 3000000000 =` → engine gives `3.333333333e-10`; or `1 ÷ 3` → `0.3333333333`; the longest is negative scientific: `0 − 1 ÷ 3000000000 =`? Let's compute: 0 − 1 = -1; then ÷ 3000000000 = → -3.333333333e-10. Hmm let me think of longest display string. Engine format max length: 10 sig digits; plain 10 digits max e.g. `0.3333333333` (12 chars). Scientific `-3.333333333e-10` (16 chars). Negative plain `-9999999999` (11 chars). The existing 2.1 test uses `-1.234567890e-10` (16 chars) as worst case by setting textContent directly. For our card, display is driven by the engine, so use a real sequence producing a 16-char value: `1 ÷ 3000000000 =` gives `3.333333333e-10` (15 chars) without minus; to get minus, `0 − 1 =` gives `-1`, then `÷ 3000000000 =` gives `-3.333333333e-10` (16 chars). Let's verify via engine: 0 − 1 = → -1. Then press '/', entry null pendingOp null → accumulator = currentValue() = -1, pendingOp '/'. Then typing 3 0 0 0 0 0 0 0 0 0 (10 digits) → entry 3000000000. Press '=' → operand 3000000000, result = -1/3e9 = -3.333333333e-10 → formatNumber: abs exponent = floor(log10(3.333e-10)) = -10; MIN_PLAIN_EXPONENT = 1-10 = -9; -10 < -9 → scientific: toPrecision(10) = "3.333333333e-10". value<0 → '-3.333333333e-10' = 16 chars. 
   - Then assert: display box height unchanged vs '0' (no wrap), no horizontal scroll (documentElement.scrollWidth <= innerWidth), and text fits (range rect width <= content width). Actually criterion says "does not wrap it or add a scrollbar". Wrap: measure display element height with short vs long text; also compare range rect height. Scrollbar: documentElement.scrollWidth <= innerWidth (no horizontal) — vertical scrollbar from wrapping would add scrollHeight > innerHeight? Careful: at 375x667 page may already scroll vertically? The existing 2.1 tests at 375 pass with `scrollWidth <= innerWidth`. For wrap, we measure the height of the display's text. Simpler: click the sequence and assert text is single line: `display.scrollHeight <= one-line height + 1`? Or use range rects per line: if wrapped, range.getClientRects().length > 1. That's robust: `range.selectNodeContents(display); range.getClientRects().length` — if wrapped, multiple rects. Use that. Plus assert no horizontal scrollbar: `document.documentElement.scrollWidth <= window.innerWidth` and no *new* scrollbar vs baseline: compare `scrollWidth`/`scrollHeight` before and after clicking? The pointer: "updating the display does not ... add a scrollbar". So take measurements with '0' and after the long value; assert scrollbars don't appear when updating. For width: scrollWidth <= innerWidth. For vertical: document.documentElement.scrollHeight <= innerHeight + tolerance? At 375x667, the calculator may already fit; card 2.1 tests didn't check vertical. Let me first run baseline page (2.1 state) to see page metrics. But the calculator was presumably designed mobile-first to fit. Hmm, if page scrolls at 375x667 even at baseline, then "add a scrollbar" means after updating display, scrollHeight shouldn't grow beyond innerHeight if it was within before, or simply shouldn't grow. I'll capture before/after metrics: assert `scrollWidth <= innerWidth` after update, and `scrollHeight <= innerHeight` after update only if baseline was also <= innerHeight? That weakens. Alternative: assert that updating the display doesn't increase `scrollWidth` or `scrollHeight` by more than 1px, AND no horizontal scrollbar (`scrollWidth <= innerWidth`). Wrapping would increase display height → increase document scrollHeight → caught by "no increase". If baseline already scrolls vertically, wrapping would still increase scrollHeight. That's a clean behavioral check: display update doesn't grow the document. But careful: the initial `0` vs after typing `1` etc. Only the display content changes; the page layout is fixed. So scrollWidth/scrollHeight deltas should be 0. Good.
   - Also check display bounding box height doesn't grow (no wrap) and text fits content width.
   - Run at all three widths 375, 768, 1440.

Also acceptance criterion 5 "Every button press updates the display immediately": I can assert display after each of a sequence of clicks (e.g., `1`, `2`, `3` shows `1`, `12`, `123`; operator shows intermediate result per chained input `2 + 3 +` shows `5`). But "immediately" timing-wise? I think showing the current number as you type is the intent — per click. Test per-click display values.

Criterion 6: Enter/Space on focused key. Focus via Tab reaching the key is slow; better: focus programmatically? "Pressing Enter or Space on a focused key" — a real user focuses via Tab (or click). Programmatic `.focus()` is fine for testing keyboard activation behavior; but we could also use Tab in a loop like the existing test. For display-effect check, I'll focus a button via `.focus()` then dispatch real key events through CDP (Input.dispatchKeyEvent), and compare to clicking the same key from the same start state. E.g.:
   - Fresh page: focus `5`, press Enter → display shows `5`.
   - Fresh page: focus `+`? Let's design: focus `7`, press Space → `7`. Then press Tab to `8`? Hmm. Simpler: two tests/fresh pages:
     a) click sequence `2 + 3`: then focus `=` (Tab or .focus()), press Enter → display `5`. Compare with clicking `=` instead: fresh page `2 + 3`, click `=` → `5`.
     b) focus `4`, press Space → `4`; also compare click `4` → `4`? Might be same test with two pages? Navigating twice within one test is fine (openPage again).
   - Better to mirror "same display change as clicking it": for each of Enter and Space, run the same sequence twice: once activating `=` by click, once by keyboard focusing the `=` button and pressing Enter/Space; assert identical displays. Also do a digit key to show typing works.
   
   Note: native `<button>` activation via Enter/Space requires real key events; CDP dispatchKeyEvent on Enter triggers click on button. The existing test showed Enter and Space activate the focused key (click event fired). Our test asserts display changes.

Implementation approach for the new test file: create `test/ui-wiring.test.js` reusing the Cdp/browser boilerplate from `ui-page.test.js`. The instructions say "reuse that approach" — I could extract a helper module (`test/helpers/browser.js`) and refactor, but modifying existing test file adds risk; better to create a new file with a copy of the needed harness? That's a lot of duplication (~200 lines). Hmm. Options:
1. New file `test/ui-wiring.test.js` that `require`s helpers from a shared module.
2. Extract the common CDP/browser launching code from `ui-page.test.js` into `test/helpers/cdp-browser.js`, update `ui-page.test.js` to use it, and write the new test file using it. This is a refactor of tests only — allowed (tester writes test files). Risk: breaking existing 48 tests; but I can run them.
3. Duplicate boilerplate in new file.

The card's "How to check" says "Automated: browser-driven checks click real buttons and read #display; run node --test". A shared helper is cleaner and the reviewer/implementer run the same command. But minimal-change principle: duplicating ~250 lines is ugly but isolated; refactoring risks the existing suite. Hmm. Also each test file would launch its own browser (current ui-page.test.js launches one browser for all its tests). If I add another file with its own browser, fine, node --test runs files in parallel by default (Node 18+ runs test files concurrently? `node --test` runs each file as a separate process, concurrency = number of CPUs). Two headless Edge instances is fine.

Given "reuse that approach", I think extraction is nicer, but safer: keep ui-page.test.js untouched and write a new self-contained file. Actually, wait: does the tester commit? No commit until human approves (per-phase). Files: new test file + evidence. I'll go with extraction? Let me weigh: The existing file is 682 lines and works. Extracting helpers means editing it — and if I make an error, the baseline suite breaks, which violates "don't break". But I'd run the suite to verify. The benefit: new file is small and readable; no duplication. The tester role: "Existing tests near the code this card touches, to match their style". Matching style suggests a similar self-contained file is acceptable, but DRY is better engineering. Let me consider what the implementer/reviewer needs to see: failing tests for wiring. A 300-line new file with duplicated harness works and is low-risk. A refactor adds review surface unrelated to the card; Groundwork cards should be minimal. Also modifying `ui-page.test.js` (card 2.1's tests) could confuse evidence for the phase. I'll create a new self-contained test file with only the harness code it needs (slightly reduced: no screenshots, no style diffing). I'll keep the Cdp class, launchBrowser, openPage, click helpers, key events.

Actually, I can reduce duplication by requiring the launch code? No, it's not exported. Fine, duplicate a trimmed version. Hmm, but "no comments unless asked" applies to code in general — the existing test file has no comments; I'll match: no comments. Wait, my global instructions say "Do not add comments unless the user asks" — but that's for the global coding conventions. Match existing style: existing tests are comment-free. OK.

Let me design the new test file `test/ui-wiring.test.js`:

Harness:
- Cdp class (open, receive, send, on, close)
- waitForEvent
- findBrowser
- launchBrowser
- before/after hooks: one browser, per-test navigation.
- PAGE_HELPERS similar but trimmed: `window.__check = { display(), buttons(), label() }` plus click helper: find button by label, compute center, dispatch mouse events, or use `button.click()`? Real click via CDP mouse events is better ("clicking"). The existing file uses real mouse events for hover tests. For wiring, using `Input.dispatchMouseEvent` at the button center = a real user click. I'll do a helper `clickKey(label)` that locates rect via evaluate then dispatches mousePressed/mouseReleased. 
- Also `readDisplay()` → textContent trimmed (use normalized whitespace).
- Track console errors: before each navigation, clear a collected array; subscribe once to `Runtime.consoleAPICalled` (type 'error') and `Runtime.exceptionThrown`. Need to ensure Runtime.enable was called (it is in launch). Exceptions from scripts also arrive via `runtime.exceptionThrown`. Also `Log.entryAdded` might catch browser-level errors? For script errors, exceptionThrown is enough. Page errors can also appear as console error entries with `Runtime.consoleAPICalled` type 'error'. Let me include both subscription points.

Tests mapping criteria:

1. `test('clicking 2 + 3 = shows 5; 5 + 3 = shows 8; = again shows 11')`
   - open page; click 2, +, 3, = → display '5'; then C; 5 + 3 = → '8'; = → '11'. Careful: card says "On the open page, clicking `2 + 3 =` shows `5`; clicking `5 + 3 =` shows `8`, and `=` again shows `11`." Could be consecutive: after `2+3=` shows 5, clicking `5 + 3 =` — since after result, typing digit starts fresh: 5, +, 3, = → 8, = → 11. Yes! That reads as one session: 2+3= → 5; then 5+3= → 8; then = → 11. So do it as a single sequence without C. 2+3= gives 5; then pressing 5 starts fresh 5; +3= gives 8; = gives 11. 
2. `test('clicking 1 . 5 + 2 . 5 = shows 4')` — fresh page, click 1, ., 5, +, 2, ., 5, = → '4'.
3. `test('1 ÷ 0 = shows Error and other keys leave Error showing')` — click 1, ÷, 0, = → 'Error'; then click each other key type? "clicking any other key leaves Error showing" — click a digit (7), an operator (+), '.', '=' and check still 'Error' after each. Also C? C is the exception (next criterion). So skip C. After each non-C key: display still 'Error'.
4. `test('C after the error shows 0 and the calculator works again')` — 1 ÷ 0 = → Error; click C → '0'; then clicking 2 + 3 = shows '5'.
5. `test('every button press updates the display immediately')` — sequence checking after each click: `1`→'1', `2`→'12', `3`→'123'; `+` → '123'; `4` → '4' (typing digit after operator starts fresh); actually after `+`, display still shows '123' (engine: pressOperator sets display to accumulator formatted = 123). Then `4` → '4'. Then `=` → '127'. This shows immediate updates. Also maybe `2 + 3 +` shows 5 straight away (spec chained input). Card's criterion is "Every button press updates the display immediately, so typing shows the current number." I'll assert after each press in a few sequences including chained `2 + 3 +` → '5'.
   Note: "immediately" — check synchronously after mouseUp dispatch. Since click handlers run synchronously during the click event, reading right after mouseUp is fine (maybe one rAF to let events process). I'll await a rAF after each click for safety.
6. `test('Enter and Space on a focused key change the display like a click')` — For keys: `5` (digit), `=` (needs a sequence), maybe `.`? Let's do: 
   - Page 1: click `2 + 3`, then focus `=` programmatically and press Enter via CDP → '5'.
   - Page 2: same sequence, focus `=` and press Space → '5'. (Does Space activate on keyup? For buttons, Space activates on keyup. CDP dispatch keyDown+keyUp should work.)
   - Page 3: focus `5` and press Enter → display '5'. Compare to baseline: a click on `5` from fresh gives '5'. Eh, simply assert display '5' after Enter on focused 5.
   - Also maybe Tab-based: use real Tab presses to reach `=`? The existing test proves Tab reaches keys. For this criterion, "focused key" - focusing via .focus() is fine but maybe use Tab to be real? Programmatic focus is acceptable and deterministic. Hmm — but "on a focused key" implies normal focus. `.focus()` sets the same state. I'll use `.focus()` and note that the existing 2.1 test proves Tab navigation. Actually to be safe and behavioral, I could use Tab loop like the existing test but that's slow for 17 keys. I'll focus programmatically; the click/Enter/Space behavior is what the criterion tests.
   - Compare "same display change as clicking it": run both in fresh pages and assert equal displays. I'll implement two runs: clickRun and keyRun, using fresh navigation for each, and compare arrays.

7. `test('the page displays engine results: label mapping and engine formatting match the engine')` — drive UI with sequences and compare with expected strings (computed from the engine in Node via require? or hardcoded?). Using the engine in Node to compute expected outputs is elegant: "one arithmetic implementation" — if the UI used its own math, it could diverge; comparing against the Node engine for a matrix of sequences covers mapping and formatting. But the expected values are then engine-derived; if I hardcode a few known values (from spec) it's clearer. Best: run the engine in Node with engine keys and compare page display after equivalent clicks, for a matrix of sequences:
   - `6 × 7 =` → 42 (mapping ×→*)
   - `8 ÷ 2 =` → 4 (mapping ÷→/)
   - `5 − 2 =` → 3 (mapping −→-)
   - `0 . 1 + 0 . 2 =` → 0.3 (rounding, from spec)
   - `1 ÷ 3 =` → 0.3333333333
   - `1 0 0 0 0 0 0 0 0 0 × 1 0 0 0 0 0 0 0 0 0 =` → 1.000000000e18
   - `1 ÷ 3 0 0 0 0 0 0 0 0 0 =` → wait spec says `1 ÷ 3 000 000 000` shows 3.333333333e-10. So type 3000000000 (10 digits).
   - digit cap: `1 2 3 4 5 6 7 8 9 0 1` → shows '1234567890' (11th ignored)
   - leading zeros: `0 0 5` → '5'
   - decimal: `. 5` → '0.5'
   - `= with no pending op`: `5 =` → '5'
   - `+ 5 =` → '5'? spec: operator with no number treats as 0: `+ 5 =` gives 5.
   - `5 + × 3 =` → 15? spec: pressing a new operator replaces pending: `5 + then × means 5 × 3` → 15.
   - `0 − 5 =` → '-5'
   For each: build an engine-key sequence (e.g. ['6','*','7','=']) and a click sequence (labels ['6','×','7','='], mapping labels→engine keys in the test helper). Expected = engine result in Node. Assert page display equals expected after each click, and also assert the final display equals `engine.display` (same). If the UI maps labels wrongly, the page display won't match.
   
   This is a good behavioral test for criterion 7's "maps labels, calls press". For "no arithmetic, digit limits, rounding or error rules in the UI code" — the equivalence matrix over engine-edge sequences is the behavioral proxy. I'll state in the report that the literal "no arithmetic in UI source" is a code-shape criterion that the reviewer verifies; the tester covers it behaviorally by requiring exact engine equality across edge sequences (digit cap, leading zeros, rounding, scientific, error). Hmm — can I do something stronger behaviorally? What about checking that the UI responds to engine state via the shared instance? E.g., `window.createCalculator` exists; if UI created its own calculator via the global, still one implementation. Testing "no arithmetic" statically would be a source scan — the role discourages source-content tests. I'll leave it behavioral and flag it.

   Also, could check that there is exactly one script-provided arithmetic implementation: e.g., override `window.createCalculator` before scripts run via `Page.addScriptToEvaluateOnNewDocument` to wrap/monkeypatch? That's a neat behavioral test: add an init script that replaces `createCalculator` with a spy that wraps `press` and counts calls, then click buttons and assert the spy was used. This proves the UI calls the engine's `press` (via the global) rather than doing its own thing. But careful: if ui.js captured `createCalculator` at load, the spy must be installed before ui.js runs. `Page.addScriptToEvaluateOnNewDocument` runs before page scripts. Then after load, click `2 + 3 =` and check spy counts: press called with '2','+','3','='. That's a strong "calls press" test! But it assumes UI uses the global `createCalculator` (the agreed implementation). The card says ui.js "calls press" — this tests it directly. Risk: if implementer implements UI differently while still meeting criteria? The agreed spec says use the global engine. The criterion says "calls `press`". So the spy test is legitimate and behaviorally verifies criterion 7's "calls press" and label mapping (spy sees engine keys '2','+','3','='). Nice. Let me include it:
   - `Page.addScriptToEvaluateOnNewDocument` with source that defines a hook after calc.js? No — ordering: the init script runs before any page script, so `window.createCalculator` doesn't exist yet. I can define a getter/setter property on window that intercepts assignment: `Object.defineProperty(window, 'createCalculator', { configurable: true, set(fn) { ... wrap ... }, get() { return wrapped; } })`. When calc.js does `root.createCalculator = createCalculator`, the setter receives the engine factory; we replace it with a wrapper that creates an instance and wraps `press` to record keys. Then ui.js (loaded after) sees the wrapped global. Careful: calc.js does `root.createCalculator = createCalculator` only if module not present; in browser yes. Also `_DEBUG` in implementer environment not needed.
   - Do I know the agreed implementation uses `window.createCalculator()`? The card goal says "Clicking the keys drives the engine in src/calc.js (from src/ui.js)". Checked facts: "In a browser it publishes the global `createCalculator` (no module object in the page)". So yes, ui.js is expected to use the global. The spy approach matches. But if the implementer, say, calls `createCalculator()` once at load and stores it — fine, spy wraps factory. If they instead copy engine code into ui.js (violating criterion 7), the spy would record no presses → test fails. 
   - Also this verifies `press` receives mapped engine keys: click `×` → spy sees `*`; `÷` → `/`; `−` → `-`.
   - And "writes display into #display": after each press, check `document.querySelector('#display').textContent === spy instance display`? We can expose the instance: `window.__engineSpy = { keys: [], instance: null }`. After clicks, compare page display to `window.__engineSpy.instance.display`. That's a strong check that the UI renders the engine's display string. But careful: if UI reads display after press, both will match. If UI computed its own display text, mismatch. Good.
   - Hmm, one subtlety: the wrapper instance's `press` must be called with same `this`. Wrap: `const instance = fn.call(this); const originalPress = instance.press; instance.press = function (key) { window.__engineSpy.keys.push(String(key)); const result = originalPress.call(instance, key); window.__engineSpy.display = instance.display; return result; };` But UI might call `press` as `instance.press(key)` → fine.
   - However, if ui.js does `var instance = createCalculator(); instance.press(...)` — wrapped. If ui.js does `createCalculator().press(key)` creating a new instance each time — the spy records but display resets each time; page display would show '2' then '+ ' ... the equivalence tests fail. Fine.
   
   This is a great test; but is it too implementation-prescriptive? The card explicitly says "calls press" and the accepted plan says scripts in order calc.js then ui.js. The monkeypatch of `createCalculator` global is behavioral. I'll include it as one test: "the UI calls the engine's press with mapped keys and renders the engine's display". Actually — the tester role says test the criteria; this is exactly criterion 7. Also criterion 8 script order is implicitly verified: if ui.js loaded before calc.js, the spy setter fires at ui.js load? No — setter defined in init script; if ui.js loaded first and called createCalculator before calc.js defined it, ui.js would throw (undefined), controls dead. Our live check catches.

   But wait: `Page.addScriptToEvaluateOnNewDocument` — do I need to remove it after? It applies to future navigations too. I'll remove via `Page.removeScriptToEvaluateOnNewDocument` with identifier after the test's navigation, or re-open after the test. Simpler: run this spy test last, or remove the identifier after page load. Since each test calls openPage (navigates), add-script persists for later navigations. I'll remove it right after navigation completes (the script already ran for that document; removal affects future documents). Implementation: add script, navigate/openPage, then remove identifier, then interact. 

   Potential issue: page reload in later tests would also run the spy if not removed. Remove after openPage.

   Also note the spy records keys — but the card says "maps labels (×→*, ÷→/, −→-)". Test: click `6`, `×`, `7`, `=` → keys spy `['6','*','7','=']`. click `8 ÷ 2 =` → `['8','/','2','=']`. click `5 − 2 =` → `['5','-','2','=']`. And display matches spy instance display. And after `C` → key 'C'.

   Edge: engine `press` may be called with digits as characters. UI passes label text directly for digits. Spy `String(key)`.

8. `test('opening index.html loads calc.js before ui.js, logs no console errors, and controls are live on first load')` — 
   - Subscribe to console errors/exceptions before navigation (in before hook after Runtime.enable, keep a collector; clear before each navigation).
   - openPage; assert `document.scripts` srcs order: find scripts whose src endsWith 'src/calc.js' and 'src/ui.js'; index calc < index ui. Also assert no other scripts that define arithmetic? Can't tell. The criterion: "loads src/calc.js before src/ui.js". Use DOM order check; it's page state, acceptable.
   - Assert `typeof window.createCalculator === 'function'` (calc.js loaded in browser).
   - Live on first load: click `7` immediately (no extra waits) → display '7'. Also maybe assert no console errors after interactions.
   - Collect console errors during load and after a couple of clicks; assert empty. Note: `Runtime.consoleAPICalled` type 'error'; `Runtime.exceptionThrown` any. Also maybe `Log.entryAdded` for network errors; file:// no network. I saw existing tests don't do console. Let me include both Runtime events. Also include `Log.enable`? Could add noise ("Failed to load resource: net::ERR_FILE_NOT_FOUND" if script missing — that would be a real failure signal! Actually if src/ui.js missing, file:// fetch fails → console error "Failed to load resource" via Log domain, and also exception `createCalculator is not defined`? If ui.js is a 404, index still "loads" without error events except network log). For "logs no console errors", Log.entryAdded with level 'error' is the right channel for resource failures. Enable Log domain. But careful: baseline page (no scripts) — Log entries none. After wiring, if scripts load fine, no entries. I'll collect both Runtime.consoleAPICalled (type error) and Log.entryAdded (level error) and Runtime.exceptionThrown. 
   - Note: navigating to file:// might log a favicon error? Chrome/Edge doesn't request favicon for file:// pages (I think it does not; even if it did, request for file:///.../favicon.ico fails with ERR_FILE_NOT_FOUND → Log entry). Risk. I'll empirically test after building the test. If favicon error shows, I'd restrict to Runtime exceptions + console errors, or filter favicon. Let's see in practice: currently no scripts; run an experiment to capture logs during load. I can write the test and iterate.

9. `test('at 375, 768 and 1440 the display update does not wrap or add a scrollbar')` — for each width: openPage(width, height), capture metrics with '0', click sequence to get `-3.333333333e-10` (via `0 − 1 = ÷ 3000000000 =`... wait: after `0 − 1 =` display '-1'; then press ÷ (operator after result) → display '-1'; type 3000000000; =) → display `-3.333333333e-10`; capture metrics; assert:
   - display text is the long value (sanity).
   - `range.getClientRects().length === 1` (no wrap) and display element height delta ≤ 1px vs '0'.
   - `document.documentElement.scrollWidth <= window.innerWidth` (no horizontal scrollbar).
   - scrollWidth/scrollHeight didn't grow beyond baseline+1.
   - text width ≤ content width (fits).
   Hmm, one nuance: at 375 width with 16-char text, card 2.1 test asserted `-1.234567890e-10` fits. Our engine-produced value is 16 chars too. Good.
   Also vertical scrollbar: if page has vertical overflow, a vertical scrollbar appears (classic overlay in headless? Edge headless may use overlay scrollbars). `document.documentElement.scrollHeight <= innerHeight` check might fail in baseline if content taller than 667. Card 2.1 tests at 375x667 passed with no horizontal scrolling; unknown vertical. I'll measure empirically. If baseline vertical scroll exists, then assert no *growth* (delta ≤ 1) plus no horizontal. And "add a scrollbar" is about adding due to the update. Growth check covers.
   
   Actually the criterion: "At 375/768/1440, updating the display does not wrap it or add a scrollbar." I'll assert: no wrap (single client rect, height unchanged), no horizontal scrollbar (scrollWidth <= innerWidth), and document/display metrics don't grow when display updates. That's faithful.

Also criteria 1-4 use "shows" — display text.

Now, evidence: save failing output to `.groundwork/evidence/2.2/`. The role says: "the command, the summary line and the failures, about 30 lines at most, not the full output". So save a file like `failing-tests.txt` (or `.md`?) with command + summary + failures. Let me check evidence format from other cards, e.g. card 2.1 evidence, to match naming. Let me read card 2.1 and list evidence dirs. Earlier glob `.groundwork/evidence/**` found nothing? That's weird given HANDOFF mentions evidence. Maybe glob ignores dotfiles unless hidden:true. Yes! Directories starting with `.` are hidden; glob default hidden:false. Let me use hidden:true.

Let me check .groundwork structure and evidence examples.

Also I should check node version to know test runner features (before/after hooks, timeouts). Node --test with `before`/`after` from node:test works in Node 18.8+ for module-level? `before`/`after` at top level of file works (they're file-level hooks). The existing file uses them, so fine.

Let me look at evidence of 1.4 or 2.1 to match style and see how "How to check" etc. is formatted.
```

</details>

<details>
<summary>Tool: glob</summary>

```json
{
  "pattern": ".groundwork/**",
  "hidden": true
}
```

```
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\workflow.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\LESSONS.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\JOURNAL.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\HANDOFF.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\SPEC.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\config.schema.json
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\config.json
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\templates\decision.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\templates\card.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\templates\AGENTS.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\retro.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\hooks\session-start.mjs
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\guides\existing-project.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\commands\gw-decide.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\commands\gw-approve.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\roles\implementer.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\roles\planner.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\commands\gw-plan.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\commands\gw-next.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\commands\gw-handoff.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\commands\gw-reject.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\commands\gw-quick.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\commands\gw-retro.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\commands\gw-setup.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\commands\gw.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\commands\gw-ui-spec.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\commands\gw-spec.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\roles\tester.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\roles\reviewer.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\guards\run.mjs
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\guards\no-ai-trailers.mjs
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\.gitkeep
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\decisions\0001-stack.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\decisions\.gitkeep
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\cards\1.3-clear-and-error-state.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\cards\1.2-operations-and-equals.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\cards\1.1-number-entry.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\cards\.gitkeep
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\cards\2.1-page-and-keypad.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\cards\1.4-result-formatting.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\cards\2.2-wire-it-up.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\1.2\tests-passing.txt
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\1.2\tests-failing.txt
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\1.2\reviewer-tests-rerun.txt
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\1.2\reviewer-criterion-check.txt
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\1.3\implementation-notes.md
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\1.3\review-probe.js
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\2.1\tests-passing.txt
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\2.1\tests-failing.txt
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\1.3\tests-passing.txt
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\1.4\tests-passing-reviewer.txt
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\1.4\tests-failing.txt
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\1.3\tests-focused-passing.txt
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\1.4\reviewer-probes.txt
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\1.3\tests-failing.txt
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\1.3\review-verification.txt
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\1.3\review-rerun.txt
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\2.1\reviewer-ui-page.txt
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\1.1\failing-tests.txt
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\1.1\passing-tests.txt
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\2.1\reviewer-full-suite.txt
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\2.1\full-suite-passing.txt
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\1.1\reviewer-rerun.txt
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\1.1\reviewer-edge-checks.txt
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\2.1\screenshots\768.png
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\2.1\screenshots\375.png
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\2.1\screenshots\1440.png
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\2.1\reviewer-states\hover.png
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\2.1\reviewer-states\focus.png
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\2.1\reviewer-states\pressed.png
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\2.1\reviewer-states\rest.png
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\2.1\reviewer-screenshots\768.png
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\2.1\reviewer-screenshots\375.png
C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\2.1\reviewer-screenshots\1440.png
```

</details>

<details>
<summary>Tool: read</summary>

```json
{
  "path": "C:\\Users\\rames\\Desktop\\calculator-groundwork\\.groundwork\\cards\\2.1-calculator-look.md"
}
```

Status: error

</details>

## Assistant


<details>
<summary>Reasoning</summary>

```
The card is `.groundwork/cards/2.1-page-and-keypad.md`. Let me read it plus an evidence sample (2.1 tests-failing.txt) to match format.
```

</details>

<details>
<summary>Tool: read</summary>

```json
{
  "path": "C:\\Users\\rames\\Desktop\\calculator-groundwork\\.groundwork\\cards\\2.1-page-and-keypad.md"
}
```

```
Read file C:\Users\rames\Desktop\calculator-groundwork\.groundwork\cards\2.1-page-and-keypad.md, lines 1-50
1: ---
2: id: 2.1
3: title: Page and keypad
4: phase: 2
5: status: done
6: depends_on: []
7: ---
8: ## Goal
9: `index.html` and `styles.css` show the calculator shell: a display area and the 17 keys (0–9, `.`, +, −, ×, ÷, =, C), usable on a phone and a desktop. This card is HTML/CSS only; the `src/ui.js` wiring is card 2.2.
10: 
11: ## Acceptance criteria
12: - [x] Opening `index.html` shows a display reading `0`, right-aligned, and exactly 17 `<button>` keys labeled `0`–`9`, `.`, `+`, `−`, `×`, `÷`, `=`, `C`.
13: - [x] The keypad is a 4-column, 5-row grid in this order: row 1 `C` (spans 3 columns) and `÷`; row 2 `7 8 9 ×`; row 3 `4 5 6 −`; row 4 `1 2 3 +`; row 5 `0` (spans 2 columns), `.`, `=`.
14: - [x] The display text is the largest on the page and fits ~16 characters (e.g. `-1.234567890e-10`) on one line without wrapping at 375px.
15: - [x] At 375px wide, every key is fully visible and no horizontal scrolling appears; at 768px and 1440px the calculator stays centered at no more than ~420px wide with no horizontal scrolling.
16: - [x] Keys have visible hover (devices with a mouse), pressed and keyboard-focus states; pressing a key does not shift the layout.
17: - [x] Tab reaches every key in visual order and Enter/Space activates the focused key; `÷`, `×`, `−`, `=`, `C` have aria-labels ("divide", "multiply", "minus", "equals", "clear").
18: - [x] With `prefers-reduced-motion: reduce`, pressing a key changes colour only (no scale).
19: 
20: ## How to check
21: - Run `start index.html` from the project root.
22: - See the display showing `0` and the 17 keys in the grid above; hover and press a few keys.
23: - Narrow the window to ~375px (or use the browser's device toolbar): all keys stay visible, no horizontal scrollbar. Widen to 1440px: the calculator stays centered and capped in width.
24: - Press Tab repeatedly: a visible focus outline moves through the keys in reading order; Enter or Space presses the focused key.
25: - Automated proof: `node --test test/ui-page.test.js` — a headless-browser check (Edge or Chrome; set `UI_BROWSER` to another executable) that asserts the display, the 17 labels, the grid order and spans, the 375/768/1440 layout, `document.documentElement.scrollWidth <= window.innerWidth` at each width, the key states, Tab order, Enter/Space activation, the aria-labels and reduced motion. It reads the display via `#display` (also accepts `[data-display]`, `.display` or `<output>`) and the keys as the page's 17 `<button>` elements.
26: - Screenshots at 375/768/1440 into `.groundwork/evidence/2.1/screenshots/`: `$env:UI_SHOTS = ".groundwork/evidence/2.1/screenshots"; node --test test/ui-page.test.js` (PowerShell, from the repo root).
27: - Manual check for how it looks (look only — everything else above is automated): the display and keypad read clearly, and hover/pressed/focus feedback looks distinct to a human eye.
28: - Reviewer state captures for a quick look: `.groundwork/evidence/2.1/reviewer-states/` (rest, hover, pressed, focus).
29: 
30: ## Evidence
31: - `.groundwork/evidence/2.1/tests-failing.txt` — before implementation: `node --test test/ui-page.test.js`, 9 tests, pass 0, fail 9, exit code 1 (index.html missing); full suite 48 tests, 39 pass, 9 fail.
32: - `.groundwork/evidence/2.1/tests-passing.txt` — implementer run: `node --test test/ui-page.test.js`, 9 tests, pass 9, fail 0, exit code 0 (Node v24.19.0, headless Edge, no new dependencies). Same run with `UI_SHOTS` wrote the three screenshots.
33: - `.groundwork/evidence/2.1/full-suite-passing.txt` — implementer run: `node --test`, 48 tests, pass 48, fail 0, exit code 0 (baseline was 39 pass / 9 fail; no new failures).
34: - `.groundwork/evidence/2.1/screenshots/` — `375.png`, `768.png`, `1440.png` from the passing run; implementer looked at all three: display `0` right-aligned, grid order and spans as agreed, centered and capped at 1440, no clipping.
35: - Reviewer re-run (2026-09-26, independent): `node --test test/ui-page.test.js` -> tests 9, pass 9, fail 0, exit 0 (`.groundwork/evidence/2.1/reviewer-ui-page.txt`); `node --test` -> tests 48, pass 48, fail 0, exit 0 (`.groundwork/evidence/2.1/reviewer-full-suite.txt`).
36: - Reviewer screenshots, regenerated from the current files: `.groundwork/evidence/2.1/reviewer-screenshots/` - byte-identical SHA-256 to the implementer's `screenshots/` at 375/768/1440, so those images match the code as committed.
37: - Reviewer state captures (headless Edge, CDP mouse + Tab input): `.groundwork/evidence/2.1/reviewer-states/` - `rest.png`, `hover.png` (key darkens), `pressed.png` (darker, slight scale), `focus.png` (blue outline). Checked by eye: all clearly distinct.
38: - Exact glyphs (PowerShell code-point check on `index.html`): U+00D7 multiply, U+00F7 divide, U+2212 minus - one each, no lookalikes.
39: - Verdict: all 7 criteria met. Checked against L-001 (status flow: implementer left `review`, reviewer sets `done` in per-phase mode) and L-002 (the implementer's call line is on the card; the reviewer call is recorded below).
40: - Caveats (honest): 1) Not verified live in an interactive `start index.html` window - verification used real headless Edge (tests plus mouse/Tab-driven state captures) and the screenshots; pointer feel on physical hardware is for the human at the phase review. 2) Extras beyond the card, judged harmless: `aria-live="polite"` on the display, `aria-label="Calculator"` on `<main>`, `touch-action`/tap-highlight/user-select on the keys. 3) The human-eye read of the states is from the reviewer captures above - still worth a glance at phase review.
41: 
42: ## History
43: 2026-09-26 planned
44: 2026-09-26 gw-ui-spec: behavior agreed with human (fluid CSS grid; layout, states, sizes and accessibility as above)
45: 2026-09-26 started (status → testing)
46: 2026-09-26 tester: 9 browser checks written (`test/ui-page.test.js`; headless Edge over DevTools, no dependencies); all 9 fail on the missing `index.html` (full suite 48: 39 pass, 9 fail); check self-validated against a throwaway correct page (9/9); status implementing
47: 2026-09-26 implementer: created `index.html` + `styles.css` only (no scripts, card 2.2's job): 17 `<button>` keys as direct children of a `.keypad` grid (`repeat(4, minmax(0, 1fr))`, gap 10px, C spans 3, 0 spans 2), display `#display` with `text-align: right`, `white-space: nowrap` and `clamp(30px, 8vw, 36px)`, `.calculator` capped at 420px and centered, typographic labels `−` U+2212 / `×` U+00D7 / `÷` U+00F7, aria-labels divide/multiply/minus/equals/clear, hover gated to `(hover: hover) and (pointer: fine)`, `:active` colour + `scale(0.97)`, `:focus-visible` outline, reduced-motion override removing transition and scale; focused 9/9 pass, full 48/48 pass, exit 0; screenshots written to `.groundwork/evidence/2.1/screenshots/`; status review
48: 2026-09-26 call: did not launch interactive `start index.html` as a subagent — no script wiring exists yet (card 2.2) and the same page was driven in real headless Edge at 375/768/1440, with all three screenshots inspected by eye; cost if wrong: pointer feel is confirmed only from screenshots until the human opens the page for the phase review
49: 2026-09-26 reviewer: re-ran the focused check 9/9 and the full suite 48/48 (exit 0, headless Edge); regenerated the three screenshots (byte-identical); captured rest/hover/pressed/focus states and read them by eye; verified the three symbol code points; read the new `index.html` + `styles.css` in full against SPEC and LESSONS; verdict pass; status done
50: 2026-09-26 reviewer call: did not open an interactive `start index.html` window (subagent run; card 2.2 has no wiring yet) - all visual proof comes from real headless Edge driven with mouse/Tab input; a real pointer/touch feel check is left to the human at the phase review. Cost if wrong: a hover/press nuance that only physical hardware shows ships.
```

</details>

<details>
<summary>Tool: read</summary>

```json
{
  "path": "C:\\Users\\rames\\Desktop\\calculator-groundwork\\.groundwork\\evidence\\2.1\\tests-failing.txt"
}
```

```
Read file C:\Users\rames\Desktop\calculator-groundwork\.groundwork\evidence\2.1\tests-failing.txt, lines 1-33
1: Card 2.1 — Page and keypad — failing check before implementation
2: 
3: Command (from repo root):
4:   node --test test/ui-page.test.js
5: 
6: The check drives a real headless Edge/Chrome over the DevTools protocol
7: (Node's built-in WebSocket, no dependencies, no server: it opens index.html
8: on file://). Every test fails at the first step because index.html is missing.
9: 
10: ✖ the display shows 0, right-aligned, and the page has exactly 17 keys with the expected labels
11: ✖ the keypad is a 4-column, 5-row grid in the agreed order, with C spanning 3 and 0 spanning 2
12: ✖ the display text is the largest on the page and fits -1.234567890e-10 on one line at 375px
13: ✖ at 375px every key is fully visible and there is no horizontal scrolling
14: ✖ at 768px and 1440px the calculator stays centered and no wider than ~420px, with no horizontal scrolling
15: ✖ keys have visible hover, pressed and keyboard-focus states, and pressing does not shift the layout
16: ✖ Tab reaches every key in visual order, and Enter/Space activate the focused key
17: ✖ the ÷ × − = C keys have the agreed aria-labels
18: ✖ with prefers-reduced-motion: reduce, pressing a key changes colour but does not scale
19: 
20: ℹ tests 9
21: ℹ pass 0
22: ℹ fail 9
23: ℹ duration_ms 3502.4929
24: 
25: Failure detail (the same for every test):
26:   AssertionError [ERR_ASSERTION]: index.html not found at
27:   C:\Users\rames\Desktop\calculator-groundwork\index.html; the check needs the page this card builds.
28:       at openPage (test\ui-page.test.js:262:10)
29: 
30: Full suite at the same point: `node --test` → tests 48, pass 39, fail 9 (only these 9).
31: The check was self-validated during the tester pass against a throwaway correct
32: page in a temp folder (not committed): it passed 9/9 there, so these failures are
33: the missing page, not a broken check.
```

</details>

## Assistant


<details>
<summary>Reasoning</summary>

```
Now I have a good understanding. Let me run the baseline test suite first to confirm 48/48. Also check node version. Then write the test file.

Let me think carefully about the test file design.

File: `test/ui-wiring.test.js`.

Harness pieces (trimmed copy from ui-page.test.js):
- Cdp class
- waitForEvent
- findBrowser
- launchBrowser
- before/after: browser + page
- console error collection: subscribe in before (after Runtime.enable). Note `launchBrowser` sends `Runtime.enable` and `Page.enable`. Add `Log.enable`.
- PAGE_HELPERS with display/buttons/label/rect.
- evaluate, openPage(width, height) — navigate to index.html, wait load, install helpers, two rAF.
- clickKey(label): evaluate rect (find button by label), scrollIntoView, then mouse events at center.
- readDisplay(): evaluate display text normalized; error if missing.

Wait — must the tests still fail "for the right reason" now (no scripts)? Yes: display will stay '0'. Good.

Console error test: interesting. Right now, no scripts → no console errors, and clicking does nothing. So that test would fail on "controls live" assertion, but the script-order assertion would also fail (no script tags). Good, fails for the right reason (feature missing).

Spy test: init script sets property setter for `createCalculator`. Currently calc.js isn't loaded, so no `press` calls; test fails. Good.

Now, designing the spy carefully:

```js
const SPY_SCRIPT = `(() => {
  const state = { keys: [], display: null, instance: null };
  Object.defineProperty(window, '__engineSpy', { value: state, configurable: true });
  Object.defineProperty(window, 'createCalculator', {
    configurable: true,
    get() { return wrapped; },
    set(create) {
      wrapped = function () {
        const instance = create.call(this);
        state.instance = instance;
        const originalPress = instance.press;
        instance.press = function (key) {
          state.keys.push(String(key));
          const result = originalPress.call(instance, key);
          state.display = instance.display;
          return result;
        };
        return instance;
      };
    },
  });
})()`;
```

Careful with `var wrapped` hoisting inside IIFE. Let me write cleanly:

```js
(() => {
  const state = { keys: [], display: null };
  let wrapped = null;
  Object.defineProperty(window, '__engineSpy', { value: state, configurable: true });
  Object.defineProperty(window, 'createCalculator', {
    configurable: true,
    set(factory) {
      wrapped = function createCalculatorWrapped() {
        const instance = factory();
        const press = instance.press;
        instance.press = function (key) {
          state.keys.push(String(key));
          const value = press.call(instance, key);
          state.display = instance.display;
          return value;
        };
        state.instance = instance;
        return instance;
      };
    },
    get() { return wrapped; },
  });
})()
```

Edge case: `factory()` — calc.js defines `createCalculator` function with closure; calling without new fine. If UI calls `new createCalculator()`? Unlikely. `factory()` with `this` undefined; fine.

But: what if the implementer's ui.js doesn't use the global `createCalculator` but does `const { createCalculator } = window;` — fine, getter returns wrapped. What if ui.js is a module (`type="module"`)? Then `createCalculator` as global still accessible via window; but module script and file://... calc.js publishes on globalThis; ui.js module would need `window.createCalculator`. The agreed implementation is plain scripts. The getter covers `window.createCalculator` and bare `createCalculator` references (global scope resolution goes through window properties, so getter works).

Wait — there's a subtlety: calc.js does:

```js
if (typeof module === 'object' && module !== null && module.exports) { ... } else { root.createCalculator = createCalculator; }
```

In browser, `module` is undefined → assigns to root (globalThis). Setter intercepts. 

But if the setter's `wrapped` is null when ui.js runs (calc.js failed to load), `createCalculator` getter returns null → ui.js calling it throws TypeError → exceptionThrown → console error test catches, and live test fails. Good.

Then test:
```js
test('src/ui.js drives the shared engine: press gets mapped keys and #display shows the engine display', async () => {
  const { identifier } = await page.send('Page.addScriptToEvaluateOnNewDocument', { source: SPY_SCRIPT });
  await openPage();
  await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
  await clickKey('6'); await clickKey('×'); await clickKey('7'); await clickKey('=');
  ...
});
```
Careful: `await openPage()` runs navigation; after load, remove script. But `Page.removeScriptToEvaluateOnNewDocument` returns `{}`; fine.

Sequence to test mapping:
- `6 × 7 =`: click labels map: '6'→'6', '×'→'*', '7'→'7', '='→'='.
- `8 ÷ 2 =`: '8','/','2','='.
- `5 − 2 =`: '5','-','2','='.
- `C`: 'C'.

Expected spy keys: ['6','*','7','=','8','/','2','=','5','-','2','=','C'].

But wait, after `6×7=`, display '42'; then click '8' starts fresh; fine. After `8÷2=` display '4'; click '5' fresh; etc. Then C resets to '0'.

Assert also after each press sequence that `#display` text equals spy's `state.display`? The spy captures after each press. But the UI writes display after calling press; synchronous. After all clicks, read display → '0' and spy.display → '0'. Compare at end, plus read display after `6 × 7 =` equals '42' and spy.display '42'. Since spy.display is only the last press's display; fine.

Actually, to compare per-step, I can click one key and check both display and spy last key. Let's do step-by-step helper `clickAndExpect(label, engineKey, expectedDisplay)`:
```
await clickKey(label);
const spy = await evaluate('({ keys: window.__engineSpy.keys, display: window.__engineSpy.display })');
assert.deepEqual(spy.keys.at(-1), engineKey) — or track expected array.
assert.equal(await readDisplay(), expectedDisplay);
assert.equal(spy.display, expectedDisplay);
```
This is nice and thorough but relies on UI writing display after each press; criterion 5 says every press updates immediately — but this spy test is criterion 7. Step-by-step assertions make label mapping exact.

However, subtle: does the UI possibly pass label text directly for `−`? Then engine ignores '−' (engine keys are '-'); result wouldn't change → display mismatch. The test catches.

Also the criterion says "no arithmetic ... in UI code". The spy test verifies all presses go through the engine and display equals engine display. If UI did additional arithmetic, display likely diverges from engine display; matrix equivalence test catches divergence.

Now the "engine equivalence matrix" test (criterion 1/2/4/5/7 combined? Better to distribute):

Test 1: chained basics per criterion 1.
Test 2: decimals per criterion 2.
Test 3: error per criterion 3.
Test 4: clear per criterion 4.
Test 5: immediate updates per criterion 5 (assert after each press; sequences: `1`, `2`, `3`, `+`, `4`, `=`; also `2 + 3 +` shows 5 immediately).
Test 6: Enter/Space per criterion 6.
Test 7: label mapping/spy per criterion 7a.
Test 8: engine-equivalence matrix per criterion 7b ("one arithmetic implementation" behavior). Sequences and expected outputs computed by running the engine in Node through `require('../src/calc.js')`.
   Wait: requiring src/calc.js in Node works (module.exports = api). In test file: `const { createCalculator } = require('../src/calc.js');`. Then for each case: `const engine = createCalculator(); for (const key of engineKeys) engine.press(key); expected = engine.display;` then on page: click label-seq (labels mapped to engine keys via LABEL_TO_ENGINE) and assert display === expected.
   
   Cases (engine keys → labels):
   - ['6','*','7','='] → ['6','×','7','='] → '42'
   - ['8','/','2','='] → ['8','÷','2','='] → '4'
   - ['5','-','2','='] → ['5','−','2','='] → '3'
   - ['0','.','1','+','0','.','2','='] → '0.3'
   - ['1','/','3','='] → '0.3333333333'
   - ['0','-','5','='] → '-5'
   - ['1','2','3','4','5','6','7','8','9','0','1'] → '1234567890' (digit cap)
   - ['0','0','5'] → '5' (leading zeros)
   - ['.','5'] → '0.5'
   - ['5','='] → '5' (= no pending op)
   - ['+','5','='] → '5' (operator with no number = 0)
   - ['5','+','*','3','='] → '15' (new operator replaces pending)
   - ['1' + 10 zeros...,'*','1e9?'] — for scientific: ['1','0','0','0','0','0','0','0','0','0','*','1','0','0','0','0','0','0','0','0','0','='] → engine: 1e9 * 1e9 = 1e18 → '1.000000000e18'. Wait format: exponent 18 > MAX_PLAIN_EXPONENT 9 → scientific → toPrecision(10) = "1.000000000e+18" → split 'e' → parts[1] = "+18" → Number("+18")=18 → "1.000000000e18". Good.
   - ['2','+','3','+'] → '5' chained (this is criterion 5 maybe).
   These are engine-behavior checks through the UI; each uses labels, so mapping verified too.
   
   For each case, I need fresh page state. Navigating 13 times per test is slow-ish but each load is a file:// page, fast (~100-300ms). Alternatively press C between cases: `C` resets fully. Does C in the UI work? Criterion 4 covers C after error; reset works generally. Using C between cases relies on C working — fine, and it's part of the contract. But if C is broken, matrix test fails for a different reason... Better isolate: use C to reset, but on failure message say which case. Hmm, cleanest: fresh navigation per case? 13 navigations × ~0.3s = ~4s. Acceptable. But the page may keep state? Each navigation is `Page.navigate` to same URL; Chrome reloads. Fine. However, I worry about `openPage` re-invoking `Emulation.setDeviceMetricsOverride` etc. It's fine.
   
   Actually reduce: use `C` between cases since C is a simple engine call and criterion 4 tests it. If C were broken, the matrix test might fail too — that's acceptable (a real bug). But to keep failure diagnosis clean, I'll use fresh page per case. 14 navigations; each openPage includes rAF wait; total maybe 5s. Existing tests already do multiple navigations. OK.

   Hmm, one more consideration: these expected values come from the same engine required in Node. Is that circular? It tests that UI + browser engine produce identical results to Node engine across edge behaviors. A UI reimplementation could coincidentally match simple cases but not the full matrix. Good enough as behavioral proxy; I'll note that exact "no arithmetic in source" is for the reviewer.

   Actually, I realize I could strengthen "one arithmetic implementation" behaviorally: monkeypatch spy catches all presses. If UI also did its own arithmetic, it might still call press... but then display would be written by UI's own code, not engine display; the spy compares engine display to page display after each press. If UI computed display itself (e.g., own formatting), divergence on edge cases. Combined, good.

Test 8 (criterion 8): scripts order + no console errors + live. 
   - Console collection: subscribe in `before`:
     ```
     consoleProblems = [];
     page.on('Runtime.consoleAPICalled', (params) => { if (params.type === 'error') consoleProblems.push(...) });
     page.on('Runtime.exceptionThrown', (params) => consoleProblems.push(description));
     page.on('Log.entryAdded', (params) => { if (params.entry.level === 'error') consoleProblems.push(...) });
     ```
     Need `Log.enable` in launchBrowser? I can send `Log.enable` in before after launch. Note Log.entryAdded may report network errors; that's desired for missing scripts. But it might also report something like "Failed to load resource: net::ERR_FAILED" for unrelated reasons? file:// local, unlikely. Let me empirically check after creating the test.
     Clear `consoleProblems.length = 0` at start of each openPage? Only the criterion-8 test needs them. I'll expose `problems` array and clear at the start of the test; openPage then any errors during that navigation get collected. But other tests navigating afterwards would add entries; only criterion 8 test reads them, and it clears before its own navigation. Since tests may run concurrently? node:test within a file runs tests sequentially by default (concurrency 1) unless `concurrency` option. Top-level tests run sequentially in Node's test runner? Within a file, tests run serially by default (each test awaited in order) — yes, `test()` top-level defaults to concurrency 1? Actually Node's test runner runs tests within a file sequentially (they're queued), subtests can be concurrent if specified. The existing file relies on shared pages serially. Fine.
   - Script order check: evaluate:
     ```
     Array.from(document.scripts).map(s => s.getAttribute('src'))
     ```
     assert indexOf('src/calc.js') !== -1, indexOf('src/ui.js') !== -1, calc < ui. Also assert calc is before ui. Maybe also assert no `type="module"`? Not needed.
   - Live on first load: after openPage, click '7' → display '7'. Maybe also check no console errors before and after this interaction (script errors during load).
   - Wait: "controls are live on first load" — clicking right after load without waiting. openPage already waits for load + rAF; clicking then is fine.
   - Assert console problems empty. Problem: favicon. Let me test empirically.

Test 9 (criterion 9): widths loop. Note: after clicking the sequence to produce the 16-char value, measure:
   - `displayText` = '-3.333333333e-10' (assert, sanity; if engine differs test fails here — engine tests already lock this).
   - Wrap: use Range `getClientRects().length` on display contents. Note: for an element with `white-space: nowrap`, wrapping can't happen; but test behavior.
   - Height: display element rect height before vs after ≤ 1px.
   - doc metrics: compare `documentElement.scrollWidth/scrollHeight`, `window.innerWidth/innerHeight` before and after; assert scrollWidth <= innerWidth after; assert scrollWidth_after <= scrollWidth_before (no new horizontal scrollbar) and scrollHeight_after <= scrollHeight_before + 1.
     Hmm, "add a scrollbar": if baseline already has vertical scrollbar, after-update growth check suffices. Also assert width fit: range rect width ≤ display content width + 1.
   - Also check display box right edge within viewport? covered by no horizontal scroll.
   - Heights: viewport 375x667, 768x900, 1440x900 (match 2.1 tests).

Also criterion 3: "clicking any other key leaves Error showing". Click several: '7' (digit), '+' (operator), '.' (point), '=' (equals), '×' (mapped operator). After each, display still 'Error'. Don't click C. Maybe also check that after error, pressing a sequence doesn't recover until C.

Criterion 4: after C → '0'; then '2 + 3 =' → '5' shows "works again". Also maybe error → C → '1 + 2 =' → '3'.

Now test count: ~9 tests, each with console noise? No.

Also test names should read clearly. The summary line `node --test` will show. Evidence file: `.groundwork/evidence/2.2/tests-failing.txt` (match naming convention from 1.1/1.2/2.1: `tests-failing.txt`).

Card updates:
- status: testing → implementing.
- Checkboxes: leave unchecked (tests fail now).
- Evidence: add bullet(s) linking failing output and test file.
- History line: `2026-09-26 tester: 9 browser checks written in test/ui-wiring.test.js; all fail (display stays 0) ...; status implementing`.
- How to check: add automated command line for the new file. The card's How to check already says "Automated: browser-driven checks click real buttons and read #display; run node --test." I should add the focused command: `node --test test/ui-wiring.test.js`. Role says "put the command that reruns it under the card's How to check". Good.

Also screenshots: card says "Screenshots of a result and the Error state are saved in .groundwork/evidence/2.2/." That's part of How to check — implementer will do; maybe I should set up the screenshot capability in my test file? The 2.1 file has `maybeScreenshot` with `UI_SHOTS`. For 2.2, the card wants screenshots of a result and Error state. The screenshots can be taken during the implementer's pass. But the card's "How to check" already lists it; the implementer can produce them with a script. Should my test file support screenshots for these states? The role says "put the command that reruns it under the card's How to check, so the implementer and reviewer rerun the same check." I can add optional screenshot hooks to my wiring test: when `UI_SHOTS` env var is set, capture after the result state and after the error state in the relevant tests? That duplicates 2.1's approach. Hmm, but evidence screenshots "of a result and the Error state" are required by the card. As tester, I could add `maybeScreenshot('result')` at the end of criterion-1 test and `maybeScreenshot('error')` in criterion-3 test, gated by `UI_SHOTS`. That would let the implementer produce them with one command. But is it my job? The tester writes the checks; the card says screenshots are part of how-to-check. Including optional capture makes the card's evidence achievable by the same command. I think adding it is helpful and small. But careful: screenshots would be captured from the criterion tests; the criterion-1 test's final state is display '11'; criterion-3's final state is 'Error'. Good: "a result and the Error state".

However, adding screenshot code means the tests' behavior changes with env var (writing files) — acceptable, mirrors 2.1.

Let me keep it minimal: `maybeScreenshot(name)` same as 2.1. In criterion-1 test after '11' → `maybeScreenshot('result')`; criterion-3 after asserting Error → `maybeScreenshot('error')`.

Hmm, but if UI_SHOTS isn't set nothing happens. Command to produce: `$env:UI_SHOTS = ".groundwork/evidence/2.2"; node --test test/ui-wiring.test.js`.

Now, potential issue: two test files both launching headless Edge concurrently under `node --test` (default concurrency = CPU cores - 1?). Node test runner default `--test-concurrency`... Node 20+: test files run in parallel up to os.availableParallelism() - 1. Both launch Edge with separate user-data-dirs and port 0 — fine.

Another consideration: the existing suite takes some time (48 tests, browser-heavy). Running `node --test` with the new file adds ~15-30s. Fine.

Node version: let me check (`node --version`). Also I want to validate my tests "fail for the right reason", and ideally self-validate against a throwaway correct implementation (like 2.1 tester did) so the tests aren't broken. Self-validation: in a temp folder? The tests navigate to `INDEX_PATH` = repo index.html — fixed path. To self-validate, I'd need to create `src/ui.js` and add script tags temporarily, run tests, then revert. That's risky (must not leave implementation). But I can do it in a copied temp directory if the test file's paths were parameterizable. The test file uses repo root. I could copy the whole repo? Heavy but simple? Alternatively, temporarily patch index.html and create src/ui.js, run, then restore/delete. Since I'm a subagent on a non-git repo... wait, env says "Is directory a git repo: no". Interesting — no git! So reverting must be manual and careful: backup index.html, create ui.js, run, restore index.html exactly, delete ui.js. Risk: leaving artifacts. If I do it, I must verify with hashes. The 2.1 tester validated against "a throwaway correct page in a temp folder (not committed)" — how, if paths are fixed? They may have monkeypatched? Maybe they copied the test to temp with adjusted path. I could do similar: copy `test/ui-wiring.test.js` to a temp folder along with a minimal correct app (index.html, calc.js, ui.js), adjusting REPO_ROOT? If test computes REPO_ROOT from `__dirname`, copying the file to temp/app/test/ with app root containing index.html and src/ would work unchanged! Nice: copy test file to `%TEMP%\calc-wiring-selftest\test\`, copy repo's index.html modified to include scripts, copy styles.css, src/calc.js, and write src/ui.js (throwaway correct implementation). Then run `node --test` there. That validates tests pass when implementation is correct, without touching the repo.

But minimal correct implementation for self-validation: I must write ui.js in temp, not repo — allowed ("Do not write the implementation" in the repo; temp validation harness is a test-development technique, 2.1 did it "against a throwaway correct page in a temp folder (not committed)"). It says the tester must not write the implementation — in the repo/production. A throwaway validation copy seems consistent with precedent. I'll do it, and mention in evidence/report. It's valuable to ensure my tests aren't broken and actually pass with the agreed implementation.

Wait, but is it "write the implementation"? The role's Must not: "Write the implementation, not even a stub that makes a test pass." Strictly, writing a correct ui.js anywhere could be seen as violating. But 2.1's tester did exactly this kind of self-validation and documented it, so precedent in this project says it's acceptable as a throwaway outside the repo (temp folder). I'll keep it in the OS temp dir (approved: C:\Users\rames\AppData\Local\Temp\opencode), clearly throwaway. I think the value (tests verified to pass with correct implementation, proving they're not impossible/broken) outweighs. And I will NOT leave it in the repo.

Hmm, but caution: my self-test implementation lives in temp where the implementer can't see it; if the tests pass there, good.

Also note: the failing output for evidence must come from the repo (no scripts). Then self-validation separately in temp. Evidence should record both: failing output in repo + note that checks were self-validated in temp (like 2.1 did).

Now let me also think about the spy test in temp validation: the temp app must load scripts as plain `<script src="src/calc.js"></script><script src="src/ui.js"></script>`. The Page.addScriptToEvaluateOnNewDocument spy intercepts `createCalculator` assignment. In the self-test the min ui.js will call `createCalculator()`. Good.

But wait: there's a subtlety with `Page.addScriptToEvaluateOnNewDocument` and file:// — works fine.

Another subtlety: `window.createCalculator` property: calc.js sets `root.createCalculator = ...` where root = globalThis. If the spy defines a property with a setter on `window` (globalThis), assignment triggers setter. Good.

One more: in the spy test, after openPage, do I need to remove the script? Yes; otherwise subsequent tests' navigations would also be spied (harmless — they don't check spy — but if ui.js calls the getter for a wrapped factory, and wrapped is per-document fresh state, fine. Still, remove to avoid surprises. Actually `addScriptToEvaluateOnNewDocument` identifiers apply to the whole page target across navigations; remove right after openPage.)
Order: add script → openPage → remove. `openPage` waits Page.loadEventFired; scripts executed by then.

Now, the live/console test details:
- Send `Log.enable` once in `before`.
- Collector: 
```js
const consoleProblems = [];
page.on('Runtime.consoleAPICalled', (params) => {
  if (params.type === 'error') consoleProblems.push('console.error: ' + params.args.map(describeRemoteObject).join(' '));
});
page.on('Runtime.exceptionThrown', (params) => {
  consoleProblems.push('uncaught: ' + (params.exceptionDetails.exception?.description || params.exceptionDetails.text));
});
page.on('Log.entryAdded', (params) => {
  if (params.entry.level === 'error') consoleProblems.push('log: ' + params.entry.text + (params.entry.url ? ' (' + params.entry.url + ')' : ''));
});
```
Need safe optional chaining — Node supports it.

The 2.1 test file doesn't have this; I add to my new file. But should I add console checking to launchBrowser (shared copy)? I'll add in the new file's before.

Potential issue: `Log.entryAdded` may contain "Uncaught ReferenceError..." duplicates. Fine.

Favicon: after adding scripts, index.html has no favicon link. Chrome requests `/favicon.ico` for http(s) only, I believe; for file:// it doesn't. But let me verify empirically in self-test: assert problems empty; if favicon noise appears, I'll see in self-test and can filter if truly unrelated. Let's see.

Another possible console error source: `aria-live` etc. no.

Now the click helper. Using real mouse events at button center. After each click, wait one rAF (`requestAnimationFrame` x2?) to let the event dispatch complete. Note CDP mousePressed/mouseReleased dispatch synchronously to the renderer; the click handler runs during dispatch, so by the time `send` resolves, the handler may have run. But to be safe, `await settle()` = evaluate rAF promise. The existing file's `openPage` waits 2 rAF after load and its click sequences in the Tab test only wait `sleep(20)`/`sleep(50)`. I'll use rAF settle after each click; cheap.

Wait, careful with the range/client-rect measurement after click: layout is sync after style/layout; rAF ensures.

`clickKey` implementation:
```js
async function clickKey(label) {
  const rect = await evaluate(`(() => {
    const button = ${buttonExpression(label)};
    if (!button) throw new Error('No button labelled ' + ${JSON.stringify(label)});
    button.scrollIntoView({ block: 'center', inline: 'center' });
    return window.__check.rect(button);
  })()`);
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 });
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
  await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
}
```
At 375px etc., buttons at y beyond viewport? openPage viewport height 667; keypad fits (2.1 tests say fully visible). scrollIntoView handles the rest. Note: mouse coordinates are viewport-relative and scrollIntoView changes scroll; recompute after. I do rect after scrollIntoView. Good.

`clickSequence(labels)` loops clickKey.

`readDisplay`:
```js
async function readDisplay() {
  const text = await evaluate(`(() => { const display = window.__check.display(); return display ? display.textContent.replace(/\\s+/g, ' ').trim() : null; })()`);
  assert.ok(text !== null, `No display element found (looked for ${DISPLAY_SELECTOR}).`);
  return text;
}
```
Wait assert.ok inside helper — throws AssertionError, fine. But `null` vs empty string. Display of 'Error' etc.

`expectDisplay(expected, context)`:
```js
assert.equal(await readDisplay(), expected, context);
```

Keyboard helper `pressKey(name)` same as 2.1 (Tab not needed; Enter, Space).

Focus helper: `focusKey(label)`:
```js
await evaluate(`(() => { const b = ${buttonExpression(label)}; if (!b) throw ...; b.focus(); return document.activeElement === b; })()`)
```
assert true.

Criterion 6 test design:
- `runWithActivation(activation)` returns array of displays after each step:
  1. openPage()
  2. click 2, +, 3
  3. if activation 'click': clickKey('=')
     if 'enter': focusKey('='), pressKey('Enter')
     if 'space': focusKey('='), pressKey('Space')
  4. read display
  Also digits via keyboard: 
  5. click 'C' (reset)
  6. focus '7', press activation
  Compare all three runs produce ['5','7'].
  
  Wait Space on a button: keyDown Space may scroll page? `Input.dispatchKeyEvent` with key ' ' on a focused button; default behavior scrolls page if not handled; but button activation prevents? Actual browsers: Space on button activates on keyup and prevents scroll. The 2.1 test verified Space triggers click. Good.
  
  Also Enter: for button, Enter triggers click on keydown. But note: `button.click()` triggered by keyboard activation — does our real mouse click differ? No.
  
  Do I need to compare with clicked equivalent? The criterion: "Pressing Enter or Space on a focused key gives the same display change as clicking it." So compare run('click') vs run('enter') vs run('space'):
  ```
  const results = {};
  for (const activation of ['click', 'enter', 'space']) results[activation] = await run(activation);
  assert.deepEqual(results.enter, results.click, ...);
  assert.deepEqual(results.space, results.click, ...);
  ```
  Nice. Each run: sequence displays for `2 + 3 =` and `C` `7`. Wait, after first run display '5'. Second run fresh page. Let me define steps: [click 2, click +, click 3, activate '=', read, click 'C', activate '7' (click or focus+key), read]. For click run, activate '7' = clickKey('7').
  
  Hmm, careful: focusKey('=') then pressKey calls `Input.dispatchKeyEvent`; but focusing needs evaluate; fine.

Criterion 5 test design (immediacy):
```
const steps = [
  ['1', '1'], ['2', '12'], ['3', '123'], ['+', '123'], ['4', '4'], ['=', '127'],
];
for each: clickKey(label); assert display === expected with message "after clicking X".
```
And chained: fresh page `2 + 3 +` → after last '+' display '5'.
Also `0 . 5` → after '.', '0.'; after '5', '0.5' (typing shows current number). That's criterion 2 territory but fine for immediacy. Keep the first sequence plus chained check. Maybe also includes `1234567890` then `1` ignored → still `1234567890`? That's matrix test. Keep criterion 5 test focused: per-press update.

Wait — one nuance: after clicking `+` (pending op) display remains '123' (engine sets display to accumulator). So expected '123'. Then '4' → '4'. Then '=' → 127. Good.

Criterion 1 test: one session sequence as analyzed: click 2,+,3,= → '5'; click 5,+,3,= → '8'; click = → '11'. Also maybe independent fresh check of `2 + 3 =` = '5' first. Let me assert after each step.

Criterion 2: `1 . 5 + 2 . 5 =`:
- after '1' → '1'; '.' → '1.'; '5' → '1.5'; '+' → '1.5'; '2' → '2'; '.' → '2.'; '5' → '2.5'; '=' → '4'. Assert final '4' and maybe intermediate values. Card: "the decimal and digit buttons all work" — assert each intermediate.

Criterion 3: `1 ÷ 0 =` → 'Error'; then click '7' → 'Error'; '×' → 'Error'; '.' → 'Error'; '+' → 'Error'; '=' → 'Error'. (Skip C.) Maybe also click '÷' again → Error. Also the engine ignores all but C.

Criterion 4: `1 ÷ 0 =` → Error; C → '0'; then `2 + 3 =` → '5'. Also `8 ÷ 2 =` → '4' to show calculator works again? One is enough; maybe do `2 + 3 =` then `=` again → '5'? No. Keep '5'.

Criterion 8 test details (order, no console errors, live):
```js
test('opening index.html loads calc.js before ui.js with no console errors, and the keys are live on first load', async () => {
  consoleProblems.length = 0;
  await openPage();
  const scripts = await evaluate('Array.from(document.scripts).map((script) => script.getAttribute(\'src\') || \'inline\')');
  const calcAt = scripts.findIndex((src) => src && src.replace(/\\\\/g, '/').endsWith('src/calc.js'));
  const uiAt = scripts.findIndex((src) => src && src.replace(/\\\\/g, '/').endsWith('src/ui.js'));
  assert.ok(calcAt !== -1, `No <script> loads src/calc.js; scripts found: ${JSON.stringify(scripts)}.`);
  assert.ok(uiAt !== -1, ...);
  assert.ok(calcAt < uiAt, `src/calc.js must load before src/ui.js; the page loads ${JSON.stringify(scripts)}.`);
  await clickKey('7');
  assert.equal(await readDisplay(), '7', 'The keys should be live on first load: clicking 7 right after load left the display at ...');
  assert.deepEqual(consoleProblems, [], `The page logged errors: ${consoleProblems.join(' | ')}`);
});
```
Note scripts src attribute is 'src/calc.js' as in HTML; endsWith handles leading './' or absolute. Fine.

But wait: "logs no console errors" — errors could occur during load before we start collecting? We subscribe in `before` before any navigation, and `Log.enable` sent then. Collector receives events during every navigation. Clearing right before this test's openPage is right. However, Runtime.consoleAPICalled events from a previous page could arrive late? Unlikely. Also note other tests' navigation errors would be cleared. Good. But should console errors also be checked on every test navigation? The criterion only asks on open. Keep in one test; maybe also assert after interactions in this test.

Also consider: baseline now (no scripts) — scripts array empty → fails at calcAt. Right reason.

Criterion 9 test details:
```js
test('at 375, 768 and 1440 updating the display does not wrap it or add a scrollbar', async () => {
  for (const [width, height] of [[375, 667], [768, 900], [1440, 900]]) {
    await openPage(width, height);
    const before = await metrics();
    await clickSequence(['0','−','1','=','÷','3','0','0','0','0','0','0','0','0','0','=']);
```
Wait: after `0 − 1 =`, display '-1'. Then clicking '÷': engine pressOperator with entry null, pendingOp null → accumulator = currentValue() = Number(display '-1') = -1; display set? In pressOperator, `entry === null` and `pendingOp === null` branch: accumulator = currentValue(); pendingOp = key; display unchanged ('-1'). Then digits 3000000000; entry builds. Then '=' → operand = 3000000000; pendingOp '/' operand !== 0 → result = -1/3e9 = -3.333333333e-10 → display. Good.
But hold on — `0 − 1 =`: click '0' → entry '0'; click '−' → pressOperator: entry='0', value 0; pendingOp null → accumulator 0; display '0'; pendingOp '-'. click '1' → entry '1' display '1'. click '=' → operand = currentValue() = 1; result = 0-1 = -1 → display '-1'; lastOp '-', lastOperand 1, entry null. Good.
Then `÷` → accumulator = currentValue() = Number('-1') = -1 (entry null so display). pendingOp '/'.
Then type 3 0 0 0 0 0 0 0 0 0: first '3' starts fresh (entry null → startFreshEntry('3')). Then nine '0's: digitCount grows: '30','300',... '3000000000' is 10 digits. Wait, we need 3000000000 = 3 followed by 9 zeros = 10 digits. Sequence: 3, then 9 zeros. In my array above I listed '3' then 9 zeros? ['÷','3','0'x9,'=']. Let me count: I wrote 3 then 0×9? In the list `'3','0','0','0','0','0','0','0','0','0'` = 3 + 9 zeros = 10 digits, good. Then '=' → -1/3000000000 = -3.333333333e-10. Good.

Metrics function:
```js
const metrics = () => evaluate(`(() => {
  const display = window.__check.display();
  if (!display) throw new Error('no display');
  const range = document.createRange();
  range.selectNodeContents(display);
  const textRect = range.getBoundingClientRect();
  const lines = range.getClientRects().length;
  const computed = getComputedStyle(display);
  const box = display.getBoundingClientRect();
  const contentWidth = box.width - pad - borders;
  return {
    text: ...,
    displayHeight: box.height,
    textWidth: textRect.width,
    textHeight: textRect.height,
    lines,
    contentWidth,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
  };
})()`);
```
After long value:
```js
assert.equal(after.text, '-3.333333333e-10', ...);
assert.equal(after.lines, 1, `display wraps ...`);
assert.ok(Math.abs(after.displayHeight - before.displayHeight) <= 1, ...);
assert.ok(after.textWidth <= after.contentWidth + 1, ...);
assert.ok(after.scrollWidth <= after.innerWidth, `horizontal scrollbar at ${width}px ...`);
assert.ok(after.scrollWidth <= before.scrollWidth, ...); // no new horizontal overflow
assert.ok(after.scrollHeight <= before.scrollHeight + 1, `updating the display added vertical overflow ...`);
```
Hmm `after.scrollWidth <= before.scrollWidth`: scrollWidth could be < innerWidth and equal anyway. Fine. For `before.scrollWidth` measured with '0'. If updating display somehow increased scrollWidth (shouldn't), fails.

Vertical: `after.scrollHeight <= before.scrollHeight + 1` ensures the update didn't add height. But if there's no vertical scrollbar at all, scrollHeight = viewport height or content height; unchanged. Good.

Also should assert `after.scrollHeight <= after.innerHeight` (no vertical scrollbar at all)? The calculator might be taller than 667 at 375×667 in current CSS; 2.1 tests passed but only checked horizontal. Let me check by measuring in the baseline quickly (we can run a quick probe with a temporary script? Or simply rely on before/after delta). The criterion says "updating the display does not wrap it or add a scrollbar" — the "add" wording means before/after. Delta check is exactly it. I'll also include the absolute horizontal check `scrollWidth <= innerWidth` (2.1 already guarantees it; if display update overflowed, caught). No absolute vertical check (page may legitimately scroll if content taller than viewport, that's not "adding").

Hmm wait, if content is taller than viewport at 375x667, a vertical scrollbar exists by default; that's not added by display update. Delta covers. OK.

Also wrapping: `range.getClientRects().length` returns rects per line; 1 if single line. But for text with `white-space: nowrap`, always 1. Good; also textHeight vs displayHeight? `textHeight` may be smaller than box height; assert `after.textHeight <= before.textHeight + 1` too? displayHeight delta suffices (box height fixed CSS; wrapping would likely not change box height if height fixed... wait, if the display has a fixed height and text wraps, the box height stays; the text rects would be 2 lines → `lines` catches; also textHeight grows vs one-line). Let me include both lines and textHeight. `textHeight` for multi-line = larger. Assert `after.textHeight <= before.textHeight + 1`.

Good.

Console errors: after all tests, nothing.

Now one more thought on criterion 7's exact wording: "The page has one arithmetic implementation: src/ui.js maps labels (×→*, ÷→/, −→-), calls press, and writes display into #display — no arithmetic, digit limits, rounding or error rules in the UI code."

My tests cover: mapping (spy + matrix), calls press (spy), writes display (spy compares engine.display to page display; immediate-update test), no separate arithmetic (matrix equivalence for digit limits, rounding, chained logic, error state). What about "no arithmetic": e.g., UI could implement `+` itself and still call press? Unlikely. The criterion is partly code-shape; I'll note in the report that "no arithmetic in ui.js source" is best confirmed by reading/review; my behavioral proxy is the engine-equivalence matrix. The role says if a criterion can't be automated as written, say so in the report rather than dropping it. I'll say exactly that.

Wait, should I also add a check that there is no second engine copy? A behavioral trick: the spy replaces `createCalculator`; if ui.js brought its own arithmetic implementation (not calling engine), spy records zero presses → fails. If ui.js also had its own arithmetic but called press anyway, matrix might still pass — but such code would be bizarre. Fine.

Hmm, actually one more possible check: after wiring, the page should have exactly one script pair. Could check that `document.scripts` has exactly 2 scripts and their srcs are calc.js and ui.js. The criterion "loads src/calc.js before src/ui.js" doesn't forbid other scripts, but a UI doing arithmetic in inline scripts... overkill. Skip; note to reviewer.

Now evidence: Save `.groundwork/evidence/2.2/tests-failing.txt` with:
- header, command `node --test test/ui-wiring.test.js`, summary (tests N, pass 0, fail N), the failing test names, representative failure detail, and full-suite note (`node --test` baseline after adding tests: 48+9... wait, adding test file adds tests; baseline said "full suite 48 tests". After adding my file: total = 48 + N tests where N = number of my tests; current index.html lacks scripts → my N tests fail; others pass. Let me run full suite to get exact counts and put in evidence (role: evidence about 30 lines max). Also self-validation note.

How many tests will I write? Let me enumerate:
1. clicking 2+3= shows 5, 5+3= shows 8, = again shows 11 (criterion 1)
2. typing decimals: 1.5+2.5= shows 4 (criterion 2)
3. 1÷0= shows Error and other keys leave it showing (criterion 3)
4. C after the error shows 0 and the calculator works again (criterion 4)
5. every button press updates the display immediately (criterion 5)
6. Enter and Space on a focused key change the display like a click (criterion 6)
7. the keys drive the shared engine: press receives mapped keys and #display shows the engine display (criterion 7 spy)
8. the UI shows the same results as the engine across entry, operator, rounding, formatting and error rules (criterion 7 matrix)
9. opening index.html loads calc.js before ui.js, no console errors, live on first load (criterion 8)
10. at 375/768/1440 the display update does not wrap or add a scrollbar (criterion 9)

10 tests. Hmm, maybe merge 7 and 8? They're distinct: spy (mapping/calls) vs equivalence (same arithmetic). Keep separate for clear failures. 10 tests is fine.

Timeout: each test 30000. The matrix test with ~14 navigations: use timeout 60000. Widths test 3 navigations + clicks: 45000 maybe; clicks at 1440 viewport: keys at y ~? viewport 900 tall; scrollIntoView fine. Keep 60000 for heavy ones.

Before hook launching browser: 30000 like existing.

Now: openPage with `width = 800, height = 900` default like 2.1.

Note on clicking `=` in the wheel: `Input.dispatchMouseEvent` with clickCount 1. Fine.

Potential issue: after `Page.navigate` to the same file URL repeatedly, does `Page.loadEventFired` fire on each navigation? Yes.

Another potential issue: `Runtime.evaluate` on file:// pages — Runtime.enable already done.

Now the self-test temp copy: 
- Create temp dir `C:\Users\rames\AppData\Local\Temp\opencode\calc-wiring-selftest` (the env says prefer opencode temp dir; I'll make a subdir).
- Copy: `test/ui-wiring.test.js` → temp/test/ui-wiring.test.js; `styles.css` → temp/styles.css; `src/calc.js` → temp/src/calc.js.
- Write temp `src/ui.js` (throwaway correct wiring):
```js
'use strict';
(function () {
  var calculator = createCalculator();
  var display = document.getElementById('display');
  var LABEL_KEYS = { '×': '*', '÷': '/', '−': '-' };
  var buttons = document.querySelectorAll('.keypad button');
  for (var i = 0; i < buttons.length; i++) {
    (function (button) {
      button.addEventListener('click', function () {
        var label = button.textContent.trim();
        calculator.press(LABEL_KEYS[label] || label);
        display.textContent = calculator.display;
      });
    })(buttons[i]);
  }
})();
```
- temp index.html: copy repo index.html + add `<script src="src/calc.js"></script><script src="src/ui.js"></script>` before `</body>`.
- Run `node --test test/ui-wiring.test.js` in temp.
- Expect 10/10 pass. Also run with `UI_SHOTS`? Not needed in temp.
- Then delete temp dir (or leave? It's temp; I'll remove it to be clean).

Wait — the self-test will also verify console-clean and script order since temp index has both scripts. Good.

Also verify failing run in repo: `node --test test/ui-wiring.test.js` → 10 fail; then `node --test` full → analyze summary.

One thing to check: Node version for `.at(-1)` — avoid `.at()` for compatibility; use index. Let me check node version first.

Also check: does `node --test` (without args) pick up `test/*.test.js`? Files matching `*.test.js` under test dir, yes (Node's default glob covers `**/*.test.js` etc.). Existing setup relies on it.

Let me now check Node version and baseline run. Use shell. Note: commands are PowerShell. Run `node --version` and `node --test` baseline? Full suite takes maybe 30-60s (headless browser tests); the earlier HANDOFF says 48/48 at commit 134ed50, but let me re-run baseline to be sure and to capture timing. Actually let me first write the test, then run focused, then full. But baseline full-suite check before adding my file is useful to confirm 48/48 start. The task said baseline 48/48 — trust but verify quickly? It takes time; running full suite once after adding gives counts including baseline anyway. I'll run focused first.

Let me also double check how `Input.dispatchKeyEvent` for Space in this harness: existing KEYSTROKES uses key ' ', code 'Space', keyCode 32, text ' '. On keyDown, text ' ' triggers... For button activation, Space keydown is consumed; keyUp triggers click. The existing 2.1 test proved it works with button click capture; good.

For Enter: key 'Enter', code 'Enter', keyCode 13, text '\r'; type keyDown (not rawKeyDown). Existing test used this and click fired. Good.

Now, one risk in criterion 6: pressing Space on a focused button where the page might scroll. Existing test didn't check scroll. Not an issue for our assertions.

Another risk: after `focusKey('=')`, pressing Enter triggers `click` → our handler. Good. But does pressing Enter also submit something? No form.

Let me now think about `PAGE_HELPERS` — copy from existing (display, buttons, label, rect). Display selector same. Need `lca`? Not needed for wiring. Keep it trimmed.

Now, about the display selector: `#display, [data-display], output, .display` — same as 2.1. Fine.

Let me write the code. I'll write carefully, matching existing style (no comments except maybe minimal; existing file has none). But clarity for humans reading evidence... The 2.1 file has no comments. I'll match.

One question: should the new file duplicate the CDP harness or require from a shared file? Let me count the minimum needed:
- Cdp class (~60 lines)
- waitForEvent (~13)
- findBrowser (~23)
- launchBrowser (~68 + Log.enable line)
- console collectors (~12)
- PAGE_HELPERS (~25 trimmed)
- evaluate (~9)
- openPage (~13)
- pressKey (~16)
- clickKey (~14)
- clickSequence (~3)
- readDisplay/expectDisplay (~10)
- focusKey (~5)
- maybeScreenshot (~10)
- tests (~300)
Total ~580 lines. Existing file 682. This duplication is significant but acceptable; alternative helper extraction edits an approved test file (2.1's evidence) — I'd rather not touch it.

Hmm, what about using `require('./ui-page.test.js')`? No, it runs tests on require.

Could I put the harness in `test/helpers/cdp-browser.js` and have only the new file use it (not touching ui-page.test.js)? Then harness lives once for future cards, but ui-page still duplicates. Still duplication overall. Not worth restructuring now; note to HANDOFF in report: consider extracting a shared harness in a later cleanup card. Actually, the report goes to HANDOFF via runner; I'll mention it as an extra idea (role says note extra ideas in HANDOFF).

Now let me think about the `LaunchBrowser` copy: I need `Log.enable` maybe inside launchBrowser after Runtime.enable. And console listeners in `before`.

Potential trap: `Log.entryAdded` for `file://` favicon. Let me empirically find out in the self-test (temp correct implementation). If favicon errors appear, then the criterion "logs no console errors" would be impossible... but note the repo page has no favicon link; Chrome will request favicon for file URLs? I recall Chrome does NOT request favicon.ico for file:// unless link present. Let me verify with a quick probe before finalizing: I can write the test, run in temp self-test, and see if console problems surface.

Actually, a quicker probe: use the existing ui-page.test.js harness? No console listeners. I'll just run my self-test and see.

Now, about the spy test and `Page.addScriptToEvaluateOnNewDocument`: Edge/Chrome support. Return `{ identifier }`. Fine.

In the self-test temp run, the spy must intercept `createCalculator`. ui.js in temp references global `createCalculator` — my temp ui.js uses bare `createCalculator()`. Bare reference resolves via global object → getter returns wrapped. 

Wait, subtlety: calc.js's IIFE sets `root.createCalculator = createCalculator`. If `window.createCalculator` has an accessor property with a setter, assignment invokes setter. Good. But does the browser page's global have `createCalculator` already defined as non-configurable? No.

Another subtlety: calc.js checks `typeof module === 'object'` — in browser, `module` undefined. Good.

Edge case: if the implementer's ui.js does `'use strict'; (function(){ var create = createCalculator; ...})()` fine.

Spy state: `window.__engineSpy` defined via `Object.defineProperty(window, '__engineSpy', { value: state, configurable: true })` so test can read `window.__engineSpy.keys`. `Runtime.evaluate` returns by value: `window.__engineSpy.keys` array deep-copies fine.

For comparing per-press: after each click, 
```js
const spyState = await evaluate('({ keys: window.__engineSpy.keys.slice(), display: window.__engineSpy.display })');
assert.equal(spyState.keys[spyState.keys.length-1], engineKey)
assert.equal(spyState.display, expectedDisplay)
assert.equal(await readDisplay(), expectedDisplay)
```
I'll accumulate expected keys and compare at end too:
```js
const steps = [
  ['6', '6', '6'], ['×', '*', '6'], ['7', '7', '67'], ['=', '=', '42'],
  ...
];
```
Wait after `6 × 7 =`: after '6' display '6'; after '×' display '6'; after '7' display '7'; after '=' display '42'. Hmm display after '×': pressOperator sets display to formatNumber(accumulator) = '6'. Good.
Then `8 ÷ 2 =`: '8'→'8','÷'→'8','2'→'2','='→'4'.
Then `5 − 2 =`: '5','−','2','=' → '5','5','2','3'.
Then 'C' → '0'.
Expected engine keys: ['6','*','6'... no: steps are (label, engineKey, expectedDisplay):
1. ['6','6','6']
2. ['×','*','6']
3. ['7','7','7']  ← wait after '×', entry null, accumulator 6; clicking '7' starts fresh entry display '7'. Yes.
4. ['=','=','42']
5. ['8','8','8']
6. ['÷','/','8']
7. ['2','2','2']
8. ['=','=','4']
9. ['5','5','5']
10. ['−','-','5']
11. ['2','2','2']
12. ['=','=','3']
13. ['C','C','0']
After each click assert page display and spy display equal expected, and last key equals engineKey. At end assert full spy.keys deepEqual.

Also assert `spy.display` after each click matches engine (it should since spy wraps instance.press). But wait: between press calls, the UI writes `display.textContent = calculator.display` — at that point `calculator.display` equals `instance.display` (same object). Yes.

However! There's a subtle failure mode: if the UI renders display *before* calling press? No.

What if the UI uses one instance per calculator but recreates on C? Still spy instance replaced? My wrapper sets `state.instance` each factory call; press wrapper per instance. Keys accumulate. display matches. Fine.

Now the matrix test: compute expected via Node engine:
```js
const { createCalculator } = require('../src/calc.js');
function engineDisplay(keys) { const engine = createCalculator(); for (const key of keys) engine.press(key); return engine.display; }
const CASES = [
  { name: 'multiply maps × to *', labels: ['6','×','7','='], keys: ['6','*','7','='] },
  ...
];
for (const testCase of CASES) {
  await openPage();
  await clickSequence(testCase.labels);
  assert.equal(await readDisplay(), engineDisplay(testCase.keys), `${testCase.name}: ...`);
}
```
Each case fresh page avoids state carry-over and needs no C. ~14 cases.

Wait: require path from test file: `require('../src/calc.js')` → test dir is `test/`, so `../src/calc.js`. Use path.join? Existing calc.test.js probably does `require('../src/calc.js')`. Let me check quickly to match. I'll read test/calc.test.js head.

Let me also double check engine outputs by running node snippets for the matrix cases — I can compute in the self-test? Better: the matrix test computes expected dynamically from engine, so it's automatically correct. But I want to ensure cases exercise what I claim and page state expectations hold (e.g. expected strings). My failing run can't validate (UI dead). The self-test validates.

However, there's a philosophical question: if the expected is computed by the engine, then a UI that delegates to the engine necessarily matches — the test is somewhat tautological for correct implementations, but it fails for broken mappings/UI-side math. That's the point. Plus the spy test proves delegation. Good.

Also I could assert `engineDisplay(keys) === explicitExpected` with explicit values for a few (e.g. '42', '0.3', '1.000000000e18', '1234567890', '0.5', '5', '15', '-5', '0.3333333333', '3.333333333e-10'). This guards against the engine being changed by the implementer to a wrong-but-consistent implementation (they shouldn't change calc.js anyway; and engine tests would catch). I'll assert both: explicit expected list and engine equivalence. That makes failures clearer too. Actually if I assert explicit expected, the engine comparison adds "same implementation" semantics. Keep both:
```js
assert.equal(actual, testCase.expected, `${testCase.name}: the page shows ...`);
assert.equal(testCase.expected, engineDisplay(testCase.keys), ...) // sanity of the fixture
```
Hmm, if the engine changes incorrectly, engine tests fail anyway. I'll assert page === expected explicitly, and page === engineDisplay for equivalence. Two assertions per case; failure messages clear.

Cases with explicit expected:
1. `6 × 7 =` → '42'
2. `8 ÷ 2 =` → '4'
3. `5 − 2 =` → '3'
4. `0 . 1 + 0 . 2 =` → '0.3' (rounding)
5. `1 ÷ 3 =` → '0.3333333333'
6. `0 − 5 =` → '-5'
7. `1 2 3 4 5 6 7 8 9 0` then `1` → '1234567890' (digit cap; note no '=' needed)
8. `0 0 5` → '5' (leading zeros)
9. `. 5` → '0.5'
10. `5 =` → '5'
11. `+ 5 =` → '5'
12. `5 + × 3 =` → '15'
13. `1 0 0 0 0 0 0 0 0 0 × 1 0 0 0 0 0 0 0 0 0 =` → '1.000000000e18'
14. `1 ÷ 3 0 0 0 0 0 0 0 0 0 =` → '3.333333333e-10'
15. Maybe `1 ÷ 0 =` → 'Error' (error rule) — covered in criterion 3, but matrix equivalence for error rule in UI: add it? Criterion 3 covers. Skip to avoid duplication? The matrix explicitly targets "rounding or error rules in the UI code" — I include one error case to show error display comes from engine: `1 ÷ 0 =` → 'Error'. Fine, add.
16. Maybe `0 . 1 + 0 . 2 =` covered; also chained: `2 + 3 + 4 =` → '9' (chained input). Add.

That's ~16 navigations; fine. Actually to reduce runtime, I could group into fewer navigations using C between cases... but fresh page is clean. Node file:// navigation is fast (~50-100ms each in headless). 16 × ~0.2s ≈ 3s. Fine.

Hmm wait, there's a subtlety with case 12 `5 + × 3 =` → engine: '5' entry; '+' operator → accumulator 5, pending '+'; '×' operator → entry null, pendingOp '+'? In pressOperator: entry null and pendingOp !== null → skip accumulator update; pendingOp = '*'. Display stays '5'. Then '3' → entry '3'; '=' → operand 3, result 5*3=15 → '15'. Good.

Case 11 `+ 5 =`: '+' → entry null, pendingOp null → accumulator = currentValue() = Number(display '0') = 0. pending '+'. '5' → entry '5'. '=' → 0+5=5 → '5'. Good.

Case 10 `5 =`: '5' entry; '=' → pendingOp null, lastOp null → entry = null; display stays '5'. Good.

Case 7: typing 11 digits: after 10 digits entry '1234567890', 11th '1' ignored since digitCount 10 == MAX. Display '1234567890'. Good.

Case 9: '.' → entry '0.', display '0.'; '5' → '0.5'. Good.

Now criterion 5 immediacy test sequences:
- `1`,`2`,`3` → '1','12','123'; `+` → '123'; `4` → '4'; `+`? Let me finish with `=` → 127? After '+' pending '+' accumulator 123; '4' entry 4; '=' → 127. Good.
- Chained: fresh page `2 + 3 +` → after '2'→'2'; '+'→'2'; '3'→'3'; '+'→'5' (immediate result). Then '4' '=' → '9'. Good.

I might merge criterion 5 with chained; keep as one test: 
```
const updates = [['1','1'],['2','12'],['3','123'],['+','123'],['4','4'],['=','127']];
for (...) { await clickKey(label); await expectDisplay(expected, `after clicking ${label} the display should already show ${expected}`); }
await openPage();
for ... [['2','2'],['+','2'],['3','3'],['+','5'],['4','4'],['=','9']]
```
Second sequence: after '+' (first) display '2'; '3' display '3'; second '+' → accumulator 2+3=5 display '5'; '4' → '4'; '=' → 5+4=9. Good.

Wait first sequence expected after '+' is '123' — engine pressOperator with entry '123': value=123, pendingOp null → accumulator=123, display=formatNumber(123)='123'. Yes.

Now, criterion 1 test:
```
await openPage();
await clickSequence(['2','+','3','=']); expect '5'
await clickSequence(['5','+','3','=']); expect '8'
await clickKey('='); expect '11'
```
Wait after first result 5, clicking '5' starts fresh → '5'; '+' → accumulator 5; '3' → '3'; '=' → 8. Then '=' again → lastOp '+' repeat with lastOperand 3 → 8+3=11. Good.

Maybe assert intermediate: after '2','+','3' display '3'; then '=' → '5'. Fine, assert final only plus maybe intermediate. Keep some intermediates for clarity.

Criterion 2 test:
```
['1','1'], ['.','1.'], ['5','1.5'], ['+','1.5'], ['2','2'], ['.','2.'], ['5','2.5'], ['=','4']
```
Good — verifies decimal and digit buttons.

Criterion 3:
```
await clickSequence(['1','÷','0','=']) → 'Error'
for label of ['7','×','.','+','÷','='] { clickKey(label); expect 'Error'; }
```
Also maybe check that after error, entering a number doesn't change: covered. C not included. Screenshot after: maybeScreenshot('error').

Criterion 4:
```
['1','÷','0','='] → Error; ['C'] → '0'; ['2','+','3','='] → '5'; maybe ['8','÷','2','='] → '4'.
```
Let me do `2 + 3 =` → '5' then C → '0'? Enough: after C → '0' then 2+3= → '5'. Also verify typing a fresh number after C: after C, '7' → '7', C again → '0'. Hmm keep simple per card: "Clicking C after the error shows 0, and the calculator works again." Do: C → '0'; then '2 + 3 =' → '5'. Also assert after error C then 'C' again? Not needed.

Screenshots: card asks result + Error state. Result screenshot in criterion-1 test after '11'? The card says "Screenshots of a result and the Error state". A result could be '5' or '11' - fine. I'll capture in criterion 1 after final '11' as `result` and criterion 3 after error as `error`. Maybe better a clean '5'? The sequence ends at '11' naturally. Fine.

Wait, maybeScreenshot with UI_SHOTS needs the viewport set; openPage sets 800x900. Fine.

Also, screenshots with UI_SHOTS in the repo run (failing) would write nothing? maybeScreenshot is called after assertions that fail → no screenshot. Fine; implementer will run with UI_SHOTS.

Evidence text should mention command for screenshots.

Now let me also think about whether to include the criterion "Opening index.html ... controls are live on first load" — interaction via click right after load, we do. Good.

What about "logs no console errors" — also check after clicking (handler errors). Do: after click '7' and '=' maybe, read problems again. I'll collect and assert at the end of the test after a couple clicks.

Edge: If `src/ui.js` doesn't exist, browser logs "Failed to load resource: net::ERR_FILE_NOT_FOUND" via Log domain → recorded. That's a real console error. Good signal.

Now — the failing run in repo: index.html has no scripts → scripts array empty. Test fails at `calcAt !== -1` before clicking. Failure message should show scripts found: []. Good.

But wait — there's a subtlety with the console-errors test while no scripts: no errors, but script assertion fails first. Fine.

Now, the ordering of assertions in criterion-8 test: script order first (fail fast), then live click, then console problems. If scripts missing, first assertion fails with clear message. Good.

Let me now write the test file. I'll be careful with escaping in template literals inside the test (e.g., regex `/\\s+/g` inside evaluated string must be `\\\\s` in source? In 2.1 they used `replace(/\\s+/g, ' ')` inside a JS template literal — since the template literal is in the test source, `\\s` becomes `\s` in the evaluated string. I'll write similar.

Also PAGE_HELPERS uses JSON.stringify for selector injection like existing.

Let me write the file now.

Structure:

```js
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { createCalculator } = require('../src/calc.js');

const REPO_ROOT = path.join(__dirname, '..');
const INDEX_PATH = path.join(REPO_ROOT, 'index.html');
const DISPLAY_SELECTOR = '#display, [data-display], output, .display';

const LABEL_KEYS = { '×': '*', '÷': '/', '−': '-' };

const KEYSTROKES = {
  Enter: { key: 'Enter', code: 'Enter', keyCode: 13, text: '\r' },
  Space: { key: ' ', code: 'Space', keyCode: 32, text: ' ' },
};

const sleep = ...
class Cdp ...
waitForEvent ...
findBrowser ...
launchBrowser ... (add Log.enable)
```

Console collectors:
```js
const consoleProblems = [];

function describeRemoteObject(object) {
  return object.value !== undefined ? String(object.value) : (object.description || object.type || 'error');
}

function watchConsole(client) {
  client.on('Runtime.consoleAPICalled', (params) => {
    if (params.type !== 'error') return;
    consoleProblems.push(`console.error: ${(params.args || []).map(describeRemoteObject).join(' ')}`);
  });
  client.on('Runtime.exceptionThrown', (params) => {
    const details = params.exceptionDetails || {};
    consoleProblems.push(`uncaught: ${(details.exception && details.exception.description) || details.text || 'error'}`);
  });
  client.on('Log.entryAdded', (params) => {
    const entry = params.entry || {};
    if (entry.level !== 'error') return;
    consoleProblems.push(`log: ${entry.text}${entry.url ? ` (${entry.url})` : ''}`);
  });
}
```

In before: after launchBrowser → watchConsole(client); page.send('Log.enable').

Note: launchBrowser already sends Page.enable and Runtime.enable.

PAGE_HELPERS trimmed:
```js
const PAGE_HELPERS = `(() => {
  const normalize = (text) => (text || '').replace(/\\s+/g, ' ').trim();
  window.__check = {
    display: () => document.querySelector(${JSON.stringify(DISPLAY_SELECTOR)}),
    buttons: () => Array.from(document.querySelectorAll('button')),
    label: (button) => normalize(button.textContent),
    rect: (element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    },
  };
})()`;
```

evaluate, openPage same.

```js
function buttonExpression(label) {
  return `window.__check.buttons().find((candidate) => window.__check.label(candidate) === ${JSON.stringify(label)})`;
}

async function clickKey(label) {
  const rect = await evaluate(`(() => {
    const button = ${buttonExpression(label)};
    if (!button) throw new Error('No button labelled ' + ${JSON.stringify(label)});
    button.scrollIntoView({ block: 'center', inline: 'center' });
    return window.__check.rect(button);
  })()`);
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 });
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
  await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
}

async function clickSequence(labels) {
  for (const label of labels) await clickKey(label);
}

async function readDisplay() { ... }

async function expectDisplay(expected, message) {
  const actual = await readDisplay();
  assert.equal(actual, expected, `${message} (expected ${JSON.stringify(expected)}, found ${JSON.stringify(actual)})`);
}
```
Careful: message wording. For each press: "after clicking 2 the display should show 12". Let me define expectDisplay(expected, context) where context is a full sentence and append details.

`focusKey`:
```js
async function focusKey(label) {
  const focused = await evaluate(`(() => {
    const button = ${buttonExpression(label)};
    if (!button) throw new Error('No button labelled ' + ${JSON.stringify(label)});
    button.focus();
    return document.activeElement === button;
  })()`);
  assert.ok(focused, `Could not focus the "${label}" key.`);
}
```

`maybeScreenshot` same as 2.1.

Tests:

Test 1:
```js
test('clicking 2 + 3 = shows 5, then 5 + 3 = shows 8, and = again shows 11', { timeout: 30000 }, async () => {
  await openPage();
  await clickSequence(['2', '+', '3', '=']);
  await expectDisplay('5', 'after clicking 2 + 3 =');
  await clickSequence(['5', '+', '3', '=']);
  await expectDisplay('8', 'after clicking 5 + 3 =');
  await clickKey('=');
  await expectDisplay('11', 'clicking = again should repeat the last operation');
  await maybeScreenshot('result');
});
```

Test 2:
```js
test('clicking 1 . 5 + 2 . 5 = shows 4 and the display updates at each step', ...
  steps...
);
```

Test 3:
```js
test('clicking 1 ÷ 0 = shows Error and every key except C leaves it showing', ...
  await clickSequence(['1','÷','0','=']);
  expectDisplay('Error', ...);
  for (const label of ['7','×','.','+','÷','=']) { await clickKey(label); await expectDisplay('Error', `after clicking ${label} while in the error state`); }
  await maybeScreenshot('error');
);
```
Wait: after error, clicking '÷' — engine: error true, key not C → return, display stays Error. Yes.

Test 4:
```js
test('clicking C after the error shows 0 and the calculator works again', ...
  ['1','÷','0','='] → Error; 'C' → '0'; ['2','+','3','='] → '5';
);
```

Test 5:
```js
test('every button press updates the display immediately, so typing shows the current number', ...
  first sequence with per-press assertions, then a fresh page chained sequence
);
```

Test 6:
```js
test('pressing Enter or Space on a focused key changes the display exactly like clicking it', { timeout: 60000 }, async () => {
  const run = async (activation) => {
    await openPage();
    await clickSequence(['2','+','3']);
    if (activation === 'click') {
      await clickKey('=');
    } else {
      await focusKey('=');
      await pressKey(activation === 'enter' ? 'Enter' : 'Space');
    }
    const result = await readDisplay();
    await clickKey('C');
    if (activation === 'click') await clickKey('7');
    else { await focusKey('7'); await pressKey(activation === 'enter' ? 'Enter' : 'Space'); }
    const digit = await readDisplay();
    return [result, digit];
  };
  const clicked = await run('click');
  const entered = await run('enter');
  const spaced = await run('space');
  assert.deepEqual(entered, clicked, `Enter on the focused key should change the display like a click: click gave ${JSON.stringify(clicked)}, Enter gave ${JSON.stringify(entered)}.`);
  assert.deepEqual(spaced, clicked, `Space ...`);
});
```
Hmm, `run('click')` clicks '=' then C then '7'. clicked should be ['5','7'].

Also the criterion asks display change "same as clicking it" — comparing arrays is good. Maybe also explicitly assert clicked equals ['5','7'] so failure reason obvious when wiring missing: currently all runs return ['0','7']? Wait with no scripts: click '=' does nothing → display '0'; C nothing; click '7' nothing → display '0'. All three runs return ['0','0'] → deepEqual passes trivially! That's bad: the test would PASS now, not fail. I must anchor an explicit expected value. Add `assert.deepEqual(clicked, ['5','7'], 'The click baseline should show 5 then 7')`. Then Enter/Space comparisons anchor to click behavior. Good catch. Similarly other tests: all compare to explicit values.

Also note: if all three produce wrong but equal values, baseline assertion catches. 

Test 7 (spy):
```js
test('the UI drives the shared engine: press receives the mapped keys and #display renders the engine display', { timeout: 60000 }, async () => {
  const { identifier } = await page.send('Page.addScriptToEvaluateOnNewDocument', { source: ENGINE_SPY });
  await openPage();
  await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
  const spySetup = await evaluate(`!!(window.__engineSpy && typeof window.createCalculator === 'function')`);
  assert.ok(spySetup, 'The engine spy was not installed / calc.js did not publish createCalculator.');
  const steps = [...];
  const seen = [];
  for (const [label, engineKey, expected] of steps) {
    await clickKey(label);
    const snapshot = await evaluate('({ keys: window.__engineSpy.keys.slice(), display: window.__engineSpy.display })');
    seen.push(snapshot.keys[snapshot.keys.length - 1]);
    assert.equal(snapshot.keys[snapshot.keys.length - 1], engineKey, `Clicking "${label}" should call press with ${JSON.stringify(engineKey)}; press received ${JSON.stringify(snapshot.keys[snapshot.keys.length - 1])} (all keys: ${snapshot.keys.join(' ')}).`);
    assert.equal(snapshot.display, expected, `After asking the engine to press ${JSON.stringify(engineKey)}, the engine display is ${JSON.stringify(snapshot.display)}; expected ${JSON.stringify(expected)}.`);
    await expectDisplay(expected, `after clicking "${label}" the page display`);
  }
  assert.deepEqual(seen, steps.map(([, engineKey]) => engineKey), ...);
});
```
Wait if no scripts: `window.__engineSpy` exists (init script ran — it runs on new document regardless of page scripts), `typeof window.createCalculator` — getter returns null (wrapped null) → typeof null = 'object' → `!!(...)` false because `typeof null === 'object'`? Let me compute: `typeof window.createCalculator === 'function'` → typeof null is 'object' → false. So spySetup false → assert fails with clear message. Good, fails now.

Hmm, but also if no scripts: `window.createCalculator` getter returns `wrapped` = null. Fine.

If ui.js loads but calc.js missing (reversed order): getter wrapped null → ui.js call throws → page error; spy test: createCalculator not function → fails. Good.

If implementation works: steps pass.

Steps:
```js
const steps = [
  ['6', '6', '6'],
  ['×', '*', '6'],
  ['7', '7', '7'],
  ['=', '=', '42'],
  ['8', '8', '8'],
  ['÷', '/', '8'],
  ['2', '2', '2'],
  ['=', '=', '4'],
  ['5', '5', '5'],
  ['−', '-', '5'],
  ['2', '2', '2'],
  ['=', '=', '3'],
  ['C', 'C', '0'],
];
```
After 'C': engine display '0'; press called with 'C'. Good.

Question: does clicking C after result also clear spy display: yes.

One concern: `state.display` is only set when press is called. Initial page load: ui.js might call press? No. If UI doesn't call press at all, `snapshot.display` null → assertion fails at first step. Good.

Another concern: what if UI calls `createCalculator()` and then calls `press` on a *different* object than the one whose display it renders? The spy wraps every instance created; state.display tracks last press on any instance; page display should equal engine display anyway. Fine.

Test 8 (matrix):
```js
test('the UI shows the same results as the engine for mapping, entry limits, rounding, formatting and error rules', { timeout: 120000 }, async () => {
  const cases = [
    { what: 'multiply', labels: ['6','×','7','='], keys: ['6','*','7','='], expected: '42' },
    ...
  ];
  for (const testCase of cases) {
    const engine = createCalculator();
    for (const key of testCase.keys) engine.press(key);
    assert.equal(engine.display, testCase.expected, `Fixture check: the engine shows ${JSON.stringify(engine.display)} for ${testCase.keys.join(' ')}; expected ${JSON.stringify(testCase.expected)}.`);
    await openPage();
    await clickSequence(testCase.labels);
    const actual = await readDisplay();
    assert.equal(actual, testCase.expected, `${testCase.what}: clicking ${testCase.labels.join(' ')} should show ${JSON.stringify(testCase.expected)}; the page shows ${JSON.stringify(actual)}.`);
  }
});
```
If no scripts: first case fails with page shows '0'. Good. Note each case navigates; first failure stops. Fine.

Cases list — let me write them with `what` description:
- multiply/divide/minus mapping
- rounding `0.1 + 0.2` → '0.3'
- `1 ÷ 3` → '0.3333333333'
- negative result `0 − 5` → '-5'
- digit limit 11 digits → '1234567890'
- leading zeros '005' → '5'
- leading decimal '. 5' → '0.5'
- `= with no operator` `5 =` → '5'
- `operator first` `+ 5 =` → '5'
- `replace pending operator` `5 + × 3 =` → '15'
- `chained input` `2 + 3 + 4 =` → '9'
- scientific large `1e9 × 1e9` → '1.000000000e18'
- scientific small `1 ÷ 3000000000` → '3.333333333e-10'
- error `1 ÷ 0 =` → 'Error'

Test 9 (criterion 8): as designed.

Test 10 (criterion 9): as designed.

Wait, count = 10 tests. Test 8 counts as criterion-7 second test.

Now let me also add to test 9 console check: capture `consoleProblems.length = 0` before openPage. But note the `Log.enable` needs sending in before. Also events from previous navigation might be delivered asynchronously — the array cleared then navigation starts; late events from previous page could land. Tests run sequentially; previous test completed interactions; the last navigation's events should have arrived. Risk low. Also note our own console listener persists across tests.

Also, should the console check be per-navigation in all tests? The criterion says opening index.html logs no console errors; one test suffices.

Now potential problem: `Log.entryAdded` events include "Failed to load resource: net::ERR_FILE_NOT_FOUND" for missing favicon? We'll see in self-test. If the temp self-test shows problems empty, all good.

Let me now write the file.

Also check existing calc.test.js require style. Let me read first lines quickly. And check Node version. Then write.

One more consideration about `Page.addScriptToEvaluateOnNewDocument` and `openPage`: openPage sends `Emulation.setDeviceMetricsOverride` then `Page.navigate`. The init script runs in the new document. Good.

Also `Page.removeScriptToEvaluateOnNewDocument` requires identifier param string. Return from add: `{identifier}`.

Now let me write everything. After writing, run:
1. `node --test test/ui-wiring.test.js` in repo → expect 10 fail.
2. Self-test in temp → expect 10 pass.
3. `node --test` full → capture counts.

Then evidence + card edits + report.

Let me check node version and read test/calc.test.js head in parallel.
```

</details>

<details>
<summary>Tool: read</summary>

```json
{
  "path": "C:\\Users\\rames\\Desktop\\calculator-groundwork\\test\\calc.test.js",
  "limit": 40
}
```

```
Read file C:\Users\rames\Desktop\calculator-groundwork\test\calc.test.js, lines 1-40
1: 'use strict';
2: 
3: const test = require('node:test');
4: const assert = require('node:assert/strict');
5: const fs = require('node:fs');
6: const path = require('node:path');
7: const vm = require('node:vm');
8: 
9: const { createCalculator } = require('../src/calc.js');
10: 
11: function displayAfter(keys) {
12:   const calc = createCalculator();
13:   for (const key of keys) {
14:     calc.press(key);
15:   }
16:   return calc.display;
17: }
18: 
19: test('a new calculator shows 0', () => {
20:   assert.equal(createCalculator().display, '0');
21: });
22: 
23: test('pressing 7 shows 7', () => {
24:   assert.equal(displayAfter('7'), '7');
25: });
26: 
27: test('pressing 2 then 3 shows 23', () => {
28:   assert.equal(displayAfter('23'), '23');
29: });
30: 
31: test('pressing 0 while the display is 0 keeps 0', () => {
32:   assert.equal(displayAfter('0'), '0');
33:   assert.equal(displayAfter('00'), '0');
34: });
35: 
36: test('0, 0 then 5 shows 5', () => {
37:   assert.equal(displayAfter('005'), '5');
38: });
39: 
40: test('typing stops at 10 digits', () => {
[Output truncated. Continue reading with offset: 41]
```

</details>

<details>
<summary>Tool: shell</summary>

```json
{
  "command": "node --version"
}
```

```
v24.19.0

```

Exit code: 0

</details>

## Assistant


<details>
<summary>Reasoning</summary>

```
Node v24.19.0. Good.

Now write the test file `test/ui-wiring.test.js`. Let me carefully compose it.

I'll write the whole file in one `write` call. Then run focused tests.

Careful with the template literal in `maybeScreenshot` / etc.

Let me draft:

```js
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { createCalculator } = require('../src/calc.js');

const REPO_ROOT = path.join(__dirname, '..');
const INDEX_PATH = path.join(REPO_ROOT, 'index.html');
const DISPLAY_SELECTOR = '#display, [data-display], output, .display';
const LABEL_KEYS = { '×': '*', '÷': '/', '−': '-' };

const KEYSTROKES = {
  Enter: { key: 'Enter', code: 'Enter', keyCode: 13, text: '\r' },
  Space: { key: ' ', code: 'Space', keyCode: 32, text: ' ' },
};

const ENGINE_SPY = `(() => {
  const state = { keys: [], display: null, instance: null };
  let wrapped = null;
  Object.defineProperty(window, '__engineSpy', { value: state, configurable: true });
  Object.defineProperty(window, 'createCalculator', {
    configurable: true,
    get() { return wrapped; },
    set(factory) {
      wrapped = function () {
        const instance = factory();
        const press = instance.press;
        instance.press = function (key) {
          state.keys.push(String(key));
          const value = press.call(instance, key);
          state.display = instance.display;
          return value;
        };
        state.instance = instance;
        return instance;
      };
    },
  });
})()`;
```

Hmm, in a template literal `\r` stays as backslash-r? In JS source template literal, `\r` inside template literal is an escape sequence → actual carriage return character. Wait, no: in the test source file, `text: '\r'` inside a normal... KEYSTROKES is regular object literal, '\r' is CR character. The existing file has `text: '\r'` too (line 28: `text: '\r'`). Good, same.

For ENGINE_SPY template literal: it contains no backslashes. Fine.

Then class Cdp, waitForEvent, findBrowser, launchBrowser (copy with Log.enable), console collecting, hooks, helpers, tests.

Let me be careful about one thing in the Cdp harness: `this.ws.addEventListener('message', (event) => this.receive(event.data));` — in Node 24 global WebSocket available. Copy as-is.

Console watch:

```js
const consoleProblems = [];

function watchConsole(client) {
  client.on('Runtime.consoleAPICalled', (params) => {
    if (params.type !== 'error') return;
    consoleProblems.push(`console.error: ${(params.args || []).map((arg) => (arg.value !== undefined ? String(arg.value) : (arg.description || arg.type))).join(' ')}`);
  });
  client.on('Runtime.exceptionThrown', (params) => {
    const details = params.exceptionDetails || {};
    const description = details.exception && details.exception.description ? details.exception.description : details.text;
    consoleProblems.push(`uncaught exception: ${description || 'unknown'}`);
  });
  client.on('Log.entryAdded', (params) => {
    const entry = params.entry || {};
    if (entry.level !== 'error') return;
    consoleProblems.push(`browser log: ${entry.text}${entry.url ? ` (${entry.url})` : ''}`);
  });
}
```

In before:
```js
before(async () => {
  browser = await launchBrowser();
  page = browser.client;
  watchConsole(page);
  await page.send('Log.enable');
}, { timeout: 30000 });
```

launchBrowser: copy but add `await client.send('Log.enable');`? I'll do it in before separately. Keep launch copy minimal, no Log.enable inside (add in before).

evaluate and openPage copies.

Now the tests. Let me write them.

Test 1:
```js
test('clicking 2 + 3 = shows 5, then 5 + 3 = shows 8, and = again shows 11', { timeout: 30000 }, async () => {
  await openPage();
  await clickSequence(['2', '+', '3', '=']);
  await expectDisplay('5', 'after clicking 2 + 3 =');
  await clickSequence(['5', '+', '3', '=']);
  await expectDisplay('8', 'after clicking 5 + 3 =');
  await clickKey('=');
  await expectDisplay('11', 'clicking = again');
  await maybeScreenshot('result');
});
```

Test 2:
```js
test('clicking 1 . 5 + 2 . 5 = shows 4 with every digit and the point updating the display', { timeout: 30000 }, async () => {
  await openPage();
  const steps = [['1','1'],['.','1.'],['5','1.5'],['+','1.5'],['2','2'],['.','2.'],['5','2.5'],['=','4']];
  for (const [label, expected] of steps) {
    await clickKey(label);
    await expectDisplay(expected, `after clicking "${label}"`);
  }
});
```

Test 3:
```js
test('clicking 1 ÷ 0 = shows Error and every key except C leaves Error showing', { timeout: 30000 }, async () => {
  await openPage();
  await clickSequence(['1', '÷', '0', '=']);
  await expectDisplay('Error', 'after clicking 1 ÷ 0 =');
  for (const label of ['7', '×', '−', '+', '.', '÷', '=']) {
    await clickKey(label);
    await expectDisplay('Error', `after clicking "${label}" while the calculator is in the error state`);
  }
  await maybeScreenshot('error');
});
```

Test 4:
```js
test('clicking C after the error shows 0 and the calculator works again', { timeout: 30000 }, async () => {
  await openPage();
  await clickSequence(['1', '÷', '0', '=']);
  await expectDisplay('Error', 'after clicking 1 ÷ 0 =');
  await clickKey('C');
  await expectDisplay('0', 'after clicking C in the error state');
  await clickSequence(['2', '+', '3', '=']);
  await expectDisplay('5', 'after typing 2 + 3 = once the error is cleared');
});
```

Test 5:
```js
test('every button press updates the display immediately, so typing shows the current number', { timeout: 30000 }, async () => {
  await openPage();
  const typed = [['1','1'],['2','12'],['3','123'],['+','123'],['4','4'],['=','127']];
  for (const [label, expected] of typed) {
    await clickKey(label);
    await expectDisplay(expected, `after clicking "${label}" the display should already show the current value`);
  }
  await openPage();
  const chained = [['2','2'],['+','2'],['3','3'],['+','5'],['4','4'],['=','9']];
  for (const [label, expected] of chained) {
    await clickKey(label);
    await expectDisplay(expected, `after clicking "${label}" in the chain 2 + 3 + 4 =`);
  }
});
```

Test 6 (Enter/Space):
```js
test('pressing Enter or Space on a focused key changes the display exactly like clicking it', { timeout: 60000 }, async () => {
  async function run(activation) {
    await openPage();
    await clickSequence(['2', '+', '3']);
    if (activation === 'click') {
      await clickKey('=');
    } else {
      await focusKey('=');
      await pressKey(activation === 'enter' ? 'Enter' : 'Space');
    }
    const result = await readDisplay();
    await clickKey('C');
    if (activation === 'click') {
      await clickKey('7');
    } else {
      await focusKey('7');
      await pressKey(activation === 'enter' ? 'Enter' : 'Space');
    }
    const digit = await readDisplay();
    return { result, digit };
  }

  const clicked = await run('click');
  const entered = await run('enter');
  const spaced = await run('space');
  assert.deepEqual(clicked, { result: '5', digit: '7' }, `The click baseline for "2 + 3 =" then "C" then "7" should show 5 then 7; it showed ${JSON.stringify(clicked)}.`);
  assert.deepEqual(entered, clicked, `Pressing Enter on the focused "=" and "7" keys should change the display like clicking them; click gave ${JSON.stringify(clicked)}, Enter gave ${JSON.stringify(entered)}.`);
  assert.deepEqual(spaced, clicked, `Pressing Space on the focused "=" and "7" keys should change the display like clicking them; click gave ${JSON.stringify(clicked)}, Space gave ${JSON.stringify(spaced)}.`);
});
```

Wait: with no scripts, clicked = {result:'0', digit:'0'} → baseline assert fails. Good.

Test 7 (spy):
```js
test('the UI calls the shared engine\'s press with mapped keys and renders the engine\'s display', { timeout: 60000 }, async () => {
  const { identifier } = await page.send('Page.addScriptToEvaluateOnNewDocument', { source: ENGINE_SPY });
  await openPage();
  await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });

  const ready = await evaluate(`!!(window.__engineSpy && typeof window.createCalculator === 'function')`);
  assert.ok(ready, 'The page did not load the engine: expected calc.js to publish a global createCalculator the UI uses.');

  const steps = [
    ['6', '6', '6'],
    ['×', '*', '6'],
    ['7', '7', '7'],
    ['=', '=', '42'],
    ['8', '8', '8'],
    ['÷', '/', '8'],
    ['2', '2', '2'],
    ['=', '=', '4'],
    ['5', '5', '5'],
    ['−', '-', '5'],
    ['2', '2', '2'],
    ['=', '=', '3'],
    ['C', 'C', '0'],
  ];
  const seen = [];
  for (const [label, engineKey, expected] of steps) {
    await clickKey(label);
    const spy = await evaluate('({ keys: window.__engineSpy.keys.slice(), display: window.__engineSpy.display })');
    const last = spy.keys[spy.keys.length - 1];
    seen.push(last);
    assert.equal(last, engineKey, `Clicking "${label}" should call the engine's press with ${JSON.stringify(engineKey)}; press last received ${JSON.stringify(last)} (all: ${spy.keys.join(' ')}).`);
    assert.equal(spy.display, expected, `After the engine press for "${label}", the engine display is ${JSON.stringify(spy.display)}; expected ${JSON.stringify(expected)}.`);
    await expectDisplay(expected, `after clicking "${label}" the page display`);
  }
  assert.deepEqual(seen, steps.map((step) => step[1]), 'The UI should map every label to its engine key.');
});
```
Wait: assert on spy.display expected — but if UI wrote its own display but engine same, still same. Fine.

One subtle thing: `window.__engineSpy.keys` — evaluate returns array by value; `spy.keys.slice()` fine.

Test 8 (matrix):
```js
test('the UI shows the engine\'s results for mapping, entry rules, rounding, formatting and error rules', { timeout: 180000 }, async () => {
  const cases = [
    { what: 'multiplication maps × to *', labels: ['6', '×', '7', '='], keys: ['6', '*', '7', '='], expected: '42' },
    { what: 'division maps ÷ to /', labels: ['8', '÷', '2', '='], keys: ['8', '/', '2', '='], expected: '4' },
    { what: 'subtraction maps − to -', labels: ['5', '−', '2', '='], keys: ['5', '-', '2', '='], expected: '3' },
    { what: 'rounding to 10 significant digits', labels: ['0', '.', '1', '+', '0', '.', '2', '='], keys: ['0', '.', '1', '+', '0', '.', '2', '='], expected: '0.3' },
    { what: 'a repeating decimal', labels: ['1', '÷', '3', '='], keys: ['1', '/', '3', '='], expected: '0.3333333333' },
    { what: 'a negative result', labels: ['0', '−', '5', '='], keys: ['0', '-', '5', '='], expected: '-5' },
    { what: 'the 10-digit entry limit', labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '1'], keys: same, expected: '1234567890' },
    { what: 'leading zeros', labels: ['0', '0', '5'], keys: ['0','0','5'], expected: '5' },
    { what: 'a point before any digit', labels: ['.', '5'], keys: ['.', '5'], expected: '0.5' },
    { what: '= with no pending operation', labels: ['5', '='], keys: ['5', '='], expected: '5' },
    { what: 'an operator with no number', labels: ['+', '5', '='], keys: ['+', '5', '='], expected: '5' },
    { what: 'a replaced pending operator', labels: ['5', '+', '×', '3', '='], keys: ['5', '+', '*', '3', '='], expected: '15' },
    { what: 'chained input', labels: ['2', '+', '3', '+', '4', '='], keys: ['2', '+', '3', '+', '4', '='], expected: '9' },
    { what: 'scientific notation for a large result', labels: ['1','0','0','0','0','0','0','0','0','0','×','1','0','0','0','0','0','0','0','0','0','='], keys: [...same but '*'], expected: '1.000000000e18' },
    { what: 'scientific notation for a small result', labels: ['1','÷','3','0','0','0','0','0','0','0','0','0','='], keys: ['1','/','3','0','0','0','0','0','0','0','0','0','='], expected: '3.333333333e-10' },
    { what: 'divide by zero', labels: ['1','÷','0','='], keys: ['1','/','0','='], expected: 'Error' },
  ];
```
Hmm for keys I can derive from labels via LABEL_KEYS to avoid duplication: `keys: labels.map((label) => LABEL_KEYS[label] || label)`. That's cleaner and itself documents the mapping. But then if my mapping constant is wrong, both page and engine fixture use same mapping — but expected string anchors correctness. The spy test verifies mapping explicitly anyway. Let me derive keys from labels with LABEL_KEYS. Good.

```js
  for (const testCase of cases) {
    const engine = createCalculator();
    for (const key of testCase.keys) engine.press(key);
    assert.equal(engine.display, testCase.expected, `Internal check failed: the engine shows ${JSON.stringify(engine.display)} for ${testCase.keys.join(' ')}.');
    await openPage();
    await clickSequence(testCase.labels);
    const actual = await readDisplay();
    assert.equal(actual, testCase.expected, `${testCase.what}: clicking ${testCase.labels.join(' ')} should show ${JSON.stringify(testCase.expected)}; the page shows ${JSON.stringify(actual)}.`);
  }
```
Also compare with engine: the engine display assertion equals expected, so page===expected===engine. Fine.

Wait: if the implementer modifies calc.js incorrectly, the fixture check fails with a message about engine, alerting that the engine is wrong (but calc.js isn't part of this card; anyway good).

Hmm, but fixture check failing would fail the test for engine reasons, which is fine.

Test 9 (criterion 8):
```js
test('opening index.html loads src/calc.js before src/ui.js, logs no console errors, and the keys are live on first load', { timeout: 30000 }, async () => {
  consoleProblems.length = 0;
  await openPage();
  const scripts = await evaluate(`Array.from(document.scripts).map((script) => script.getAttribute('src') || '(inline)')`);
  const calcAt = scripts.findIndex((src) => src.replace(/\\\\/g, '/').split('?')[0].endsWith('src/calc.js'));
```
Careful escaping: inside a template literal, `\\\\` becomes `\\` in evaluated string → regex /\\/g matches backslash. Actually simpler: `src.indexOf('calc.js') !== -1`. Let's use endsWith('calc.js') and endsWith('ui.js'), and check calc before ui. Avoid regex:
```js
  const calcAt = scripts.findIndex((src) => src.endsWith('calc.js'));
  const uiAt = scripts.findIndex((src) => src.endsWith('ui.js'));
```
Fine (handles `src/calc.js`, `./src/calc.js`, absolute). 
```js
  assert.ok(calcAt !== -1, `No <script> loads src/calc.js. Scripts on the page: ${JSON.stringify(scripts)}.`);
  assert.ok(uiAt !== -1, `No <script> loads src/ui.js. Scripts on the page: ${JSON.stringify(scripts)}.`);
  assert.ok(calcAt < uiAt, `src/calc.js must load before src/ui.js; the page loads ${JSON.stringify(scripts)}.`);
  await clickKey('7');
  await expectDisplay('7', 'the keys should be live as soon as the page loads');
  await clickSequence(['C', '2', '+', '3', '=']);
  await expectDisplay('5', 'after a first calculation right after load');
  assert.deepEqual(consoleProblems, [], `The page logged errors: ${consoleProblems.join(' | ')}`);
});
```
Hmm wait: expectDisplay message gets `(expected ..., found ...)` appended. Fine.

Wait: click '7' then ['C','2','+','3','='] — after C resets, 2+3=5. Good. But if no scripts, first assert fails before clicks. Good.

Test 10 (criterion 9):
```js
test('at 375, 768 and 1440 updating the display does not wrap it or add a scrollbar', { timeout: 90000 }, async () => {
  const WIDTHS = [[375, 667], [768, 900], [1440, 900]];
  const LONG_VALUE = '-3.333333333e-10';
  const sequence = ['0', '−', '1', '=', '÷', '3', '0', '0', '0', '0', '0', '0', '0', '0', '0', '='];

  for (const [width, height] of WIDTHS) {
    await openPage(width, height);
    const before = await displayMetrics();
    await clickSequence(sequence);
    await expectDisplay(LONG_VALUE, `after 0 − 1 = ÷ 3000000000 = at ${width}px`);
    const after = await displayMetrics();
    assert.equal(after.lines, 1, `At ${width}px the display wraps ${JSON.stringify(LONG_VALUE)} onto ${after.lines} lines.`);
    assert.ok(after.textHeight <= before.textHeight + 1, `At ${width}px the display text grows from ${before.textHeight.toFixed(1)}px to ${after.textHeight.toFixed(1)}px tall, so it wraps.`);
    assert.ok(Math.abs(after.displayHeight - before.displayHeight) <= 1, `At ${width}px the display box grows from ${before.displayHeight.toFixed(1)}px to ${after.displayHeight.toFixed(1)}px tall when the value changes.`);
    assert.ok(after.textWidth <= after.contentWidth + 1, `At ${width}px ${JSON.stringify(LONG_VALUE)} is ${Math.round(after.textWidth)}px wide but the display content is ${Math.round(after.contentWidth)}px.`);
    assert.ok(after.scrollWidth <= after.innerWidth, `At ${width}px updating the display adds a horizontal scrollbar (scrollWidth ${after.scrollWidth} > viewport ${after.innerWidth}).`);
    assert.ok(after.scrollWidth <= before.scrollWidth, `At ${width}px updating the display widens the page from ${before.scrollWidth}px to ${after.scrollWidth}px.`);
    assert.ok(after.scrollHeight <= before.scrollHeight + 1, `At ${width}px updating the display grows the page from ${before.scrollHeight}px to ${after.scrollHeight}px tall.`);
  }
});
```
`displayMetrics`:
```js
function displayMetrics() {
  return evaluate(`(() => {
    const display = window.__check.display();
    if (!display) throw new Error('No display element found.');
    const range = document.createRange();
    range.selectNodeContents(display);
    const textRect = range.getBoundingClientRect();
    const computed = getComputedStyle(display);
    const box = display.getBoundingClientRect();
    const contentWidth = box.width - (parseFloat(computed.paddingLeft) || 0) - (parseFloat(computed.paddingRight) || 0) - (parseFloat(computed.borderLeftWidth) || 0) - (parseFloat(computed.borderRightWidth) || 0);
    return {
      text: display.textContent.replace(/\\s+/g, ' ').trim(),
      lines: range.getClientRects().length,
      textWidth: textRect.width,
      textHeight: textRect.height,
      displayHeight: box.height,
      contentWidth,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    };
  })()`);
}
```
Note: `range.getClientRects().length` for empty? Not empty. For text on one line, returns 1? For inline text range, getClientRects returns one rect per line typically. For a Range selecting contents of a block with a single text node, yes 1.

Potential gotcha: `-3.333333333e-10` at 375px must fit; 2.1 test measured `-1.234567890e-10` (16 chars) fits; both 16 chars. Good.

Before metrics with '0': fine.

Also note: `scrollHeight` before could be e.g. 667 (viewport) if content shorter; after same. Good.

Now one concern: at 375×667 with `openPage` clicking sequence requires scrolling; the scrollIntoView changes document scroll position and may change scrollHeight? scrollHeight is scroll size, unaffected by scroll position. Fine.

Also after clicking at 375, is the display still visible/rendered? Yes.

Now, `maybeScreenshot`: copy from 2.1:
```js
async function maybeScreenshot(name) {
  const directory = process.env.UI_SHOTS;
  if (!directory) return;
  const outputDirectory = path.resolve(REPO_ROOT, directory);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const shot = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outputDirectory, `${name}.png`), Buffer.from(shot.data, 'base64'));
}
```

Now, the before/after hooks: `launchBrowser` copy. Let me copy exactly from ui-page.test.js lines 132-199, adding nothing. And `findBrowser` copy.

One more: `openPage` asserts index exists; fine.

Also add `expectDisplay`:
```js
async function expectDisplay(expected, context) {
  const actual = await readDisplay();
  assert.equal(actual, expected, `${context}: expected the display to show ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}.`);
}
```

`readDisplay`:
```js
async function readDisplay() {
  return evaluate(`(() => {
    const display = window.__check.display();
    return display ? display.textContent.replace(/\\s+/g, ' ').trim() : null;
  })()`);
}
```
Returns null if missing; expectDisplay would fail with found null. But if scripts missing, display exists (HTML present) with '0'. Good.

Now write the file.

Also, tests must be named so evidence summaries are informative.

Total tests = 10.

Let me now write it.

One more design check for the spy: if the implementer's `ui.js` uses `document.querySelectorAll('button')` and adds listeners — fine. If it calls `createCalculator()` before DOMContentLoaded (script at end of body), fine.

Potential collision: The spy defines `window.createCalculator` accessor before calc.js runs. calc.js's IIFE also checks `typeof module === 'object'`; in browser false. Then `root.createCalculator = createCalculator` → setter. Good.

If calc.js were loaded as a module (type=module), `module` still undefined but `root` is globalThis; assignment works too. Fine.

Now about `Log.enable`: available on all pages. Good.

Let me write the file now. I need to be careful about `'` inside test names (e.g. "the UI calls the shared engine's press"). Use double quotes or escape. I'll use double-quoted test names where needed.

Also, one more thought on the criterion-8 test name: "opening index.html loads src/calc.js before src/ui.js..." — the script order assertion uses DOM. Include.

Writing now.
```

</details>

Now I'll write the failing wiring checks. I'll reuse the headless-Edge-over-CDP approach from `test/ui-page.test.js` in a new self-contained file.

<details>
<summary>Tool: write</summary>

```json
{
  "path": "C:\\Users\\rames\\Desktop\\calculator-groundwork\\test\\ui-wiring.test.js",
  "content": "'use strict';\n\nconst { test, before, after } = require('node:test');\nconst assert = require('node:assert/strict');\nconst { spawn } = require('node:child_process');\nconst fs = require('node:fs');\nconst os = require('node:os');\nconst path = require('node:path');\nconst { pathToFileURL } = require('node:url');\n\nconst { createCalculator } = require('../src/calc.js');\n\nconst REPO_ROOT = path.join(__dirname, '..');\nconst INDEX_PATH = path.join(REPO_ROOT, 'index.html');\nconst DISPLAY_SELECTOR = '#display, [data-display], output, .display';\nconst LABEL_KEYS = { '×': '*', '÷': '/', '−': '-' };\n\nconst KEYSTROKES = {\n  Enter: { key: 'Enter', code: 'Enter', keyCode: 13, text: '\\r' },\n  Space: { key: ' ', code: 'Space', keyCode: 32, text: ' ' },\n};\n\nconst ENGINE_SPY = `(() => {\n  const state = { keys: [], display: null, instance: null };\n  let wrapped = null;\n  Object.defineProperty(window, '__engineSpy', { value: state, configurable: true });\n  Object.defineProperty(window, 'createCalculator', {\n    configurable: true,\n    get() { return wrapped; },\n    set(factory) {\n      wrapped = function () {\n        const instance = factory();\n        const press = instance.press;\n        instance.press = function (key) {\n          state.keys.push(String(key));\n          const value = press.call(instance, key);\n          state.display = instance.display;\n          return value;\n        };\n        state.instance = instance;\n        return instance;\n      };\n    },\n  });\n})()`;\n\nconst sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));\n\nclass Cdp {\n  constructor(url) {\n    this.url = url;\n    this.ws = null;\n    this.nextId = 0;\n    this.pending = new Map();\n    this.listeners = new Map();\n  }\n\n  async open() {\n    this.ws = new WebSocket(this.url);\n    await new Promise((resolve, reject) => {\n      this.ws.addEventListener('open', resolve, { once: true });\n      this.ws.addEventListener('error', () => reject(new Error(`Could not open the DevTools websocket at ${this.url}.`)), { once: true });\n    });\n    this.ws.addEventListener('message', (event) => this.receive(event.data));\n    this.ws.addEventListener('close', () => {\n      for (const { reject } of this.pending.values()) reject(new Error('The DevTools connection closed.'));\n      this.pending.clear();\n    });\n  }\n\n  receive(data) {\n    let message;\n    try {\n      message = JSON.parse(typeof data === 'string' ? data : String(data));\n    } catch {\n      return;\n    }\n    if (message.id && this.pending.has(message.id)) {\n      const { resolve, reject } = this.pending.get(message.id);\n      this.pending.delete(message.id);\n      if (message.error) reject(new Error(`DevTools error ${message.error.code}: ${message.error.message}`));\n      else resolve(message.result);\n    } else if (message.method) {\n      for (const listener of this.listeners.get(message.method) || []) listener(message.params);\n    }\n  }\n\n  send(method, params = {}) {\n    const id = ++this.nextId;\n    return new Promise((resolve, reject) => {\n      this.pending.set(id, { resolve, reject });\n      this.ws.send(JSON.stringify({ id, method, params }));\n    });\n  }\n\n  on(method, listener) {\n    if (!this.listeners.has(method)) this.listeners.set(method, new Set());\n    this.listeners.get(method).add(listener);\n    return () => this.listeners.get(method).delete(listener);\n  }\n\n  close() {\n    try {\n      this.ws.close();\n    } catch {}\n  }\n}\n\nfunction waitForEvent(client, method, ms) {\n  return new Promise((resolve, reject) => {\n    const timer = setTimeout(() => {\n      off();\n      reject(new Error(`Timed out after ${ms}ms waiting for ${method}.`));\n    }, ms);\n    const off = client.on(method, (params) => {\n      clearTimeout(timer);\n      off();\n      resolve(params);\n    });\n  });\n}\n\nfunction findBrowser() {\n  if (process.env.UI_BROWSER) {\n    assert.ok(fs.existsSync(process.env.UI_BROWSER), `UI_BROWSER points at a missing file: ${process.env.UI_BROWSER}`);\n    return process.env.UI_BROWSER;\n  }\n  const candidates = process.platform === 'win32'\n    ? [\n        'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',\n        'C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',\n        'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',\n        'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',\n      ]\n    : [\n        '/usr/bin/microsoft-edge',\n        '/usr/bin/google-chrome',\n        '/usr/bin/chromium',\n        '/usr/bin/chromium-browser',\n        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',\n      ];\n  const found = candidates.find((candidate) => fs.existsSync(candidate));\n  assert.ok(found, 'No Chromium browser found for the UI check. Install Edge or Chrome, or set UI_BROWSER to a browser executable.');\n  return found;\n}\n\nasync function launchBrowser() {\n  const executable = findBrowser();\n  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calc-wiring-check-'));\n  const child = spawn(executable, [\n    '--headless=new',\n    '--disable-gpu',\n    '--no-first-run',\n    '--no-default-browser-check',\n    '--disable-extensions',\n    '--mute-audio',\n    '--remote-allow-origins=*',\n    `--user-data-dir=${userDataDir}`,\n    '--remote-debugging-port=0',\n    'about:blank',\n  ], { stdio: 'ignore', windowsHide: true });\n\n  const cleanup = async () => {\n    try {\n      child.kill();\n    } catch {}\n    await Promise.race([new Promise((resolve) => child.once('exit', resolve)), sleep(3000)]);\n    for (let attempt = 0; attempt < 10; attempt++) {\n      try {\n        fs.rmSync(userDataDir, { recursive: true, force: true });\n        break;\n      } catch {\n        await sleep(300);\n      }\n    }\n  };\n\n  try {\n    const portFile = path.join(userDataDir, 'DevToolsActivePort');\n    const deadline = Date.now() + 20000;\n    let port = 0;\n    while (Date.now() < deadline) {\n      if (child.exitCode !== null) throw new Error(`The browser exited before it was ready (code ${child.exitCode}).`);\n      if (fs.existsSync(portFile)) {\n        port = Number(fs.readFileSync(portFile, 'utf8').split(/\\r?\\n/)[0].trim());\n        if (Number.isInteger(port) && port > 0) break;\n      }\n      await sleep(100);\n    }\n    if (!port) throw new Error('The browser did not report a DevTools port within 20 seconds.');\n\n    let target = null;\n    while (!target && Date.now() < deadline) {\n      try {\n        const response = await fetch(`http://127.0.0.1:${port}/json/list`);\n        if (response.ok) {\n          const targets = await response.json();\n          target = targets.find((candidate) => candidate.type === 'page' && candidate.webSocketDebuggerUrl);\n        }\n      } catch {}\n      if (!target) await sleep(100);\n    }\n    if (!target) throw new Error('The browser did not expose a page target for DevTools.');\n\n    const client = new Cdp(target.webSocketDebuggerUrl);\n    await client.open();\n    await client.send('Page.enable');\n    await client.send('Runtime.enable');\n    return { client, cleanup };\n  } catch (error) {\n    await cleanup();\n    throw error;\n  }\n}\n\nconst consoleProblems = [];\n\nfunction watchConsole(client) {\n  client.on('Runtime.consoleAPICalled', (params) => {\n    if (params.type !== 'error') return;\n    const text = (params.args || []).map((arg) => (arg.value !== undefined ? String(arg.value) : (arg.description || arg.type))).join(' ');\n    consoleProblems.push(`console.error: ${text}`);\n  });\n  client.on('Runtime.exceptionThrown', (params) => {\n    const details = params.exceptionDetails || {};\n    const description = details.exception && details.exception.description ? details.exception.description : details.text;\n    consoleProblems.push(`uncaught exception: ${description || 'unknown'}`);\n  });\n  client.on('Log.entryAdded', (params) => {\n    const entry = params.entry || {};\n    if (entry.level !== 'error') return;\n    consoleProblems.push(`browser log: ${entry.text}${entry.url ? ` (${entry.url})` : ''}`);\n  });\n}\n\nlet browser = null;\nlet page = null;\n\nbefore(async () => {\n  browser = await launchBrowser();\n  page = browser.client;\n  watchConsole(page);\n  await page.send('Log.enable');\n}, { timeout: 30000 });\n\nafter(async () => {\n  if (browser) await browser.cleanup();\n});\n\nconst PAGE_HELPERS = `(() => {\n  const normalize = (text) => (text || '').replace(/\\\\s+/g, ' ').trim();\n  window.__check = {\n    display: () => document.querySelector(${JSON.stringify(DISPLAY_SELECTOR)}),\n    buttons: () => Array.from(document.querySelectorAll('button')),\n    label: (button) => normalize(button.textContent),\n    rect: (element) => {\n      const rect = element.getBoundingClientRect();\n      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };\n    },\n  };\n})()`;\n\nasync function evaluate(expression) {\n  const result = await page.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });\n  if (result.exceptionDetails) {\n    const description = result.exceptionDetails.exception ? result.exceptionDetails.exception.description : result.exceptionDetails.text;\n    throw new Error(`The page threw while a check ran: ${description}`);\n  }\n  return result.result.value;\n}\n\nasync function openPage(width = 800, height = 900) {\n  assert.ok(fs.existsSync(INDEX_PATH), `index.html not found at ${INDEX_PATH}; the check needs the page this card wires up.`);\n  await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });\n  const loaded = waitForEvent(page, 'Page.loadEventFired', 10000);\n  const navigation = await page.send('Page.navigate', { url: pathToFileURL(INDEX_PATH).href });\n  if (navigation && navigation.errorText) {\n    await loaded.catch(() => {});\n    throw new Error(`The browser could not load index.html: ${navigation.errorText}.`);\n  }\n  await loaded;\n  await evaluate(PAGE_HELPERS);\n  await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');\n  return { width, height };\n}\n\nfunction buttonExpression(label) {\n  return `window.__check.buttons().find((candidate) => window.__check.label(candidate) === ${JSON.stringify(label)})`;\n}\n\nasync function clickKey(label) {\n  const rect = await evaluate(`(() => {\n    const button = ${buttonExpression(label)};\n    if (!button) throw new Error('No button labelled ' + ${JSON.stringify(label)});\n    button.scrollIntoView({ block: 'center', inline: 'center' });\n    return window.__check.rect(button);\n  })()`);\n  const x = rect.left + rect.width / 2;\n  const y = rect.top + rect.height / 2;\n  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 });\n  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });\n  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });\n  await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');\n}\n\nasync function clickSequence(labels) {\n  for (const label of labels) await clickKey(label);\n}\n\nasync function pressKey(name) {\n  const definition = KEYSTROKES[name];\n  const common = {\n    key: definition.key,\n    code: definition.code,\n    windowsVirtualKeyCode: definition.keyCode,\n    nativeVirtualKeyCode: definition.keyCode,\n  };\n  const down = { type: definition.text === null ? 'rawKeyDown' : 'keyDown', ...common };\n  if (definition.text !== null) {\n    down.text = definition.text;\n    down.unmodifiedText = definition.text;\n  }\n  await page.send('Input.dispatchKeyEvent', down);\n  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...common });\n}\n\nasync function focusKey(label) {\n  const focused = await evaluate(`(() => {\n    const button = ${buttonExpression(label)};\n    if (!button) throw new Error('No button labelled ' + ${JSON.stringify(label)});\n    button.focus();\n    return document.activeElement === button;\n  })()`);\n  assert.ok(focused, `Could not focus the \"${label}\" key.`);\n}\n\nasync function readDisplay() {\n  return evaluate(`(() => {\n    const display = window.__check.display();\n    return display ? display.textContent.replace(/\\\\s+/g, ' ').trim() : null;\n  })()`);\n}\n\nasync function expectDisplay(expected, context) {\n  const actual = await readDisplay();\n  assert.equal(actual, expected, `${context}: expected the display to show ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}.`);\n}\n\nfunction displayMetrics() {\n  return evaluate(`(() => {\n    const display = window.__check.display();\n    if (!display) throw new Error('No display element found.');\n    const range = document.createRange();\n    range.selectNodeContents(display);\n    const textRect = range.getBoundingClientRect();\n    const computed = getComputedStyle(display);\n    const box = display.getBoundingClientRect();\n    const contentWidth = box.width - (parseFloat(computed.paddingLeft) || 0) - (parseFloat(computed.paddingRight) || 0) - (parseFloat(computed.borderLeftWidth) || 0) - (parseFloat(computed.borderRightWidth) || 0);\n    return {\n      text: display.textContent.replace(/\\\\s+/g, ' ').trim(),\n      lines: range.getClientRects().length,\n      textWidth: textRect.width,\n      textHeight: textRect.height,\n      displayHeight: box.height,\n      contentWidth,\n      scrollWidth: document.documentElement.scrollWidth,\n      scrollHeight: document.documentElement.scrollHeight,\n      innerWidth: window.innerWidth,\n      innerHeight: window.innerHeight,\n    };\n  })()`);\n}\n\nasync function maybeScreenshot(name) {\n  const directory = process.env.UI_SHOTS;\n  if (!directory) return;\n  const outputDirectory = path.resolve(REPO_ROOT, directory);\n  fs.mkdirSync(outputDirectory, { recursive: true });\n  const shot = await page.send('Page.captureScreenshot', { format: 'png' });\n  fs.writeFileSync(path.join(outputDirectory, `${name}.png`), Buffer.from(shot.data, 'base64'));\n}\n\ntest('clicking 2 + 3 = shows 5, then 5 + 3 = shows 8, and = again shows 11', { timeout: 30000 }, async () => {\n  await openPage();\n  await clickSequence(['2', '+', '3', '=']);\n  await expectDisplay('5', 'after clicking 2 + 3 =');\n  await clickSequence(['5', '+', '3', '=']);\n  await expectDisplay('8', 'after clicking 5 + 3 =');\n  await clickKey('=');\n  await expectDisplay('11', 'clicking = again should repeat the last operation');\n  await maybeScreenshot('result');\n});\n\ntest('clicking 1 . 5 + 2 . 5 = shows 4, with digit and point presses updating the display', { timeout: 30000 }, async () => {\n  await openPage();\n  const steps = [\n    ['1', '1'],\n    ['.', '1.'],\n    ['5', '1.5'],\n    ['+', '1.5'],\n    ['2', '2'],\n    ['.', '2.'],\n    ['5', '2.5'],\n    ['=', '4'],\n  ];\n  for (const [label, expected] of steps) {\n    await clickKey(label);\n    await expectDisplay(expected, `after clicking \"${label}\" in 1 . 5 + 2 . 5 =`);\n  }\n});\n\ntest('clicking 1 ÷ 0 = shows Error and every key except C leaves Error showing', { timeout: 30000 }, async () => {\n  await openPage();\n  await clickSequence(['1', '÷', '0', '=']);\n  await expectDisplay('Error', 'after clicking 1 ÷ 0 =');\n  for (const label of ['7', '×', '−', '+', '.', '÷', '=']) {\n    await clickKey(label);\n    await expectDisplay('Error', `after clicking \"${label}\" while the calculator is in the error state`);\n  }\n  await maybeScreenshot('error');\n});\n\ntest('clicking C after the error shows 0 and the calculator works again', { timeout: 30000 }, async () => {\n  await openPage();\n  await clickSequence(['1', '÷', '0', '=']);\n  await expectDisplay('Error', 'after clicking 1 ÷ 0 =');\n  await clickKey('C');\n  await expectDisplay('0', 'after clicking C in the error state');\n  await clickSequence(['2', '+', '3', '=']);\n  await expectDisplay('5', 'after typing 2 + 3 = once the error is cleared');\n});\n\ntest('every button press updates the display immediately, so typing shows the current number', { timeout: 30000 }, async () => {\n  await openPage();\n  const typed = [\n    ['1', '1'],\n    ['2', '12'],\n    ['3', '123'],\n    ['+', '123'],\n    ['4', '4'],\n    ['=', '127'],\n  ];\n  for (const [label, expected] of typed) {\n    await clickKey(label);\n    await expectDisplay(expected, `after clicking \"${label}\" the display should already show the current value`);\n  }\n\n  await openPage();\n  const chained = [\n    ['2', '2'],\n    ['+', '2'],\n    ['3', '3'],\n    ['+', '5'],\n    ['4', '4'],\n    ['=', '9'],\n  ];\n  for (const [label, expected] of chained) {\n    await clickKey(label);\n    await expectDisplay(expected, `after clicking \"${label}\" in the chain 2 + 3 + 4 =`);\n  }\n});\n\ntest('pressing Enter or Space on a focused key changes the display exactly like clicking it', { timeout: 60000 }, async () => {\n  async function run(activation) {\n    await openPage();\n    await clickSequence(['2', '+', '3']);\n    if (activation === 'click') {\n      await clickKey('=');\n    } else {\n      await focusKey('=');\n      await pressKey(activation === 'enter' ? 'Enter' : 'Space');\n    }\n    const result = await readDisplay();\n    await clickKey('C');\n    if (activation === 'click') {\n      await clickKey('7');\n    } else {\n      await focusKey('7');\n      await pressKey(activation === 'enter' ? 'Enter' : 'Space');\n    }\n    const digit = await readDisplay();\n    return { result, digit };\n  }\n\n  const clicked = await run('click');\n  const entered = await run('enter');\n  const spaced = await run('space');\n\n  assert.deepEqual(clicked, { result: '5', digit: '7' }, `The click baseline for \"2 + 3 =\" then \"C\" then \"7\" should show 5 then 7; it showed ${JSON.stringify(clicked)}.`);\n  assert.deepEqual(entered, clicked, `Pressing Enter on the focused \"=\" and \"7\" keys should change the display like clicking them; clicking gave ${JSON.stringify(clicked)}, Enter gave ${JSON.stringify(entered)}.`);\n  assert.deepEqual(spaced, clicked, `Pressing Space on the focused \"=\" and \"7\" keys should change the display like clicking them; clicking gave ${JSON.stringify(clicked)}, Space gave ${JSON.stringify(spaced)}.`);\n});\n\ntest(\"the UI calls the shared engine's press with mapped keys and renders the engine's display\", { timeout: 60000 }, async () => {\n  const { identifier } = await page.send('Page.addScriptToEvaluateOnNewDocument', { source: ENGINE_SPY });\n  await openPage();\n  await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });\n\n  const ready = await evaluate(`!!(window.__engineSpy && typeof window.createCalculator === 'function')`);\n  assert.ok(ready, 'The page did not expose a working global createCalculator: src/calc.js is missing or src/ui.js never reached it.');\n\n  const steps = [\n    ['6', '6', '6'],\n    ['×', '*', '6'],\n    ['7', '7', '7'],\n    ['=', '=', '42'],\n    ['8', '8', '8'],\n    ['÷', '/', '8'],\n    ['2', '2', '2'],\n    ['=', '=', '4'],\n    ['5', '5', '5'],\n    ['−', '-', '5'],\n    ['2', '2', '2'],\n    ['=', '=', '3'],\n    ['C', 'C', '0'],\n  ];\n  const seen = [];\n  for (const [label, engineKey, expected] of steps) {\n    await clickKey(label);\n    const spy = await evaluate('({ keys: window.__engineSpy.keys.slice(), display: window.__engineSpy.display })');\n    const last = spy.keys[spy.keys.length - 1];\n    seen.push(last);\n    assert.equal(last, engineKey, `Clicking \"${label}\" should call the engine's press with ${JSON.stringify(engineKey)}; press last received ${JSON.stringify(last)} (all: ${spy.keys.join(' ') || 'none'}).`);\n    assert.equal(spy.display, expected, `After the engine press for \"${label}\", the engine display is ${JSON.stringify(spy.display)}; expected ${JSON.stringify(expected)}.`);\n    await expectDisplay(expected, `after clicking \"${label}\" the page display`);\n  }\n  assert.deepEqual(seen, steps.map((step) => step[1]), 'The UI should map every label to its engine key.');\n});\n\ntest(\"the UI shows the engine's results for mapping, entry rules, rounding, formatting and errors\", { timeout: 180000 }, async () => {\n  const cases = [\n    { what: 'multiplication maps × to *', labels: ['6', '×', '7', '='], expected: '42' },\n    { what: 'division maps ÷ to /', labels: ['8', '÷', '2', '='], expected: '4' },\n    { what: 'subtraction maps − to -', labels: ['5', '−', '2', '='], expected: '3' },\n    { what: 'rounding to 10 significant digits', labels: ['0', '.', '1', '+', '0', '.', '2', '='], expected: '0.3' },\n    { what: 'a repeating decimal', labels: ['1', '÷', '3', '='], expected: '0.3333333333' },\n    { what: 'a negative result', labels: ['0', '−', '5', '='], expected: '-5' },\n    { what: 'the 10-digit entry limit', labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '1'], expected: '1234567890' },\n    { what: 'leading zeros', labels: ['0', '0', '5'], expected: '5' },\n    { what: 'a point before any digit', labels: ['.', '5'], expected: '0.5' },\n    { what: '= with no pending operation', labels: ['5', '='], expected: '5' },\n    { what: 'an operator with no number', labels: ['+', '5', '='], expected: '5' },\n    { what: 'a replaced pending operator', labels: ['5', '+', '×', '3', '='], expected: '15' },\n    { what: 'chained input', labels: ['2', '+', '3', '+', '4', '='], expected: '9' },\n    { what: 'scientific notation for a large result', labels: ['1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '×', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '='], expected: '1.000000000e18' },\n    { what: 'scientific notation for a small result', labels: ['1', '÷', '3', '0', '0', '0', '0', '0', '0', '0', '0', '0', '='], expected: '3.333333333e-10' },\n    { what: 'divide by zero', labels: ['1', '÷', '0', '='], expected: 'Error' },\n  ];\n  for (const testCase of cases) {\n    const keys = testCase.labels.map((label) => LABEL_KEYS[label] || label);\n    const engine = createCalculator();\n    for (const key of keys) engine.press(key);\n    assert.equal(engine.display, testCase.expected, `Internal fixture check failed: the engine shows ${JSON.stringify(engine.display)} for ${keys.join(' ')}; expected ${JSON.stringify(testCase.expected)}.`);\n    await openPage();\n    await clickSequence(testCase.labels);\n    const actual = await readDisplay();\n    assert.equal(actual, testCase.expected, `${testCase.what}: clicking ${testCase.labels.join(' ')} should show ${JSON.stringify(testCase.expected)}; the page shows ${JSON.stringify(actual)}.`);\n  }\n});\n\ntest('opening index.html loads src/calc.js before src/ui.js, logs no console errors, and the keys are live on first load', { timeout: 30000 }, async () => {\n  consoleProblems.length = 0;\n  await openPage();\n\n  const scripts = await evaluate(`Array.from(document.scripts).map((script) => script.getAttribute('src') || '(inline)')`);\n  const calcAt = scripts.findIndex((src) => src.endsWith('calc.js'));\n  const uiAt = scripts.findIndex((src) => src.endsWith('ui.js'));\n  assert.ok(calcAt !== -1, `No <script> loads src/calc.js. Scripts on the page: ${JSON.stringify(scripts)}.`);\n  assert.ok(uiAt !== -1, `No <script> loads src/ui.js. Scripts on the page: ${JSON.stringify(scripts)}.`);\n  assert.ok(calcAt < uiAt, `src/calc.js must load before src/ui.js; the page loads ${JSON.stringify(scripts)}.`);\n\n  await clickKey('7');\n  await expectDisplay('7', 'the keys should be live as soon as the page loads');\n  await clickSequence(['C', '2', '+', '3', '=']);\n  await expectDisplay('5', 'after a first calculation right after load');\n  assert.deepEqual(consoleProblems, [], `The page logged errors: ${consoleProblems.join(' | ')}`);\n});\n\ntest('at 375, 768 and 1440 updating the display does not wrap it or add a scrollbar', { timeout: 90000 }, async () => {\n  const WIDTHS = [[375, 667], [768, 900], [1440, 900]];\n  const LONG_VALUE = '-3.333333333e-10';\n  const sequence = ['0', '−', '1', '=', '÷', '3', '0', '0', '0', '0', '0', '0', '0', '0', '0', '='];\n\n  for (const [width, height] of WIDTHS) {\n    await openPage(width, height);\n    const before = await displayMetrics();\n    await clickSequence(sequence);\n    await expectDisplay(LONG_VALUE, `after 0 − 1 = ÷ 3000000000 = at ${width}px`);\n    const after = await displayMetrics();\n\n    assert.equal(after.lines, 1, `At ${width}px the display wraps ${JSON.stringify(LONG_VALUE)} onto ${after.lines} lines.`);\n    assert.ok(after.textHeight <= before.textHeight + 1, `At ${width}px the display text grows from ${before.textHeight.toFixed(1)}px to ${after.textHeight.toFixed(1)}px tall, so it wraps.`);\n    assert.ok(Math.abs(after.displayHeight - before.displayHeight) <= 1, `At ${width}px the display box grows from ${before.displayHeight.toFixed(1)}px to ${after.displayHeight.toFixed(1)}px tall when the value changes.`);\n    assert.ok(after.textWidth <= after.contentWidth + 1, `At ${width}px ${JSON.stringify(LONG_VALUE)} is ${Math.round(after.textWidth)}px wide but the display content is ${Math.round(after.contentWidth)}px.`);\n    assert.ok(after.scrollWidth <= after.innerWidth, `At ${width}px updating the display adds a horizontal scrollbar (scrollWidth ${after.scrollWidth} > viewport ${after.innerWidth}).`);\n    assert.ok(after.scrollWidth <= before.scrollWidth, `At ${width}px updating the display widens the page from ${before.scrollWidth}px to ${after.scrollWidth}px.`);\n    assert.ok(after.scrollHeight <= before.scrollHeight + 1, `At ${width}px updating the display grows the page from ${before.scrollHeight}px to ${after.scrollHeight}px tall.`);\n  }\n});\n"
}
```

```
Created file successfully: test/ui-wiring.test.js
```

</details>

## Assistant


<details>
<summary>Reasoning</summary>

```
Now run the focused tests in the repo to see failures for the right reason.
```

</details>

Now run the new checks against the current (unwired) page:

<details>
<summary>Tool: shell</summary>

```json
{
  "command": "node --test test/ui-wiring.test.js 2>&1 | Out-String -Width 240",
  "timeout": 300000
}
```

```
✖ clicking 2 + 3 = shows 5, then 5 + 3 = shows 8, and = again shows 11 (661.4902ms)
✖ clicking 1 . 5 + 2 . 5 = shows 4, with digit and point presses updating the display (99.4409ms)
✖ clicking 1 ÷ 0 = shows Error and every key except C leaves Error showing (249.3114ms)
✖ clicking C after the error shows 0 and the calculator works again (248.4276ms)
✖ every button press updates the display immediately, so typing shows the current number (101.1713ms)
✖ pressing Enter or Space on a focused key changes the display exactly like clicking it (851.8872ms)
✖ the UI calls the shared engine's press with mapped keys and renders the engine's display (47.1518ms)
✖ the UI shows the engine's results for mapping, entry rules, rounding, formatting and errors (267.2178ms)
✖ opening index.html loads src/calc.js before src/ui.js, logs no console errors, and the keys are live on first load (49.4489ms)
✖ at 375, 768 and 1440 updating the display does not wrap it or add a scrollbar (850.619ms)
ℹ tests 10
ℹ suites 0
ℹ pass 0
ℹ fail 10
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 6518.3771

✖ failing tests:

test at test\ui-wiring.test.js:383:1
✖ clicking 2 + 3 = shows 5, then 5 + 3 = shows 8, and = again shows 11 (661.4902ms)
  AssertionError [ERR_ASSERTION]: after clicking 2 + 3 =: expected the display to show "5", found "0".
  
  '0' !== '5'
  
      at expectDisplay (C:\Users\rames\Desktop\calculator-groundwork\test\ui-wiring.test.js:346:10)
      at async TestContext.<anonymous> (C:\Users\rames\Desktop\calculator-groundwork\test\ui-wiring.test.js:386:3)
      at async Test.run (node:internal/test_runner/test:1389:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: '0',
    expected: '5',
    operator: 'strictEqual',
    diff: 'simple'
  }

test at test\ui-wiring.test.js:394:1
✖ clicking 1 . 5 + 2 . 5 = shows 4, with digit and point presses updating the display (99.4409ms)
  AssertionError [ERR_ASSERTION]: after clicking "1" in 1 . 5 + 2 . 5 =: expected the display to show "1", found "0".
  
  '0' !== '1'
  
      at expectDisplay (C:\Users\rames\Desktop\calculator-groundwork\test\ui-wiring.test.js:346:10)
      at async TestContext.<anonymous> (C:\Users\rames\Desktop\calculator-groundwork\test\ui-wiring.test.js:408:5)
      at async Test.run (node:internal/test_runner/test:1389:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: '0',
    expected: '1',
    operator: 'strictEqual',
    diff: 'simple'
  }

test at test\ui-wiring.test.js:412:1
✖ clicking 1 ÷ 0 = shows Error and every key except C leaves Error showing (249.3114ms)
  AssertionError [ERR_ASSERTION]: after clicking 1 ÷ 0 =: expected the display to show "Error", found "0".
  
  '0' !== 'Error'
  
      at expectDisplay (C:\Users\rames\Desktop\calculator-groundwork\test\ui-wiring.test.js:346:10)
      at async TestContext.<anonymous> (C:\Users\rames\Desktop\calculator-groundwork\test\ui-wiring.test.js:415:3)
      at async Test.run (node:internal/test_runner/test:1389:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: '0',
    expected: 'Error',
    operator: 'strictEqual',
    diff: 'simple'
  }

test at test\ui-wiring.test.js:423:1
✖ clicking C after the error shows 0 and the calculator works again (248.4276ms)
  AssertionError [ERR_ASSERTION]: after clicking 1 ÷ 0 =: expected the display to show "Error", found "0".
  
  '0' !== 'Error'
  
      at expectDisplay (C:\Users\rames\Desktop\calculator-groundwork\test\ui-wiring.test.js:346:10)
      at async TestContext.<anonymous> (C:\Users\rames\Desktop\calculator-groundwork\test\ui-wiring.test.js:426:3)
      at async Test.run (node:internal/test_runner/test:1389:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: '0',
    expected: 'Error',
    operator: 'strictEqual',
    diff: 'simple'
  }

test at test\ui-wiring.test.js:433:1
✖ every button press updates the display immediately, so typing shows the current number (101.1713ms)
  AssertionError [ERR_ASSERTION]: after clicking "1" the display should already show the current value: expected the display to show "1", found "0".
  
  '0' !== '1'
  
      at expectDisplay (C:\Users\rames\Desktop\calculator-groundwork\test\ui-wiring.test.js:346:10)
      at async TestContext.<anonymous> (C:\Users\rames\Desktop\calculator-groundwork\test\ui-wiring.test.js:445:5)
      at async Test.run (node:internal/test_runner/test:1389:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: '0',
    expected: '1',
    operator: 'strictEqual',
    diff: 'simple'
  }

test at test\ui-wiring.test.js:463:1
✖ pressing Enter or Space on a focused key changes the display exactly like clicking it (851.8872ms)
  AssertionError [ERR_ASSERTION]: The click baseline for "2 + 3 =" then "C" then "7" should show 5 then 7; it showed {"result":"0","digit":"0"}.
  + actual - expected
  
    {
  +   digit: '0',
  +   result: '0'
  -   digit: '7',
  -   result: '5'
    }
  
      at TestContext.<anonymous> (C:\Users\rames\Desktop\calculator-groundwork\test\ui-wiring.test.js:489:10)
      at async Test.run (node:internal/test_runner/test:1389:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: { result: '0', digit: '0' },
    expected: { result: '5', digit: '7' },
    operator: 'deepStrictEqual',
    diff: 'simple'
  }

test at test\ui-wiring.test.js:494:1
✖ the UI calls the shared engine's press with mapped keys and renders the engine's display (47.1518ms)
  AssertionError [ERR_ASSERTION]: The page did not expose a working global createCalculator: src/calc.js is missing or src/ui.js never reached it.
      at TestContext.<anonymous> (C:\Users\rames\Desktop\calculator-groundwork\test\ui-wiring.test.js:500:10)
      at async Test.run (node:internal/test_runner/test:1389:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: '==',
    diff: 'simple'
  }

test at test\ui-wiring.test.js:530:1
✖ the UI shows the engine's results for mapping, entry rules, rounding, formatting and errors (267.2178ms)
  AssertionError [ERR_ASSERTION]: multiplication maps × to *: clicking 6 × 7 = should show "42"; the page shows "0".
  
  '0' !== '42'
  
      at TestContext.<anonymous> (C:\Users\rames\Desktop\calculator-groundwork\test\ui-wiring.test.js:557:12)
      at async Test.run (node:internal/test_runner/test:1389:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: '0',
    expected: '42',
    operator: 'strictEqual',
    diff: 'simple'
  }

test at test\ui-wiring.test.js:561:1
✖ opening index.html loads src/calc.js before src/ui.js, logs no console errors, and the keys are live on first load (49.4489ms)
  AssertionError [ERR_ASSERTION]: No <script> loads src/calc.js. Scripts on the page: [].
      at TestContext.<anonymous> (C:\Users\rames\Desktop\calculator-groundwork\test\ui-wiring.test.js:568:10)
      at async Test.run (node:internal/test_runner/test:1389:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: '==',
    diff: 'simple'
  }

test at test\ui-wiring.test.js:579:1
✖ at 375, 768 and 1440 updating the display does not wrap it or add a scrollbar (850.619ms)
  AssertionError [ERR_ASSERTION]: after 0 − 1 = ÷ 3000000000 = at 375px: expected the display to show "-3.333333333e-10", found "0".
  + actual - expected
  
  + '0'
  - '-3.333333333e-10'
  
      at expectDisplay (C:\Users\rames\Desktop\calculator-groundwork\test\ui-wiring.test.js:346:10)
      at async TestContext.<anonymous> (C:\Users\rames\Desktop\calculator-groundwork\test\ui-wiring.test.js:588:5)
      at async Test.run (node:internal/test_runner/test:1389:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: '0',
    expected: '-3.333333333e-10',
    operator: 'strictEqual',
    diff: 'simple'
  }


Exited with code 1
```

Exit code: 1

</details>

## Assistant


<details>
<summary>Reasoning</summary>

```
All 10 fail for the right reason: display stays '0' / no scripts. Now self-validate against a throwaway correct implementation in a temp folder, so the tests are proven to pass when the card is done. This must not touch the repo.

Plan:
- temp dir: `C:\Users\rames\AppData\Local\Temp\opencode\calc-wiring-selftest`
- Copy repo `test/ui-wiring.test.js` → temp/test/
- Copy repo `src/calc.js` → temp/src/
- Copy repo `styles.css` → temp/
- Create temp `index.html` = repo index.html with script tags added (read content and write edited copy)
- Create temp `src/ui.js` throwaway (correct wiring)
- Run `node --test test/ui-wiring.test.js` in temp, with UI_SHOTS maybe to test screenshot path too.

I'll do this with PowerShell file ops + write tool for ui.js/index.html? index.html needs the repo content plus two script lines. I can generate temp index.html via PowerShell replacing `</body>` with scripts + `</body>`. But simpler with the write tool after reading repo index.html (already read). Let me create temp files with write tool (deterministic), and copy test/calc/styles via Copy-Item.

Wait, PowerShell paths with spaces — fine.

Actually the test file computes REPO_ROOT = path.join(__dirname, '..') → temp root. INDEX_PATH = temp/index.html. Requires ../src/calc.js. Good.

Let me do it.

Note: styles.css copy needed for layout; index references styles.css. Copy from repo.

Then run. Also set UI_SHOTS to a temp dir to validate maybeScreenshot writes? Optional; let me validate it too so implementer's command will work: set `$env:UI_SHOTS = "shots"; node --test test/ui-wiring.test.js` in temp, verify result.png and error.png created. This validates the screenshot path end-to-end (captureScreenshot works in headless).

Then remove temp dir.

The ui.js throwaway implementation (in temp only):

```js
'use strict';

(function () {
  var calculator = createCalculator();
  var display = document.getElementById('display');
  var keys = { '×': '*', '÷': '/', '−': '-' };
  var buttons = document.querySelectorAll('.keypad button');
  for (var index = 0; index < buttons.length; index++) {
    (function (button) {
      button.addEventListener('click', function () {
        var label = button.textContent.trim();
        calculator.press(keys[label] || label);
        display.textContent = calculator.display;
      });
    })(buttons[index]);
  }
})();
```

This matches the agreed shape (label map, press, render). Note: calc.js in browser publishes `createCalculator`; bare reference works.

Temp index.html script tags:
```html
  <script src="src/calc.js"></script>
  <script src="src/ui.js"></script>
</body>
```

Let me create the temp dir and files. Use PowerShell to copy and I'll use write for ui.js and index.html. But write creates dirs automatically. Let me first Copy-Item calc.js/styles.css/test file.

Actually I can just use write for all three copied files? Copying binary-ish text via read/write risks nothing for text files but unnecessary; use PowerShell Copy-Item.

Path: `$root = "C:\Users\rames\AppData\Local\Temp\opencode\calc-wiring-selftest"`.

Commands:
```powershell
$root = "C:\Users\rames\AppData\Local\Temp\opencode\calc-wiring-selftest"
Remove-Item -Recurse -Force -LiteralPath $root -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path "$root\test","$root\src" | Out-Null
Copy-Item -LiteralPath "test\ui-wiring.test.js" -Destination "$root\test\ui-wiring.test.js"
Copy-Item -LiteralPath "src\calc.js" -Destination "$root\src\calc.js"
Copy-Item -LiteralPath "styles.css" -Destination "$root\styles.css"
```
workdir repo. Then write temp index.html and ui.js.

For index.html I'll write exactly the repo content with script tags. Let me produce it.
```

</details>

All 10 fail for the right reason (display never moves off `0`; no scripts on the page). Now I'll self-validate the checks against a throwaway correct wiring **outside the repo** (temp folder), so I know they pass when the card is done — same technique card 2.1's tester used.

<details>
<summary>Tool: shell</summary>

```json
{
  "command": "$root = \"C:\\Users\\rames\\AppData\\Local\\Temp\\opencode\\calc-wiring-selftest\"; Remove-Item -Recurse -Force -LiteralPath $root -ErrorAction SilentlyContinue; New-Item -ItemType Directory -Force -Path \"$root\\test\",\"$root\\src\" | Out-Null; Copy-Item -LiteralPath \"test\\ui-wiring.test.js\" -Destination \"$root\\test\\ui-wiring.test.js\"; Copy-Item -LiteralPath \"src\\calc.js\" -Destination \"$root\\src\\calc.js\"; Copy-Item -LiteralPath \"styles.css\" -Destination \"$root\\styles.css\"; Get-ChildItem -Recurse -File $root | Select-Object -ExpandProperty FullName",
  "workdir": "C:\\Users\\rames\\Desktop\\calculator-groundwork"
}
```

```
C:\Users\rames\AppData\Local\Temp\opencode\calc-wiring-selftest\styles.css
C:\Users\rames\AppData\Local\Temp\opencode\calc-wiring-selftest\src\calc.js
C:\Users\rames\AppData\Local\Temp\opencode\calc-wiring-selftest\test\ui-wiring.test.js

```

Exit code: 0

</details>

## Assistant


<details>
<summary>Reasoning</summary>

```
Now write temp index.html and temp ui.js. These are throwaway, in temp, not repo.
```

</details>

<details>
<summary>Tool: write</summary>

```json
{
  "content": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <title>Calculator</title>\n  <link rel=\"stylesheet\" href=\"styles.css\">\n</head>\n<body>\n  <main class=\"calculator\" aria-label=\"Calculator\">\n    <div id=\"display\" class=\"display\" aria-live=\"polite\">0</div>\n    <div class=\"keypad\">\n      <button type=\"button\" class=\"key key-span-3\" aria-label=\"clear\">C</button>\n      <button type=\"button\" class=\"key\" aria-label=\"divide\">÷</button>\n      <button type=\"button\" class=\"key\">7</button>\n      <button type=\"button\" class=\"key\">8</button>\n      <button type=\"button\" class=\"key\">9</button>\n      <button type=\"button\" class=\"key\" aria-label=\"multiply\">×</button>\n      <button type=\"button\" class=\"key\">4</button>\n      <button type=\"button\" class=\"key\">5</button>\n      <button type=\"button\" class=\"key\">6</button>\n      <button type=\"button\" class=\"key\" aria-label=\"minus\">−</button>\n      <button type=\"button\" class=\"key\">1</button>\n      <button type=\"button\" class=\"key\">2</button>\n      <button type=\"button\" class=\"key\">3</button>\n      <button type=\"button\" class=\"key\">+</button>\n      <button type=\"button\" class=\"key key-span-2\">0</button>\n      <button type=\"button\" class=\"key\">.</button>\n      <button type=\"button\" class=\"key\" aria-label=\"equals\">=</button>\n    </div>\n  </main>\n  <script src=\"src/calc.js\"></script>\n  <script src=\"src/ui.js\"></script>\n</body>\n</html>\n",
  "path": "C:\\Users\\rames\\AppData\\Local\\Temp\\opencode\\calc-wiring-selftest\\index.html"
}
```

```
Created file successfully: C:/Users/rames/AppData/Local/Temp/opencode/calc-wiring-selftest/index.html
```

</details>

<details>
<summary>Tool: write</summary>

```json
{
  "content": "'use strict';\n\n(function () {\n  var calculator = createCalculator();\n  var display = document.getElementById('display');\n  var keys = { '×': '*', '÷': '/', '−': '-' };\n  var buttons = document.querySelectorAll('.keypad button');\n  for (var index = 0; index < buttons.length; index++) {\n    (function (button) {\n      button.addEventListener('click', function () {\n        var label = button.textContent.trim();\n        calculator.press(keys[label] || label);\n        display.textContent = calculator.display;\n      });\n    })(buttons[index]);\n  }\n})();\n",
  "path": "C:\\Users\\rames\\AppData\\Local\\Temp\\opencode\\calc-wiring-selftest\\src\\ui.js"
}
```

```
Created file successfully: C:/Users/rames/AppData/Local/Temp/opencode/calc-wiring-selftest/src/ui.js
```

</details>

## Assistant


<details>
<summary>Tool: shell</summary>

```json
{
  "command": "$env:UI_SHOTS = \"shots\"; node --test test/ui-wiring.test.js 2>&1 | Out-String -Width 240; Write-Output \"---- screenshots ----\"; Get-ChildItem -Recurse -File shots | Select-Object -ExpandProperty FullName",
  "timeout": 300000,
  "workdir": "C:\\Users\\rames\\AppData\\Local\\Temp\\opencode\\calc-wiring-selftest"
}
```

```
✔ clicking 2 + 3 = shows 5, then 5 + 3 = shows 8, and = again shows 11 (971.5021ms)
✔ clicking 1 . 5 + 2 . 5 = shows 4, with digit and point presses updating the display (467.1862ms)
✔ clicking 1 ÷ 0 = shows Error and every key except C leaves Error showing (765.8047ms)
✔ clicking C after the error shows 0 and the calculator works again (500.5658ms)
✔ every button press updates the display immediately, so typing shows the current number (700.5789ms)
✔ pressing Enter or Space on a focused key changes the display exactly like clicking it (885.6557ms)
✔ the UI calls the shared engine's press with mapped keys and renders the engine's display (696.6843ms)
✔ the UI shows the engine's results for mapping, entry rules, rounding, formatting and errors (5750.2294ms)
✔ opening index.html loads src/calc.js before src/ui.js, logs no console errors, and the keys are live on first load (349.4555ms)
✔ at 375, 768 and 1440 updating the display does not wrap it or add a scrollbar (2551.0426ms)
ℹ tests 10
ℹ suites 0
ℹ pass 10
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 16718.769

---- screenshots ----
C:\Users\rames\AppData\Local\Temp\opencode\calc-wiring-selftest\shots\error.png
C:\Users\rames\AppData\Local\Temp\opencode\calc-wiring-selftest\shots\result.png

```

Exit code: 0

</details>

## Assistant


<details>
<summary>Reasoning</summary>

```
Self-validation passes 10/10 with the agreed implementation shape, console-clean check passes (so no favicon noise), script order check passes, screenshots captured.

Let me look at the two screenshots to make sure they capture meaningful states (result '11', error 'Error'). I could read them with the read tool (images). Good idea. Then delete the temp dir.

Also suppress any concern: temp ui.js is throwaway; delete folder after inspection.

Let me view screenshots.
```

</details>

Self-validation: 10/10 pass with the agreed implementation (temp copy only), and the screenshot hook works. Let me eyeball those two captures before deleting the temp folder:

<details>
<summary>Tool: read</summary>

```json
{
  "path": "C:\\Users\\rames\\AppData\\Local\\Temp\\opencode\\calc-wiring-selftest\\shots\\result.png"
}
```

```
Image read successfully
```

</details>

<details>
<summary>Tool: read</summary>

```json
{
  "path": "C:\\Users\\rames\\AppData\\Local\\Temp\\opencode\\calc-wiring-selftest\\shots\\error.png"
}
```

```
Image read successfully
```

</details>

## Assistant


<details>
<summary>Reasoning</summary>

```
Screenshots look right: '11' result state and 'Error' state. Now delete the temp folder, then run the full suite in the repo to get exact counts (focused: 10 fail; full suite should be 58 tests, 48 pass, 10 fail).

Then write evidence, update card.
```

</details>

Both captures are correct. Cleaning up the temp folder, then running the full suite for the evidence numbers:

<details>
<summary>Tool: shell</summary>

```json
{
  "command": "Remove-Item -Recurse -Force -LiteralPath \"C:\\Users\\rames\\AppData\\Local\\Temp\\opencode\\calc-wiring-selftest\"; Test-Path -LiteralPath \"C:\\Users\\rames\\AppData\\Local\\Temp\\opencode\\calc-wiring-selftest\"",
  "workdir": "C:\\Users\\rames\\Desktop\\calculator-groundwork"
}
```

```
False

```

Exit code: 0

</details>

## Assistant


<details>
<summary>Tool: shell</summary>

```json
{
  "command": "node --test 2>&1 | Select-String -Pattern '^ℹ (tests|pass|fail|cancelled|skipped|todo|duration_ms) ' | ForEach-Object { $_.Line }; Write-Output \"exit=$LASTEXITCODE\"",
  "timeout": 600000,
  "workdir": "C:\\Users\\rames\\Desktop\\calculator-groundwork"
}
```

```
exit=1

```

Exit code: 0

</details>

## Assistant


<details>
<summary>Reasoning</summary>

```
The Select-String pattern didn't match because of formatting (the `ℹ` lines maybe have leading spaces or different). Let me capture the output to a file and inspect the tail. Use `node --test *> full-output.txt`? Better: run and save to temp file, then read tail. Note evidence needs summary lines. Let me run `node --test 2>&1 | Out-File -Encoding utf8 $out` then `Get-Content $out -Tail 20`.
```

</details>

<details>
<summary>Tool: shell</summary>

```json
{
  "command": "$out = \"C:\\Users\\rames\\AppData\\Local\\Temp\\opencode\\full-suite-before.txt\"; node --test 2>&1 | Out-File -Encoding utf8 $out; Write-Output \"exit=$LASTEXITCODE\"; Get-Content $out -Tail 16",
  "timeout": 600000,
  "workdir": "C:\\Users\\rames\\Desktop\\calculator-groundwork"
}
```

```
exit=1
  + actual - expected
  
  + '0'
  - '-3.333333333e-10'
  
      at expectDisplay (C:\Users\rames\Desktop\calculator-groundwork\test\ui-wiring.test.js:346:10)
      at async TestContext.<anonymous> (C:\Users\rames\Desktop\calculator-groundwork\test\ui-wiring.test.js:588:5)
      at async Test.run (node:internal/test_runner/test:1389:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: '0',
    expected: '-3.333333333e-10',
    operator: 'strictEqual',
    diff: 'simple'
  }

```

Exit code: 0

</details>

## Assistant


<details>
<summary>Reasoning</summary>

```
The summary lines are before the failing details. Let me grep the file for "tests" summary. Node's reporter prints summary at the start of the output? In the focused run, summary appeared right after test lines and before "failing tests:". With TAP not used, spec reporter prints all test lines, then failing details, then summary at end? In the earlier focused run, output showed tests, then ℹ summary, then failing tests. Now tail 16 shows failing detail at end — hmm, that suggests summary appears after failing tests? Let me search the output file for "ℹ tests" etc.
```

</details>

<details>
<summary>Tool: shell</summary>

```json
{
  "command": "Select-String -Path \"C:\\Users\\rames\\AppData\\Local\\Temp\\opencode\\full-suite-before.txt\" -Pattern 'tests |pass |fail |✖ ' | Select-Object -ExpandProperty Line | Select-Object -First 40",
  "workdir": "C:\\Users\\rames\\Desktop\\calculator-groundwork"
}
```

```
ℹ tests 58
ℹ pass 48
ℹ fail 10
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {

```

Exit code: 0

</details>

## Assistant


<details>
<summary>Reasoning</summary>

```
Full suite: 58 tests, 48 pass, 10 fail — exactly my 10 new tests fail; all 48 baseline tests still pass.

Now write the evidence file `.groundwork/evidence/2.2/tests-failing.txt` (about 30 lines max): command, summary, failing test names, representative failure detail, full-suite note, self-validation note. Match style of 2.1 evidence.

Then update the card:
- status: `testing` → `implementing`
- How to check: add focused automated command + screenshot command.
- Evidence: bullets.
- History: tester line.

Let me draft the evidence text (~30 lines). Also include the exact failing names (10). Draft:

```
Card 2.2 — Wire it up — failing checks before implementation

Command (from repo root):
  node --test test/ui-wiring.test.js

The check drives real headless Edge over the DevTools protocol (Node's
built-in WebSocket, no dependencies, no server: file:// page), clicks the
real <button>s with CDP mouse events and reads #display. index.html has no
<script> tags yet, so every click leaves the display at "0".

✖ clicking 2 + 3 = shows 5, then 5 + 3 = shows 8, and = again shows 11
✖ clicking 1 . 5 + 2 . 5 = shows 4, with digit and point presses updating the display
✖ clicking 1 ÷ 0 = shows Error and every key except C leaves Error showing
✖ clicking C after the error shows 0 and the calculator works again
✖ every button press updates the display immediately, so typing shows the current number
✖ pressing Enter or Space on a focused key changes the display exactly like clicking it
✖ the UI calls the shared engine's press with mapped keys and renders the engine's display
✖ the UI shows the engine's results for mapping, entry rules, rounding, formatting and errors
✖ opening index.html loads src/calc.js before src/ui.js, logs no console errors, and the keys are live on first load
✖ at 375, 768 and 1440 updating the display does not wrap it or add a scrollbar

ℹ tests 10
ℹ pass 0
ℹ fail 10
ℹ duration_ms 6518.3771

Failure detail (first failure; all ten share the same cause):
  after clicking 2 + 3 =: expected the display to show "5", found "0". (expectDisplay, test/ui-wiring.test.js:346)

Full suite at the same point: `node --test` -> tests 58, pass 48, fail 10
(only these 10; the 48 existing engine/page tests still pass).

Self-validation (tester pass): the same file was copied to a throwaway folder
in %TEMP% with a correct wiring (index.html + src/calc.js + a temporary
src/ui.js, since deleted) -> 10/10 pass, exit 0, no console errors; with
UI_SHOTS set it wrote result.png and error.png. So these failures are the
missing wiring, not a broken check.
```

That's ~40 lines; role says about 30 lines at most. Trim. Let me compress to ~30 lines:

```
Card 2.2 — Wire it up — failing checks before implementation

Command (from repo root):
  node --test test/ui-wiring.test.js

Real headless Edge over the DevTools protocol (Node built-ins only, file://
page): clicks the real <button>s with CDP mouse events and reads #display.
index.html has no <script> yet, so every click leaves the display at "0".

✖ clicking 2 + 3 = shows 5, then 5 + 3 = shows 8, and = again shows 11
✖ clicking 1 . 5 + 2 . 5 = shows 4, with digit and point presses updating the display
✖ clicking 1 ÷ 0 = shows Error and every key except C leaves Error showing
✖ clicking C after the error shows 0 and the calculator works again
✖ every button press updates the display immediately, so typing shows the current number
✖ pressing Enter or Space on a focused key changes the display exactly like clicking it
✖ the UI calls the shared engine's press with mapped keys and renders the engine's display
✖ the UI shows the engine's results for mapping, entry rules, rounding, formatting and errors
✖ opening index.html loads src/calc.js before src/ui.js, logs no console errors, and the keys are live on first load
✖ at 375, 768 and 1440 updating the display does not wrap it or add a scrollbar

ℹ tests 10
ℹ pass 0
ℹ fail 10
ℹ duration_ms 6518.3771

Failure detail (first; all ten share the cause - nothing is wired):
  AssertionError: after clicking 2 + 3 =: expected the display to show "5", found "0".
      at expectDisplay (test\ui-wiring.test.js:346:10)

Full suite: `node --test` -> tests 58, pass 48, fail 10 (only these 10).

Self-validation in a throwaway %TEMP% copy (correct wiring, now deleted):
10/10 pass, exit 0, console clean; UI_SHOTS wrote result.png + error.png.
So these failures are the missing wiring, not a broken check.
```

~32 lines. Fine.

Wait — one thing: "logs no console errors" check passed in the self-test, meaning no favicon noise. Good.

Now, should I also copy the temp screenshot files as evidence? No — card says screenshots of a result and Error state in `.groundwork/evidence/2.2/` are produced by the implementer when wiring exists. My temp ones were throwaway; I could keep them but they're from a temp implementation, better not to ship them as evidence (could confuse). The self-validation note suffices.

Now update the card. Current card content lines 22-33. Changes:
- front matter status: implementing.
- How to check: after the existing "Automated:" line, add:
  `- Automated (this card's wiring checks): `node --test test/ui-wiring.test.js` — headless Edge; clicks the real buttons, reads `#display`, checks Enter/Space, engine delegation, console errors, script order, and the 375/768/1440 no-wrap/no-scrollbar rule. Full suite: `node --test`.`
  `- Screenshots of the result and Error states: `$env:UI_SHOTS = ".groundwork/evidence/2.2"; node --test test/ui-wiring.test.js` (PowerShell, from the repo root).`
- Evidence: add bullet:
  `- `.groundwork/evidence/2.2/tests-failing.txt` — before implementation: `node --test test/ui-wiring.test.js`, 10 tests, pass 0, fail 10, exit 1 (no `<script>` tags; display stays `0`); full suite 58 tests, 48 pass, 10 fail. Self-validated 10/10 against a throwaway correct wiring in %TEMP% (now deleted).`
- History: add:
  `2026-09-26 tester: 10 wiring checks written (`test/ui-wiring.test.js`; headless Edge, DevTools protocol, no dependencies); all 10 fail on the unwired page (display stays `0`); full suite 58: 48 pass, 10 fail; self-validated 10/10 against a throwaway correct wiring in %TEMP% (deleted); screenshots hook verified (result.png/error.png); status implementing`

Also mark: "Do not implement the app or change the criteria" — I don't.

Note the checkboxes: leave `[ ]`.

Now write evidence file + edit card. Then report.

One question: should the card's "How to check" line about automated checks reference `node --test test/ui-wiring.test.js`? Role: "put the command that reruns it under the card's How to check". Yes.

Let me now write evidence and edit card.
```

</details>

Full suite: **58 tests, 48 pass, 10 fail** — exactly the 10 new checks, all 48 baseline still green. Now the evidence file and card update:

<details>
<summary>Tool: write</summary>

```json
{
  "content": "Card 2.2 — Wire it up — failing checks before implementation\n\nCommand (from repo root):\n  node --test test/ui-wiring.test.js\n\nReal headless Edge over the DevTools protocol (Node built-ins only, file://\npage): clicks the real <button>s with CDP mouse events and reads #display.\nindex.html has no <script> tags yet, so every click leaves the display at \"0\".\n\n✖ clicking 2 + 3 = shows 5, then 5 + 3 = shows 8, and = again shows 11\n✖ clicking 1 . 5 + 2 . 5 = shows 4, with digit and point presses updating the display\n✖ clicking 1 ÷ 0 = shows Error and every key except C leaves Error showing\n✖ clicking C after the error shows 0 and the calculator works again\n✖ every button press updates the display immediately, so typing shows the current number\n✖ pressing Enter or Space on a focused key changes the display exactly like clicking it\n✖ the UI calls the shared engine's press with mapped keys and renders the engine's display\n✖ the UI shows the engine's results for mapping, entry rules, rounding, formatting and errors\n✖ opening index.html loads src/calc.js before src/ui.js, logs no console errors, and the keys are live on first load\n✖ at 375, 768 and 1440 updating the display does not wrap it or add a scrollbar\n\nℹ tests 10\nℹ pass 0\nℹ fail 10\nℹ duration_ms 6518.3771\n\nFailure detail (first; all ten share the cause — nothing is wired):\n  AssertionError: after clicking 2 + 3 =: expected the display to show \"5\", found \"0\".\n      at expectDisplay (test\\ui-wiring.test.js:346:10)\n\nFull suite at the same point: `node --test` -> tests 58, pass 48, fail 10\n(only these 10; the 48 existing engine/page tests still pass).\n\nSelf-validation in a throwaway %TEMP% copy (index.html + src/calc.js + a\ntemporary src/ui.js, deleted afterwards; not in the repo): 10/10 pass, exit 0,\nconsole clean; with UI_SHOTS set it wrote result.png and error.png. So these\nfailures are the missing wiring, not a broken check.\n",
  "path": "C:\\Users\\rames\\Desktop\\calculator-groundwork\\.groundwork\\evidence\\2.2\\tests-failing.txt"
}
```

```
Created file successfully: .groundwork/evidence/2.2/tests-failing.txt
```

</details>

## Assistant


<details>
<summary>Reasoning</summary>

```
Now edit the card. Changes:
1. status: testing → implementing
2. How to check: add focused command + screenshot command
3. Evidence section: add bullet
4. History: add tester line

Let me apply edits.
```

</details>

<details>
<summary>Tool: edit</summary>

```json
{
  "path": "C:\\Users\\rames\\Desktop\\calculator-groundwork\\.groundwork\\cards\\2.2-wire-it-up.md",
  "oldString": "status: testing",
  "newString": "status: implementing"
}
```

```
Edited .groundwork/cards/2.2-wire-it-up.md (1 replacement)
```

</details>

<details>
<summary>Tool: edit</summary>

```json
{
  "path": "C:\\Users\\rames\\Desktop\\calculator-groundwork\\.groundwork\\cards\\2.2-wire-it-up.md",
  "oldString": "- Automated: browser-driven checks click real buttons and read `#display`; run `node --test`.",
  "newString": "- Automated: browser-driven checks click real buttons and read `#display`; run `node --test` (all tests) or `node --test test/ui-wiring.test.js` (this card's 10 wiring checks: clicks, Enter/Space, engine delegation, console errors, script order, 375/768/1440 no-wrap/no-scrollbar).\n- Screenshots of the result and Error states: `$env:UI_SHOTS = \".groundwork/evidence/2.2\"; node --test test/ui-wiring.test.js` (PowerShell, from the repo root)."
}
```

```
Edited .groundwork/cards/2.2-wire-it-up.md (1 replacement)
```

</details>

## Assistant


<details>
<summary>Tool: edit</summary>

```json
{
  "newString": "## Evidence\n- `.groundwork/evidence/2.2/tests-failing.txt` — before implementation: `node --test test/ui-wiring.test.js`, 10 tests, pass 0, fail 10, exit 1 (no `<script>` tags; the display never leaves `0`); full suite 58 tests, 48 pass, 10 fail. Self-validated 10/10 against a throwaway correct wiring in `%TEMP%` (deleted; not in the repo).\n\n## History",
  "oldString": "## Evidence\n\n## History",
  "path": "C:\\Users\\rames\\Desktop\\calculator-groundwork\\.groundwork\\cards\\2.2-wire-it-up.md"
}
```

```
Edited .groundwork/cards/2.2-wire-it-up.md (1 replacement)
```

</details>

<details>
<summary>Tool: edit</summary>

```json
{
  "newString": "2026-09-26 started (status → testing)\n2026-09-26 tester: 10 wiring checks written (`test/ui-wiring.test.js`; headless Edge over the DevTools protocol, no dependencies; clicks via CDP mouse events, real Enter/Space key events, an engine spy that intercepts `createCalculator` to prove label mapping/press/render, and an engine-equivalence matrix reusing `src/calc.js` in Node); all 10 fail on the unwired page (display stays `0`), full suite 58: 48 pass / 10 fail; self-validated 10/10 against a throwaway correct wiring in `%TEMP%` (deleted) and verified the UI_SHOTS result/error captures; status implementing",
  "oldString": "2026-09-26 started (status → testing)",
  "path": "C:\\Users\\rames\\Desktop\\calculator-groundwork\\.groundwork\\cards\\2.2-wire-it-up.md"
}
```

```
Edited .groundwork/cards/2.2-wire-it-up.md (1 replacement)
```

</details>

## Assistant


<details>
<summary>Reasoning</summary>

```
Let me read the card back to verify it's coherent.
```

</details>

<details>
<summary>Tool: read</summary>

```json
{
  "path": "C:\\Users\\rames\\Desktop\\calculator-groundwork\\.groundwork\\cards\\2.2-wire-it-up.md"
}
```

```
Read file C:\Users\rames\Desktop\calculator-groundwork\.groundwork\cards\2.2-wire-it-up.md, lines 1-36
1: ---
2: id: 2.2
3: title: Wire it up
4: phase: 2
5: status: implementing
6: depends_on: [2.1, 1.4]
7: ---
8: ## Goal
9: Clicking the keys drives the engine in `src/calc.js` (from `src/ui.js`): the display updates as you type, results and errors appear, and Clear resets. `src/ui.js` maps button labels to engine keys and renders the engine's display string; it contains no arithmetic.
10: 
11: ## Acceptance criteria
12: - [ ] On the open page, clicking `2 + 3 =` shows `5`; clicking `5 + 3 =` shows `8`, and `=` again shows `11`.
13: - [ ] Clicking `1 . 5 + 2 . 5 =` shows `4` — the decimal and digit buttons all work.
14: - [ ] Clicking `1 ÷ 0 =` shows `Error`; clicking any other key leaves `Error` showing.
15: - [ ] Clicking `C` after the error shows `0`, and the calculator works again.
16: - [ ] Every button press updates the display immediately, so typing shows the current number.
17: - [ ] Pressing Enter or Space on a focused key gives the same display change as clicking it.
18: - [ ] The page has one arithmetic implementation: `src/ui.js` maps labels (`×`→`*`, `÷`→`/`, `−`→`-`), calls `press`, and writes `display` into `#display` — no arithmetic, digit limits, rounding or error rules in the UI code.
19: - [ ] Opening `index.html` loads `src/calc.js` before `src/ui.js`, logs no console errors, and the controls are live on first load.
20: - [ ] At 375/768/1440, updating the display does not wrap it or add a scrollbar.
21: 
22: ## How to check
23: - Run `start index.html` and click the sequences above; the display must match the engine tests' behavior.
24: - Press Tab to a key and use Enter/Space: the same change appears as a click.
25: - Automated: browser-driven checks click real buttons and read `#display`; run `node --test` (all tests) or `node --test test/ui-wiring.test.js` (this card's 10 wiring checks: clicks, Enter/Space, engine delegation, console errors, script order, 375/768/1440 no-wrap/no-scrollbar).
26: - Screenshots of the result and Error states: `$env:UI_SHOTS = ".groundwork/evidence/2.2"; node --test test/ui-wiring.test.js` (PowerShell, from the repo root).
27: - Screenshots of a result and the `Error` state are saved in `.groundwork/evidence/2.2/`.
28: 
29: ## Evidence
30: - `.groundwork/evidence/2.2/tests-failing.txt` — before implementation: `node --test test/ui-wiring.test.js`, 10 tests, pass 0, fail 10, exit 1 (no `<script>` tags; the display never leaves `0`); full suite 58 tests, 48 pass, 10 fail. Self-validated 10/10 against a throwaway correct wiring in `%TEMP%` (deleted; not in the repo).
31: 
32: ## History
33: 2026-09-26 planned
34: 2026-09-26 gw-ui-spec: behavior agreed with human (thin UI over the engine; label mapping in `src/ui.js`, per-button listeners)
35: 2026-09-26 started (status → testing)
36: 2026-09-26 tester: 10 wiring checks written (`test/ui-wiring.test.js`; headless Edge over the DevTools protocol, no dependencies; clicks via CDP mouse events, real Enter/Space key events, an engine spy that intercepts `createCalculator` to prove label mapping/press/render, and an engine-equivalence matrix reusing `src/calc.js` in Node); all 10 fail on the unwired page (display stays `0`), full suite 58: 48 pass / 10 fail; self-validated 10/10 against a throwaway correct wiring in `%TEMP%` (deleted) and verified the UI_SHOTS result/error captures; status implementing
```

</details>

## Assistant


<details>
<summary>Reasoning</summary>

```
The card now has a small redundancy: line 26 (my new screenshot command) and line 27 (original "Screenshots of a result and the Error state are saved in..." — which reads as an outcome statement). Originally line 27 was part of the how-to-check list and implied the implementer saves them. Now line 26 gives the command; line 27 is slightly redundant but still expresses the expected artifact. I could merge, but leaving both is okay. Actually, to keep clean: line 27 says "Screenshots ... are saved in .groundwork/evidence/2.2/" — as an expectation. Keep it; it's the criterion-ish check. Fine.

Also criterion 18 mentions `src/ui.js` maps labels; my tests cover behaviorally + spy. The card's criteria checkboxes remain unchecked, correct.

Now: should I update HANDOFF? Role says: "`.groundwork/HANDOFF.md`, when you play every role yourself. As a subagent, put what HANDOFF needs in your report instead; the runner writes it." So no HANDOFF edit.

One more check: the `Is directory a git repo: no` environment note. So no commit concerns.

Let me double-check the final test file for issues:
- Unused variable `sleep`? Used in launchBrowser cleanup. Yes.
- `waitForEvent` etc. all used.
- `KEYSTROKES` only Enter/Space used; Tab not present. `pressKey` handles `definition.text === null` check — text is never null in our map, but harmless. Fine.
- `ENGINE_SPY` is used.
- `consoleProblems` reset in test 9.

One thing I noticed in the focused run: test 8 "the UI shows the engine's results..." took only 267ms for the failing run (fails on first case), and 5750ms when passing. Fine.

Also, check the card's criterion 3 wording "clicking any other key leaves Error showing" — I test 7 keys excluding C; good.

Potential concern: criterion 6 says "Pressing Enter or Space on a focused key gives the same display change as clicking it." My test focuses programmatically rather than via Tab. The existing 2.1 test proves Tab reaches every key; the wiring criterion is about activation. I'll mention this in the report: focus is set programmatically (document.activeElement), since 2.1's suite already covers Tab traversal; this keeps the check deterministic. Should I strengthen by using Tab navigation in the new test instead? Hmm. The criterion says "on a focused key" — a user gets there via Tab or click. Using `.focus()` is a legitimate focused state. But a skeptical reviewer might say it should test Tab+Enter. The cost: tabbing to '=' is up to 17 presses; doable (existing test does it in a loop). But deterministic focus is also good. I think programmatic focus is acceptable and I'll note it. Actually, let me reconsider — is there a risk that keyboard activation works only with programmatic focus but not with Tab focus? No; focus is focus. Conversely, Tab order is already tested. I'll keep it and note.

Another consideration: the evidence mentions `%TEMP%`; the actual temp path was `C:\Users\rames\AppData\Local\Temp\opencode\...`. `%TEMP%` is close enough (opencode subfolder). Fine.

Now the final summary run for the evidence: I already have focused failing output (10 fail) and full-suite counts. The evidence file records duration_ms 6518.3771 from the first run. Good.

Should I include the exact summary line of the full suite in the report: "tests 58, pass 48, fail 10".

Also, the report should include files created/changed, exact command, summary line, and anything the implementer must know. The implementer must know:
1. Add `src/ui.js` + two script tags; tests will go 58/58.
2. The checks expect the engine's exact display strings; no UI math.
3. The spy test requires calc.js to publish the global `createCalculator` before ui.js runs, and `press` must be called with mapped keys; display text must equal `calculator.display` after every press.
4. Digital note: the page must have no console errors at load (Log domain catches missing files).
5. Script order: DOM order calc.js then ui.js asserted.
6. The `−` label is U+2212; mapping needed.
7. Screenshot command.
8. Known limitation: "no arithmetic in ui.js" is a source-shape rule; my behavioral proxy is engine equivalence + spy + reviewer read. I should flag this honestly.
9. The engine-equivalence matrix runs each case on a freshly loaded page; it requires the display to show exact strings like `1.000000000e18`, `-3.333333333e-10`, `0.3333333333`, `-5`, `1234567890`, `0.5`.
10. The test file uses `node --test` default; no deps.

Also mention the extra idea for HANDOFF: consider extracting the shared headless-Edge CDP harness from `test/ui-page.test.js` and `test/ui-wiring.test.js` into one helper in a later cleanup card (duplication is ~250 lines). Role says note extra ideas in HANDOFF; as a subagent, put in report for the runner. Good.

Also mention the self-validation temp copy was deleted; the repo has no `src/ui.js` (implementer creates it), and no changes to `index.html` by me (verify: I didn't edit index.html). Confirm: files changed by me in repo: `test/ui-wiring.test.js` (new), `.groundwork/evidence/2.2/tests-failing.txt` (new), `.groundwork/cards/2.2-wire-it-up.md` (status, how-to-check, evidence, history). No app files touched.

Let me also double check there's no leftover temp folder: verified Test-Path False.

One last sanity: run the focused suite once more? Already did; after that I didn't modify the test file. Card/evidence edits don't affect tests. No need.

Wait — one more consideration about `node --test` in the repo picking up the new evidence file? No, evidence is not a test file.

Also should I verify the focused failing run output is what I recorded in evidence (line numbers)? Evidence quotes `expectDisplay (test\ui-wiring.test.js:346:10)` — from actual output. Yes.

Now compose the final report. Keep it organized and concise but complete.

Report format requested: "report back with: files created/changed, the exact command, its summary line, and anything the implementer must know."

I'll structure:

**Files**
- Created `test/ui-wiring.test.js` — 10 browser checks...
- Created `.groundwork/evidence/2.2/tests-failing.txt`
- Updated `.groundwork/cards/2.2-wire-it-up.md` — status implementing, how-to-check commands, evidence link, history.
- Repo app untouched: no `src/ui.js`, `index.html` unchanged.

**Command / result**
- `node --test test/ui-wiring.test.js` → ℹ tests 10 / pass 0 / fail 10, exit 1.
- `node --test` → tests 58, pass 48, fail 10 (all 10 new; 48 existing pass).
- Self-validation: 10/10 pass in temp copy with correct wiring (deleted).

**Test-to-criterion map** (brief)
1. ... map each criterion to test names.

**Implementer must know**
- exact expectations, spy, console, script order, screenshot command, focus note, limitation note.

**HANDOFF note** (for runner)
- Next step: implement per agreed plan; run `node --test test/ui-wiring.test.js`; screenshots command.
- Extra idea: shared CDP harness extraction later.

Let me write it.
```

</details>

The card is coherent. Here is the report.

## Tester report — card 2.2 `Wire it up`

### Files created/changed
| File | Change |
|---|---|
| `test/ui-wiring.test.js` | **new** — 10 headless-Edge checks (DevTools protocol, Node built-ins only, `file://` page; real CDP mouse clicks, real Enter/Space key events, an engine spy, and an engine-equivalence matrix) |
| `.groundwork/evidence/2.2/tests-failing.txt` | **new** — command, summary, all 10 failing names, first failure detail, full-suite line, self-validation note |
| `.groundwork/cards/2.2-wire-it-up.md` | status → `implementing`; How to check gains the focused command and screenshot command; Evidence bullet; History line |
| Repo app | **untouched** — no `src/ui.js` created, `index.html` unchanged |

### Exact command and summary
```
node --test test/ui-wiring.test.js
```
```
ℹ tests 10 · ℹ pass 0 · ℹ fail 10 · exit 1
```
All 10 fail for the right reason: `index.html` has no `<script>` tags, so every click leaves `#display` at `"0"` (first failure: `after clicking 2 + 3 =: expected "5", found "0"`).

Full suite at the same point: `node --test` → **tests 58, pass 48, fail 10** (only the 10 new ones; all 48 existing tests still pass).

Self-validation (throwaway `%TEMP%` copy with a correct wiring + temporary `src/ui.js`, **deleted**, not in repo): **10/10 pass, exit 0**, console clean; `UI_SHOTS` wrote `result.png` and `error.png` (looked at both: `11` and `Error` states render correctly).

### Criterion coverage
1. `2+3=` → 5, `5+3=` → 8, `=` → 11 — test 1
2. `1.5+2.5=` → 4, step-by-step — test 2
3. `1÷0=` → Error; every key except C leaves Error — test 3
4. C after error → 0, then `2+3=` → 5 — test 4
5. per-press updates, incl. chained `2+3+` → 5 — test 5
6. Enter/Space vs click, compared field-by-field — test 6
7. label map/press/render via an init-script spy on `createCalculator` (proves `×→*`, `÷→/`, `−→-`, `press` calls, and page display === engine display per press) — test 7; engine-equivalence matrix over 16 cases (digit cap, leading zeros, `. 5`, rounding, scientific, operator-replacement, `=` no-op, `/0`) — test 8
8. script order (calc.js before ui.js), no console errors (Runtime + Log domains), live on first load — test 9
9. 375/768/1440: single text line, no box/text growth, no new horizontal/vertical overflow for the 16-char `-3.333333333e-10` (driven via `0 − 1 = ÷ 3000000000 =`) — test 10

### What the implementer must know
- **Exact expected strings**, not just "a number": `0.3`, `0.3333333333`, `-5`, `1234567890`, `0.5`, `1.000000000e18`, `3.333333333e-10`, `Error`.
- The spy test requires `src/calc.js` to publish the global `createCalculator` **before** `src/ui.js` runs, and after every press the page's `#display` must equal `calculator.display` exactly. `C` must reach the engine too.
- The no-console-errors check listens on `Log.entryAdded`, so a missing/404 `src/ui.js` fails it.
- Screenshots: `$env:UI_SHOTS = ".groundwork/evidence/2.2"; node --test test/ui-wiring.test.js` (captures `result.png` after `2+3=`→`5+3=`→`=`→`11`, `error.png` after `1÷0=`).
- Enter/Space checks focus the key programmatically; Tab traversal is already locked by `test/ui-page.test.js`.
- **Honest limitation:** "no arithmetic/digit-limit/rounding/error rules *in the source*" can't be fully asserted behaviorally — the check covers it via the spy (all presses go through the engine) plus exact engine equivalence on those edge rules. A reviewer read of `src/ui.js` should confirm it literally contains no arithmetic.

### HANDOFF note (for the runner)
- Next step: implement per the agreed plan (`src/ui.js` + script tags `src/calc.js` then `src/ui.js`); verify with `node --test test/ui-wiring.test.js` then `node --test` (expect 58/58) and the screenshot command.
- Extra idea (not this card): the CDP harness is now duplicated between `test/ui-page.test.js` and `test/ui-wiring.test.js` (~250 lines); a later cleanup card could extract `test/helpers/cdp-browser.js`.
