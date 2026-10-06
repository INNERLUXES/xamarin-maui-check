import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG_LIMITS, ConfigError, DEFAULT_EXCLUDE, DEFAULT_KEEP_PACKAGES, DEFAULT_LAYOUTS, DEFAULT_PACKAGE_BASIS, DEFAULT_PACKAGE_MAP, DEFAULT_RULES, KEYS, POINTS, defaultConfig, defaultsAsConfig, distance, isObject, isTypeName, kindOf, mergePackageMap, packagePatternProblem, pathPatternProblem, readConfig, suggestion, validateConfig } from '../src/index.js';
import { P, PROJECT, configOf, projectWith, run, sdkProject } from './helpers.js';

// The configuration file: every key with a good value and a bad one, unknown keys with their line and a suggestion,
// and a key named twice refused.

const problems = (text) => {
  try {
    readConfig(text, 'c.json');
  } catch (error) {
    assert.ok(error instanceof ConfigError);
    return error.problems;
  }
  return [];
};

test('config: the defaults, and --print-defaults read back give the same configuration', () => {
  const d = defaultConfig();
  assert.deepEqual(d.rules, DEFAULT_RULES);
  assert.deepEqual(d.packageMap, DEFAULT_PACKAGE_MAP);
  assert.deepEqual(d.keepPackages, DEFAULT_KEEP_PACKAGES);
  assert.deepEqual(d.layouts, DEFAULT_LAYOUTS);
  assert.deepEqual(d.exclude, DEFAULT_EXCLUDE);
  assert.equal(d.minSeverity, 'info');
  assert.equal(d.failOn, 'error');
  const back = readConfig(JSON.stringify(defaultsAsConfig()), 'd.json');
  assert.deepEqual({ ...back, file: null, name: null }, d);
  assert.deepEqual(Object.keys(KEYS), ['name', 'rules', 'packageMap', 'keepPackages', 'layouts', 'exclude', 'minSeverity', 'failOn']);
  d.keepPackages.push('x');
  d.packageMap[0].use = 'changed';
  assert.equal(defaultConfig().keepPackages.length, 2, 'the defaults are copied, never shared');
  assert.notEqual(defaultConfig().packageMap[0].use, 'changed');
  assert.deepEqual(Object.entries(DEFAULT_RULES).filter(([, v]) => v === 'error').map(([k]) => k), ['noMauiEquivalent']);
});

test('config: the default package table is short, has no package with no equivalent, and every entry names a point of a public page', () => {
  assert.ok(DEFAULT_PACKAGE_MAP.length <= 10);
  assert.ok(DEFAULT_PACKAGE_MAP.every((e) => typeof e.use === 'string'));
  assert.deepEqual(Object.keys(DEFAULT_PACKAGE_BASIS), DEFAULT_PACKAGE_MAP.map((e) => e.match));
  for (const key of Object.values(DEFAULT_PACKAGE_BASIS)) assert.ok(POINTS[key], key);
  assert.deepEqual(DEFAULT_PACKAGE_MAP.slice(0, 3).map((e) => [e.match, e.use.split(/[ ,;]/)[0]]), [['Xamarin.Forms', 'Microsoft.Maui.Controls'], ['Xamarin.Essentials', 'the'], ['Xamarin.CommunityToolkit', 'CommunityToolkit.Maui']]);
});

