// The configuration file: the settings of the tool, in one strict JSON object over the built-in defaults. Every key the
// tool does not know is an error with its line and a suggestion, so a typo cannot leave a default in place unnoticed;
// the JSON reader refuses a name given twice in one object. The configuration is optional: with none, the defaults
// apply. packageMap adds to the default table of packages; the other lists replace their defaults.

import { LEVELS } from './data.js';
import { DEFAULT_EXCLUDE, DEFAULT_FAIL_ON, DEFAULT_KEEP_PACKAGES, DEFAULT_LAYOUTS, DEFAULT_MIN_SEVERITY, DEFAULT_PACKAGE_MAP, DEFAULT_RULES } from './defaults.js';
import { MAX_PATTERN_LENGTH } from './glob.js';
import { JsonError, jsonProblem, parseJson } from './json.js';
import { asciiLower } from './words.js';

export const CONFIG_LIMITS = { maxListEntries: 200 };

// Every key of the configuration file, with the kind of its value. docs/inputs.md describes each of them.
export const KEYS = {
  name: 'text',
  rules: Object.fromEntries(Object.keys(DEFAULT_RULES).map((k) => [k, 'level or off'])),
  packageMap: { match: 'package pattern', use: 'text or null', note: 'text' },
  keepPackages: 'list of package patterns',
  layouts: { name: 'type name', use: 'text' },
  exclude: 'list of path patterns',
  minSeverity: 'level',
  failOn: 'level'
};

export class ConfigError extends Error {
  constructor(problems) {
    super(problems.join('; '));
    this.problems = problems;
  }
}

// The edit distance of two short names, for a suggestion: an insertion, a deletion, a change or two neighbours swapped
// ("nmae" for "name") each count one.
export function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// The closest of the known names, when it is close enough to be a typo: '; did you mean "..."?' or nothing. A name that
// differs in length from a known name by more than three characters, or that is longer than 64 characters, is not
// compared with it.
export function suggestion(name, known) {
  if (name.length > 64) return '';
  let best = null;
  for (const k of known) {
    if (Math.abs(name.length - k.length) > 3 || k.length > 64) continue;
    const d = distance(asciiLower(name), asciiLower(k));
    if (d <= Math.max(1, Math.floor(k.length / 3)) && (!best || d < best.d)) best = { k, d };
  }
  return best ? `; did you mean "${best.k}"?` : '';
}

export function kindOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'a list';
  if (typeof value === 'object') return 'an object';
  return `a ${typeof value}`;
}

export const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// A pattern of NuGet package ids, such as Xamarin.Forms or Acme.Forms.*: letters, digits, dots, dashes and
// underscores, with * for any run of characters and ? for one.
export function packagePatternProblem(text) {
  if (text.length === 0 || text.length > MAX_PATTERN_LENGTH) return `must be 1 to ${MAX_PATTERN_LENGTH} characters`;
  if (!/^[A-Za-z0-9_.*?-]+$/.test(text)) return 'holds a character other than letters, digits, . _ - * and ?';
  return null;
}

// The name of a type, such as RelativeLayout.
export const isTypeName = (text) => /^[A-Za-z_][A-Za-z0-9_]{0,99}$/.test(text);

// A path pattern relative to the folder, with forward slashes, that does not leave the folder.
export function pathPatternProblem(text) {
  if (text.length === 0 || text.length > MAX_PATTERN_LENGTH) return `must be 1 to ${MAX_PATTERN_LENGTH} characters`;
  if (text.includes('\\')) return 'uses a backslash; write paths with forward slashes';
  if (text.startsWith('/') || /^[A-Za-z]:/.test(text)) return 'is absolute; write it relative to the folder';
  if (text.split('/').includes('..')) return 'leaves the folder with ..';
  if (/[\x00-\x1f\x7f]/.test(text)) return 'holds a control character';
  return null;
}

// The default package table with the entries of a configuration in front: an entry whose match is the same, without
// regard to case, as a default entry takes its place.
export function mergePackageMap(entries) {
  const own = new Set(entries.map((e) => asciiLower(e.match)));
  return [...entries, ...DEFAULT_PACKAGE_MAP.filter((d) => !own.has(asciiLower(d.match))).map((d) => ({ ...d }))];
}

