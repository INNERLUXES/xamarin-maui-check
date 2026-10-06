import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CSV_COLUMNS, NOTICE, USAGE, VERSION, csvField, escapeData, escapeProperty, parseArgs } from '../src/index.js';
import { C, P, PROJECT, X, cli, columnOf, cs, lineOf, oldProject, projectWith, run, sdkProject, withFiles, xaml } from './helpers.js';

const WARN = projectWith({ [P]: sdkProject([['Xamarin.Forms', '5.0.0.2622']]) });
const ERROR_TEXT = sdkProject([['Acme.Forms.Charts', '1.0.0']]);
const ERROR_CONFIG = '{"packageMap": [{"match": "Acme.Forms.Charts", "use": null}]}';
const ERROR = { ...projectWith({ [P]: ERROR_TEXT }), 'c.json': ERROR_CONFIG };
const INFO = projectWith({ [C]: cs(['MessagingCenter.Send(this, "a");']) });

test('cli: exit 0 below the fail-on level, 1 at or above it, from the flag or the configuration', async () => {
  const clean = await run(PROJECT);
  assert.equal(clean.code, 0, clean.err);
  assert.match(clean.out, /^xamarin-maui-check: p\ninput: 1 solution; 1 project file; 0 packages\.config; 1 C# file; 1 XAML file; 0 platform manifests; 0 other files passed over; 0 folders named bin, obj, packages, \.git or \.vs passed over; 0 paths excluded; 0 links not followed\nconfig: built-in defaults: package table 7 entries; keep Xamarin\.AndroidX\.\* and Xamarin\.Google\.\*; layouts RelativeLayout; exclude none; minimum severity info; fail on error\n/);
  assert.match(clean.out, /\nfindings: 0\n/);
  assert.match(clean.out, /RESULT: PASS - no finding at or above error\n$/);
  assert.equal(clean.err, '');
  assert.equal((await run(WARN)).code, 0, 'a warning does not fail the run by default');
  assert.equal((await run(WARN, ['p', '--fail-on', 'warning'])).code, 1);
  assert.equal((await run(INFO, ['p', '--fail-on', 'warning'])).code, 0);
  assert.equal((await run(INFO, ['p', '--fail-on', 'info'])).code, 1);
  const configured = await run({ ...WARN, 'c.json': '{"failOn": "warning"}' }, ['p', '--config', 'c.json']);
  assert.equal(configured.code, 1);
  assert.match(configured.out, /RESULT: FAIL - 1 finding at or above warning \(1 warning\)\n$/);
  assert.equal((await run({ ...WARN, 'c.json': '{"failOn": "warning"}' }, ['p', '--config', 'c.json', '--fail-on', 'error'])).code, 0, 'the flag wins over the configuration');
  const error = await run(ERROR, ['p', '--config', 'c.json']);
  assert.equal(error.code, 1);
  assert.match(error.out, /RESULT: FAIL - 1 finding at or above error \(1 error\)\n$/);
});

test('cli: a file that cannot be read is an unreadable-file error at its place, and the run goes on', async () => {
  const badProject = '<Project>\n  <PropertyGroup>\n</Project>\n';
  const r = await run(projectWith({ [P]: badProject, [X]: '<!DOCTYPE x>\n<x/>', 'p/App/packages.config': '<packages>\n  <package version="1" />\n</packages>', 'p/App/Bin.cs': Buffer.from([0x3c, 0, 0x3e]), 'p/Acme.sln': Buffer.from([0x61, 0xe9]) }), ['p', '--json']);
  assert.equal(r.code, 1);
  const out = JSON.parse(r.out);
  const f = out.findings.filter((x) => x.rule === 'unreadable-file');
  assert.deepEqual(f.map((x) => [x.file, x.line, x.column]), [['p/Acme.sln', 1, 1], ['p/App/App.csproj', lineOf(badProject, '</Project>'), 1], ['p/App/Bin.cs', 1, 1], ['p/App/MainPage.xaml', 1, 1], ['p/App/packages.config', 2, 3]]);
  assert.match(f[1].found, /the project file cannot be read as XML: the close tag <\/Project> does not match <PropertyGroup>; nothing in it is checked/);
  assert.match(f[2].found, /the C# file cannot be read: .*holds binary data/);
  assert.match(f[3].found, /a DOCTYPE declaration/);
  assert.match(f[4].found, /a <package> element with no id/);
  assert.deepEqual(out.projects, [], 'a project that cannot be read is not in the table');
  const big = await run(projectWith({ [C]: `// ${'x'.repeat(200)}\n` }), ['p', '--json'], { maxFileBytes: 100 });
  assert.match(JSON.parse(big.out).findings.find((x) => x.file === C).found, /the C# file cannot be read: .*bytes is over the 100 byte limit/);
});

test('cli: files saved as UTF-16 with their byte order mark, or with CRLF line ends, give the same findings', async () => {
  const project = oldProject({ TargetFrameworkVersion: 'v13.0', AndroidApplication: 'True' }, [['Xamarin.Forms', '5.0.0.2622']]);
  const code = cs(['Device.BeginInvokeOnMainThread(() => { });', 'var a = "MessagingCenter.Send";'], ['Xamarin.Forms']);
  const page = xaml('    <RelativeLayout />');
  const base = JSON.parse((await run(projectWith({ [P]: project, [C]: code, [X]: page }), ['p', '--json'])).out);
  assert.ok(base.findings.length >= 6);
  for (const change of [(t) => Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(t, 'utf16le')]), (t) => Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(t)]), (t) => t.split('\n').join('\r\n')]) {
    const r = JSON.parse((await run(projectWith({ [P]: change(project), [C]: change(code), [X]: change(page) }), ['p', '--json'])).out);
    assert.deepEqual(r.findings, base.findings);
  }
});

