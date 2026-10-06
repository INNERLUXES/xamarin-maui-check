import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEVICE_REPLACEMENTS, PLATFORMS, classifyPackage, ownerOf } from '../src/index.js';
import { ANDROID_GUIDS, C, FORMS_NS, IOS_GUIDS, MAUI_NS, P, PROJECT, UWP_GUIDS, X, columnOf, configOf, cs, findingsOf, lineOf, oldProject, packagesConfig, projectWith, reportOf, rulesOf, sdkProject, xaml } from './helpers.js';

// Every rule through a whole run, with the form that is reported and the form next to it that is not.

test('the folder with nothing to migrate gives no finding', async () => {
  const r = await reportOf(PROJECT);
  assert.deepEqual(r.findings, []);
  assert.equal(r.result.pass, true);
  assert.equal(r.summary.projects, 1);
  assert.equal(r.effort.total, 0);
});

test('non-sdk-project: a project with no Sdk is reported at its Project element; Sdk in any of its three forms is not', async () => {
  const old = oldProject({ OutputType: 'Library', TargetFramework: 'netstandard2.0' });
  const r = await reportOf(projectWith({ [P]: old }));
  assert.deepEqual(findingsOf(r, 'non-sdk-project').map((f) => [f.line, f.column]), [[lineOf(old, '<Project'), 1]]);
  assert.match(findingsOf(r, 'non-sdk-project')[0].found, /the project App is in the old project format/);
  for (const sdk of ['<Project Sdk="Microsoft.NET.Sdk">\n</Project>', '<Project>\n  <Sdk Name="Microsoft.NET.Sdk" />\n</Project>', '<Project>\n  <Import Project="Sdk.props" Sdk="Microsoft.NET.Sdk" />\n</Project>']) {
    assert.deepEqual(await rulesOf(projectWith({ [P]: sdk })), [], sdk);
  }
});

test('platform-head and legacy-target-framework: Android, iOS and UWP heads by GUID, by framework and by property', async () => {
  const android = oldProject({ ProjectTypeGuids: ANDROID_GUIDS, TargetFrameworkVersion: 'v13.0' });
  const r = await reportOf(projectWith({ [P]: android }));
  assert.deepEqual(r.findings.map((f) => f.rule).sort(), ['legacy-target-framework', 'non-sdk-project', 'platform-head']);
  assert.match(findingsOf(r, 'platform-head')[0].found, /the Android head of the solution: in a \.NET MAUI single project its code and resources go to Platforms\/Android/);
  const tfm = findingsOf(r, 'legacy-target-framework')[0];
  assert.equal(tfm.line, lineOf(android, '<TargetFrameworkVersion>'));
  assert.match(tfm.found, /targets MonoAndroid v13\.0, a Xamarin framework: on \.NET the target is net8\.0-android/);
  const ios = await reportOf(projectWith({ [P]: oldProject({ ProjectTypeGuids: IOS_GUIDS }) }));
  assert.match(findingsOf(ios, 'legacy-target-framework')[0].found, /targets Xamarin\.iOS, a Xamarin framework: on \.NET the target is net8\.0-ios/);
  assert.match(findingsOf(ios, 'platform-head')[0].found, /iOS head/);
  const uwp = await reportOf(projectWith({ [P]: oldProject({ ProjectTypeGuids: UWP_GUIDS, TargetPlatformVersion: '10.0.19041.0' }) }));
  assert.match(findingsOf(uwp, 'legacy-target-framework')[0].found, /UAP 10\.0\.19041\.0/);
  assert.match(findingsOf(uwp, 'platform-head')[0].found, /Platforms\/Windows/);
  const byIdentifier = await reportOf(projectWith({ [P]: oldProject({ TargetFrameworkIdentifier: 'Xamarin.iOS' }) }));
  assert.equal(findingsOf(byIdentifier, 'platform-head').length, 1);
  const sdkHead = await reportOf(projectWith({ [P]: sdkProject([], 'monoandroid13.0;xamarinios10;xamarinwatchos10') }));
  assert.deepEqual(findingsOf(sdkHead, 'legacy-target-framework').map((f) => f.found.split(',')[0]), ['the project targets monoandroid13.0', 'the project targets xamarinios10', 'the project targets xamarinwatchos10']);
  assert.match(findingsOf(sdkHead, 'legacy-target-framework')[2].found, /\.NET has no target for it/);
  assert.equal(findingsOf(sdkHead, 'non-sdk-project').length, 0);
  // Near misses: .NET targets, and an old-style library with no platform.
  assert.deepEqual(await rulesOf(projectWith({ [P]: sdkProject([], 'net8.0-android;net8.0-ios;netstandard2.0') })), []);
  assert.deepEqual(await rulesOf(projectWith({ [P]: oldProject({ TargetFrameworkVersion: 'v4.8' }) })), ['non-sdk-project']);
});

