import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdir, symlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LIMITS, MAX_PROBLEMS, blank, globMatch, parseXml, readSolution, scanCode, scanXaml } from '../src/index.js';
import { C, FORMS_NS, P, PROJECT, X, cli, cs, projectWith, run, sdkProject, withFiles, xaml } from './helpers.js';

// Hostile input: projects, C# and XAML built to exhaust the memory, the stack or the time, to make the tool follow a
// link out of the folder or expand an entity, to rewrite the terminal, to start a second workflow command, to slip a
// formula into a spreadsheet or to change how objects behave. Each heavy test also checks the time, because work that
// grows faster than the input is a failure even when the answer is right. Tests that need a symbolic link, a device or
// file permissions are guarded with process.platform, and none of them asserts a line: lines are asserted in the tests
// that run everywhere.

const LIMIT = { timeout: 180000 };
// Coverage counting slows every line of the tool several times over, so a run with --experimental-test-coverage gets a
// wider time limit. A plain `npm test` keeps the tight one, and that is the run that guards against slow growth.
// The runner sets NODE_V8_COVERAGE for its test processes only when coverage is on.
const COVERAGE = Boolean(process.env.NODE_V8_COVERAGE);
const fast = async (fn, ms = 5000) => {
  const limit = COVERAGE ? ms * 4 : ms;
  const start = Date.now();
  const result = await fn();
  assert.ok(Date.now() - start < limit, `took ${Date.now() - start} ms`);
  return result;
};
const refused = (fn) => {
  try {
    fn();
  } catch {
    // refused input is fine; the time is what is checked
  }
};

