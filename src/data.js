// The public pages the checks rest on, and what each says, written in this project's own words. research/sources.md
// lists every page with a longer note on each, and test/data.test.js checks that every page here is listed there and
// that every rule names points that exist. The code in src/ uses these constants and never writes a reason of its own
// in a report.

const LEARN = 'https://learn.microsoft.com/en-us/dotnet';

export const SOURCES = [
  { id: 'xamarinSupport', title: 'Xamarin Support Policy (.NET website)', url: 'https://dotnet.microsoft.com/platform/support/policy/xamarin' },
  { id: 'mauiOverview', title: 'What is .NET MAUI? (Microsoft Learn)', url: `${LEARN}/maui/what-is-maui` },
  { id: 'upgradeOverview', title: 'Upgrade from Xamarin to .NET (Microsoft Learn)', url: `${LEARN}/maui/migration/` },
  { id: 'formsUpgrade', title: 'Manually upgrade a Xamarin.Forms app to a multi-project .NET MAUI app (Microsoft Learn)', url: `${LEARN}/maui/migration/multi-project-to-multi-project` },
  { id: 'androidProjects', title: 'Xamarin.Android project migration (Microsoft Learn)', url: `${LEARN}/maui/migration/android-projects` },
  { id: 'rendererToHandler', title: 'Migrate a custom renderer to a .NET MAUI handler (Microsoft Learn)', url: `${LEARN}/maui/migration/renderer-to-handler` },
  { id: 'reuseRenderers', title: 'Reuse custom renderers in .NET MAUI (Microsoft Learn)', url: `${LEARN}/maui/migration/custom-renderers` },
  { id: 'reuseEffects', title: 'Reuse effects in .NET MAUI (Microsoft Learn)', url: `${LEARN}/maui/migration/effects` },
  { id: 'layoutChanges', title: 'Layout behavior changes from Xamarin.Forms (Microsoft Learn)', url: `${LEARN}/maui/migration/layouts` },
  { id: 'upgradeAssistant', title: 'Upgrade a Xamarin.Forms app to a .NET MAUI app with the .NET Upgrade Assistant (Microsoft Learn)', url: `${LEARN}/maui/migration/upgrade-assistant` },
  { id: 'singleProject', title: 'Target multiple platforms from .NET MAUI single project (Microsoft Learn)', url: `${LEARN}/maui/fundamentals/single-project` },
  { id: 'dependencyInjection', title: 'Dependency injection in .NET MAUI (Microsoft Learn)', url: `${LEARN}/maui/fundamentals/dependency-injection` },
  { id: 'messagingCenter', title: 'Publish and subscribe to messages (Microsoft Learn)', url: `${LEARN}/maui/fundamentals/messagingcenter` },
  { id: 'skiaSharp', title: 'Reuse SkiaSharp code in .NET MAUI (Microsoft Learn)', url: `${LEARN}/maui/migration/skiasharp` },
  { id: 'communityToolkit', title: '.NET MAUI Community Toolkit documentation (Microsoft Learn)', url: `${LEARN}/communitytoolkit/maui/` },
  { id: 'mauiGraphics', title: 'Microsoft.Maui.Graphics Namespace (Microsoft Learn, .NET API browser)', url: `${LEARN}/api/microsoft.maui.graphics` },
  { id: 'rfc4180', title: 'RFC 4180, Common Format and MIME Type for Comma-Separated Values (CSV) Files', url: 'https://www.rfc-editor.org/rfc/rfc4180' },
  { id: 'rfc8259', title: 'RFC 8259, The JSON Data Interchange Format', url: 'https://www.rfc-editor.org/rfc/rfc8259' },
  { id: 'owaspCsv', title: 'CSV Injection (OWASP)', url: 'https://community.owasp.org/attacks/CSV_Injection' },
  { id: 'owaspXxe', title: 'XML External Entity Prevention Cheat Sheet (OWASP)', url: 'https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html' },
  { id: 'githubCommands', title: 'Workflow commands for GitHub Actions (GitHub Docs)', url: 'https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands' }
];

export const source = (id) => SOURCES.find((s) => s.id === id);

