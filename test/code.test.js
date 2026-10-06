import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CODE_LIMITS, blank, localName, scanCode } from '../src/index.js';

// C# read as text: comments and literals blanked with their line ends kept, then the fixed patterns.

test('blank: comments and the contents of every kind of literal are spaces, line ends and offsets stay', () => {
  const text = 'a // MessagingCenter.Send\nb /* x\n y */ c "s\\"q" @"v""w" $"i{x}" $@"j" """raw "" quote""" \'"\' \'\\\'\' d';
  const out = blank(text);
  assert.equal(out.length, text.length);
  assert.equal(out.split('\n').length, text.split('\n').length);
  for (const word of ['MessagingCenter', 'x\n', 's\\"q', 'v""w', 'i{x}', 'raw', 'quote']) assert.ok(!out.includes(word.trim()) || word === 'x\n', word);
  for (const word of ['a ', 'b ', ' c ', ' d']) assert.ok(out.includes(word), word);
  assert.equal(blank('"open\nnext').split('\n')[1], 'next', 'a string that is not closed ends at the line end');
  assert.equal(blank("'x"), "'x", 'a lone quote is kept');
  assert.equal(blank('/* open'), '       ');
  assert.equal(blank('@"open'), '@"    ');
});

test('scanCode: renderers, effects, exports, calls, references, created types and colors', () => {
  const code = `using Xamarin.Forms;
using Alias = Xamarin.Essentials.Preferences;
global using static Xamarin.Forms.Device;
[assembly: ExportRenderer(typeof(A.Entry2), typeof(B.Entry2Renderer))]
[assembly: ExportEffectAttribute(typeof(Glow), "Glow")]
[assembly: Dependency(typeof(Store))]
[assembly: Xamarin.Forms.XamlCompilation(XamlCompilationOptions.Compile)]
class Entry2Renderer : Xamarin.Forms.Platform.Android.EntryRenderer { }
class Holder<T> : ViewRenderer<T, View> where T : View { }
class Glow : PlatformEffect { }
class Route : RoutingEffect { }
var a = DependencyService.Get<IStore>();
MessagingCenter.Subscribe<A>(this, "m", _ => { });
Device.OnPlatform(() => { });
var c = Color.Accent;
var r = new Xamarin.Forms.Rectangle(0, 0, 1, 1);
`;
  const s = scanCode(code);
  assert.deepEqual(s.renderers.map((r) => [r.name, r.base]), [['Entry2Renderer', 'EntryRenderer'], ['Holder', 'ViewRenderer']]);
  assert.deepEqual(s.platformEffects.map((e) => e.name), ['Glow']);
  assert.deepEqual(s.routingEffects.map((e) => e.name), ['Route']);
  assert.deepEqual(s.exportRenderers.map((e) => [e.control, e.renderer]), [['Entry2', 'Entry2Renderer']]);
  assert.deepEqual(s.exportEffects.map((e) => e.effect), ['Glow']);
  assert.deepEqual(s.dependencies.map((d) => d.service), ['Store']);
  assert.deepEqual(s.dependencyCalls.map((d) => d.member), ['Get']);
  assert.deepEqual(s.messaging.map((d) => d.member), ['Subscribe']);
  assert.deepEqual(s.device.map((d) => d.member), ['OnPlatform']);
  assert.equal(s.formsUsings, 3);
  assert.equal(s.formsReferences, 6);
  assert.equal(s.firstForms, code.indexOf('Xamarin.Forms'));
  assert.deepEqual(s.created.map((x) => [x.name, x.qualified]), [['Rectangle', 'Xamarin.Forms.Rectangle']]);
  assert.deepEqual(s.colors.map((x) => x.member), ['Accent']);
  assert.equal(s.limited, false);
  assert.equal(localName('A . B .C'), 'C');
});

test('scanCode: the near misses are not read', () => {
  const s = scanCode(`class Renderer : Base { }
class Html : IRenderer { }
class Text : RendererBase { }
interface IFoo : ICustomRenderer { }
var a = Foo.DependencyService.Get();
var b = MessagingCenterHelper.Send();
var d = DeviceInfo.Platform;
var e = Xamarin.Formsy.Thing;
var f = "Device.RuntimePlatform";
// Device.BeginInvokeOnMainThread(() => {});
[ExportRenderer(typeof(A), typeof(B))] class C { }
`);
  assert.deepEqual([s.renderers, s.exportRenderers, s.device, s.messaging, s.formsReferences], [[], [], [], [], 0]);
  assert.deepEqual(s.dependencyCalls.map((d) => d.member), ['Get'], 'a call through another object is still read as DependencyService');
});

test('scanCode: past the limit of matches, the file is marked as limited', () => {
  const s = scanCode('Device.OS; '.repeat(50), { maxCodeMatches: 10 });
  assert.equal(s.limited, true);
  assert.equal(s.device.length, 10);
  assert.equal(CODE_LIMITS.maxCodeMatches, 20000);
});