test('hostile: thousands of package references, renderers and calls are read in one pass', LIMIT, async () => {
  const packages = Array.from({ length: 3000 }, (_, i) => [`Xamarin.P${i}`, `1.0.${i}`]);
  const code = cs(Array.from({ length: 3000 }, (_, i) => `MessagingCenter.Send(this, "m${i}"); var r${i} = new RelativeLayout();`), ['Xamarin.Forms']);
  const renderers = Array.from({ length: 1500 }, (_, i) => `class R${i} : EntryRenderer { }`).join('\n');
  const r = await fast(() => run(projectWith({ [P]: sdkProject(packages), [C]: code, 'p/App/R.cs': renderers }), ['p', '--json']), 30000);
  const out = JSON.parse(r.out);
  assert.equal(out.summary.packageReferences, 3000);
  assert.equal(out.summary.renderers, 1500);
  assert.equal(out.findings.filter((f) => f.rule === 'unknown-xamarin-package').length, LIMITS.maxFindingsPerRule);
  assert.ok(out.totals.notListed >= 3 * (3000 - LIMITS.maxFindingsPerRule));
  const capped = JSON.parse((await run(projectWith({ [C]: code }), ['p', '--json'], { maxCodeMatches: 100 })).out);
  assert.match(capped.findings.find((f) => f.rule === 'scan-limit').found, /the C# file holds more than 100 matches of the patterns/);
});

test('hostile: C# with long runs of quotes, comments, slashes, braces, names and attributes is read in one pass', LIMIT, async () => {
  for (const text of ['"'.repeat(300000), '@"'.repeat(150000), '"""'.repeat(100000), '/*'.repeat(200000), '//'.repeat(200000), '*/'.repeat(200000), "'".repeat(300000), `"${'\\'.repeat(300000)}`, '$@"{'.repeat(80000), 'class '.repeat(60000), `class A : ${'B.'.repeat(100000)}`, `new ${'a.'.repeat(100000)}`, `[assembly: ${'a . '.repeat(60000)}`, `[assembly: ExportRenderer(${'('.repeat(100000)}`, `typeof(${'a.'.repeat(100000)}`, 'Color.'.repeat(100000), `class A<${'<'.repeat(100000)}`, 'Xamarin.Forms '.repeat(30000)]) {
    await fast(() => scanCode(text, { maxCodeMatches: Infinity }));
  }
  assert.equal(blank('"'.repeat(1001)).length, 1001);
});

test('hostile: XML with long runs of brackets, quotes, entities and attributes, deep nesting and many elements is read or refused in one pass', LIMIT, async () => {
  for (const text of ['<'.repeat(300000), `<a ${'b="1" '.repeat(5000)}/>`, `<a b="${'&amp;'.repeat(60000)}"/>`, `<a>${'&lt;'.repeat(60000)}</a>`, `<a>${'<!---->'.repeat(100000)}</a>`, `<a>${'<?p?>'.repeat(100000)}</a>`, `<r>${'<a/>'.repeat(150000)}</r>`, `${'<a>'.repeat(100000)}`, `<a>${']]'.repeat(100000)}</a>`, `<a ${'x'.repeat(300000)}`, `<a>${'<![CDATA[x]]>'.repeat(50000)}</a>`, `<a>${'&'.repeat(200000)}</a>`]) {
    await fast(() => refused(() => parseXml(text)));
  }
  assert.throws(() => parseXml(`<r>${'<a/>'.repeat(10)}</r>`, { maxXmlElements: 5 }), /more than 5 elements/);
  const deep = `${'<StackLayout>'.repeat(60)}${'</StackLayout>'.repeat(60)}`;
  await fast(() => scanXaml(xaml(deep), new Set(['RelativeLayout'])));
  await fast(() => readSolution('Project("{'.repeat(100000)));
});

test('hostile: no entity is ever expanded: the billion laughs and an external entity are refused at the DOCTYPE', async () => {
  const laughs = `<?xml version="1.0"?>\n<!DOCTYPE lolz [\n <!ENTITY lol "lol">\n <!ENTITY lol2 "&lol;&lol;&lol;&lol;">\n]>\n<Project>&lol2;</Project>\n`;
  const external = `<?xml version="1.0"?>\n<!DOCTYPE p [<!ENTITY x SYSTEM "file:///etc/hostname">]>\n<ContentPage xmlns="${FORMS_NS}">&x;</ContentPage>\n`;
  const r = await fast(() => run(projectWith({ [P]: laughs, [X]: external }), ['p', '--json']));
  const out = JSON.parse(r.out);
  assert.deepEqual(out.findings.map((f) => [f.rule, f.file]), [['unreadable-file', P], ['unreadable-file', X]]);
  assert.ok(out.findings.every((f) => /a DOCTYPE declaration/.test(f.found)));
  assert.ok(!r.out.includes('lollol'));
});

test('hostile: patterns are matched in time bounded by their length', LIMIT, async () => {
  const path = `${'a/'.repeat(500)}b`;
  await fast(() => {
    for (let i = 0; i < 200; i += 1) globMatch(`${'*'.repeat(100)}**${'?*'.repeat(50)}c`, path);
  });
  assert.equal(globMatch('**/b', path), true);
  assert.equal(globMatch('*/b', path), false);
});

test('hostile: thousands of folders and files are listed in seconds, and the limits of a folder hold', LIMIT, async () => {
  const files = { ...PROJECT };
  for (let i = 0; i < 300; i += 1) files[`p/M${i}/Page${i}.cs`] = cs([`Device.OpenUri(u${i});`]);
  const r = await fast(() => run(files, ['p', '--json']), 60000);
  assert.equal(JSON.parse(r.out).input.codeFiles, 301);
  const capped = JSON.parse((await run(files, ['p', '--json'], { maxInputFiles: 10 })).out);
  assert.match(capped.findings.find((f) => f.rule === 'scan-limit').found, /the folder holds more than 10 solution, project, package, C#, XAML and manifest files/);
  assert.equal(capped.result.pass, false);
  const entries = JSON.parse((await run(files, ['p', '--json'], { maxProjectEntries: 5 })).out);
  assert.match(entries.findings.find((f) => f.rule === 'scan-limit').found, /more than 5 files and folders/);
  const deep = { ...PROJECT, [`p/${'d/'.repeat(40)}A.cs`]: 'x' };
  const depth = JSON.parse((await run(deep, ['p', '--json'])).out);
  assert.match(depth.findings.find((f) => f.rule === 'scan-limit').found, /folders nested more than 32 deep/);
});

test('hostile: a file over its size limit is an unreadable-file error, and a configuration over its limit stops the run', LIMIT, async () => {
  const big = await run(projectWith({ [C]: `// ${'x'.repeat(LIMITS.maxFileBytes)}\n` }), ['p', '--json']);
  assert.match(JSON.parse(big.out).findings.find((f) => f.rule === 'unreadable-file').found, /bytes is over the 4 MB limit/);
  const config = await run({ ...PROJECT, 'c.json': ' '.repeat(LIMITS.maxConfigBytes + 1) }, ['p', '--config', 'c.json']);
  assert.equal(config.code, 2);
  assert.match(config.err, /c\.json: [\d,]+ bytes is over the 1 MB limit/);
  const many = await run({ ...PROJECT, 'c.json': JSON.stringify(Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`k${i}`, 1]))) }, ['p', '--config', 'c.json']);
  assert.match(many.err, /\n {2}and 10 more\n$/);
  assert.equal(many.err.split('\n').filter((l) => l.startsWith('  c.json')).length, MAX_PROBLEMS);
});

