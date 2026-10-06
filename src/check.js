// A run: read the configuration, list the files of the solution folder, read each solution, project, packages.config,
// C# and XAML file, note the platform manifests, run the checks of src/project.js and build the report of the run. A
// path on the command line that cannot be used (missing, a link, a folder that is a file), an --exclude pattern that is
// not valid or a configuration with a problem stops the run with an InputError and no result. A file that cannot be
// read, and input past the limits of a run, are error findings of their own, so the run fails at the default level and
// never passes because a part of the input was passed over.

import { CODE_LIMITS, scanCode } from './code.js';
import { ConfigError, defaultConfig, pathPatternProblem, readConfig } from './config.js';
import { LEVELS, NOTICE, POINTS, pointPage } from './data.js';
import { EFFORT_WEIGHTS } from './defaults.js';
import { FILE_LIMITS, inspectPath, readText, readTextFile } from './files.js';
import { lineStarts, positionOf } from './json.js';
import { readPackagesConfig, readProject, readSolution } from './msbuild.js';
import { analyze, ownerOf } from './project.js';
import { RULES, atOrAbove, decide } from './rules.js';
import { grouped, listText, plural } from './size.js';
import { safeText } from './text.js';
import { WALK_LIMITS, walkProject } from './walk.js';
import { scanXaml } from './xaml.js';
import { XML_LIMITS, XmlError } from './xml.js';
import { byCode, joinPath } from './words.js';

export const LIMITS = { ...FILE_LIMITS, ...WALK_LIMITS, ...XML_LIMITS, ...CODE_LIMITS, maxFindingsPerRule: 500, maxExcludes: 100 };
export const MAX_PROBLEMS = 20;

export class InputError extends Error {
  constructor(problems) {
    super(problems.join('; '));
    this.problems = problems;
  }
}

// A list of problems for an error message: the first twenty, then a count.
export function capped(problems) {
  return problems.length > MAX_PROBLEMS ? [...problems.slice(0, MAX_PROBLEMS), `and ${grouped(problems.length - MAX_PROBLEMS)} more`] : problems;
}

// The level of a rule under a configuration: the rules of input problems are always errors.
export function levelOf(rule, config) {
  return rule.key === null ? 'error' : config.rules[rule.key];
}

// The line and column of every offset of a text.
export function placer(text) {
  const starts = lineStarts(text);
  return (offset) => positionOf(starts, Math.max(0, Math.min(offset, text.length)));
}

export const KIND_WORDS = { solution: 'solution', project: 'project file', packages: 'packages.config', code: 'C# file', xaml: 'XAML file' };

// Reads one file of the folder by its kind: { kind, item, problem }, where item is what the checks use and problem an
// unreadable-file or scan-limit finding { rule, line, column, found } when the file cannot be read as its kind.
export async function readInputFile(full, shown, kind, config, lim = LIMITS) {
  let text;
  try {
    ({ text } = await readText(full, shown, lim.maxFileBytes));
  } catch (error) {
    return { problem: { rule: 'unreadable-file', line: 1, column: 1, found: `the ${KIND_WORDS[kind]} cannot be read: ${error.reason ?? error.message}; nothing in it is checked` } };
  }
  const place = placer(text);
  try {
    if (kind === 'solution') return { item: { file: shown, place, entries: readSolution(text) }, problem: null };
    if (kind === 'project') return { item: { file: shown, place, model: readProject(text, lim) }, problem: null };
    if (kind === 'packages') return { item: { file: shown, place, list: readPackagesConfig(text, lim) }, problem: null };
    if (kind === 'xaml') return { item: { file: shown, place, scan: scanXaml(text, new Set(config.layouts.map((l) => l.name)), lim) }, problem: null };
    const scan = scanCode(text, lim);
    return { item: { file: shown, place, scan }, problem: scan.limited ? { rule: 'scan-limit', line: 1, column: 1, found: `the C# file holds more than ${grouped(lim.maxCodeMatches)} matches of the patterns; the rest is not read` } : null };
  } catch (error) {
    if (error instanceof XmlError) return { problem: { rule: 'unreadable-file', ...place(error.offset), found: `the ${KIND_WORDS[kind]} cannot be read as XML: ${error.reason}; nothing in it is checked` } };
    throw error;
  }
}