test('packages: the table of replacements, packages with no equivalent, Xamarin packages to check, kept packages and others', async () => {
  const project = sdkProject([['Xamarin.Forms', '5.0.0.2622'], ['xamarin.essentials', '1.8.1'], ['SkiaSharp.Views.Forms', '2.88.6'], ['Xamarin.Forms.Visual.Material', '5.0.0.2622'], ['Acme.Forms.Popups', '3.1.0'], ['Xamarin.AndroidX.Core', '1.12.0.2'], ['Acme.Formsy', '1.0.0'], ['Acme.Json', '2.1.0']]);
  const r = await reportOf(projectWith({ [P]: project }));
  assert.deepEqual(r.findings.map((f) => [f.rule, f.found.split(' ').slice(2, 3).join('')]), [
    ['replace-package', 'Xamarin.Forms'],
    ['replace-package', 'xamarin.essentials'],
    ['replace-package', 'SkiaSharp.Views.Forms'],
    ['unknown-xamarin-package', 'Xamarin.Forms.Visual.Material'],
    ['unknown-xamarin-package', 'Acme.Forms.Popups']
  ]);
  assert.equal(r.findings[0].line, lineOf(project, 'Include="Xamarin.Forms"'));
  assert.equal(r.findings[0].column, columnOf(project, 'Include="Xamarin.Forms"'));
  assert.match(r.findings[2].found, /on \.NET MAUI use SkiaSharp\.Views\.Maui\.Controls/);
  assert.deepEqual(r.packages.map((p) => [p.package, p.status]), [['Acme.Forms.Popups', 'check'], ['Acme.Formsy', 'other'], ['Acme.Json', 'other'], ['SkiaSharp.Views.Forms', 'replace'], ['Xamarin.AndroidX.Core', 'keep'], ['xamarin.essentials', 'replace'], ['Xamarin.Forms', 'replace'], ['Xamarin.Forms.Visual.Material', 'check']]);
  const configured = await reportOf({ ...projectWith({ [P]: project }), 'c.json': JSON.stringify({ packageMap: [{ match: 'Acme.Forms.*', use: null, note: 'the vendor stopped' }, { match: 'Xamarin.Forms', use: 'Microsoft.Maui.Controls and a review' }], keepPackages: [] }) }, ['p', '--config', 'c.json']);
  assert.match(findingsOf(configured, 'no-maui-equivalent')[0].found, /the package Acme\.Forms\.Popups 3\.1\.0 has no known \.NET MAUI equivalent: the vendor stopped/);
  assert.match(findingsOf(configured, 'replace-package')[0].found, /use Microsoft\.Maui\.Controls and a review$/);
  assert.ok(findingsOf(configured, 'unknown-xamarin-package').some((f) => f.found.includes('Xamarin.AndroidX.Core')), 'keepPackages replaces its default');
  assert.equal(configured.result.pass, false);
});

test('packages: packages.config is read and belongs to the project in its folder', async () => {
  const config = packagesConfig([['Xamarin.Forms', '5.0.0.2622'], ['Acme.Json', '2.1.0']]);
  const r = await reportOf(projectWith({ 'p/App/packages.config': config }));
  assert.deepEqual(r.findings.map((f) => [f.rule, f.file, f.line]), [['replace-package', 'p/App/packages.config', lineOf(config, 'id="Xamarin.Forms"')]]);
  assert.equal(r.projects[0].packages, 3);
  assert.equal(r.summary.packageReferences, 3);
});