test('hostile: long ids, versions and paths are capped in the messages', LIMIT, async () => {
  const long = 'x'.repeat(3000);
  const r = await fast(() => run(projectWith({ [P]: sdkProject([[`Xamarin.${long}`, long]]) }), ['p', '--json']));
  const out = JSON.parse(r.out);
  assert.ok(out.findings.length >= 1);
  assert.ok(out.findings.every((f) => f.found.length <= 800));
  assert.ok(out.packages.every((p) => p.package.length <= 200 && p.versions.length <= 200));
});

test('hostile: control, escape, direction and line separator characters in values are removed from every format', async () => {
  const evil = 'Xamarin.Bad&#x1b;[31m&#x202e;&#x2028;Pkg';
  const files = projectWith({ [P]: sdkProject([[evil, '1.0.0']]) });
  for (const format of ['text', 'json', 'csv', 'github']) {
    const r = await run(files, ['p', '--format', format, '--fail-on', 'warning']);
    assert.equal(r.code, 1, format);
    for (const c of ['\u001b', '\u202e', '\u2028']) assert.ok(!r.out.includes(c) && !JSON.stringify(JSON.parse(format === 'json' ? r.out : '{}')).includes(c), `${format}: ${JSON.stringify(c)}`);
  }
});

test('hostile: a value cannot end a workflow command or start another one, and a formula is neutralized in CSV', async () => {
  const files = projectWith({ [P]: sdkProject([['Xamarin.A', '%0A::error file=x::y&#10;::warning::z']]) });
  const github = await run(files, ['p', '--format', 'github']);
  const lines = github.out.trimEnd().split('\n');
  assert.ok(lines.slice(0, -1).every((l) => /^::(?:error|warning|notice) file=/.test(l)), github.out);
  assert.ok(github.out.includes('%250A::error file=x::y ::warning::z'));
  const csv = await run(projectWith({ [P]: sdkProject([['Xamarin.B', '1.0.0']]) }), ['p', '--format', 'csv']);
  assert.ok(csv.out.split('\r\n').slice(1, -1).every((l) => !/,[=+@-]/.test(l.replace(/,"[^"]*"/g, ','))), csv.out);
});

test('hostile: __proto__, constructor and toString as package ids, names and keys change nothing', async () => {
  const project = sdkProject([['__proto__', '1.0.0'], ['constructor', '1.0.0'], ['Xamarin.toString', '1.0.0']]);
  const code = cs(['new __proto__();', 'new constructor();'], ['Xamarin.Forms']);
  const config = '{"layouts": [{"name": "__proto__", "use": "nothing"}], "packageMap": [{"match": "constructor", "use": "hasOwnProperty"}]}';
  const out = JSON.parse((await run({ ...projectWith({ [P]: project, [C]: code }), 'c.json': config }, ['p', '--json', '--config', 'c.json'])).out);
  assert.deepEqual(out.findings.map((f) => [f.rule, f.found.slice(0, 30)]).sort(), [['forms-namespace', 'the file names the Xamarin.For'], ['removed-layout', 'new __proto__: on .NET MAUI us'], ['replace-package', 'the package constructor 1.0.0 '], ['unknown-xamarin-package', 'the package Xamarin.toString 1']]);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.prototype.toString.call([]), '[object Array]');
});

test('hostile: CRLF, CR and a byte order mark give the same report as LF', async () => {
  const files = projectWith({ [C]: cs(['Device.StartTimer(t, f);', 'var a = "x";'], ['Xamarin.Forms']), [X]: xaml('    <RelativeLayout />') });
  const lf = JSON.parse((await run(files, ['p', '--json'])).out);
  for (const [name, change] of [['CRLF', (t) => t.split('\n').join('\r\n')], ['CR', (t) => t.split('\n').join('\r')], ['BOM', (t) => `\ufeff${t}`]]) {
    const other = JSON.parse((await run(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, change(v)])), ['p', '--json'])).out);
    assert.deepEqual(other.findings.map((f) => [f.rule, f.line, f.column]), lf.findings.map((f) => [f.rule, f.line, f.column]), name);
  }
});