// The built-in configuration, as the checks use it.
export function defaultConfig() {
  return {
    file: null,
    name: null,
    rules: { ...DEFAULT_RULES },
    packageMap: DEFAULT_PACKAGE_MAP.map((d) => ({ ...d })),
    keepPackages: [...DEFAULT_KEEP_PACKAGES],
    layouts: DEFAULT_LAYOUTS.map((d) => ({ ...d })),
    exclude: [...DEFAULT_EXCLUDE],
    minSeverity: DEFAULT_MIN_SEVERITY,
    failOn: DEFAULT_FAIL_ON
  };
}

// The built-in configuration written as a configuration file, for --print-defaults. Read back, it gives the defaults.
export function defaultsAsConfig() {
  const d = defaultConfig();
  return { name: 'built-in defaults', rules: d.rules, packageMap: d.packageMap, keepPackages: d.keepPackages, layouts: d.layouts, exclude: d.exclude, minSeverity: d.minSeverity, failOn: d.failOn };
}

// Checks a parsed configuration and builds the configuration the checks use, or throws ConfigError with every problem.
export function validateConfig(value, lines = new Map(), file = 'config') {
  const problems = [];
  const lineOf = (path) => {
    for (let p = path, prev = null; p && p !== prev; prev = p, p = p.replace(/(?:\.[^.[]+|\[\d+\])$/, '')) if (lines.has(p)) return lines.get(p);
    return 1;
  };
  const fail = (path, message) => problems.push({ line: lineOf(path), text: `${file}: line ${lineOf(path)}: ${message}` });
  const config = defaultConfig();
  config.file = file;
  if (!isObject(value)) throw new ConfigError([`${file}: line 1: the configuration must be a JSON object, not ${kindOf(value)}`]);
  const show = (v) => (typeof v === 'string' ? `"${v.slice(0, 40)}"` : kindOf(v));

  const top = Object.keys(KEYS);
  for (const k of Object.keys(value)) if (!top.includes(k)) fail(k, `"${k.slice(0, 60)}" is not a key of the configuration${suggestion(k, top)}`);

  if (Object.hasOwn(value, 'name')) {
    if (typeof value.name !== 'string' || value.name.trim().length === 0 || value.name.length > 120) fail('name', 'name must be a text of 1 to 120 characters');
    else config.name = value.name;
  }

  if (Object.hasOwn(value, 'rules')) {
    const v = value.rules;
    const keys = Object.keys(DEFAULT_RULES);
    const levels = [...LEVELS, 'off'];
    if (!isObject(v)) fail('rules', `rules must be an object, not ${kindOf(v)}`);
    else {
      for (const k of Object.keys(v)) {
        const path = `rules.${k}`;
        if (!keys.includes(k)) fail(path, `"${k.slice(0, 60)}" is not a key of rules${suggestion(k, keys)}`);
        else if (typeof v[k] !== 'string' || !levels.includes(v[k])) fail(path, `${path} must be one of ${levels.join(', ')}, not ${typeof v[k] === 'number' ? String(v[k]) : show(v[k])}`);
        else config.rules[k] = v[k];
      }
    }
  }

  const text300 = (x) => typeof x === 'string' && x.trim().length > 0 && x.length <= 300;

  // A list of objects with the fields of KEYS[key]; check(entry, path) checks the fields and returns the entry or null.
  const objectList = (key, check) => {
    const list = value[key];
    const fields = Object.keys(KEYS[key]);
    if (!Array.isArray(list)) {
      fail(key, `${key} must be a list, not ${kindOf(list)}`);
      return null;
    }
    if (list.length > CONFIG_LIMITS.maxListEntries) {
      fail(key, `${key} holds more than ${CONFIG_LIMITS.maxListEntries} entries`);
      return null;
    }
    const out = [];
    list.forEach((x, i) => {
      const p = `${key}[${i}]`;
      if (!isObject(x)) {
        fail(p, `${p} must be an object, not ${kindOf(x)}`);
        return;
      }
      let ok = true;
      for (const k of Object.keys(x)) {
        if (!fields.includes(k)) {
          fail(`${p}.${k}`, `"${k.slice(0, 60)}" is not a key of ${key}${suggestion(k, fields)}`);
          ok = false;
        }
      }
      const entry = check(x, p);
      if (ok && entry) out.push(entry);
    });
    return out;
  };

  if (Object.hasOwn(value, 'packageMap')) {
    const list = objectList('packageMap', (x, p) => {
      let ok = true;
      if (typeof x.match !== 'string') {
        fail(`${p}.match`, `${p}.match must be a package id or pattern, such as Acme.Forms.Charts or Acme.Forms.*`);
        ok = false;
      } else if (packagePatternProblem(x.match)) {
        fail(`${p}.match`, `${p}.match: "${x.match.slice(0, 60)}" ${packagePatternProblem(x.match)}`);
        ok = false;
      }
      if (!Object.hasOwn(x, 'use') || (x.use !== null && !text300(x.use))) {
        fail(`${p}.use`, `${p}.use must be a text of 1 to 300 characters, or null for a package with no .NET MAUI equivalent`);
        ok = false;
      }
      if (Object.hasOwn(x, 'note') && !text300(x.note)) {
        fail(`${p}.note`, `${p}.note must be a text of 1 to 300 characters`);
        ok = false;
      }
      return ok ? { match: x.match, use: x.use, ...(Object.hasOwn(x, 'note') ? { note: x.note } : {}) } : null;
    });
    if (list) {
      const seen = new Set();
      const unique = list.filter((e) => !seen.has(asciiLower(e.match)) && seen.add(asciiLower(e.match)));
      config.packageMap = mergePackageMap(unique);
    }
  }

  if (Object.hasOwn(value, 'layouts')) {
    const list = objectList('layouts', (x, p) => {
      let ok = true;
      if (typeof x.name !== 'string' || !isTypeName(x.name)) {
        fail(`${p}.name`, `${p}.name must be the name of a type, such as RelativeLayout`);
        ok = false;
      }
      if (!text300(x.use)) {
        fail(`${p}.use`, `${p}.use must be a text of 1 to 300 characters`);
        ok = false;
      }
      return ok ? { name: x.name, use: x.use } : null;
    });
    if (list) config.layouts = list.filter((e, i) => list.findIndex((x) => x.name === e.name) === i);
  }

  // A list of texts, each checked; null when the list itself is not usable.
  const textList = (path, list, check) => {
    if (!Array.isArray(list)) {
      fail(path, `${path} must be a list, not ${kindOf(list)}`);
      return null;
    }
    if (list.length > CONFIG_LIMITS.maxListEntries) {
      fail(path, `${path} holds more than ${CONFIG_LIMITS.maxListEntries} entries`);
      return null;
    }
    const out = [];
    list.forEach((x, i) => {
      const p = `${path}[${i}]`;
      if (typeof x !== 'string') fail(p, `${p} must be a text, not ${kindOf(x)}`);
      else if (check(x)) fail(p, `${p}: "${x.slice(0, 60)}" ${check(x)}`);
      else if (!out.includes(x)) out.push(x);
    });
    return out;
  };
  if (Object.hasOwn(value, 'keepPackages')) {
    const list = textList('keepPackages', value.keepPackages, packagePatternProblem);
    if (list) config.keepPackages = list;
  }
  if (Object.hasOwn(value, 'exclude')) {
    const list = textList('exclude', value.exclude, pathPatternProblem);
    if (list) config.exclude = list;
  }

  for (const key of ['minSeverity', 'failOn']) {
    if (!Object.hasOwn(value, key)) continue;
    if (!LEVELS.includes(value[key])) fail(key, `${key} must be one of ${LEVELS.join(', ')}`);
    else config[key] = value[key];
  }
  // The problems in the order of their lines, so the list reads like the file.
  if (problems.length) throw new ConfigError(problems.sort((a, b) => a.line - b.line).map((p) => p.text));
  return config;
}

// Reads the text of a configuration file.
export function readConfig(text, file) {
  let parsed;
  try {
    parsed = parseJson(text, { linesUpTo: 4 });
  } catch (error) {
    if (error instanceof JsonError) throw new ConfigError([`${file}: ${jsonProblem(error, text)}`]);
    throw error;
  }
  return validateConfig(parsed.value, parsed.lines, file);
}
