// The built-in configuration: the level of every rule, the table of Xamarin-era packages and their .NET MAUI way
// forward, the packages that stay as they are, the layouts .NET MAUI does not carry over, the paths left out, the lowest
// level shown and the level that fails the run; and the weights of the effort score. docs/inputs.md describes every
// key, docs/method.md the weights, and --print-defaults writes the configuration out.

// The level of every rule that the configuration can set. The two rules of input problems are always errors.
export const DEFAULT_RULES = {
  noMauiEquivalent: 'error',
  nonSdkProject: 'warning',
  replacePackage: 'warning',
  unknownXamarinPackage: 'warning',
  customRenderer: 'warning',
  effect: 'warning',
  removedLayout: 'warning',
  platformHead: 'info',
  legacyTargetFramework: 'info',
  platformManifest: 'info',
  formsNamespace: 'info',
  dependencyService: 'info',
  messagingCenter: 'info',
  deviceApi: 'info',
  graphicsType: 'info'
};

// Xamarin-era packages and what takes their place. match is a package id, or a pattern of ids where * is any run of
// characters and ? one character, compared without regard to case; use is what to move to, or null when there is no
// .NET MAUI equivalent, which makes the package an error. Each entry follows a public page, named in
// DEFAULT_PACKAGE_BASIS; the configuration adds entries of its own in front of these.
export const DEFAULT_PACKAGE_MAP = [
  { match: 'Xamarin.Forms', use: 'Microsoft.Maui.Controls, which an SDK-style project with UseMaui brings in' },
  { match: 'Xamarin.Essentials', use: 'the APIs built into .NET MAUI; remove the package and its using directives' },
  { match: 'Xamarin.CommunityToolkit', use: 'CommunityToolkit.Maui, the .NET MAUI Community Toolkit' },
  { match: 'Xamarin.CommunityToolkit.Markup', use: 'CommunityToolkit.Maui.Markup' },
  { match: 'Xamarin.Forms.Maps', use: 'Microsoft.Maui.Controls.Maps' },
  { match: 'Xamarin.Forms.DualScreen', use: 'Microsoft.Maui.Controls.Foldable' },
  { match: 'SkiaSharp.Views.Forms', use: 'SkiaSharp.Views.Maui.Controls' }
];

// The point of a public page behind each default entry of the package table.
export const DEFAULT_PACKAGE_BASIS = {
  'Xamarin.Forms': 'upgradeAssistantPackages',
  'Xamarin.Essentials': 'namespaceChanges',
  'Xamarin.CommunityToolkit': 'upgradeAssistantPackages',
  'Xamarin.CommunityToolkit.Markup': 'toolkitPackages',
  'Xamarin.Forms.Maps': 'namespaceChanges',
  'Xamarin.Forms.DualScreen': 'namespaceChanges',
  'SkiaSharp.Views.Forms': 'skiaPackages'
};

// Packages whose id starts with Xamarin. but that a .NET for Android or .NET MAUI app keeps: the AndroidX and Google
// bindings, which target monoandroid or .NET for Android and stay usable (docs/inputs.md says why).
export const DEFAULT_KEEP_PACKAGES = ['Xamarin.AndroidX.*', 'Xamarin.Google.*'];

// Layouts that .NET MAUI does not carry over as they are, with what to use instead.
export const DEFAULT_LAYOUTS = [{ name: 'RelativeLayout', use: 'Grid; RelativeLayout is only a compatibility control in .NET MAUI' }];

// Paths of the folder that are not read, as patterns relative to it. None by default; the folders bin, obj, packages,
// .git and .vs are never read.
export const DEFAULT_EXCLUDE = [];

// The lowest level of a finding that is shown.
export const DEFAULT_MIN_SEVERITY = 'info';

// The lowest level of a finding that fails the run.
export const DEFAULT_FAIL_ON = 'error';

// The weights of the effort score: every finding of a rule adds its weight to the score of its area. The score is a
// relative weight for planning, to compare areas and solutions with each other; it is not a time estimate.
export const EFFORT_WEIGHTS = {
  project: { 'non-sdk-project': 3, 'platform-head': 2, 'legacy-target-framework': 1, 'platform-manifest': 1 },
  packages: { 'replace-package': 1, 'unknown-xamarin-package': 3, 'no-maui-equivalent': 8 },
  renderers: { 'custom-renderer': 5 },
  effects: { effect: 3 },
  apis: { 'dependency-service': 1, 'messaging-center': 1, 'device-api': 1, 'graphics-type': 1 },
  namespaces: { 'forms-namespace': 1 },
  layouts: { 'removed-layout': 3 }
};
