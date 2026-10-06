// The reports: text for a terminal, JSON for other tools, and GitHub workflow commands that turn each finding into an
// annotation on the file, line and column. The CSV report is in src/csv.js. Every text from the input (a file name, a
// package id, a version) was cleaned by safeText before it reached the report object. The GitHub commands also escape
// the characters a command gives a meaning to, so a text in the input cannot end a command early or start another one.

import { DEFAULT_PACKAGE_MAP } from './defaults.js';
import { grouped, listText, plural } from './size.js';
import { safeText } from './text.js';

const clean = (t, max = 200) => safeText(t, max);

function inputLine(r) {
  const i = r.input;
  return [plural(i.solutions, 'solution'), plural(i.projectFiles, 'project file'), `${grouped(i.packagesConfigs)} packages.config`, plural(i.codeFiles, 'C# file'), plural(i.xamlFiles, 'XAML file'), plural(i.manifests, 'platform manifest'), `${plural(i.otherFiles, 'other file')} passed over`, `${plural(i.foldersPassedOver, 'folder')} named bin, obj, packages, .git or .vs passed over`, `${plural(i.excluded, 'path')} excluded`, `${plural(i.links, 'link')} not followed`].join('; ');
}

function configLine(r) {
  const c = r.config;
  const where = c.file ? `${c.file}${c.name ? ` (${clean(c.name, 120)})` : ''}` : 'built-in defaults';
  const list = (items) => (items.length ? listText(items, 20) : 'none');
  // The entries of the package table that are not the defaults as they are.
  const own = c.packageMap.filter((e) => !DEFAULT_PACKAGE_MAP.some((d) => d.match === e.match && d.use === e.use)).length;
  return [
    `${where}: package table ${plural(c.packageMap.length, 'entry', 'entries')}${own ? ` (${grouped(own)} from the configuration)` : ''}`,
    `keep ${list(c.keepPackages)}`,
    `layouts ${list(c.layouts.map((l) => l.name))}`,
    `exclude ${list(r.input.exclude)}`,
    `minimum severity ${c.minSeverity}`,
    `fail on ${c.failOn}`
  ].join('; ');
}

const rulesLine = (r) => r.config.rules.map((x) => `${x.id} (${x.level})`).join('; ');

function findingsLine(r) {
  const b = r.totals.byLevel;
  const parts = ['error', 'warning', 'info'].filter((l) => b[l]).map((l) => `${grouped(b[l])} ${l}`);
  return `${grouped(r.totals.findings)}${parts.length ? ` (${parts.join(', ')})` : ''}${r.totals.hidden ? `; ${grouped(r.totals.hidden)} below ${r.config.minSeverity} not shown` : ''}`;
}

// A table with a header row and its columns padded to the widest cell.
function table(head, rows, indent = '  ') {
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
  const line = (cells) => `${indent}${cells.map((c, i) => (i === cells.length - 1 ? c : c.padEnd(widths[i]))).join('  ')}`.trimEnd();
  return [line(head), ...rows.map(line)];
}

const PAD = ' '.repeat(11);
const HEAD_NAMES = { android: 'Android', ios: 'iOS', mac: 'Mac', uwp: 'UWP', tvos: 'tvOS', watchos: 'watchOS' };

export function summaryLines(r) {
  const s = r.summary;
  const heads = Object.entries(HEAD_NAMES).filter(([k]) => s.heads[k]).map(([k, n]) => `${grouped(s.heads[k])} ${n}`);
  const headCount = Object.values(s.heads).reduce((a, b) => a + b, 0);
  const packageParts = [`${grouped(s.toReplace)} to replace`, `${grouped(s.noEquivalent)} with no .NET MAUI equivalent`, `${grouped(s.toCheck)} to check`, `${grouped(s.kept)} kept`];
  return [
    `  projects: ${grouped(s.projects)} (${grouped(s.oldStyle)} old-style, ${grouped(s.sdkStyle)} SDK-style), ${plural(headCount, 'platform head')}${heads.length ? ` (${heads.join(', ')})` : ''}, in ${plural(s.solutions, 'solution')} listing ${plural(s.solutionProjects, 'project')}`,
    `  packages: ${grouped(s.packages)} in ${plural(s.packageReferences, 'reference')}: ${packageParts.join(', ')}`,
    `  custom renderers: ${grouped(s.renderers)}; effects: ${grouped(s.effects)} platform ${s.effects === 1 ? 'effect' : 'effects'} and ${grouped(s.routingEffects)} routing ${s.routingEffects === 1 ? 'effect' : 'effects'}`,
    `  C# files: ${grouped(s.codeFiles)}, ${grouped(s.codeFilesWithForms)} naming Xamarin.Forms or Xamarin.Essentials (${plural(s.formsReferences, 'reference')})`,
    `  XAML files: ${grouped(s.xamlFiles)}, ${grouped(s.xamlWithForms)} in the Xamarin.Forms XAML namespace`,
    `  DependencyService: ${grouped(s.dependencyService)}; MessagingCenter: ${grouped(s.messagingCenter)}; Device class: ${grouped(s.deviceApi)}`,
    ''
  ];
}