test('hostile: a symbolic link in the folder is counted and not followed, and a link named is refused', async (t) => {
  if (process.platform === 'win32') {
    t.skip('symbolic links need extra rights on Windows');
    return;
  }
  await withFiles(PROJECT, async (dir) => {
    await mkdir(resolve(dir, 'outside'));
    await writeFile(resolve(dir, 'outside/R.cs'), 'class R : EntryRenderer { }\n');
    await symlink(resolve(dir, 'outside'), resolve(dir, 'p/loop'));
    await symlink(resolve(dir, 'outside/R.cs'), resolve(dir, 'p/R.cs'));
    await symlink(resolve(dir, 'p'), resolve(dir, 'p-link'));
    const out = JSON.parse((await cli(['p', '--json'], dir)).out);
    assert.equal(out.input.links, 2);
    assert.deepEqual(out.findings, []);
    assert.match(out.notes.join('\n'), /2 symbolic links are not followed/);
    const named = await cli(['p-link'], dir);
    assert.equal(named.code, 2);
    assert.match(named.err, /is a symbolic link, which is not followed/);
    await symlink(resolve(dir, 'outside/R.cs'), resolve(dir, 'c.json'));
    assert.equal((await cli(['p', '--config', 'c.json'], dir)).code, 2);
  });
});

test('hostile: a device named as a folder is refused, and a file with no read access is an unreadable-file error', async (t) => {
  if (process.platform === 'win32') {
    t.skip('devices and file modes work differently on Windows');
    return;
  }
  const device = await cli(['/dev/null'], process.cwd());
  assert.equal(device.code, 2);
  assert.match(device.err, /is not a regular file or folder/);
  if (typeof process.getuid === 'function' && process.getuid() === 0) {
    t.skip('the root user reads every file whatever its mode');
    return;
  }
  await withFiles(PROJECT, async (dir) => {
    await chmod(resolve(dir, C), 0o000);
    const r = await cli(['p', '--json'], dir);
    assert.match(JSON.parse(r.out).findings.find((f) => f.rule === 'unreadable-file').found, /cannot be read \(EACCES\)/);
    await chmod(resolve(dir, C), 0o644);
  });
});
