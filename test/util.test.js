import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { EFFORT_WEIGHTS, FILE_LIMITS, KIND_WORDS, LIMITS, MAX_PATTERN_LENGTH, OPEN_FLAGS, RULES, SKIPPED_FOLDERS, WALK_LIMITS, asciiLower, atOrAbove, baseName, byCode, capped, checkProject, decide, defaultConfig, displayPath, effortOf, excluded, fileError, flat, folderOf, globMatch, grouped, inspectPath, joinPath, kindOfFile, levelOf, listText, placer, plural, readBounded, readInputFile, readText, readTextFile, ruleById, safeText, textOf, walkProject } from '../src/index.js';
import { PROJECT, withFiles } from './helpers.js';

test('glob: path and package patterns with *, ?, ** and **/', () => {
  for (const [p, t] of [['Samples/**', 'Samples/a/Page.cs'], ['Samples/**', 'Samples/'], ['**/Tests/**', 'x/Tests/A.cs'], ['**/Tests/**', 'Tests/a'], ['*.cs', 'A.cs'], ['a?c', 'abc'], ['**', 'a/b/c'], ['**/A.cs', 'A.cs'], ['a/**/b', 'a/b'], ['a/**/b', 'a/x/y/b'], ['xamarin.androidx.*', 'xamarin.androidx.core']]) assert.ok(globMatch(p, t), `${p} ${t}`);
  for (const [p, t] of [['Samples/**', 'Samples'], ['*.cs', 'a/A.cs'], ['a?c', 'a/c'], ['a', 'ab'], ['ab', 'a'], ['**/x', 'ax']]) assert.ok(!globMatch(p, t), `${p} ${t}`);
  assert.ok(excluded(['Samples/**'], 'Samples', true) && !excluded(['Samples/**'], 'Samples', false) && !excluded([], 'x'));
  assert.equal(MAX_PATTERN_LENGTH, 200);
});

test('words, sizes and text: ASCII lowercase, paths, lists, plurals and cleaned text', () => {
  assert.equal(asciiLower('App.CSPROJ'), 'app.csproj');
  assert.equal(baseName('App/App.csproj'), 'App.csproj');
  assert.equal(folderOf('App/App.csproj'), 'App');
  assert.equal(folderOf('App.csproj'), '.');
  assert.equal(joinPath('.', 'a'), 'a');
  assert.equal(joinPath('a', ''), 'a');
  assert.equal(byCode('B', 'a'), -1);
  assert.equal(grouped(1234567), '1,234,567');
  assert.equal(listText(['a', 'b', 'c', 'd'], 2), 'a, b and 2 more');
  assert.equal(listText(['a', 'b']), 'a and b');
  assert.equal(plural(1, 'project'), '1 project');
  assert.equal(plural(2, 'project'), '2 projects');
  assert.equal(plural(2, 'entry', 'entries'), '2 entries');
  assert.equal(safeText('a\u0007b\u202ec\u2028d', 100), 'a b c d');
  assert.equal(safeText('x'.repeat(20), 10), 'xxxxxxx...');
  assert.equal(flat(' a \n b '), 'a b');
});

test('rules: the levels, the result, the input problems and the effort score', () => {
  assert.ok(atOrAbove('error', 'warning'));
  assert.ok(!atOrAbove('info', 'warning'));
  assert.equal(ruleById('custom-renderer').key, 'customRenderer');
  assert.equal(levelOf(ruleById('unreadable-file'), defaultConfig()), 'error');
  assert.deepEqual(decide([{ level: 'warning' }], 'error'), { pass: true, failOn: 'error', failing: 0, byLevel: { error: 0, warning: 1, info: 0 }, text: 'PASS - no finding at or above error (1 warning)' });
  assert.equal(decide([{ level: 'error' }, { level: 'error' }], 'error').text, 'FAIL - 2 findings at or above error (2 error)');
  assert.equal(capped(Array.from({ length: 25 }, (_, i) => `p${i}`)).at(-1), 'and 5 more');
  assert.equal(RULES.filter((r) => r.key === null).length, 2);
  assert.equal(RULES.length, 17);
  const weighted = Object.values(EFFORT_WEIGHTS).flatMap((w) => Object.keys(w));
  assert.deepEqual([...weighted].sort(), RULES.filter((r) => r.key !== null).map((r) => r.id).sort(), 'every rule of the configuration has a weight, once');
  assert.deepEqual(effortOf([{ rule: 'custom-renderer' }, { rule: 'custom-renderer' }, { rule: 'replace-package' }, { rule: 'scan-limit' }]).total, 11);
});