export function toText(r, { explain = false } = {}) {
  const out = [];
  out.push(`xamarin-maui-check: ${r.input.folder}`);
  out.push(`input: ${inputLine(r)}`);
  out.push(`config: ${configLine(r)}`);
  out.push(`rules: ${rulesLine(r)}`);
  out.push(`findings: ${findingsLine(r)}`);
  out.push('', `Projects (${grouped(r.projects.length)})`, '');
  if (r.projects.length) out.push(...table(['project', 'style', 'kind', 'targets', 'packages', 'error', 'warning', 'info'], r.projects.map((p) => [p.project, p.style, p.kind, p.targets, grouped(p.packages), grouped(p.byLevel.error), grouped(p.byLevel.warning), grouped(p.byLevel.info)])), '');
  else out.push('  none', '');
  out.push(`Packages (${grouped(r.packages.length)})`, '');
  if (r.packages.length) out.push(...table(['package', 'versions', 'projects', 'status', 'use'], r.packages.map((p) => [p.package, p.versions, grouped(p.projects), p.status, p.use])), '');
  else out.push('  none', '');
  out.push('Summary', '', ...summaryLines(r));
  out.push('Effort score (relative weights of docs/method.md, not a time estimate)', '');
  out.push(...table(['area', 'findings', 'score'], [...r.effort.areas.map((a) => [a.area, grouped(a.findings), grouped(a.score)]), ['total', grouped(r.effort.areas.reduce((n, a) => n + a.findings, 0)), grouped(r.effort.total)]]), '');
  out.push(`Rules (${grouped(r.rules.length)})`, '');
  out.push(...table(['rule', 'level', 'findings'], r.rules.map((x) => [x.id, x.level, grouped(x.findings)])), '');
  out.push(`Findings (${grouped(r.findings.length)})`, '');
  if (!r.findings.length) out.push('  none', '');
  const width = Math.max(...r.config.rules.map((x) => x.id.length));
  for (const f of r.findings) {
    out.push(`  ${f.level.toUpperCase().padEnd(8)} ${f.rule.padEnd(width)}  ${f.at}`);
    out.push(`${PAD}${f.found}`);
    out.push(`${PAD}fix: ${f.fix}`);
    if (explain) {
      out.push(`${PAD}rule: ${r.config.rules.find((x) => x.id === f.rule).rule}`);
      for (const b of f.basis) out.push(`${PAD}basis: ${b.text} (${b.source}, ${b.url})`);
      if (f.own) out.push(`${PAD}the tool's own choice: ${f.own}`);
    }
    out.push('');
  }
  for (const n of r.notes) out.push(`note: ${n}`);
  if (r.notes.length) out.push('');
  out.push(r.notice, '');
  out.push(`RESULT: ${r.result.text}`);
  return `${out.join('\n')}\n`;
}

export function toJson(r, { explain = false } = {}) {
  const out = { ...r, findings: r.findings.map((f) => (explain ? f : { ...f, basis: undefined, own: undefined })) };
  return `${JSON.stringify(out, null, 2)}\n`;
}

// The message of a workflow command: %, CR and LF escaped.
export const escapeData = (t) => String(t).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');

// A property of a workflow command: also : and , escaped.
export const escapeProperty = (t) => escapeData(t).replace(/:/g, '%3A').replace(/,/g, '%2C');

const COMMANDS = { error: 'error', warning: 'warning', info: 'notice' };

export function toGithub(r) {
  const out = [];
  for (const f of r.findings) {
    const props = [`file=${escapeProperty(f.file)}`, `line=${f.line}`, ...(f.column ? [`col=${f.column}`] : []), `title=${escapeProperty(`xamarin-maui-check ${f.rule}`)}`];
    out.push(`::${COMMANDS[f.level]} ${props.join(',')}::${escapeData(`${f.found}; fix: ${f.fix}`)}`);
  }
  out.push(`xamarin-maui-check: ${plural(r.totals.projects, 'project')}, ${plural(r.totals.packages, 'package')}, ${plural(r.totals.findings, 'finding')}, effort score ${grouped(r.effort.total)}; RESULT: ${r.result.text}`);
  return `${out.join('\n')}\n`;
}
