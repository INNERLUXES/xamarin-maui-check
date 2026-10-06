import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLATFORM_GUIDS, XmlError, legacyFramework, readPackagesConfig, readProject, readSolution } from '../src/index.js';
import { ANDROID_GUIDS, IOS_GUIDS, SOLUTION, UWP_GUIDS, lineOf, oldProject, packagesConfig, sdkProject } from './helpers.js';

// Solutions, projects and packages.config.

test('solution: project entries with their paths in forward slashes, solution folders passed over', () => {
  const text = `${SOLUTION}Project("{2150E333-8FDC-42A3-9474-1A3956D46DE8}") = "Docs", "Docs", "{5A4B3C2D-1E0F-4A9B-8C7D-6E5F4A3B2C1D}"\nEndProject\nProject("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "App.Android", "Heads\\App.Android\\App.Android.csproj", "{6B5A4C3D-2E1F-4B0A-9D8C-7F6E5D4C3B2A}"\nEndProject\n`;
  assert.deepEqual(readSolution(text).map((e) => [e.name, e.path]), [['App', 'App/App.csproj'], ['App.Android', 'Heads/App.Android/App.Android.csproj']]);
  assert.deepEqual(readSolution('no projects here'), []);
});

test('project: SDK-style or old-style, properties, package references with a Version attribute or element', () => {
  const sdk = readProject(sdkProject([['Xamarin.Forms', '5.0.0.2622']]));
  assert.equal(sdk.sdk, true);
  assert.equal(sdk.platform, null);
  assert.deepEqual(sdk.packages.map((p) => [p.id, p.version]), [['Xamarin.Forms', '5.0.0.2622']]);
  const text = '<Project>\n  <PropertyGroup>\n    <OutputType>Exe</OutputType>\n  </PropertyGroup>\n  <ItemGroup>\n    <PackageReference Include="Acme.Json">\n      <Version>2.1.0</Version>\n    </PackageReference>\n    <PackageReference Update="Acme.Other" Version="1.0.0" />\n    <PackageReference Include="Acme.Bare" />\n  </ItemGroup>\n</Project>\n';
  const old = readProject(text);
  assert.equal(old.sdk, false);
  assert.equal(old.properties.get('OutputType').value, 'Exe');
  assert.deepEqual(old.packages.map((p) => [p.id, p.version]), [['Acme.Json', '2.1.0'], ['Acme.Bare', '']]);
  assert.equal(old.packages[0].offset, text.indexOf('Include="Acme.Json"'));
  assert.throws(() => readProject('<Root/>'), (e) => e instanceof XmlError && /the root element is <Root>, not <Project>/.test(e.reason));
});

test('project: the platform from the project type GUIDs, the properties and the target frameworks', () => {
  assert.equal(readProject(oldProject({ ProjectTypeGuids: ANDROID_GUIDS })).platform, 'android');
  assert.equal(readProject(oldProject({ AndroidApplication: 'True' })).platform, 'android');
  assert.equal(readProject(oldProject({ ProjectTypeGuids: IOS_GUIDS })).platform, 'ios');
  assert.equal(readProject(oldProject({ TargetFrameworkIdentifier: 'Xamarin.iOS' })).platform, 'ios');
  assert.equal(readProject(oldProject({ ProjectTypeGuids: UWP_GUIDS })).platform, 'uwp');
  assert.equal(readProject(oldProject({ TargetPlatformIdentifier: 'UAP' })).platform, 'uwp');
  assert.equal(readProject(sdkProject([], 'xamarin.mac20')).platform, 'mac');
  const android = oldProject({ ProjectTypeGuids: ANDROID_GUIDS, TargetFrameworkVersion: 'v12.1' });
  const m = readProject(android);
  assert.deepEqual(m.frameworks.map((f) => [f.text, f.platform]), [['MonoAndroid v12.1', 'android']]);
  assert.equal(m.frameworks[0].offset, android.indexOf('<TargetFrameworkVersion>'));
  assert.ok(lineOf(android, '<TargetFrameworkVersion>') > 1);
  assert.deepEqual(readProject(oldProject({ ProjectTypeGuids: UWP_GUIDS, TargetPlatformVersion: '10.0.18362.0' })).frameworks.map((f) => f.text), ['UAP 10.0.18362.0']);
  assert.deepEqual(readProject(oldProject({ ProjectTypeGuids: ANDROID_GUIDS })).frameworks, [], 'no version, no framework to name');
  assert.deepEqual(readProject(sdkProject([], ' netstandard2.0 ; MonoAndroid13.0 ;')).frameworks.map((f) => f.text), ['MonoAndroid13.0']);
  assert.equal(PLATFORM_GUIDS.ios, 'feacfbd2-3405-455c-9665-78fe426c6842');
});

test('legacyFramework: the Xamarin target framework monikers and the .NET ones next to them', () => {
  for (const [tfm, platform] of [['monoandroid13.0', 'android'], ['MonoAndroid10.0', 'android'], ['xamarinios10', 'ios'], ['Xamarin.iOS10', 'ios'], ['xamarinmac20', 'mac'], ['xamarintvos10', 'tvos'], ['xamarinwatchos10', 'watchos'], ['uap10.0.16299', 'uwp'], ['net8.0-android', null], ['net8.0-ios', null], ['netstandard2.0', null], ['net48', null]]) assert.equal(legacyFramework(tfm), platform, tfm);
});

test('packages.config: the packages with their ids and versions, and what is refused', () => {
  const text = packagesConfig([['Xamarin.Forms', '5.0.0.2622'], ['Acme.Json', '2.1.0']]);
  assert.deepEqual(readPackagesConfig(text).map((p) => [p.id, p.version, p.offset]), [['Xamarin.Forms', '5.0.0.2622', text.indexOf('id="Xamarin.Forms"')], ['Acme.Json', '2.1.0', text.indexOf('id="Acme.Json"')]]);
  assert.throws(() => readPackagesConfig('<packages><package version="1.0.0"/></packages>'), /a <package> element with no id/);
  assert.throws(() => readPackagesConfig('<Project/>'), /not <packages>/);
  assert.deepEqual(readPackagesConfig('<packages><package id="A"/><other id="B"/></packages>').map((p) => [p.id, p.version]), [['A', '']]);
});