test('files: bounded reading, UTF-8 and UTF-16 by the byte order mark, and paths as shown', async () => {
  const utf16le = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('a = 1', 'utf16le')]);
  const utf16be = Buffer.from(Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from('a = 1', 'utf16le')]).map((b, i, all) => (i < 2 ? b : all[i % 2 === 0 ? i + 1 : i - 1])));
  await withFiles({ 'a/x.cs': 'x\n', 'a/big.bin': Buffer.alloc(3000, 1), 'a/latin.csproj': Buffer.from([0x61, 0xe9]), 'a/le.txt': utf16le, 'a/bad.xaml': '<a>' }, async (dir) => {
    assert.equal((await readBounded(resolve(dir, 'a/x.cs'), 100)).toString(), 'x\n');
    await assert.rejects(readBounded(resolve(dir, 'a/big.bin'), 100), /3,000 bytes is over the 100 byte limit/);
    await assert.rejects(readBounded(resolve(dir, 'a'), 100), /is a folder/);
    await assert.rejects(readBounded(resolve(dir, 'none'), 100), /no such file/);
    assert.deepEqual(await readText(resolve(dir, 'a/le.txt'), 'a/le.txt', 100), { size: 12, text: 'a = 1', encoding: 'utf-16le' });
    assert.equal(displayPath(resolve(dir, 'a/x.cs'), dir), 'a/x.cs');
    assert.equal(displayPath(dir, dir), '.');
    assert.ok(!displayPath(resolve(dir, '..', 'x'), dir).startsWith('..'));
    assert.equal((await inspectPath('a', dir)).folder, true);
    await assert.rejects(inspectPath('none', dir), /no such file or folder/);
    await assert.rejects(readTextFile('a', dir, 100), /is a folder; give the file itself/);
    const r = await readInputFile(resolve(dir, 'a/latin.csproj'), 'a/latin.csproj', 'project', defaultConfig());
    assert.match(r.problem.found, /the project file cannot be read: .*not valid UTF-8/);
    const x = await readInputFile(resolve(dir, 'a/bad.xaml'), 'a/bad.xaml', 'xaml', defaultConfig());
    assert.match(x.problem.found, /the XAML file cannot be read as XML: the element <a> is not closed/);
    const c = await readInputFile(resolve(dir, 'a/x.cs'), 'a/x.cs', 'code', defaultConfig());
    assert.deepEqual([c.item.file, c.item.scan.renderers, c.problem], ['a/x.cs', [], null]);
  });
  assert.deepEqual(textOf(Buffer.from('\ufeffx'), 'f'), { text: 'x', encoding: 'utf-8' });
  assert.deepEqual(textOf(utf16be, 'f'), { text: 'a = 1', encoding: 'utf-16be' });
  assert.throws(() => textOf(Buffer.from([0xff]), 'f'), /not valid UTF-8/);
  assert.throws(() => textOf(Buffer.from('<a/>', 'utf16le'), 'f'), /a null byte\); a UTF-16 file needs its byte order mark/);
  assert.throws(() => textOf(Buffer.from([0xff, 0xfe, 0x41]), 'f'), /odd number of bytes/);
  assert.throws(() => textOf(Buffer.from([0xff, 0xfe, 0x00, 0xd8, 0x41, 0x00]), 'f'), /not valid UTF-16/);
  assert.throws(() => textOf(Buffer.from([0xff, 0xfe, 0x00, 0x00]), 'f'), /a null character/);
  assert.equal(fileError('p', 'r').reason, 'r');
  assert.equal(typeof OPEN_FLAGS, 'number');
  assert.equal(FILE_LIMITS.maxFileBytes, 4 * 1024 * 1024);
  assert.equal(KIND_WORDS.packages, 'packages.config');
});

test('walk: the files below a folder in the order of their paths, with bin, obj, packages, .git and .vs passed over in any case', async () => {
  await withFiles({
    'r/App.sln': 'x',
    'r/App/App.csproj': 'x',
    'r/App/packages.config': 'x',
    'r/App/Page.xaml': 'x',
    'r/App/Page.XAML.cs': 'x',
    'r/Droid/Properties/AndroidManifest.xml': 'x',
    'r/iOS/Info.plist': 'x',
    'r/App/readme.md': 'x',
    'r/App/bin/Debug/A.cs': 'x',
    'r/App/Obj/A.cs': 'x',
    'r/packages/Pkg/A.cs': 'x',
    'r/.git/A.cs': 'x',
    'r/.vs/A.cs': 'x',
    'r/Samples/A.cs': 'x'
  }, async (dir) => {
    const w = await walkProject(resolve(dir, 'r'), { exclude: ['Samples/**'] });
    assert.deepEqual(w.files.map((f) => [f.rel, f.kind]), [['App.sln', 'solution'], ['App/App.csproj', 'project'], ['App/Page.XAML.cs', 'code'], ['App/Page.xaml', 'xaml'], ['App/packages.config', 'packages'], ['Droid/Properties/AndroidManifest.xml', 'androidManifest'], ['iOS/Info.plist', 'infoPlist']]);
    assert.deepEqual([w.skipped, w.excluded, w.links, w.others, w.limit], [5, 1, 0, 1, null]);
    assert.match((await walkProject(resolve(dir, 'r'), { limits: { maxInputFiles: 2 } })).limit, /more than 2 solution, project, package, C#, XAML and manifest files/);
  });
  for (const [name, kind] of [['A.sln', 'solution'], ['.sln', null], ['A.CSPROJ', 'project'], ['A.vbproj', null], ['packages.config', 'packages'], ['app.config', null], ['A.cs', 'code'], ['A.csx', null], ['A.xaml', 'xaml'], ['androidmanifest.xml', 'androidManifest'], ['Info.plist', 'infoPlist'], ['Entitlements.plist', null]]) assert.equal(kindOfFile(name), kind, name);
  assert.deepEqual(SKIPPED_FOLDERS, ['bin', 'obj', 'packages', '.git', '.vs']);
  assert.equal(WALK_LIMITS.maxProjectEntries, 50000);
});

test('check: checkProject builds the report of a run without the command line, and the pieces it uses', async () => {
  await withFiles(PROJECT, async (dir) => {
    const r = await checkProject({ project: 'p', base: dir, version: '9.9.9' });
    assert.equal(r.version, '9.9.9');
    assert.equal(r.result.pass, true);
    assert.equal(r.input.projectFiles, 1);
    assert.equal(r.projects.length, 1);
  });
  const place = placer('a\nbc\r\nd');
  assert.deepEqual(place(3), { line: 2, column: 2 });
  assert.deepEqual(place(99), { line: 3, column: 2 });
  assert.equal(LIMITS.maxFindingsPerRule, 500);
});
