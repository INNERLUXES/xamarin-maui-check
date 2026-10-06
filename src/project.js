// The checks of a solution folder: the projects, the package references, the C# files, the XAML files and the platform
// manifests side by side. Each finding carries its rule, its file, its line and column and what was found; src/check.js
// gives it its level and builds the report. The tables of projects and packages and the summary are built here too.

import { globMatch } from './glob.js';
import { grouped, plural } from './size.js';
import { asciiLower, baseName, byCode, folderOf } from './words.js';

// The platforms of a head project: the name, the folder of a .NET MAUI single project, and the .NET project type.
export const PLATFORMS = {
  android: { name: 'Android', folder: 'Platforms/Android', net: '.NET for Android', target: 'net8.0-android' },
  ios: { name: 'iOS', folder: 'Platforms/iOS', net: '.NET for iOS', target: 'net8.0-ios' },
  mac: { name: 'Mac', folder: 'Platforms/MacCatalyst', net: '.NET for Mac Catalyst', target: 'net8.0-maccatalyst' },
  uwp: { name: 'UWP', folder: 'Platforms/Windows', net: 'WinUI 3', target: 'net8.0-windows10.0.19041.0' },
  tvos: { name: 'tvOS', folder: null, net: '.NET for tvOS', target: 'net8.0-tvos' },
  watchos: { name: 'watchOS', folder: null, net: null, target: null }
};

// What replaces each member of the Xamarin.Forms Device class.
export const DEVICE_REPLACEMENTS = {
  RuntimePlatform: 'DeviceInfo.Platform',
  OnPlatform: 'DeviceInfo.Platform in code, or OnPlatform in XAML',
  BeginInvokeOnMainThread: 'MainThread.BeginInvokeOnMainThread',
  InvokeOnMainThreadAsync: 'MainThread.InvokeOnMainThreadAsync',
  StartTimer: 'Dispatcher.StartTimer or Dispatcher.DispatchDelayed',
  OpenUri: 'Launcher.OpenAsync',
  Idiom: 'DeviceInfo.Idiom',
  OS: 'DeviceInfo.Platform'
};

// The types of Xamarin.Forms that Microsoft.Maui.Graphics replaces when they are created with new.
const GRAPHICS_TYPES = new Set(['Rectangle', 'Point']);

// What the package table says of a package id: { status, entry }, where status is 'replace' (an entry with a use),
// 'none' (an entry with use null), 'keep' (keepPackages), 'check' (a Xamarin.* or *.Forms.* package outside both) or
// 'other'.
export function classifyPackage(id, config) {
  const lower = asciiLower(id);
  const entry = config.packageMap.find((p) => globMatch(asciiLower(p.match), lower));
  if (entry) return { status: entry.use === null ? 'none' : 'replace', entry };
  if (config.keepPackages.some((p) => globMatch(asciiLower(p), lower))) return { status: 'keep', entry: null };
  if (lower.startsWith('xamarin.') || lower.split('.').includes('forms')) return { status: 'check', entry: null };
  return { status: 'other', entry: null };
}

// The folder of the project a file belongs to: the longest project folder the file is in, or null.
export function ownerOf(file, folders) {
  let best = null;
  for (const f of folders) {
    const inside = f === '.' ? !file.startsWith('../') && !file.startsWith('/') : file.startsWith(`${f}/`);
    if (inside && (best === null || f.length > best.length)) best = f;
  }
  return best;
}

const STATUS_WORDS = { replace: 'replace', none: 'no equivalent', check: 'check', keep: 'keep', other: 'other' };

