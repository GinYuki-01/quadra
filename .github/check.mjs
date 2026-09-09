// index.html と manifest.json の最低限の検査。依存パッケージなし。
import { readFileSync, existsSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let ng = 0;
const fail = m => { console.error('NG: ' + m); ng++; };
const ok = m => console.log('OK: ' + m);

// 1. index.html 内の全インラインスクリプトを取り出して構文検査
const html = readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
if (!scripts.length) fail('index.html にインラインスクリプトが無い');
const dir = mkdtempSync(join(tmpdir(), 'quadra-'));
scripts.forEach((src, i) => {
  const f = join(dir, `script${i}.js`);
  writeFileSync(f, src);
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); ok(`script ${i + 1}/${scripts.length} 構文`); }
  catch (e) { fail(`script ${i + 1} 構文エラー\n` + e.stderr.toString()); }
});

// 2. 必須の要素と ID が残っているか
['id="login"', 'id="app"', 'id="mx"', 'id="taskList"', 'id="dtree"', 'id="cfg"', 'rel="manifest"']
  .forEach(s => html.includes(s) ? ok(s) : fail(`index.html に ${s} が無い`));

// 3. manifest.json が正しい JSON で、参照するアイコンが存在するか
try {
  const m = JSON.parse(readFileSync('manifest.json', 'utf8'));
  ok('manifest.json は正しい JSON');
  (m.icons || []).forEach(i => existsSync(i.src) ? ok(`icon ${i.src}`) : fail(`manifest のアイコンが無い: ${i.src}`));
} catch (e) { fail('manifest.json を読めない: ' + e.message); }

if (ng) { console.error(`\n${ng} 件の問題`); process.exit(1); }
console.log('\n問題なし');
