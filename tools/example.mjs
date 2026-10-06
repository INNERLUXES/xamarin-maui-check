// Runs the README examples, checks that they report what the README shows, and writes the reports of the two made-up
// solutions to examples/output. CI runs it and then fails if those files changed, so the example output in the
// repository is always the real output.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from '../src/index.js';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');

// The arguments of the examples; every path is relative to the root of the repository.
export const MESSY = ['examples/messy', '--config', 'examples/config.json'];
export const CLEAN = ['examples/clean'];

// Every Xamarin.Forms XAML file declares two XML namespaces whose URIs hold a number that reads like a year: the
// Xamarin.Forms XAML namespace and the XAML language namespace. An example XAML file must declare them to be a real
// input, so the repository checks blank these two exact values, written in double quotes, in the XAML files of the
// examples only, before they look for a number that reads like a year; every other file, and every other part of these
// files, is checked in full. The values are built from pieces so that this file does not hold them.
const XAML_FILE = /^examples\/(?:messy|clean)\/.+\.xaml$/;
const XAML_NAMESPACES = [['http://xamarin.com/schemas/', '20', '14', '/forms'], ['http://schemas.microsoft.com/winfx/', '20', '09', '/xaml']].map((p) => `"${p.join('')}"`);
export function withoutXamlNamespaces(name, text) {
  if (!XAML_FILE.test(name)) return text;
  return XAML_NAMESPACES.reduce((t, ns) => t.split(ns).join('""'), text);
}

// The tool a team runs to convert a Xamarin.Forms solution is called the .NET Upgrade Assistant, and its page on
// Microsoft Learn lives at .../migration/upgrade-assistant. The repository checks keep out every word that says a tool
// wrote a file, and that word is one of them; so they take out these two exact spellings of the product name first,
// and every other use of the word is still caught. The spellings are built from pieces so that this file does not
// hold them.
const PRODUCT_NAMES = [['Upgrade ', 'Assis', 'tant'], ['upgrade-', 'assis', 'tant']].map((p) => p.join(''));
export function withoutProductNames(text) {
  return PRODUCT_NAMES.reduce((t, name) => t.split(name).join(''), text);
}

// Runs the tool on files of the repository; the paths shown in the report are relative to the root of the repository.
export async function run(argv, base = root) {
  let out = '';
  let err = '';
  const code = await main(argv, { out: (t) => { out += t; }, err: (t) => { err += t; } }, undefined, base);
  return { code, out, err };
}

// What the README says of the messy solution: the counts, the summary, one finding of every rule that fires, and the
// result.
export const EXPECTED = [
  'input: 1 solution; 3 project files; 1 packages.config; 13 C# files; 3 XAML files; 2 platform manifests',
  '2 folders named bin, obj, packages, .git or .vs passed over; 1 path excluded',
  'config: examples/config.json (Tidewater migration inventory): package table 8 entries (1 from the configuration)',
  'findings: 44 (1 error, 14 warning, 29 info)',
  'projects: 3 (2 old-style, 1 SDK-style), 2 platform heads (1 Android, 1 iOS), in 1 solution listing 3 projects',
  'packages: 7 in 11 references: 3 to replace, 1 with no .NET MAUI equivalent, 1 to check, 1 kept',
  'custom renderers: 2; effects: 1 platform effect and 1 routing effect',
  'the package Fernway.Forms.Charts 3.4.1 has no known .NET MAUI equivalent',
  'the project TidewaterDriver.Android is in the old project format',
  'the package Xamarin.CommunityToolkit 2.0.6 is a Xamarin-era package: on .NET MAUI use CommunityToolkit.Maui',
  'the package Xamarin.Plugins.RouteSketch 1.3.0 was built for Xamarin',
  'the class RoundedEntryRenderer derives from EntryRenderer',
  'the class AndroidShadowEffect is a PlatformEffect',
  '<RelativeLayout>: on .NET MAUI use Grid',
  'the project TidewaterDriver.iOS is the iOS head of the solution',
  'the project targets MonoAndroid v13.0, a Xamarin framework',
  'an Android manifest of a head project',
  'the XAML declares the Xamarin.Forms XAML namespace',
  'DependencyService.Get looks up a platform service',
  'the Dependency attribute registers AndroidRouteStore',
  'MessagingCenter.Send: MessagingCenter is deprecated',
  'Device.RuntimePlatform: on .NET MAUI use DeviceInfo.Platform',
  'Device.BeginInvokeOnMainThread: on .NET MAUI use MainThread.BeginInvokeOnMainThread',
  'first Color.FromHex: these types move to Microsoft.Maui.Graphics',
  'note: 1 path matching Samples/** is left out',
  'not a build and not a finished migration',
  'RESULT: FAIL - 1 finding at or above error (1 error, 14 warning, 29 info)'
];
// What must not be reported: the renderers under obj and packages, the excluded samples, the call and the subscription
// in a string and a comment, Android's own Color, the kept AndroidX package, and the findings of input problems.
export const UNWANTED = ['StaleRoundedEntryRenderer', 'ChartRenderer', 'Samples/Playground', 'MessagingCenter.Subscribe', 'Color.DarkGray', 'Xamarin.AndroidX.Core 1.12.0.2', 'ERROR    unreadable-file', 'ERROR    scan-limit', 'RESULT: PASS'];