// The findings, the tables and the summary of a solution folder. Each input file is { file, place, ... } where place
// gives the line and column of an offset: solutions { entries }, projects { model }, packageFiles { list }, code
// { scan }, xaml { scan }; manifests are { file, kind }.
export function analyze({ solutions = [], projects = [], packageFiles = [], code = [], xaml = [], manifests = [], config }) {
  const findings = [];
  const add = (rule, file, pos, found) => findings.push({ rule, file, line: pos.line, column: pos.column, found });
  const name = (file) => baseName(file).replace(/\.csproj$/i, '');
  const folders = projects.map((p) => folderOf(p.file));

  // Projects: their style, their platform and their target frameworks.
  for (const p of projects) {
    const m = p.model;
    const pos = p.place(m.rootOffset);
    if (!m.sdk) add('non-sdk-project', p.file, pos, `the project ${name(p.file)} is in the old project format, with no Sdk on its Project element: it lists every file and reference by hand and must become an SDK-style project to target .NET`);
    const platform = m.platform ? PLATFORMS[m.platform] : null;
    if (platform && platform.folder) add('platform-head', p.file, pos, `the project ${name(p.file)} is the ${platform.name} head of the solution: in a .NET MAUI single project its code and resources go to ${platform.folder}, or it becomes an SDK-style ${platform.net} project`);
    for (const f of m.frameworks) {
      const target = PLATFORMS[f.platform];
      const way = target.target ? `on .NET the target is ${target.target}, or the same name for the .NET version you move to` : '.NET has no target for it, and .NET MAUI does not support it';
      add('legacy-target-framework', p.file, p.place(f.offset), `the project targets ${f.text}, a Xamarin framework: ${way}`);
    }
  }

  // Packages, from the project files and packages.config.
  const references = [];
  for (const p of projects) for (const r of p.model.packages) references.push({ ...r, file: p.file, place: p.place, owner: folderOf(p.file) });
  for (const p of packageFiles) for (const r of p.list) references.push({ ...r, file: p.file, place: p.place, owner: ownerOf(p.file, folders) ?? folderOf(p.file) });
  const packageRows = new Map();
  for (const r of references) {
    const c = classifyPackage(r.id, config);
    const shown = `${r.id}${r.version ? ` ${r.version}` : ''}`;
    if (c.status === 'replace') add('replace-package', r.file, r.place(r.offset), `the package ${shown} is a Xamarin-era package: on .NET MAUI use ${c.entry.use}${c.entry.note ? ` (${c.entry.note})` : ''}`);
    else if (c.status === 'none') add('no-maui-equivalent', r.file, r.place(r.offset), `the package ${shown} has no known .NET MAUI equivalent${c.entry.note ? `: ${c.entry.note}` : ''}`);
    else if (c.status === 'check') add('unknown-xamarin-package', r.file, r.place(r.offset), `the package ${shown} was built for Xamarin and is not in the package table: check for a version that targets .NET for Android, .NET for iOS or .NET MAUI`);
    const key = asciiLower(r.id);
    if (!packageRows.has(key)) packageRows.set(key, { package: r.id, versions: [], owners: new Set(), references: 0, status: STATUS_WORDS[c.status], use: c.entry ? c.entry.use ?? 'none known' : '-' });
    const row = packageRows.get(key);
    row.references += 1;
    if (r.version && !row.versions.includes(r.version)) row.versions.push(r.version);
    row.owners.add(r.owner);
  }

  // C# files: renderers and effects first, matched with their export attributes across the files.
  const exportsOf = (list) => {
    const map = new Map();
    for (const c of code) for (const x of c.scan[list]) {
      const key = list === 'exportRenderers' ? x.renderer : x.effect;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ ...x, file: c.file, place: c.place });
    }
    return map;
  };
  const exportedRenderers = exportsOf('exportRenderers');
  const exportedEffects = exportsOf('exportEffects');
  const rendererNames = new Set();
  const effectNames = new Set();
  let renderers = 0;
  let effects = 0;
  let routingEffects = 0;
  const at = (x) => `${x.file}:${x.place(x.offset).line}`;
  // The export attribute of a class: the one in the same file, else the first.
  const pick = (list, file) => (list ? list.find((x) => x.file === file) ?? list[0] : null);
  for (const c of code) {
    for (const r of c.scan.renderers) {
      renderers += 1;
      rendererNames.add(r.name);
      const exp = pick(exportedRenderers.get(r.name), c.file);
      add('custom-renderer', c.file, c.place(r.offset), `the class ${r.name} derives from ${r.base}, a Xamarin.Forms renderer${exp ? `, registered for ${exp.control || 'a control'} by ExportRenderer at ${at(exp)}` : ''}: renderers become handlers on .NET MAUI`);
    }
    for (const e of c.scan.platformEffects) {
      effects += 1;
      effectNames.add(e.name);
      const exp = pick(exportedEffects.get(e.name), c.file);
      add('effect', c.file, c.place(e.offset), `the class ${e.name} is a PlatformEffect${exp ? `, exported by ExportEffect at ${at(exp)}` : ''}: on .NET MAUI the effect is registered with ConfigureEffects, with no ExportEffect or ResolutionGroupName attribute`);
    }
    routingEffects += c.scan.routingEffects.length;
  }
  for (const [renderer, list] of exportedRenderers) {
    if (rendererNames.has(renderer)) continue;
    for (const x of list) {
      renderers += 1;
      add('custom-renderer', x.file, x.place(x.offset), `ExportRenderer registers ${renderer || 'a renderer'} for ${x.control || 'a control'}, and no class of that name was found: the renderer still needs a handler on .NET MAUI`);
    }
  }
  for (const [effect, list] of exportedEffects) {
    if (effectNames.has(effect)) continue;
    for (const x of list) {
      effects += 1;
      add('effect', x.file, x.place(x.offset), `ExportEffect exports ${effect || 'an effect'}, and no PlatformEffect class of that name was found: on .NET MAUI the effect is registered with ConfigureEffects`);
    }
  }

  const layoutUse = new Map(config.layouts.map((l) => [l.name, l.use]));
  let formsFiles = 0;
  let formsReferences = 0;
  let dependency = 0;
  let messaging = 0;
  let device = 0;
  for (const c of code) {
    const s = c.scan;
    for (const d of s.dependencyCalls) add('dependency-service', c.file, c.place(d.offset), `DependencyService.${d.member} looks up a platform service through the service locator of Xamarin.Forms: .NET MAUI has dependency injection built in`);
    for (const d of s.dependencies) add('dependency-service', c.file, c.place(d.offset), `the Dependency attribute registers ${d.service || 'a service'} with DependencyService: register it on builder.Services in MauiProgram instead`);
    for (const m of s.messaging) add('messaging-center', c.file, c.place(m.offset), `MessagingCenter.${m.member}: MessagingCenter is deprecated in .NET MAUI`);
    for (const d of s.device) add('device-api', c.file, c.place(d.offset), `Device.${d.member}: on .NET MAUI use ${DEVICE_REPLACEMENTS[d.member]}`);
    dependency += s.dependencyCalls.length + s.dependencies.length;
    messaging += s.messaging.length;
    device += s.device.length;
    for (const n of s.created) if (layoutUse.has(n.name)) add('removed-layout', c.file, c.place(n.offset), `new ${n.name}: on .NET MAUI use ${layoutUse.get(n.name)}`);
    if (s.formsReferences) {
      formsFiles += 1;
      formsReferences += s.formsReferences;
      add('forms-namespace', c.file, c.place(s.firstForms), `the file names the Xamarin.Forms or Xamarin.Essentials namespace ${plural(s.formsReferences, 'time')} (${grouped(s.formsUsings)} in using directives)`);
      const uses = [...s.colors.map((x) => ({ text: `Color.${x.member}`, offset: x.offset })), ...s.created.filter((x) => GRAPHICS_TYPES.has(x.name) && (x.qualified === x.name || x.qualified === `Xamarin.Forms.${x.name}`)).map((x) => ({ text: `new ${x.name}`, offset: x.offset }))].sort((a, b) => a.offset - b.offset);
      if (uses.length) add('graphics-type', c.file, c.place(uses[0].offset), `${plural(uses.length, 'use')} of Color, Rectangle or Point, first ${uses[0].text}: these types move to Microsoft.Maui.Graphics`);
    }
  }

  let xamlForms = 0;
  for (const x of xaml) {
    if (x.scan.formsNamespace !== null) {
      xamlForms += 1;
      add('forms-namespace', x.file, x.place(x.scan.formsNamespace), 'the XAML declares the Xamarin.Forms XAML namespace: .NET MAUI XAML uses the .NET MAUI namespace');
    }
    for (const l of x.scan.layouts) add('removed-layout', x.file, x.place(l.offset), `<${l.name}>: on .NET MAUI use ${layoutUse.get(l.name)}`);
  }

  for (const m of manifests) {
    if (/(?:^|\/)Platforms\//.test(m.file)) continue;
    add('platform-manifest', m.file, { line: 1, column: 1 }, m.kind === 'androidManifest'
      ? 'an Android manifest of a head project: in a .NET MAUI single project it lives in Platforms/Android, and the minimum Android version moves to SupportedOSPlatformVersion'
      : 'an iOS property list of a head project: in a .NET MAUI single project it lives in Platforms/iOS');
  }

  // The table of projects.
  const projectRows = projects.map((p) => {
    const m = p.model;
    const platform = m.platform ? PLATFORMS[m.platform] : null;
    const formsLibrary = m.packages.some((r) => asciiLower(r.id) === 'xamarin.forms');
    const own = packageFiles.filter((f) => ownerOf(f.file, folders) === folderOf(p.file)).reduce((n, f) => n + f.list.length, 0);
    const targets = [...m.frameworks.map((f) => f.text), ...['TargetFramework', 'TargetFrameworks'].filter((k) => m.properties.has(k)).flatMap((k) => m.properties.get(k).value.split(';').map((x) => x.trim()).filter(Boolean)).filter((t) => !m.frameworks.some((f) => f.text === t))];
    return {
      project: p.file,
      folder: folderOf(p.file),
      style: m.sdk ? 'SDK-style' : 'old-style',
      kind: platform ? `${platform.name} head` : formsLibrary ? 'Xamarin.Forms library' : 'library',
      targets: targets.length ? targets.join(', ') : '-',
      packages: m.packages.length + own
    };
  }).sort((a, b) => byCode(a.project, b.project));

  const packageTable = [...packageRows.values()].map((r) => ({ package: r.package, versions: r.versions.length ? r.versions.join(', ') : '-', projects: r.owners.size, references: r.references, status: r.status, use: r.use })).sort((a, b) => byCode(asciiLower(a.package), asciiLower(b.package)));
  const heads = {};
  for (const p of projects) if (p.model.platform) heads[p.model.platform] = (heads[p.model.platform] ?? 0) + 1;
  const statusCount = (s) => packageTable.filter((r) => r.status === s).length;
  const listed = new Set(solutions.flatMap((s) => s.entries.map((e) => asciiLower(e.path))));
  const summary = {
    solutions: solutions.length,
    solutionProjects: listed.size,
    projects: projects.length,
    oldStyle: projects.filter((p) => !p.model.sdk).length,
    sdkStyle: projects.filter((p) => p.model.sdk).length,
    heads,
    packages: packageTable.length,
    packageReferences: references.length,
    toReplace: statusCount('replace'),
    noEquivalent: statusCount('no equivalent'),
    toCheck: statusCount('check'),
    kept: statusCount('keep'),
    renderers,
    effects,
    routingEffects,
    codeFiles: code.length,
    codeFilesWithForms: formsFiles,
    formsReferences,
    xamlFiles: xaml.length,
    xamlWithForms: xamlForms,
    dependencyService: dependency,
    messagingCenter: messaging,
    deviceApi: device,
    manifests: manifests.length
  };
  // A project a solution names that is not in the folder.
  const onDisk = new Set(projects.map((p) => asciiLower(p.file)));
  const missing = [];
  for (const s of solutions) {
    const base = folderOf(s.file);
    for (const e of s.entries) {
      if (!asciiLower(e.path).endsWith('.csproj')) continue;
      const full = base === '.' ? e.path : `${base}/${e.path}`;
      if (!onDisk.has(asciiLower(full))) missing.push(full);
    }
  }
  return { findings, projects: projectRows, packages: packageTable, summary, missing };
}