test('cli: --min-severity hides the findings below it and says so', async () => {
  const r = await run(INFO, ['p', '--min-severity', 'warning']);
  assert.equal(r.code, 0);
  assert.match(r.out, /findings: 0; 1 below warning not shown/);
  assert.match(r.out, /note: 1 finding below warning is not shown/);
});

test('cli: the folder and --exclude must be usable, or the run stops with no result', async () => {
  const file = await run(PROJECT, [P]);
  assert.equal(file.code, 2);
  assert.match(file.err, /p\/App\/App\.csproj: is a file; give the folder of the solution/);
  assert.match((await run(PROJECT, ['nowhere'])).err, /nowhere: no such file or folder/);
  assert.match((await run(PROJECT, ['p', '--exclude', '../x'])).err, /--exclude "\.\.\/x" leaves the folder with \.\./);
  const excluded = JSON.parse((await run(INFO, ['p', '--exclude', 'App/*.cs', '--json'])).out);
  assert.deepEqual(excluded.findings, []);
  assert.equal(excluded.input.excluded, 1);
});

test('cli: usage errors give exit code 2 and the usage', async () => {
  for (const argv of [[], ['--format', 'xml', 'p'], ['--min-severity', 'fatal', 'p'], ['--fail-on'], ['p', '--bogus'], ['p', '--config', 'a', '--config', 'b'], ['p', '--explain', '--format', 'csv'], ['p', '--json', '--format', 'csv'], ['-'], ['p', '--config', '-'], ['https://example.test/solution'], ['p', '--config', 'https://a.test/c.json'], ['p', 'q'], ['p', '--exclude', '--json']]) {
    const r = await cli(argv, process.cwd());
    assert.equal(r.code, 2, argv.join(' '));
    assert.equal(r.out, '');
    assert.match(r.err, /^xamarin-maui-check: .+\n\nUsage: xamarin-maui-check/, argv.join(' '));
  }
  assert.match((await cli(['https://example.test/solution'], process.cwd())).err, /never fetches a URL/);
  assert.match((await cli(['p', 'q'], process.cwd())).err, /give one solution folder/);
  assert.throws(() => parseArgs(['p', ...Array.from({ length: 101 }, () => ['--exclude', 'x']).flat()]), /more than 100 exclude patterns/);
  assert.deepEqual(parseArgs(['p', '--exclude', 'a', '--exclude', 'b']).exclude, ['a', 'b']);
});