// What a page says, in this project's own words. Each point names its page.
export const POINTS = {
  supportEnded: { source: 'xamarinSupport', text: 'support for the Xamarin SDKs, Xamarin.Forms included, has ended with no further fixes or updates, and the policy points Xamarin.Forms apps to .NET MAUI and Xamarin.Android and Xamarin.iOS apps to .NET for Android and .NET for iOS' },
  mauiEvolution: { source: 'mauiOverview', text: '.NET MAUI is the evolution of Xamarin.Forms, with its controls rebuilt for performance and extensibility, and one project can target Android, iOS, macOS and Windows' },
  sdkStyleRequired: { source: 'upgradeOverview', text: 'every project must become an SDK-style project to run on .NET, while a multi-project solution does not have to become a single project' },
  upgradeAssistantRole: { source: 'upgradeOverview', text: 'the .NET Upgrade Assistant can upgrade a multi-project Xamarin.Forms app, and in most cases the app needs more work after it has run' },
  namespaceChanges: { source: 'formsUpgrade', text: 'the Xamarin.Forms namespaces become Microsoft.Maui and Microsoft.Maui.Controls namespaces, the Xamarin.Essentials features are part of .NET MAUI, and the default XAML namespace changes to the .NET MAUI one' },
  colorChanges: { source: 'formsUpgrade', text: 'the Xamarin.Forms Color struct is replaced by the Color and Colors classes of Microsoft.Maui.Graphics, with float values and no implicit conversion to System.Drawing.Color' },
  deviceChanges: { source: 'formsUpgrade', text: 'the Device class of Xamarin.Forms is replaced by several types: RuntimePlatform and OnPlatform by DeviceInfo.Platform, BeginInvokeOnMainThread by MainThread.BeginInvokeOnMainThread, StartTimer by the dispatcher and OpenUri by Launcher.OpenAsync' },
  incompatiblePackages: { source: 'formsUpgrade', text: 'Xamarin.Forms NuGet packages are generally not compatible with .NET unless rebuilt for .NET target frameworks; without a compatible version, a package is rebuilt, taken in a preview or replaced' },
  androidPackagesOk: { source: 'formsUpgrade', text: 'Android apps can still use NuGet packages that target monoandroid, and .NET Standard libraries with no dependency on a Xamarin-only framework stay compatible' },
  androidTargets: { source: 'androidProjects', text: 'a .NET for Android project is SDK-style with a target such as net8.0-android, and the minimum Android version moves from the uses-sdk element of AndroidManifest.xml to SupportedOSPlatformVersion' },
  handlersReplaceRenderers: { source: 'rendererToHandler', text: '.NET MAUI replaces custom renderers with handlers, which map each property to its own method, create no parent view and are registered in MauiProgram rather than found by assembly scanning' },
  shimmedRenderers: { source: 'reuseRenderers', text: 'renderers that derive from a few base classes, such as VisualElementRenderer, ListViewRenderer or FrameRenderer, can be reused through shims once the ExportRenderer attributes are removed and the renderers are registered with AddHandler' },
  effectsReuse: { source: 'reuseEffects', text: 'Xamarin.Forms effects can be reused once the ExportEffect and ResolutionGroupName attributes are removed, the platform effects sit with the routing effect, and the effect is registered with ConfigureEffects' },
  relativeLayoutCompat: { source: 'layoutChanges', text: 'RelativeLayout needs the compatibility namespace in .NET MAUI and is not advised, with Grid advised instead, and other layouts measure and space their children differently' },
  upgradeAssistantPackages: { source: 'upgradeAssistant', text: 'the Upgrade Assistant converts the projects to SDK-style, sets UseMaui, removes the Xamarin.Forms and Xamarin.Essentials packages, replaces Xamarin.CommunityToolkit with the .NET MAUI Community Toolkit and swaps the SkiaSharp packages' },
  singleProjectPlatforms: { source: 'singleProject', text: 'a .NET MAUI single project keeps platform code and resources in a Platforms folder with one child folder per platform, with one app manifest and one cross-platform entry point' },
  builtInDi: { source: 'dependencyInjection', text: '.NET MAUI has dependency injection built in: services are registered on MauiAppBuilder.Services in MauiProgram and passed to constructors' },
  messagingDeprecated: { source: 'messagingCenter', text: 'MessagingCenter is deprecated, and WeakReferenceMessenger of the CommunityToolkit.Mvvm package, or plain events, are advised instead' },
  skiaPackages: { source: 'skiaSharp', text: 'the Xamarin.Forms SkiaSharp packages are removed and SkiaSharp.Views.Maui.Controls is added, and the types of SkiaSharp.Views.Forms move to the SkiaSharp.Views.Maui namespaces' },
  toolkitPackages: { source: 'communityToolkit', text: 'the .NET MAUI Community Toolkit ships as NuGet packages for .NET MAUI projects, CommunityToolkit.Maui and CommunityToolkit.Maui.Markup' },
  graphicsTypes: { source: 'mauiGraphics', text: 'the Microsoft.Maui.Graphics namespace holds the Color and Colors classes and the Point, Rect and Size structures' },
  csvRecords: { source: 'rfc4180', text: 'each record of a CSV file is on its own line, ended by CRLF, the first line may be a header, and a field that holds a comma, a double quote or a line break is put in double quotes, with a double quote inside it written twice' },
  csvInjection: { source: 'owaspCsv', text: 'a spreadsheet may read a cell that starts with =, +, -, @ or some white space as a formula, and no one escape is safe in every program that opens the file' },
  jsonUtf8: { source: 'rfc8259', text: 'JSON text exchanged between systems must be UTF-8' },
  jsonRepeatedNames: { source: 'rfc8259', text: 'when an object repeats a name the behavior of the software that reads it cannot be predicted, so the JSON reader of this tool refuses a repeated name' },
  xmlNoDtd: { source: 'owaspXxe', text: 'an XML reader that resolves external entities of untrusted input can expose files or reach other systems, and the safest defense is to refuse document type definitions altogether' },
  githubAnnotations: { source: 'githubCommands', text: 'a line of output such as ::warning file=...,line=...::message becomes an annotation on that file and line in the run' }
};

// The page of a point.
export const pointPage = (key) => source(POINTS[key].source);

// The levels of a finding, from the lowest.
export const LEVELS = ['info', 'warning', 'error'];

// The sentence every report ends with, before the result.
export const NOTICE = 'This check reads the solution, project, package, C# and XAML files on disk as text and builds nothing; the code and XAML checks are a heuristic. A finding is a lead with a file and a line, the effort score is a relative weight and not a time estimate, and a clean result is not a build and not a finished migration (docs/limits.md).';