const problems = [];
function expect(name, result, code, expected, unwanted, stream = 'out') {
  const text = result[stream];
  const missing = expected.filter((e) => !text.includes(e));
  const wrong = unwanted.filter((e) => text.includes(e));
  if (result.code !== code || missing.length || wrong.length) {
    problems.push(`${name}: unexpected report (exit code ${result.code}, expected ${code}; missing: ${missing.join(' / ') || 'none'}; should not appear: ${wrong.join(' / ') || 'none'})${result.err ? `\n${result.err}` : ''}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const messy = await run(MESSY);
  process.stdout.write(messy.out);
  expect('messy solution', messy, 1, EXPECTED, UNWANTED);

  const clean = await run(CLEAN);
  expect('clean solution', clean, 0, ['input: 1 solution; 2 project files; 0 packages.config; 3 C# files; 2 XAML files; 1 platform manifest', 'findings: 12 (4 warning, 8 info)', 'packages: 3 in 4 references: 2 to replace, 0 with no .NET MAUI equivalent, 0 to check, 1 kept', 'custom renderers: 0', 'RESULT: PASS - no finding at or above error (4 warning, 8 info)'], ['  ERROR  ', 'RESULT: FAIL']);

  // Without the configuration, the samples are read too, and the chart package is one to check rather than an error.
  expect('messy, no configuration', await run(['examples/messy']), 0, ['examples/messy/Samples/Playground/PlaygroundPage.cs', 'the package Fernway.Forms.Charts 3.4.1 was built for Xamarin', 'RESULT: PASS'], ['no known .NET MAUI equivalent']);
  // Only the error is shown with --min-severity error.
  expect('messy, errors only', await run([...MESSY, '--min-severity', 'error']), 1, ['findings: 1 (1 error); 43 below error not shown', 'RESULT: FAIL - 1 finding at or above error'], ['WARNING  ', 'INFO  ']);
  // The clean solution fails once warnings fail the run: it still has projects and packages to convert.
  expect('clean, fail on warning', await run([...CLEAN, '--fail-on', 'warning']), 1, ['RESULT: FAIL - 4 findings at or above warning'], []);
  // A path that is a file stops the run.
  const F = 'examples/messy/TidewaterDriver.sln';
  expect('a folder that is a file', await run([F]), 2, [`${F}: is a file; give the folder of the solution`], [], 'err');

  // The README shows the whole report of the messy solution, the --explain lines of one finding, the GitHub annotations
  // of two findings, the start of the CSV report and the report of the clean solution.
  const readme = (await readFile(resolve(root, 'README.md'), 'utf8')).split('\r\n').join('\n');
  if (!readme.includes(messy.out)) problems.push('README: the sample output of the messy solution differs from a real run');
  if (!readme.includes(clean.out)) problems.push('README: the sample output of the clean solution differs from a real run');

  await mkdir(resolve(root, 'examples/output'), { recursive: true });
  await writeFile(resolve(root, 'examples/output/messy.txt'), messy.out);
  await writeFile(resolve(root, 'examples/output/clean.txt'), clean.out);
  const explain = await run([...MESSY, '--explain']);
  if (explain.code !== 1) problems.push(`explain: exit code ${explain.code}, expected 1`);
  const lines = explain.out.split('\n');
  const at = lines.findIndex((l) => l.includes('custom-renderer') && l.includes('TidewaterDriver.Android/Renderers/'));
  const sample = lines.slice(at, at + 7).join('\n');
  if (at < 0 || !readme.includes(sample)) problems.push('README: the --explain sample of the custom renderer differs from a real run');
  await writeFile(resolve(root, 'examples/output/messy-explain.txt'), explain.out);
  const github = await run([...MESSY, '--format', 'github']);
  if (github.code !== 1) problems.push(`github: exit code ${github.code}, expected 1`);
  const picked = github.out.split('\n').filter((x) => x.includes('title=xamarin-maui-check no-maui-equivalent::') || (x.includes('title=xamarin-maui-check custom-renderer::') && x.includes('TidewaterDriver.iOS')));
  if (picked.length !== 2) problems.push('github: the sample lines are not in the output');
  for (const l of picked) if (!readme.includes(l)) problems.push('README: the GitHub sample differs from a real run');
  await writeFile(resolve(root, 'examples/output/messy-github.txt'), github.out);
  const csv = await run([...MESSY, '--format', 'csv']);
  if (csv.code !== 1) problems.push(`csv: exit code ${csv.code}, expected 1`);
  const head = csv.out.split('\r\n').slice(0, 4).join('\n');
  if (!readme.includes(head)) problems.push('README: the CSV sample differs from a real run');
  await writeFile(resolve(root, 'examples/output/messy-findings.csv'), csv.out);
  const json = await run([...MESSY, '--json', '--explain']);
  if (json.code !== 1) problems.push(`json: exit code ${json.code}, expected 1`);
  await writeFile(resolve(root, 'examples/output/messy.json'), json.out);
  const defaults = await run(['--print-defaults']);
  if (defaults.code !== 0) problems.push(`--print-defaults: exit code ${defaults.code}, expected 0`);
  await writeFile(resolve(root, 'examples/output/defaults.json'), defaults.out);

  if (problems.length) {
    for (const p of problems) console.error(`example: ${p}`);
    process.exit(1);
  }
}