test('custom-renderer: a class with a *Renderer base, with its ExportRenderer; an export with no class; near misses', async () => {
  const renderer = `using Xamarin.Forms;
using Xamarin.Forms.Platform.Android;

[assembly: ExportRenderer(typeof(Acme.RoundEntry), typeof(Acme.Droid.RoundEntryRenderer))]

namespace Acme.Droid
{
    public class RoundEntryRenderer : EntryRenderer
    {
    }

    public class ChartViewRenderer : ViewRenderer<Acme.Chart, Android.Views.View>, IDisposable
    {
    }

    public class Renderer : Base { }
    public class MarkdownRendererOptions : Options { }
    public class Plain : IRenderer { }
}
`;
  const other = '[assembly: Xamarin.Forms.ExportRendererAttribute(typeof(Acme.Card), typeof(CardRenderer))]\n';
  const r = await reportOf(projectWith({ 'p/App/Droid/RoundEntryRenderer.cs': renderer, 'p/App/Droid/AssemblyInfo.cs': other }));
  const found = findingsOf(r, 'custom-renderer');
  assert.deepEqual(found.map((f) => [f.file.split('/').at(-1), f.line]), [['AssemblyInfo.cs', 1], ['RoundEntryRenderer.cs', lineOf(renderer, 'EntryRenderer\n')], ['RoundEntryRenderer.cs', lineOf(renderer, 'ViewRenderer<')]]);
  assert.match(found[0].found, /ExportRenderer registers CardRenderer for Card, and no class of that name was found/);
  assert.match(found[1].found, /the class RoundEntryRenderer derives from EntryRenderer, a Xamarin\.Forms renderer, registered for RoundEntry by ExportRenderer at p\/App\/Droid\/RoundEntryRenderer\.cs:4/);
  assert.match(found[2].found, /the class ChartViewRenderer derives from ViewRenderer, a Xamarin\.Forms renderer: renderers become handlers/);
  assert.equal(r.summary.renderers, 3);
  // In a comment and a string, nothing is a renderer.
  assert.deepEqual(await rulesOf(projectWith({ [C]: cs(['// class A : EntryRenderer', 'var s = "class B : EntryRenderer";', 'var t = @"[assembly: ExportRenderer(typeof(A), typeof(B))]";']) })), []);
});

test('effect: a PlatformEffect with its ExportEffect, an export alone, and the routing effect counted', async () => {
  const effect = `[assembly: ResolutionGroupName("Acme")]
[assembly: ExportEffect(typeof(Acme.Droid.GlowEffect), "GlowEffect")]
[assembly: ExportEffect(typeof(Acme.Droid.LostEffect), "LostEffect")]
namespace Acme.Droid
{
    public class GlowEffect : PlatformEffect
    {
    }
    public class Glow : RoutingEffect
    {
    }
    public class NotAnEffect : PlatformEffectHelper
    {
    }
}
`;
  const r = await reportOf(projectWith({ 'p/App/GlowEffect.cs': effect }));
  assert.deepEqual(findingsOf(r, 'effect').map((f) => f.line), [lineOf(effect, 'ExportEffect(typeof(Acme.Droid.LostEffect)'), lineOf(effect, ': PlatformEffect\n')]);
  assert.match(findingsOf(r, 'effect')[1].found, /exported by ExportEffect at p\/App\/GlowEffect\.cs:2/);
  assert.equal(r.summary.effects, 2);
  assert.equal(r.summary.routingEffects, 1);
});

test('dependency-service, messaging-center and device-api: each call with its replacement, and the near misses', async () => {
  const code = cs([
    'var store = DependencyService.Get<IStore>();',
    'DependencyService.Register<IStore, Store>();',
    'MessagingCenter.Send(this, "Saved");',
    'MessagingCenter.Unsubscribe<Worker>(this, "Saved");',
    'if (Device.RuntimePlatform == Device.iOS) { }',
    'Device.BeginInvokeOnMainThread(() => { });',
    'Device.StartTimer(System.TimeSpan.FromSeconds(1), () => false);',
    'Device.OpenUri(uri);',
    'var idiom = Device.Idiom;',
    'var near = DeviceInfo.Platform;',
    'var store2 = MyDependencyService.Get<IStore>();',
    'var other = Device.Info;'
  ]);
  const attribute = '[assembly: Dependency(typeof(Acme.Droid.Store))]\n';
  const r = await reportOf(projectWith({ [C]: code, 'p/App/Store.cs': attribute }));
  assert.deepEqual(findingsOf(r, 'dependency-service').map((f) => [f.file.split('/').at(-1), f.line]), [['Store.cs', 1], ['Worker.cs', lineOf(code, 'DependencyService.Get')], ['Worker.cs', lineOf(code, 'DependencyService.Register')]]);
  assert.match(findingsOf(r, 'dependency-service')[0].found, /the Dependency attribute registers Store with DependencyService/);
  assert.deepEqual(findingsOf(r, 'messaging-center').map((f) => f.found.split(':')[0]), ['MessagingCenter.Send', 'MessagingCenter.Unsubscribe']);
  assert.deepEqual(findingsOf(r, 'device-api').map((f) => f.found), ['RuntimePlatform', 'BeginInvokeOnMainThread', 'StartTimer', 'OpenUri', 'Idiom'].map((m) => `Device.${m}: on .NET MAUI use ${DEVICE_REPLACEMENTS[m]}`));
  assert.equal(findingsOf(r, 'device-api')[0].column, columnOf(code, 'Device.RuntimePlatform'));
  assert.deepEqual([r.summary.dependencyService, r.summary.messagingCenter, r.summary.deviceApi], [3, 2, 5]);
});