// The effort score of a set of findings: { areas: [{ area, findings, score }], total }, each finding adding the weight
// of its rule in EFFORT_WEIGHTS to the score of its area.
export function effortOf(findings) {
  const areas = Object.entries(EFFORT_WEIGHTS).map(([area, weights]) => {
    let count = 0;
    let score = 0;
    for (const f of findings) {
      if (!Object.hasOwn(weights, f.rule)) continue;
      count += 1;
      score += weights[f.rule];
    }
    return { area, findings: count, score };
  });
  return { areas, total: areas.reduce((n, a) => n + a.score, 0) };
}

// The run as a report object.
export function buildReport({ input, projects, packages, summary, raw, config, minSeverity, failOn, version, notes: extraNotes = [], limits = LIMITS }) {
  const ruleOrder = new Map(RULES.map((r, i) => [r.id, i]));
  const level = (id) => levelOf(RULES.find((r) => r.id === id), config);
  const all = raw
    .filter((f) => level(f.rule) !== 'off')
    .map((f) => ({ ...f, level: level(f.rule) }))
    .sort((a, b) => LEVELS.indexOf(b.level) - LEVELS.indexOf(a.level) || byCode(a.file, b.file) || a.line - b.line || a.column - b.column || ruleOrder.get(a.rule) - ruleOrder.get(b.rule));
  const shown = all.filter((f) => atOrAbove(f.level, minSeverity));
  const hidden = all.length - shown.length;
  const perRule = new Map();
  const findings = [];
  let cut = 0;
  for (const f of shown) {
    const n = (perRule.get(f.rule) ?? 0) + 1;
    perRule.set(f.rule, n);
    if (n > limits.maxFindingsPerRule) {
      cut += 1;
      continue;
    }
    const rule = RULES.find((r) => r.id === f.rule);
    findings.push({
      rule: f.rule,
      level: f.level,
      file: safeText(f.file),
      line: f.line,
      column: f.column,
      at: `${safeText(f.file)}:${f.line}`,
      found: safeText(f.found, 800),
      fix: rule.fix,
      basis: rule.basis.map((k) => ({ text: POINTS[k].text, source: pointPage(k).title, url: pointPage(k).url })),
      own: rule.own
    });
  }
  const result = decide(shown, failOn);
  const folders = projects.map((p) => p.folder);
  const shownProjects = projects.map((p) => {
    const byLevel = { error: 0, warning: 0, info: 0 };
    for (const x of all) if (ownerOf(x.file, folders) === p.folder) byLevel[x.level] += 1;
    return { project: safeText(p.project), style: p.style, kind: p.kind, targets: safeText(p.targets, 200), packages: p.packages, byLevel };
  });
  const rules = RULES.map((r) => ({ id: r.id, level: level(r.id), findings: all.filter((f) => f.rule === r.id).length }));
  const notes = [];
  if (!input.projectFiles && !input.codeFiles && !input.xamlFiles) notes.push('the folder holds no project, C# or XAML file');
  if (input.links) notes.push(`${plural(input.links, 'symbolic link')} ${input.links === 1 ? 'is' : 'are'} not followed`);
  notes.push(...extraNotes);
  if (cut) notes.push(`${plural(cut, 'finding')} past the limit of ${grouped(limits.maxFindingsPerRule)} per rule ${cut === 1 ? 'is' : 'are'} counted but not listed`);
  if (hidden) notes.push(`${plural(hidden, 'finding')} below ${minSeverity} ${hidden === 1 ? 'is' : 'are'} not shown`);
  const off = RULES.filter((r) => r.key !== null && levelOf(r, config) === 'off');
  if (off.length) notes.push(`${plural(off.length, 'rule')} ${off.length === 1 ? 'is' : 'are'} off: ${off.map((r) => r.id).join(', ')}`);
  const byLevel = { error: 0, warning: 0, info: 0 };
  for (const f of shown) byLevel[f.level] += 1;
  return {
    tool: 'xamarin-maui-check',
    version,
    input: { ...input, folder: safeText(input.folder), exclude: input.exclude.map((p) => safeText(p, 200)) },
    config: {
      file: config.file === null ? null : safeText(config.file),
      name: config.name === null ? null : safeText(config.name, 120),
      packageMap: config.packageMap,
      keepPackages: config.keepPackages,
      layouts: config.layouts,
      exclude: config.exclude,
      minSeverity,
      failOn,
      rules: RULES.map((r) => ({ id: r.id, key: r.key, level: levelOf(r, config), rule: safeText(r.rule(config), 600) }))
    },
    projects: shownProjects,
    packages: packages.map((p) => ({ ...p, package: safeText(p.package, 200), versions: safeText(p.versions, 200), use: safeText(p.use, 300) })),
    summary,
    effort: effortOf(all),
    rules,
    findings,
    totals: { findings: shown.length, byLevel, hidden, notListed: cut, projects: projects.length, packages: packages.length },
    result,
    notes: notes.map((n) => safeText(n, 600)),
    notice: NOTICE
  };
}