test('cli: --help, --version and --print-defaults', async () => {
  const help = await cli(['--help'], process.cwd());
  assert.equal(help.code, 0);
  assert.equal(help.out, USAGE);
  for (const s of ['--exclude', '--config', '--format', '--json', '--min-severity', '--fail-on', '--explain', '--print-defaults', 'Exit codes: 0', 'custom-renderer (rules.customRenderer)', 'unreadable-file (always error)', 'builds nothing']) assert.ok(USAGE.includes(s), s);
  assert.equal((await cli(['-v'], process.cwd())).out, `${VERSION}\n`);
  const d = await cli(['--print-defaults'], process.cwd());
  assert.equal(JSON.parse(d.out).name, 'built-in defaults');
  assert.deepEqual(JSON.parse(d.out).layouts.map((l) => l.name), ['RelativeLayout']);
});

test('report: the JSON report holds the input, the configuration, the tables, the summary, the effort, the findings and the result', async () => {
  const out = JSON.parse((await run(ERROR, ['p', '--config', 'c.json', '--json'])).out);
  assert.deepEqual(Object.keys(out), ['tool', 'version', 'input', 'config', 'projects', 'packages', 'summary', 'effort', 'rules', 'findings', 'totals', 'result', 'notes', 'notice']);
  assert.equal(out.tool, 'xamarin-maui-check');
  assert.equal(out.notice, NOTICE);
  const f = out.findings[0];
  assert.deepEqual(Object.keys(f), ['rule', 'level', 'file', 'line', 'column', 'at', 'found', 'fix']);
  assert.equal(f.at, `${P}:${f.line}`);
  assert.equal(out.rules.length, 17);
  assert.deepEqual(Object.keys(out.projects[0]), ['project', 'style', 'kind', 'targets', 'packages', 'byLevel']);
  assert.deepEqual(Object.keys(out.packages[0]), ['package', 'versions', 'projects', 'references', 'status', 'use']);
  assert.deepEqual(Object.keys(out.effort), ['areas', 'total']);
  assert.equal(out.effort.total, 8);
  const explained = JSON.parse((await run(ERROR, ['p', '--config', 'c.json', '--json', '--explain'])).out);
  assert.ok(explained.findings[0].basis.length > 0);
  assert.ok(explained.findings[0].own.length > 0);
});