test('forms-namespace: one finding per C# file with the count, and one per XAML file at the declaration', async () => {
  const code = cs(['var c = Xamarin.Forms.Color.Red;', 'global::Xamarin.Essentials.Preferences.Set("a", 1);'], ['System', 'Xamarin.Forms', 'Xamarin.Forms.Xaml', 'Xamarin.Essentials']);
  const page = xaml('    <Grid />');
  const r = await reportOf(projectWith({ [C]: code, [X]: page }));
  const found = findingsOf(r, 'forms-namespace');
  assert.deepEqual(found.map((f) => [f.file.split('/').at(-1), f.line, f.column]), [['MainPage.xaml', lineOf(page, 'xmlns='), columnOf(page, 'xmlns=')], ['Worker.cs', 2, 7]]);
  assert.match(found[1].found, /names the Xamarin\.Forms or Xamarin\.Essentials namespace 5 times \(3 in using directives\)/);
  assert.equal(r.summary.xamlWithForms, 1);
  // A .NET MAUI page, a namespace in a comment and a namespace of another vendor are not reported.
  assert.deepEqual(await rulesOf(projectWith({ [C]: cs(['// using Xamarin.Forms;'], ['Acme.Xamarin.Format']), [X]: xaml('<Grid />', MAUI_NS) })), []);
  const prefixed = `<?xml version="1.0"?>\n<forms:ContentPage xmlns:forms="${FORMS_NS}" />\n`;
  assert.deepEqual(await rulesOf(projectWith({ [X]: prefixed })), ['forms-namespace']);
});

test('removed-layout: RelativeLayout in Xamarin.Forms XAML and in C#, the configured list, and the near misses', async () => {
  const page = xaml('    <RelativeLayout>\n        <Label Text="a" />\n    </RelativeLayout>\n    <compat:RelativeLayout xmlns:compat="clr-namespace:Acme.Compat" />');
  const code = cs(['var layout = new RelativeLayout();', 'var other = new Acme.RelativeLayoutHelper();']);
  const r = await reportOf(projectWith({ [X]: page, [C]: code }));
  assert.deepEqual(findingsOf(r, 'removed-layout').map((f) => [f.file.split('/').at(-1), f.line, f.found]), [
    ['MainPage.xaml', lineOf(page, '<RelativeLayout>'), '<RelativeLayout>: on .NET MAUI use Grid; RelativeLayout is only a compatibility control in .NET MAUI'],
    ['Worker.cs', lineOf(code, 'new RelativeLayout'), 'new RelativeLayout: on .NET MAUI use Grid; RelativeLayout is only a compatibility control in .NET MAUI']
  ]);
  const configured = await reportOf({ ...projectWith({ [X]: xaml('    <AbsoluteLayout />\n    <RelativeLayout />') }), 'c.json': '{"layouts": [{"name": "AbsoluteLayout", "use": "Grid"}]}' }, ['p', '--config', 'c.json']);
  assert.deepEqual(findingsOf(configured, 'removed-layout').map((f) => f.found), ['<AbsoluteLayout>: on .NET MAUI use Grid']);
  assert.deepEqual(await rulesOf(projectWith({ [X]: xaml('<RelativeLayout />', MAUI_NS) })), [], 'a .NET MAUI page is not a Xamarin.Forms one');
});