// Reads the inputs, runs every check and builds the report object of the run.
export async function checkProject({ project, config: configPath = null, exclude = [], minSeverity = null, failOn = null, version = '0.0.0', limits = LIMITS, base = process.cwd() }) {
  const lim = { ...LIMITS, ...limits };
  let config;
  try {
    if (configPath) {
      const c = await readTextFile(configPath, base, lim.maxConfigBytes);
      config = readConfig(c.text, c.file);
    } else config = defaultConfig();
  } catch (error) {
    if (error instanceof ConfigError) throw new InputError(capped(error.problems));
    throw new InputError([error.message]);
  }
  const problems = [];
  let root = null;
  try {
    root = await inspectPath(project, base);
    if (!root.folder) problems.push(`${root.shown}: is a file; give the folder of the solution, the one that holds the .sln or the projects`);
  } catch (error) {
    problems.push(error.message);
  }
  for (const p of exclude) {
    const problem = pathPatternProblem(p);
    if (problem) problems.push(`--exclude "${p.slice(0, 80)}" ${problem}`);
  }
  if (problems.length) throw new InputError(capped(problems));

  const patterns = [...new Set([...config.exclude, ...exclude])];
  const walked = await walkProject(root.full, { exclude: patterns, limits: lim });
  const raw = [];
  const notes = [];
  if (walked.limit) raw.push({ rule: 'scan-limit', file: root.shown, line: 1, column: 1, found: `the folder holds ${walked.limit}; the listing stopped there, and the rest of the folder is not read` });

  const read = { solution: [], project: [], packages: [], code: [], xaml: [] };
  const manifests = [];
  for (const f of walked.files) {
    const shown = joinPath(root.shown, f.rel);
    if (f.kind === 'androidManifest' || f.kind === 'infoPlist') {
      manifests.push({ file: shown, kind: f.kind });
      continue;
    }
    const r = await readInputFile(f.full, shown, f.kind, config, lim);
    if (r.problem) raw.push({ ...r.problem, file: shown });
    if (r.item) read[f.kind].push(r.item);
  }

  const analysis = analyze({ solutions: read.solution, projects: read.project, packageFiles: read.packages, code: read.code, xaml: read.xaml, manifests, config });
  raw.push(...analysis.findings);

  if (walked.excluded) notes.push(`${plural(walked.excluded, 'path')} matching ${listText(patterns, 5)} ${walked.excluded === 1 ? 'is' : 'are'} left out`);
  if (walked.skipped) notes.push(`${plural(walked.skipped, 'folder')} named bin, obj, packages, .git or .vs ${walked.skipped === 1 ? 'is' : 'are'} passed over`);
  if (analysis.missing.length) notes.push(`${plural(analysis.missing.length, 'project')} named by a solution ${analysis.missing.length === 1 ? 'is' : 'are'} not in the folder: ${listText(analysis.missing, 5)}`);
  const count = (kind) => walked.files.filter((f) => f.kind === kind).length;
  return buildReport({
    input: { folder: root.shown, solutions: count('solution'), projectFiles: count('project'), packagesConfigs: count('packages'), codeFiles: count('code'), xamlFiles: count('xaml'), manifests: count('androidManifest') + count('infoPlist'), otherFiles: walked.others, foldersPassedOver: walked.skipped, excluded: walked.excluded, links: walked.links, exclude: patterns },
    projects: analysis.projects,
    packages: analysis.packages,
    summary: analysis.summary,
    raw,
    config,
    minSeverity: minSeverity ?? config.minSeverity,
    failOn: failOn ?? config.failOn,
    version,
    notes,
    limits: lim
  });
}