test('report: --explain adds the rule, the points of the public pages and the own choice to the text', async () => {
  const r = await run(projectWith({ 'p/App/R.cs': 'class R : EntryRenderer { }\n' }), ['p', '--explain']);
  assert.match(r.out, /\n {11}rule: a class that derives from a \*Renderer type, or an ExportRenderer attribute\n {11}basis: \.NET MAUI replaces custom renderers with handlers.+\(Migrate a custom renderer to a \.NET MAUI handler \(Microsoft Learn\), https:\/\/learn\.microsoft\.com\/en-us\/dotnet\/maui\/migration\/renderer-to-handler\)\n/);
  assert.match(r.out, /\n {11}the tool's own choice: /);
});

test('report: CSV with one record per finding, CRLF line ends, quotes and a neutralized formula', async () => {
  const r = await run(ERROR, ['p', '--config', 'c.json', '--format', 'csv']);
  assert.equal(r.code, 1);
  const lines = r.out.split('\r\n');
  assert.equal(lines[0], CSV_COLUMNS.join(','));
  assert.equal(lines.at(-1), '');
  assert.equal(lines.length, 3);
  assert.match(lines[1], new RegExp(`^error,no-maui-equivalent,p/App/App\\.csproj,${lineOf(ERROR_TEXT, 'Include=')},${columnOf(ERROR_TEXT, 'Include=')},the package Acme\\.Forms\\.Charts 1\\.0\\.0 has no known \\.NET MAUI equivalent,"find a library`));
  assert.equal(csvField('=SUM(A1)'), "'=SUM(A1)");
  assert.equal(csvField('-1'), "'-1");
  assert.equal(csvField('@x'), "'@x");
  assert.equal(csvField('a,b'), '"a,b"');
  assert.equal(csvField('a"b'), '"a""b"');
  assert.equal(csvField(null), '');
});

test('report: GitHub commands with file, line, column and title, escaped, and a summary line', async () => {
  const r = await run(ERROR, ['p', '--config', 'c.json', '--format', 'github']);
  const lines = r.out.trimEnd().split('\n');
  assert.match(lines[0], new RegExp(`^::error file=p/App/App\\.csproj,line=${lineOf(ERROR_TEXT, 'Include=')},col=${columnOf(ERROR_TEXT, 'Include=')},title=xamarin-maui-check no-maui-equivalent::the package Acme\\.Forms\\.Charts`));
  assert.equal(lines.at(-1), 'xamarin-maui-check: 1 project, 1 package, 1 finding, effort score 8; RESULT: FAIL - 1 finding at or above error (1 error)');
  assert.equal(escapeData('50%\r\nx'), '50%25%0D%0Ax');
  assert.equal(escapeProperty('a:b,c'), 'a%3Ab%2Cc');
  const info = await run(INFO, ['p', '--format', 'github']);
  assert.match(info.out, /^::notice file=p\/App\/Worker\.cs,line=\d+,col=\d+,title=xamarin-maui-check messaging-center::/);
});

test('report: the text names each project and package with its counts, a summary, the effort, and ends with the notice and the result', async () => {
  const r = await run(WARN);
  assert.ok(r.out.includes('\n  p/App/App.csproj  SDK-style  Xamarin.Forms library  netstandard2.0  1         0      1        0\n'), r.out);
  assert.ok(r.out.includes('\n  Xamarin.Forms  5.0.0.2622  1         replace  Microsoft.Maui.Controls, which an SDK-style project with UseMaui brings in\n'), r.out);
  assert.ok(r.out.includes('\n  projects: 1 (0 old-style, 1 SDK-style), 0 platform heads, in 1 solution listing 1 project\n'));
  assert.ok(r.out.includes('\n  packages: 1 in 1 reference: 1 to replace, 0 with no .NET MAUI equivalent, 0 to check, 0 kept\n'));
  assert.ok(r.out.includes('\n  total       1         1\n'), r.out);
  assert.ok(r.out.includes(`\n${NOTICE}\n\nRESULT: PASS - no finding at or above error (1 warning)\n`));
  const empty = await withFiles({ 'e/readme.txt': 'x' }, (dir) => cli(['e'], dir));
  assert.equal(empty.code, 0);
  assert.match(empty.out, /0 solutions; 0 project files; 0 packages\.config; 0 C# files; 0 XAML files; 0 platform manifests; 1 other file passed over/);
  assert.match(empty.out, /\nProjects \(0\)\n\n {2}none\n/);
  assert.match(empty.out, /\nPackages \(0\)\n\n {2}none\n/);
  assert.match(empty.out, /note: the folder holds no project, C# or XAML file/);
});

test('cli: a run writes nothing to the folders it reads', async () => {
  await withFiles(WARN, async (dir) => {
    const before = (await readdir(dir, { recursive: true })).sort();
    const r = await cli(['p', '--format', 'csv', '--fail-on', 'warning'], dir);
    assert.equal(r.code, 1);
    assert.deepEqual((await readdir(dir, { recursive: true })).sort(), before);
    assert.ok(resolve(dir).length > 0);
  });
});