test('graphics-type: Color members and new Rectangle or Point in a file that names Xamarin.Forms, once per file', async () => {
  const code = cs(['var a = Color.FromHex("#fff");', 'var b = Xamarin.Forms.Color.Red;', 'var c = Android.Graphics.Color.Red;', 'var d = new Rectangle(0, 0, 1, 1);', 'var e = new System.Drawing.Point(1, 2);', 'var f = new Point(1, 2);'], ['Xamarin.Forms']);
  const r = await reportOf(projectWith({ [C]: code }));
  const g = findingsOf(r, 'graphics-type');
  assert.equal(g.length, 1);
  assert.equal(g[0].line, lineOf(code, 'Color.FromHex'));
  assert.match(g[0].found, /^4 uses of Color, Rectangle or Point, first Color\.FromHex: these types move to Microsoft\.Maui\.Graphics$/);
  assert.deepEqual(await rulesOf(projectWith({ [C]: cs(['var a = Color.FromHex("#fff");', 'var d = new Rectangle(0, 0, 1, 1);'], ['System.Drawing']) })), [], 'a file that does not name Xamarin.Forms');
});

test('platform-manifest: AndroidManifest.xml and Info.plist of a head are noted by presence; one under Platforms is not', async () => {
  const r = await reportOf(projectWith({ 'p/Droid/Properties/AndroidManifest.xml': 'not read', 'p/iOS/Info.plist': '\u0000binary', 'p/App/Platforms/Android/AndroidManifest.xml': 'x', 'p/App/Platforms/iOS/Info.plist': 'x' }));
  assert.deepEqual(findingsOf(r, 'platform-manifest').map((f) => [f.file, f.line, f.found.split(':')[0]]), [['p/Droid/Properties/AndroidManifest.xml', 1, 'an Android manifest of a head project'], ['p/iOS/Info.plist', 1, 'an iOS property list of a head project']]);
  assert.equal(r.input.manifests, 4);
});

test('the summary, the tables and the effort score follow the findings and their weights', async () => {
  const files = projectWith({
    [P]: oldProject({ ProjectTypeGuids: ANDROID_GUIDS, TargetFrameworkVersion: 'v13.0' }, [['Xamarin.Forms', '5.0.0.2622']]),
    'p/App/R.cs': 'class R : EntryRenderer { }\n',
    [X]: xaml('<RelativeLayout />')
  });
  const r = await reportOf(files);
  assert.deepEqual(r.projects.map((p) => [p.style, p.kind, p.targets, p.packages, p.byLevel.warning, p.byLevel.info]), [['old-style', 'Android head', 'MonoAndroid v13.0', 1, 4, 3]]);
  assert.deepEqual(Object.fromEntries(r.effort.areas.map((a) => [a.area, a.score])), { project: 6, packages: 1, renderers: 5, effects: 0, apis: 0, namespaces: 1, layouts: 3 });
  assert.equal(r.effort.total, 16);
  const off = await reportOf({ ...files, 'c.json': '{"rules": {"customRenderer": "off"}}' }, ['p', '--config', 'c.json']);
  assert.equal(off.effort.total, 11, 'a rule that is off adds nothing');
  const hidden = await reportOf(files, ['p', '--min-severity', 'error']);
  assert.equal(hidden.effort.total, 16, 'the score counts the findings that are not shown');
});

test('the pieces: the package table, the owner of a file, and the platforms', () => {
  const config = configOf();
  assert.equal(classifyPackage('XAMARIN.FORMS', config).status, 'replace');
  assert.equal(classifyPackage('Xamarin.Google.Android.Material', config).status, 'keep');
  assert.equal(classifyPackage('Acme.Json', config).status, 'other');
  assert.equal(ownerOf('a/b/c.cs', ['a', 'a/b', 'x']), 'a/b');
  assert.equal(ownerOf('c.cs', ['.']), '.');
  assert.equal(ownerOf('z/c.cs', ['a']), null);
  assert.equal(PLATFORMS.android.folder, 'Platforms/Android');
  assert.equal(PLATFORMS.watchos.target, null);
});

test('a solution that names a project that is not in the folder gets a note', async () => {
  const r = await reportOf(projectWith({ 'p/Acme.sln': `${PROJECT['p/Acme.sln']}Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "Gone", "Gone\\Gone.csproj", "{7D6C5B4A-3F2E-4D1C-8B0A-9F8E7D6C5B4A}"\nEndProject\n` }));
  assert.match(r.notes.join('\n'), /1 project named by a solution is not in the folder: p\/Gone\/Gone\.csproj/);
  assert.equal(r.summary.solutionProjects, 2);
});