test('config: every key with a good value is taken; packageMap adds to the table, the other lists replace theirs', () => {
  const c = configOf({ name: 'Review', rules: { customRenderer: 'error', graphicsType: 'off' }, packageMap: [{ match: 'Acme.Forms.*', use: null, note: 'gone' }, { match: 'xamarin.forms', use: 'Microsoft.Maui.Controls 8' }, { match: 'Acme.Forms.*', use: 'twice' }], keepPackages: ['Xamarin.Kotlin.*', 'Xamarin.Kotlin.*'], layouts: [{ name: 'AbsoluteLayout', use: 'Grid' }], exclude: ['Samples/**'], minSeverity: 'warning', failOn: 'warning' });
  assert.equal(c.name, 'Review');
  assert.equal(c.rules.customRenderer, 'error');
  assert.equal(c.rules.graphicsType, 'off');
  assert.deepEqual(c.packageMap.slice(0, 2), [{ match: 'Acme.Forms.*', use: null, note: 'gone' }, { match: 'xamarin.forms', use: 'Microsoft.Maui.Controls 8' }]);
  assert.equal(c.packageMap.length, DEFAULT_PACKAGE_MAP.length + 1, 'an entry with the match of a default takes its place, and a match given twice is kept once');
  assert.deepEqual(c.keepPackages, ['Xamarin.Kotlin.*']);
  assert.deepEqual(c.layouts, [{ name: 'AbsoluteLayout', use: 'Grid' }]);
  assert.deepEqual(c.exclude, ['Samples/**']);
  assert.equal(c.minSeverity, 'warning');
  assert.equal(c.failOn, 'warning');
  assert.deepEqual(mergePackageMap([]), DEFAULT_PACKAGE_MAP);
});

test('config: an unknown key is an error with its line and a suggestion, at the top, in rules and in a list entry', () => {
  assert.deepEqual(problems('{\n  "failOm": "error"\n}'), ['c.json: line 2: "failOm" is not a key of the configuration; did you mean "failOn"?']);
  assert.deepEqual(problems('{\n  "rules": {\n    "customRenderers": "off"\n  }\n}'), ['c.json: line 3: "customRenderers" is not a key of rules; did you mean "customRenderer"?']);
  assert.deepEqual(problems('{"packageMaps": []}'), ['c.json: line 1: "packageMaps" is not a key of the configuration; did you mean "packageMap"?']);
  assert.deepEqual(problems('{\n  "packageMap": [\n    {"match": "A", "uze": "x"}\n  ]\n}'), ['c.json: line 3: "uze" is not a key of packageMap; did you mean "use"?', 'c.json: line 3: packageMap[0].use must be a text of 1 to 300 characters, or null for a package with no .NET MAUI equivalent']);
  assert.deepEqual(problems('{"layouts": [{"nam": "A", "use": "B"}]}'), ['c.json: line 1: "nam" is not a key of layouts; did you mean "name"?', 'c.json: line 1: layouts[0].name must be the name of a type, such as RelativeLayout']);
  assert.deepEqual(problems('{"colour": 1}'), ['c.json: line 1: "colour" is not a key of the configuration']);
});

test('config: a value of the wrong kind is an error, and all problems are listed in the order of their lines', () => {
  const p = problems('{\n  "name": "",\n  "rules": {"effect": "loud", "deviceApi": 3},\n  "packageMap": [{"match": "a b", "use": ""}, 5, {"match": 1, "use": "x", "note": ""}],\n  "keepPackages": ["Xamarin/*", 2],\n  "layouts": [{"name": "1x", "use": "x"}, {"name": "A", "use": 4}],\n  "exclude": ["/abs", "a\\\\b", "../up", ""],\n  "minSeverity": "fatal",\n  "failOn": null\n}');
  assert.deepEqual(p, [
    'c.json: line 2: name must be a text of 1 to 120 characters',
    'c.json: line 3: rules.effect must be one of info, warning, error, off, not "loud"',
    'c.json: line 3: rules.deviceApi must be one of info, warning, error, off, not 3',
    'c.json: line 4: packageMap[0].match: "a b" holds a character other than letters, digits, . _ - * and ?',
    'c.json: line 4: packageMap[0].use must be a text of 1 to 300 characters, or null for a package with no .NET MAUI equivalent',
    'c.json: line 4: packageMap[1] must be an object, not a number',
    'c.json: line 4: packageMap[2].match must be a package id or pattern, such as Acme.Forms.Charts or Acme.Forms.*',
    'c.json: line 4: packageMap[2].note must be a text of 1 to 300 characters',
    'c.json: line 5: keepPackages[0]: "Xamarin/*" holds a character other than letters, digits, . _ - * and ?',
    'c.json: line 5: keepPackages[1] must be a text, not a number',
    'c.json: line 6: layouts[0].name must be the name of a type, such as RelativeLayout',
    'c.json: line 6: layouts[1].use must be a text of 1 to 300 characters',
    'c.json: line 7: exclude[0]: "/abs" is absolute; write it relative to the folder',
    'c.json: line 7: exclude[1]: "a\\b" uses a backslash; write paths with forward slashes',
    'c.json: line 7: exclude[2]: "../up" leaves the folder with ..',
    'c.json: line 7: exclude[3]: "" must be 1 to 200 characters',
    'c.json: line 8: minSeverity must be one of info, warning, error',
    'c.json: line 9: failOn must be one of info, warning, error'
  ]);
  assert.deepEqual(problems('{"rules": []}'), ['c.json: line 1: rules must be an object, not a list']);
  assert.deepEqual(problems('{"packageMap": {}}'), ['c.json: line 1: packageMap must be a list, not an object']);
  assert.deepEqual(problems('{"exclude": "x"}'), ['c.json: line 1: exclude must be a list, not a string']);
  assert.deepEqual(problems(`{"keepPackages": ${JSON.stringify(Array(CONFIG_LIMITS.maxListEntries + 1).fill('a'))}}`), [`c.json: line 1: keepPackages holds more than ${CONFIG_LIMITS.maxListEntries} entries`]);
  assert.deepEqual(problems(`{"layouts": ${JSON.stringify(Array(CONFIG_LIMITS.maxListEntries + 1).fill({ name: 'A', use: 'B' }))}}`), [`c.json: line 1: layouts holds more than ${CONFIG_LIMITS.maxListEntries} entries`]);
});

