import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLEAN, EXPECTED, MESSY, UNWANTED, run } from '../tools/example.mjs';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const saved = (name) => readFile(resolve(root, 'examples/output', name), 'utf8');
const M = 'examples/messy';
const SHARED = `${M}/TidewaterDriver/TidewaterDriver.csproj`;
const DROID = `${M}/TidewaterDriver.Android/TidewaterDriver.Android.csproj`;
const PAGE = `${M}/TidewaterDriver/Views/DeliveryPage.xaml`;
const VM = `${M}/TidewaterDriver/ViewModels/DeliveryViewModel.cs`;
const RENDERER = `${M}/TidewaterDriver.Android/Renderers/RoundedEntryRenderer.cs`;

test('examples: the messy solution fails with the report that is saved in examples/output', async () => {
  const r = await run(MESSY);
  assert.equal(r.code, 1);
  assert.equal(r.err, '');
  assert.equal(r.out, await saved('messy.txt'));
  for (const e of EXPECTED) assert.ok(r.out.includes(e), e);
  for (const u of UNWANTED) assert.ok(!r.out.includes(u), u);
});

test('examples: the clean solution passes at the default level with the report that is saved', async () => {
  const r = await run(CLEAN);
  assert.equal(r.code, 0);
  assert.equal(r.out, await saved('clean.txt'));
  assert.match(r.out, /\nfindings: 12 \(4 warning, 8 info\)\n/);
  assert.equal((await run([...CLEAN, '--config', 'examples/config.json'])).code, 0, 'the clean solution also passes with the configuration of the messy one');
});

test('examples: --explain, JSON, CSV, the GitHub commands and the defaults are the reports that are saved', async () => {
  const outputs = { 'messy-explain.txt': [...MESSY, '--explain'], 'messy.json': [...MESSY, '--json', '--explain'], 'messy-findings.csv': [...MESSY, '--format', 'csv'], 'messy-github.txt': [...MESSY, '--format', 'github'], 'defaults.json': ['--print-defaults'] };
  for (const [name, args] of Object.entries(outputs)) assert.equal((await run(args)).out, await saved(name), name);
});

test('examples: the rules that fire on the messy solution, each on the line built for it', async () => {
  const report = JSON.parse((await run([...MESSY, '--json'])).out);
  const lines = {};
  for (const f of [SHARED, DROID, PAGE, VM, RENDERER]) lines[f] = (await readFile(resolve(root, f), 'utf8')).split('\n');
  const at = (file, needle) => `${file}:${lines[file].findIndex((l) => l.includes(needle)) + 1}`;
  const of = (rule) => report.findings.filter((f) => f.rule === rule).map((f) => f.at);
  assert.deepEqual(of('no-maui-equivalent'), [at(SHARED, 'Fernway.Forms.Charts')]);
  assert.deepEqual(of('unknown-xamarin-package'), [at(SHARED, 'Xamarin.Plugins.RouteSketch')]);
  assert.ok(of('replace-package').includes(at(SHARED, '"Xamarin.CommunityToolkit"')));
  assert.ok(of('custom-renderer').includes(at(RENDERER, ': EntryRenderer')));
  assert.deepEqual(of('removed-layout'), [at(PAGE, '<RelativeLayout>')]);
  assert.ok(of('legacy-target-framework').includes(at(DROID, '<TargetFrameworkVersion>')));
  assert.deepEqual(of('device-api'), [at(VM, 'Device.BeginInvokeOnMainThread'), at(VM, 'Device.RuntimePlatform')]);
  assert.deepEqual(report.findings.map((f) => f.rule).filter((r, i, a) => a.indexOf(r) === i).sort(), ['custom-renderer', 'dependency-service', 'device-api', 'effect', 'forms-namespace', 'graphics-type', 'legacy-target-framework', 'messaging-center', 'no-maui-equivalent', 'non-sdk-project', 'platform-head', 'platform-manifest', 'removed-layout', 'replace-package', 'unknown-xamarin-package']);
  assert.deepEqual(report.projects.map((p) => [p.project.split('/').at(-1), p.style, p.kind]), [['TidewaterDriver.Android.csproj', 'old-style', 'Android head'], ['TidewaterDriver.iOS.csproj', 'old-style', 'iOS head'], ['TidewaterDriver.csproj', 'SDK-style', 'Xamarin.Forms library']]);
  assert.equal(report.effort.total, 71);
});

test('examples: without the configuration, the samples are read too; bin, obj and packages never are', async () => {
  const report = JSON.parse((await run(['examples/messy', '--json'])).out);
  assert.ok(report.findings.some((f) => f.file === 'examples/messy/Samples/Playground/PlaygroundPage.cs' && f.rule === 'removed-layout'));
  assert.ok(report.findings.some((f) => f.rule === 'unknown-xamarin-package' && f.found.includes('Fernway.Forms.Charts')));
  assert.ok(!report.findings.some((f) => /\/(?:obj|bin|packages)\//.test(f.file)));
  assert.equal(report.input.foldersPassedOver, 2);
});

test('examples: the same files written with CRLF line ends and as UTF-16 give the same output', async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 'xamarin-maui-check-crlf-'));
  try {
    await cp(resolve(root, 'examples'), resolve(dir, 'examples'), { recursive: true });
    for (const f of [SHARED, DROID, PAGE, VM]) {
      const text = (await readFile(resolve(root, f), 'utf8')).split('\r\n').join('\n');
      await writeFile(resolve(dir, f), text.split('\n').join('\r\n'));
    }
    const renderer = (await readFile(resolve(root, RENDERER), 'utf8')).split('\n').join('\r\n');
    await writeFile(resolve(dir, RENDERER), Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(renderer, 'utf16le')]));
    assert.equal((await run([...MESSY, '--explain'], dir)).out, await saved('messy-explain.txt'));
    assert.equal((await run(CLEAN, dir)).out, await saved('clean.txt'));
    assert.ok((await readdir(resolve(dir, 'examples/messy'))).includes('Samples'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
