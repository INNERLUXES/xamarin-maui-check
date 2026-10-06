// Shared test helpers: solutions, projects, packages.config, C# and XAML files built inline, read in memory or written
// into a temporary folder that is removed after the test. Paths are built with resolve() from forward-slash names, so
// the same test runs on Linux, macOS and Windows. The line a test expects is found with lineOf(), which counts lines the
// way the tool does, so a test never holds a line number worked out by hand for one system only. No test reads the
// clock, the time zone or the locale.

import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { defaultConfig, lineStarts, main, positionOf, readConfig } from '../src/index.js';

export async function withFiles(files, fn) {
  const dir = await mkdtemp(resolve(tmpdir(), 'xamarin-maui-check-'));
  try {
    for (const [rel, content] of Object.entries(files)) {
      await mkdir(dirname(resolve(dir, rel)), { recursive: true });
      await writeFile(resolve(dir, rel), content);
    }
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function offsetOf(text, needle, n) {
  let at = -1;
  for (let i = 0; i < n; i += 1) {
    at = text.indexOf(needle, at + 1);
    if (at < 0) throw new Error(`${needle} is not in the text ${n} times`);
  }
  return at;
}

// The line (from 1) of the n-th place where needle starts in text.
export const lineOf = (text, needle, n = 1) => positionOf(lineStarts(text), offsetOf(text, needle, n)).line;

// The column (from 1) of the n-th place where needle starts in text.
export const columnOf = (text, needle, n = 1) => positionOf(lineStarts(text), offsetOf(text, needle, n)).column;

// The configuration of a configuration object, through the real reader, or the defaults.
export const configOf = (object = null) => (object === null ? defaultConfig() : readConfig(JSON.stringify(object), 'config.json'));

// The two XML namespaces of a Xamarin.Forms XAML file, built from pieces so that no file of the tests holds a number
// that reads like a year.
export const FORMS_NS = ['http://xamarin.com/schemas/', '20', '14', '/forms'].join('');
export const XAML_NS = ['http://schemas.microsoft.com/winfx/', '20', '09', '/xaml'].join('');
export const MAUI_NS = 'http://schemas.microsoft.com/dotnet/maui';

// A Xamarin.Forms XAML page with this body.
export function xaml(body, ns = FORMS_NS) {
  return `<?xml version="1.0" encoding="utf-8" ?>
<ContentPage xmlns="${ns}"
             xmlns:x="${XAML_NS}"
             x:Class="Acme.MainPage">
${body}
</ContentPage>
`;
}

// An SDK-style project with these package references: [[id, version]].
export function sdkProject(packages = [], tfm = 'netstandard2.0') {
  return `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>${tfm}</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
${packages.map(([id, v]) => `    <PackageReference Include="${id}" Version="${v}" />`).join('\n')}
  </ItemGroup>
</Project>
`;
}

// An old-style project with these properties and package references.
export function oldProject(properties = {}, packages = []) {
  return `<?xml version="1.0" encoding="utf-8"?>
<Project ToolsVersion="15.0" DefaultTargets="Build">
  <PropertyGroup>
${Object.entries(properties).map(([k, v]) => `    <${k}>${v}</${k}>`).join('\n')}
  </PropertyGroup>
  <ItemGroup>
${packages.map(([id, v]) => `    <PackageReference Include="${id}" Version="${v}" />`).join('\n')}
  </ItemGroup>
</Project>
`;
}

export const ANDROID_GUIDS = '{EFBA0AD7-5A72-4C68-AF49-83D382785DCF};{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}';
export const IOS_GUIDS = '{FEACFBD2-3405-455C-9665-78FE426C6842};{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}';
export const UWP_GUIDS = '{A5A43C5B-DE2A-4C0C-9213-0A381AF9435A};{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}';

// A packages.config with these packages: [[id, version]].
export function packagesConfig(packages) {
  return `<?xml version="1.0" encoding="utf-8"?>
<packages>
${packages.map(([id, v]) => `  <package id="${id}" version="${v}" targetFramework="monoandroid13.0" />`).join('\n')}
</packages>
`;
}

// A C# file with these lines in the body of a method of a class.
export function cs(lines, usings = []) {
  return `${usings.map((u) => `using ${u};`).join('\n')}

namespace Acme.App
{
    public class Worker
    {
        public void Run()
        {
${lines.map((l) => `            ${l}`).join('\n')}
        }
    }
}
`;
}

export const S = 'p/Acme.sln';
export const P = 'p/App/App.csproj';
export const C = 'p/App/Worker.cs';
export const X = 'p/App/MainPage.xaml';

// A solution that lists the project.
export const SOLUTION = `
Microsoft Visual Studio Solution File, Format Version 12.00
Project("{9A19103F-16F7-4668-BE54-9A1E7A4F7556}") = "App", "App\\App.csproj", "{3C1A5B7D-6E2F-4A8B-9C0D-1E2F3A4B5C6D}"
EndProject
`;

// A folder with nothing to migrate: an SDK-style .NET project, a plain C# file and a .NET MAUI page. Every test of a
// whole run changes it.
export const PROJECT = {
  [S]: SOLUTION,
  [P]: sdkProject([['Acme.Json', '2.1.0']], 'net8.0-android'),
  [C]: cs(['var total = 1 + 2;', 'System.Console.WriteLine(total);'], ['System']),
  [X]: xaml('    <Grid />', MAUI_NS)
};

// A text with pieces replaced: pairs of [from, to], each replaced once.
export function edit(text, ...pairs) {
  let out = text;
  for (const [from, to] of pairs) {
    if (!out.includes(from)) throw new Error(`${from} is not in the text`);
    out = out.replace(from, to);
  }
  return out;
}

// The folder with some files changed or added; null takes a file out.
export function projectWith(changes = {}) {
  const out = { ...PROJECT };
  for (const [k, v] of Object.entries(changes)) {
    if (v === null) delete out[k];
    else out[k] = v;
  }
  return out;
}

// Writes the files and runs the command line with these arguments (paths relative to the folder).
export async function run(files, args = ['p'], limits) {
  return withFiles(files, async (dir) => {
    let out = '';
    let err = '';
    const code = await main(args, { out: (t) => { out += t; }, err: (t) => { err += t; } }, limits, dir);
    return { code, out, err, dir };
  });
}

// The JSON report of a folder of files, with more arguments.
export async function reportOf(files, args = ['p'], limits) {
  const r = await run(files, [...args, '--json'], limits);
  if (r.code === 2) throw new Error(r.err);
  return { ...JSON.parse(r.out), code: r.code };
}

// The findings of a report, of one rule or of all.
export const findingsOf = (r, rule) => r.findings.filter((f) => !rule || f.rule === rule);

// The rule ids of the findings of a folder.
export const rulesOf = async (files, args) => (await reportOf(files, args)).findings.map((f) => f.rule);

// Runs the command line with exactly these arguments, in a folder.
export async function cli(argv, dir) {
  let out = '';
  let err = '';
  const code = await main(argv, { out: (t) => { out += t; }, err: (t) => { err += t; } }, undefined, dir);
  return { code, out, err };
}