test('config: JSON that is not strict, a name given twice and a value that is not an object are refused', () => {
  assert.match(problems('{"failOn": "error",}')[0], /c\.json: line 1, column 20: a comma before the closing brace/);
  assert.match(problems('{"failOn": "error", "failOn": "info"}')[0], /appears twice in one object/);
  assert.match(problems('// comment\n{}')[0], /a comment; JSON has no comments/);
  assert.deepEqual(problems('[]'), ['c.json: line 1: the configuration must be a JSON object, not a list']);
  assert.throws(() => validateConfig('x'), ConfigError);
});

test('config: the suggestion and the checks of names and patterns', () => {
  assert.equal(distance('nmae', 'name'), 1);
  assert.equal(suggestion('x'.repeat(70), ['name']), '');
  assert.equal(suggestion('zzzzzz', ['name']), '');
  assert.equal(kindOf(null), 'null');
  assert.equal(kindOf({}), 'an object');
  assert.ok(isObject({}) && !isObject([]));
  assert.ok(isTypeName('RelativeLayout') && !isTypeName('Relative Layout') && !isTypeName('1A'));
  assert.equal(packagePatternProblem('Acme.Forms.*'), null);
  assert.match(packagePatternProblem(''), /must be 1 to 200 characters/);
  assert.equal(pathPatternProblem('**/Tests/**'), null);
  assert.match(pathPatternProblem('C:/x'), /absolute/);
  assert.match(pathPatternProblem('a\u0001'), /control character/);
});

test('config: through a run, a rule set to off gives no finding and a note, and a bad configuration stops the run with exit code 2', async () => {
  const files = projectWith({ [P]: sdkProject([['Xamarin.Forms', '5.0.0.2622']]), 'c.json': '{"rules": {"replacePackage": "off"}}' });
  const r = await run(files, ['p', '--config', 'c.json']);
  assert.equal(r.code, 0);
  assert.match(r.out, /findings: 0\n/);
  assert.match(r.out, /note: 1 rule is off: replace-package\n/);
  const bad = await run({ ...PROJECT, 'c.json': '{"failon": "info"}' }, ['p', '--config', 'c.json']);
  assert.equal(bad.code, 2);
  assert.equal(bad.out, '');
  assert.match(bad.err, /^xamarin-maui-check: no result, the input has a problem:\n {2}c\.json: line 1: "failon" is not a key of the configuration; did you mean "failOn"\?\n$/);
  const missing = await run(PROJECT, ['p', '--config', 'none.json']);
  assert.match(missing.err, /none\.json: no such file or folder/);
  const off = await run({ ...PROJECT, 'c.json': '{"rules": {"unreadableFile": "off"}}' }, ['p', '--config', 'c.json']);
  assert.equal(off.code, 2, 'the rules of input problems have no key');
});
