# xamarin-maui-check

Xamarin to .NET MAUI migration check. Give it the folder of a Xamarin.Forms, Xamarin.Android or Xamarin.iOS solution.
It reads every solution, every project file (old-style and SDK-style), every packages.config, every C# file and every
XAML file as text, notes the Android manifests and Info.plist files, builds nothing, and lists what must change to move
the app to .NET MAUI: projects to convert to SDK-style, platform head projects that become the Platforms folders of a
single project, Xamarin target frameworks and the .NET targets that take their place, Xamarin-era packages and what
replaces them, packages with no known .NET MAUI equivalent, custom renderers that become handlers, effects,
DependencyService, MessagingCenter, the Device class, the Xamarin.Forms namespaces in C# and XAML, layouts .NET MAUI
does not carry over, and the Color, Rectangle and Point types. Each project and each package gets a line, every
finding has its file, line and column and the way forward on .NET MAUI, a summary counts what was found, and an effort
score weighs each area. The run exits with a code a pipeline can act on.

**It is a migration inventory for planning: not a build and not a finished migration.** It runs no MSBuild and no
dotnet, restores no package and converts nothing; it reads what the files say, the C# and XAML checks are a
heuristic, and the effort score is a relative weight from documented weights, not a time estimate. A clean run means
only that none of the forms of its rules were found.

Microsoft support for the Xamarin SDKs, Xamarin.Forms included, has ended, and the policy points Xamarin.Forms apps to
.NET MAUI (https://dotnet.microsoft.com/platform/support/policy/xamarin). Every project must become SDK-style, the
Xamarin.Forms namespaces and packages change, and custom renderers move to handlers
(https://learn.microsoft.com/en-us/dotnet/maui/migration/multi-project-to-multi-project). The .NET Upgrade Assistant
converts part of this, and the app needs more work after it has run. Before a team commits to a plan, it needs the
list: how many projects, which packages, how many renderers and effects, which pages. This tool writes that list from
the files, on every change.

- **One check per change.** Fifteen rules, each with what it looks at, what it cannot see, the public pages it rests on
  and the way forward, and two rules of input problems that are always errors.
- **A package table that follows the pages.** Xamarin.Forms, Xamarin.Essentials, Xamarin.CommunityToolkit and a few
  more have their replacement from Microsoft Learn; every other Xamarin-era package is one to check, and the team's
  own entries, including packages with no equivalent, go into the configuration.
- **Readers of its own.** A safe XML reader for projects, packages.config and XAML that refuses a DOCTYPE and every
  entity; C# read as text with comments and literals blanked out; the Xamarin.Forms XAML namespace recognized by its
  shape. Each refuses what it does not read, with its place.
- Reports as text, JSON, CSV with one row per finding and GitHub workflow annotations, with an exit code for a
  pipeline: `0` no finding at or above the `--fail-on` level, `1` a finding at or above it, `2` usage or input error.
- Plain JavaScript, no dependencies, no clock and no network.

```
npm test
```

```
tests 115
pass 113
fail 0
skipped 2
```

These are the summary lines that `npm test` prints at the end on Windows. The skipped tests are the ones that need a
symbolic link, a device or file permissions (links in the solution to a file and to a folder, a folder and a
configuration named through a link, `/dev/null` named as a folder, and a C# file with no read access); they are
guarded with `process.platform`, run on Linux and macOS, and none of them asserts a line. `npm run test:coverage` runs
the same tests with coverage; their time limits are four times wider when coverage is on.

## Quick start

Requires Node 22 or newer. There is nothing to install, and no .NET SDK, workload or Mac is needed.

```
git clone https://github.com/INNERLUXES/xamarin-maui-check.git
cd xamarin-maui-check
node bin/xamarin-maui-check.js examples/messy --config examples/config.json
```

Or without a clone, in the folder of your own solution:

```
npx --yes github:INNERLUXES/xamarin-maui-check .
```

`examples/` holds two made-up solutions. `examples/messy/` is the delivery app of a courier company that plans its
move to .NET MAUI: a shared Xamarin.Forms library and old-style Android and iOS heads, the iOS head with a
packages.config; Xamarin.Forms, Xamarin.Essentials and Xamarin.CommunityToolkit, a Xamarin plugin to check, and a chart
package that the team's configuration lists with no .NET MAUI equivalent; a custom renderer on each platform, an
effect, DependencyService, MessagingCenter, Device.RuntimePlatform and Device.BeginInvokeOnMainThread, a page laid out
with a RelativeLayout, and Color.FromHex. It also holds what must not be reported: renderers under `obj` and
`packages`, calls in a comment and a string, Android's own Color, an AndroidX binding the head keeps, and a samples
folder the configuration leaves out. `examples/clean/` is a notes app with little to change, which passes at the
default level.

## Usage

```
xamarin-maui-check <solution folder> [--exclude <pattern>]... [--config <file>] [options]
```

```
--exclude <pattern>       a path of the folder to leave out, relative to it, such as Samples/** or **/Tests/**;
                          may be given more than once, and adds to exclude of the configuration
--config <file>           settings in strict JSON: rules, packageMap, keepPackages, layouts, exclude, minSeverity
                          and failOn (--print-defaults shows them)
--format <name>           text, json, csv or github (default: text); csv writes one row per finding, github writes
                          workflow commands that GitHub shows as annotations
--json                    the same as --format json
--min-severity <level>    the lowest level of a finding that is shown: info, warning, error (default: minSeverity of
                          the configuration, else info)
--fail-on <level>         the lowest level of a finding that fails the run: info, warning, error (default: failOn of
                          the configuration, else error)
--explain                 show the rule, the public sources and the tool's own choice behind each finding
--print-defaults          print the built-in configuration and exit
--help                    show the usage
--version                 show the version
```

Name one folder, the one that holds the .sln and the project folders. The paths in the report are relative to the
folder you run the command in, with forward slashes on every system, followed by the line.

The report of the messy example starts with what was read, the configuration, the rules and the findings in one line
each; then every project with its style, kind, targets, packages and findings; then every package with its versions,
the projects that use it, its status and what to use; then the summary; then the effort score of every area; then the
count of findings of every rule; then the findings, errors first, each with what to change:

```
xamarin-maui-check: examples/messy
input: 1 solution; 3 project files; 1 packages.config; 13 C# files; 3 XAML files; 2 platform manifests; 1 other file passed over; 2 folders named bin, obj, packages, .git or .vs passed over; 1 path excluded; 0 links not followed
config: examples/config.json (Tidewater migration inventory): package table 8 entries (1 from the configuration); keep Xamarin.AndroidX.* and Xamarin.Google.*; layouts RelativeLayout; exclude Samples/**; minimum severity info; fail on error
rules: no-maui-equivalent (error); non-sdk-project (warning); replace-package (warning); unknown-xamarin-package (warning); custom-renderer (warning); effect (warning); removed-layout (warning); platform-head (info); legacy-target-framework (info); platform-manifest (info); forms-namespace (info); dependency-service (info); messaging-center (info); device-api (info); graphics-type (info); unreadable-file (error); scan-limit (error)
findings: 44 (1 error, 14 warning, 29 info)

Projects (3)

  project                                                                style      kind                   targets            packages  error  warning  info
  examples/messy/TidewaterDriver.Android/TidewaterDriver.Android.csproj  old-style  Android head           MonoAndroid v13.0  3         0      5        8
  examples/messy/TidewaterDriver.iOS/TidewaterDriver.iOS.csproj          old-style  iOS head               Xamarin.iOS        2         0      4        5
  examples/messy/TidewaterDriver/TidewaterDriver.csproj                  SDK-style  Xamarin.Forms library  netstandard2.0     6         1      5        16

Packages (7)

  package                      versions    projects  status         use
  Fernway.Forms.Charts         3.4.1       1         no equivalent  none known
  Saltmarsh.Geo                2.1.0       1         other          -
  Xamarin.AndroidX.Core        1.12.0.2    1         keep           -
  Xamarin.CommunityToolkit     2.0.6       1         replace        CommunityToolkit.Maui, the .NET MAUI Community Toolkit
  Xamarin.Essentials           1.8.1       3         replace        the APIs built into .NET MAUI; remove the package and its using directives
  Xamarin.Forms                5.0.0.2622  3         replace        Microsoft.Maui.Controls, which an SDK-style project with UseMaui brings in
  Xamarin.Plugins.RouteSketch  1.3.0       1         check          -

Summary

  projects: 3 (2 old-style, 1 SDK-style), 2 platform heads (1 Android, 1 iOS), in 1 solution listing 3 projects
  packages: 7 in 11 references: 3 to replace, 1 with no .NET MAUI equivalent, 1 to check, 1 kept
  custom renderers: 2; effects: 1 platform effect and 1 routing effect
  C# files: 13, 12 naming Xamarin.Forms or Xamarin.Essentials (21 references)
  XAML files: 3, 3 in the Xamarin.Forms XAML namespace
  DependencyService: 2; MessagingCenter: 2; Device class: 2

Effort score (relative weights of docs/method.md, not a time estimate)

  area        findings  score
  project     8         14
  packages    9         18
  renderers   2         10
  effects     1         3
  apis        8         8
  namespaces  15        15
  layouts     1         3
  total       44        71

Rules (17)

  rule                     level    findings
  no-maui-equivalent       error    1
  non-sdk-project          warning  2
  replace-package          warning  7
  unknown-xamarin-package  warning  1
  custom-renderer          warning  2
  effect                   warning  1
  removed-layout           warning  1
  platform-head            info     2
  legacy-target-framework  info     2
  platform-manifest        info     2
  forms-namespace          info     15
  dependency-service       info     2
  messaging-center         info     2
  device-api               info     2
  graphics-type            info     2
  unreadable-file          error    0
  scan-limit               error    0

Findings (44)

  ERROR    no-maui-equivalent       examples/messy/TidewaterDriver/TidewaterDriver.csproj:12
           the package Fernway.Forms.Charts 3.4.1 has no known .NET MAUI equivalent: the vendor stopped at Xamarin.Forms; pick a .NET MAUI chart library or draw the charts with Microsoft.Maui.Graphics
           fix: find a library that targets .NET for Android, .NET for iOS or .NET MAUI and does the same job, rebuild the package for .NET target frameworks if you own its code, or write the feature against the platform APIs

  WARNING  effect                   examples/messy/TidewaterDriver.Android/Effects/AndroidShadowEffect.cs:10
           the class AndroidShadowEffect is a PlatformEffect, exported by ExportEffect at examples/messy/TidewaterDriver.Android/Effects/AndroidShadowEffect.cs:6: on .NET MAUI the effect is registered with ConfigureEffects, with no ExportEffect or ResolutionGroupName attribute
           fix: remove the ExportEffect and ResolutionGroupName attributes, put the platform effects next to their RoutingEffect with conditional compilation, and register the pair with ConfigureEffects in MauiProgram; or move the customization to a handler

  WARNING  custom-renderer          examples/messy/TidewaterDriver.Android/Renderers/RoundedEntryRenderer.cs:12
           the class RoundedEntryRenderer derives from EntryRenderer, a Xamarin.Forms renderer, registered for RoundedEntry by ExportRenderer at examples/messy/TidewaterDriver.Android/Renderers/RoundedEntryRenderer.cs:8: renderers become handlers on .NET MAUI
           fix: move the customization to a .NET MAUI handler: a PropertyMapper entry, or a handler of its own registered with ConfigureMauiHandlers; a renderer that derives from VisualElementRenderer, ListViewRenderer, FrameRenderer or TableViewRenderer can be kept for a while through the shims, registered with AddHandler, with its ExportRenderer attribute removed

  WARNING  non-sdk-project          examples/messy/TidewaterDriver.Android/TidewaterDriver.Android.csproj:2
           the project TidewaterDriver.Android is in the old project format, with no Sdk on its Project element: it lists every file and reference by hand and must become an SDK-style project to target .NET
           fix: convert the project to an SDK-style project, by hand or with the .NET Upgrade Assistant, with UseMaui set to true and .NET target frameworks; move what AssemblyInfo.cs and the old properties held into the project file

  WARNING  replace-package          examples/messy/TidewaterDriver.Android/TidewaterDriver.Android.csproj:23
           the package Xamarin.Forms 5.0.0.2622 is a Xamarin-era package: on .NET MAUI use Microsoft.Maui.Controls, which an SDK-style project with UseMaui brings in
           fix: remove the package and add the one the message names, then update the namespaces and the code that used it

  WARNING  replace-package          examples/messy/TidewaterDriver.Android/TidewaterDriver.Android.csproj:24
           the package Xamarin.Essentials 1.8.1 is a Xamarin-era package: on .NET MAUI use the APIs built into .NET MAUI; remove the package and its using directives
           fix: remove the package and add the one the message names, then update the namespaces and the code that used it

  WARNING  custom-renderer          examples/messy/TidewaterDriver.iOS/Renderers/RoundedEntryRenderer.cs:11
           the class RoundedEntryRenderer derives from EntryRenderer, a Xamarin.Forms renderer, registered for RoundedEntry by ExportRenderer at examples/messy/TidewaterDriver.iOS/Renderers/RoundedEntryRenderer.cs:7: renderers become handlers on .NET MAUI
           fix: move the customization to a .NET MAUI handler: a PropertyMapper entry, or a handler of its own registered with ConfigureMauiHandlers; a renderer that derives from VisualElementRenderer, ListViewRenderer, FrameRenderer or TableViewRenderer can be kept for a while through the shims, registered with AddHandler, with its ExportRenderer attribute removed

  WARNING  non-sdk-project          examples/messy/TidewaterDriver.iOS/TidewaterDriver.iOS.csproj:2
           the project TidewaterDriver.iOS is in the old project format, with no Sdk on its Project element: it lists every file and reference by hand and must become an SDK-style project to target .NET
           fix: convert the project to an SDK-style project, by hand or with the .NET Upgrade Assistant, with UseMaui set to true and .NET target frameworks; move what AssemblyInfo.cs and the old properties held into the project file

  WARNING  replace-package          examples/messy/TidewaterDriver.iOS/packages.config:3
           the package Xamarin.Forms 5.0.0.2622 is a Xamarin-era package: on .NET MAUI use Microsoft.Maui.Controls, which an SDK-style project with UseMaui brings in
           fix: remove the package and add the one the message names, then update the namespaces and the code that used it

  WARNING  replace-package          examples/messy/TidewaterDriver.iOS/packages.config:4
           the package Xamarin.Essentials 1.8.1 is a Xamarin-era package: on .NET MAUI use the APIs built into .NET MAUI; remove the package and its using directives
           fix: remove the package and add the one the message names, then update the namespaces and the code that used it

  WARNING  replace-package          examples/messy/TidewaterDriver/TidewaterDriver.csproj:9
           the package Xamarin.Forms 5.0.0.2622 is a Xamarin-era package: on .NET MAUI use Microsoft.Maui.Controls, which an SDK-style project with UseMaui brings in
           fix: remove the package and add the one the message names, then update the namespaces and the code that used it

  WARNING  replace-package          examples/messy/TidewaterDriver/TidewaterDriver.csproj:10
           the package Xamarin.Essentials 1.8.1 is a Xamarin-era package: on .NET MAUI use the APIs built into .NET MAUI; remove the package and its using directives
           fix: remove the package and add the one the message names, then update the namespaces and the code that used it

  WARNING  replace-package          examples/messy/TidewaterDriver/TidewaterDriver.csproj:11
           the package Xamarin.CommunityToolkit 2.0.6 is a Xamarin-era package: on .NET MAUI use CommunityToolkit.Maui, the .NET MAUI Community Toolkit
           fix: remove the package and add the one the message names, then update the namespaces and the code that used it

  WARNING  unknown-xamarin-package  examples/messy/TidewaterDriver/TidewaterDriver.csproj:13
           the package Xamarin.Plugins.RouteSketch 1.3.0 was built for Xamarin and is not in the package table: check for a version that targets .NET for Android, .NET for iOS or .NET MAUI
           fix: check for a version of the package that targets .NET for Android, .NET for iOS or .NET MAUI; once checked, add it to packageMap with what to use, or to keepPackages when it stays

  WARNING  removed-layout           examples/messy/TidewaterDriver/Views/DeliveryPage.xaml:9
           <RelativeLayout>: on .NET MAUI use Grid; RelativeLayout is only a compatibility control in .NET MAUI
           fix: rebuild the layout with the one the message names, usually a Grid with row and column definitions; the compatibility control keeps it working while you do

  INFO     forms-namespace          examples/messy/TidewaterDriver.Android/Effects/AndroidShadowEffect.cs:2
           the file names the Xamarin.Forms or Xamarin.Essentials namespace 2 times (2 in using directives)
           fix: replace the Xamarin.Forms namespaces with Microsoft.Maui and Microsoft.Maui.Controls, drop the Xamarin.Essentials using directives (.NET MAUI brings them in with global usings), and set the default XAML namespace to the .NET MAUI one

  INFO     forms-namespace          examples/messy/TidewaterDriver.Android/MainActivity.cs:8
           the file names the Xamarin.Forms or Xamarin.Essentials namespace 4 times (0 in using directives)
           fix: replace the Xamarin.Forms namespaces with Microsoft.Maui and Microsoft.Maui.Controls, drop the Xamarin.Essentials using directives (.NET MAUI brings them in with global usings), and set the default XAML namespace to the .NET MAUI one

  INFO     platform-manifest        examples/messy/TidewaterDriver.Android/Properties/AndroidManifest.xml:1
           an Android manifest of a head project: in a .NET MAUI single project it lives in Platforms/Android, and the minimum Android version moves to SupportedOSPlatformVersion
           fix: in a single project, keep it under Platforms/Android or Platforms/iOS; take the app title, id and version from the project file, and move the minimum Android version from uses-sdk to SupportedOSPlatformVersion

  INFO     forms-namespace          examples/messy/TidewaterDriver.Android/Renderers/RoundedEntryRenderer.cs:5
           the file names the Xamarin.Forms or Xamarin.Essentials namespace 2 times (2 in using directives)
           fix: replace the Xamarin.Forms namespaces with Microsoft.Maui and Microsoft.Maui.Controls, drop the Xamarin.Essentials using directives (.NET MAUI brings them in with global usings), and set the default XAML namespace to the .NET MAUI one

  INFO     dependency-service       examples/messy/TidewaterDriver.Android/Services/AndroidRouteStore.cs:7
           the Dependency attribute registers AndroidRouteStore with DependencyService: register it on builder.Services in MauiProgram instead
           fix: register the platform service on builder.Services in MauiProgram and take it in a constructor; remove the Dependency attribute

  INFO     forms-namespace          examples/messy/TidewaterDriver.Android/Services/AndroidRouteStore.cs:7
           the file names the Xamarin.Forms or Xamarin.Essentials namespace 1 time (0 in using directives)
           fix: replace the Xamarin.Forms namespaces with Microsoft.Maui and Microsoft.Maui.Controls, drop the Xamarin.Essentials using directives (.NET MAUI brings them in with global usings), and set the default XAML namespace to the .NET MAUI one

  INFO     platform-head            examples/messy/TidewaterDriver.Android/TidewaterDriver.Android.csproj:2
           the project TidewaterDriver.Android is the Android head of the solution: in a .NET MAUI single project its code and resources go to Platforms/Android, or it becomes an SDK-style .NET for Android project
           fix: move the platform code and resources into the Platforms folder of a .NET MAUI single project (Platforms/Android, Platforms/iOS, Platforms/Windows), or convert the head to an SDK-style .NET for Android, .NET for iOS or WinUI project

  INFO     legacy-target-framework  examples/messy/TidewaterDriver.Android/TidewaterDriver.Android.csproj:14
           the project targets MonoAndroid v13.0, a Xamarin framework: on .NET the target is net8.0-android, or the same name for the .NET version you move to
           fix: target .NET instead: net8.0-android for Android, net8.0-ios for iOS, net8.0-maccatalyst for the Mac and net8.0-windows10.0.19041.0 for Windows (or the same names for the .NET version you move to), with the minimum OS version in SupportedOSPlatformVersion

  INFO     forms-namespace          examples/messy/TidewaterDriver.iOS/AppDelegate.cs:7
           the file names the Xamarin.Forms or Xamarin.Essentials namespace 2 times (0 in using directives)
           fix: replace the Xamarin.Forms namespaces with Microsoft.Maui and Microsoft.Maui.Controls, drop the Xamarin.Essentials using directives (.NET MAUI brings them in with global usings), and set the default XAML namespace to the .NET MAUI one

  INFO     platform-manifest        examples/messy/TidewaterDriver.iOS/Info.plist:1
           an iOS property list of a head project: in a .NET MAUI single project it lives in Platforms/iOS
           fix: in a single project, keep it under Platforms/Android or Platforms/iOS; take the app title, id and version from the project file, and move the minimum Android version from uses-sdk to SupportedOSPlatformVersion

  INFO     forms-namespace          examples/messy/TidewaterDriver.iOS/Renderers/RoundedEntryRenderer.cs:4
           the file names the Xamarin.Forms or Xamarin.Essentials namespace 2 times (2 in using directives)
           fix: replace the Xamarin.Forms namespaces with Microsoft.Maui and Microsoft.Maui.Controls, drop the Xamarin.Essentials using directives (.NET MAUI brings them in with global usings), and set the default XAML namespace to the .NET MAUI one

  INFO     platform-head            examples/messy/TidewaterDriver.iOS/TidewaterDriver.iOS.csproj:2
           the project TidewaterDriver.iOS is the iOS head of the solution: in a .NET MAUI single project its code and resources go to Platforms/iOS, or it becomes an SDK-style .NET for iOS project
           fix: move the platform code and resources into the Platforms folder of a .NET MAUI single project (Platforms/Android, Platforms/iOS, Platforms/Windows), or convert the head to an SDK-style .NET for Android, .NET for iOS or WinUI project

  INFO     legacy-target-framework  examples/messy/TidewaterDriver.iOS/TidewaterDriver.iOS.csproj:7
           the project targets Xamarin.iOS, a Xamarin framework: on .NET the target is net8.0-ios, or the same name for the .NET version you move to
           fix: target .NET instead: net8.0-android for Android, net8.0-ios for iOS, net8.0-maccatalyst for the Mac and net8.0-windows10.0.19041.0 for Windows (or the same names for the .NET version you move to), with the minimum OS version in SupportedOSPlatformVersion

  INFO     forms-namespace          examples/messy/TidewaterDriver/App.xaml:2
           the XAML declares the Xamarin.Forms XAML namespace: .NET MAUI XAML uses the .NET MAUI namespace
           fix: replace the Xamarin.Forms namespaces with Microsoft.Maui and Microsoft.Maui.Controls, drop the Xamarin.Essentials using directives (.NET MAUI brings them in with global usings), and set the default XAML namespace to the .NET MAUI one

  INFO     forms-namespace          examples/messy/TidewaterDriver/App.xaml.cs:2
           the file names the Xamarin.Forms or Xamarin.Essentials namespace 2 times (2 in using directives)
           fix: replace the Xamarin.Forms namespaces with Microsoft.Maui and Microsoft.Maui.Controls, drop the Xamarin.Essentials using directives (.NET MAUI brings them in with global usings), and set the default XAML namespace to the .NET MAUI one

  INFO     forms-namespace          examples/messy/TidewaterDriver/Controls/RoundedEntry.cs:1
           the file names the Xamarin.Forms or Xamarin.Essentials namespace 1 time (1 in using directives)
           fix: replace the Xamarin.Forms namespaces with Microsoft.Maui and Microsoft.Maui.Controls, drop the Xamarin.Essentials using directives (.NET MAUI brings them in with global usings), and set the default XAML namespace to the .NET MAUI one

  INFO     graphics-type            examples/messy/TidewaterDriver/Controls/RoundedEntry.cs:12
           2 uses of Color, Rectangle or Point, first Color.Gray: these types move to Microsoft.Maui.Graphics
           fix: use Microsoft.Maui.Graphics: Color with float values, Colors for named colors, Color.FromArgb for a hex string, Rect for Rectangle and Point for Point

  INFO     forms-namespace          examples/messy/TidewaterDriver/Effects/ShadowEffect.cs:1
           the file names the Xamarin.Forms or Xamarin.Essentials namespace 1 time (1 in using directives)
           fix: replace the Xamarin.Forms namespaces with Microsoft.Maui and Microsoft.Maui.Controls, drop the Xamarin.Essentials using directives (.NET MAUI brings them in with global usings), and set the default XAML namespace to the .NET MAUI one

  INFO     forms-namespace          examples/messy/TidewaterDriver/ViewModels/DeliveryViewModel.cs:5
           the file names the Xamarin.Forms or Xamarin.Essentials namespace 2 times (2 in using directives)
           fix: replace the Xamarin.Forms namespaces with Microsoft.Maui and Microsoft.Maui.Controls, drop the Xamarin.Essentials using directives (.NET MAUI brings them in with global usings), and set the default XAML namespace to the .NET MAUI one

  INFO     dependency-service       examples/messy/TidewaterDriver/ViewModels/DeliveryViewModel.cs:12
           DependencyService.Get looks up a platform service through the service locator of Xamarin.Forms: .NET MAUI has dependency injection built in
           fix: register the platform service on builder.Services in MauiProgram and take it in a constructor; remove the Dependency attribute

  INFO     messaging-center         examples/messy/TidewaterDriver/ViewModels/DeliveryViewModel.cs:19
           MessagingCenter.Send: MessagingCenter is deprecated in .NET MAUI
           fix: send a typed message with WeakReferenceMessenger of CommunityToolkit.Mvvm and receive it with IRecipient<T>, or use an event

  INFO     device-api               examples/messy/TidewaterDriver/ViewModels/DeliveryViewModel.cs:20
           Device.BeginInvokeOnMainThread: on .NET MAUI use MainThread.BeginInvokeOnMainThread
           fix: use the replacement the message names: DeviceInfo.Platform, DeviceInfo.Idiom, MainThread, the Dispatcher or Launcher.OpenAsync

  INFO     device-api               examples/messy/TidewaterDriver/ViewModels/DeliveryViewModel.cs:24
           Device.RuntimePlatform: on .NET MAUI use DeviceInfo.Platform
           fix: use the replacement the message names: DeviceInfo.Platform, DeviceInfo.Idiom, MainThread, the Dispatcher or Launcher.OpenAsync

  INFO     forms-namespace          examples/messy/TidewaterDriver/Views/DeliveryPage.xaml:2
           the XAML declares the Xamarin.Forms XAML namespace: .NET MAUI XAML uses the .NET MAUI namespace
           fix: replace the Xamarin.Forms namespaces with Microsoft.Maui and Microsoft.Maui.Controls, drop the Xamarin.Essentials using directives (.NET MAUI brings them in with global usings), and set the default XAML namespace to the .NET MAUI one

  INFO     forms-namespace          examples/messy/TidewaterDriver/Views/DeliveryPage.xaml.cs:2
           the file names the Xamarin.Forms or Xamarin.Essentials namespace 1 time (1 in using directives)
           fix: replace the Xamarin.Forms namespaces with Microsoft.Maui and Microsoft.Maui.Controls, drop the Xamarin.Essentials using directives (.NET MAUI brings them in with global usings), and set the default XAML namespace to the .NET MAUI one

  INFO     graphics-type            examples/messy/TidewaterDriver/Views/DeliveryPage.xaml.cs:12
           1 use of Color, Rectangle or Point, first Color.FromHex: these types move to Microsoft.Maui.Graphics
           fix: use Microsoft.Maui.Graphics: Color with float values, Colors for named colors, Color.FromArgb for a hex string, Rect for Rectangle and Point for Point

  INFO     forms-namespace          examples/messy/TidewaterDriver/Views/SignaturePage.xaml:2
           the XAML declares the Xamarin.Forms XAML namespace: .NET MAUI XAML uses the .NET MAUI namespace
           fix: replace the Xamarin.Forms namespaces with Microsoft.Maui and Microsoft.Maui.Controls, drop the Xamarin.Essentials using directives (.NET MAUI brings them in with global usings), and set the default XAML namespace to the .NET MAUI one

  INFO     forms-namespace          examples/messy/TidewaterDriver/Views/SignaturePage.xaml.cs:2
           the file names the Xamarin.Forms or Xamarin.Essentials namespace 1 time (1 in using directives)
           fix: replace the Xamarin.Forms namespaces with Microsoft.Maui and Microsoft.Maui.Controls, drop the Xamarin.Essentials using directives (.NET MAUI brings them in with global usings), and set the default XAML namespace to the .NET MAUI one

  INFO     messaging-center         examples/messy/TidewaterDriver/Views/SignaturePage.xaml.cs:15
           MessagingCenter.Send: MessagingCenter is deprecated in .NET MAUI
           fix: send a typed message with WeakReferenceMessenger of CommunityToolkit.Mvvm and receive it with IRecipient<T>, or use an event

note: 1 path matching Samples/** is left out
note: 2 folders named bin, obj, packages, .git or .vs are passed over

This check reads the solution, project, package, C# and XAML files on disk as text and builds nothing; the code and XAML checks are a heuristic. A finding is a lead with a file and a line, the effort score is a relative weight and not a time estimate, and a clean result is not a build and not a finished migration (docs/limits.md).

RESULT: FAIL - 1 finding at or above error (1 error, 14 warning, 29 info)
```

With `--explain`, each finding also shows the rule, the points of the public pages it rests on and the tool's own
choice:

```
  WARNING  custom-renderer          examples/messy/TidewaterDriver.Android/Renderers/RoundedEntryRenderer.cs:12
           the class RoundedEntryRenderer derives from EntryRenderer, a Xamarin.Forms renderer, registered for RoundedEntry by ExportRenderer at examples/messy/TidewaterDriver.Android/Renderers/RoundedEntryRenderer.cs:8: renderers become handlers on .NET MAUI
           fix: move the customization to a .NET MAUI handler: a PropertyMapper entry, or a handler of its own registered with ConfigureMauiHandlers; a renderer that derives from VisualElementRenderer, ListViewRenderer, FrameRenderer or TableViewRenderer can be kept for a while through the shims, registered with AddHandler, with its ExportRenderer attribute removed
           rule: a class that derives from a *Renderer type, or an ExportRenderer attribute
           basis: .NET MAUI replaces custom renderers with handlers, which map each property to its own method, create no parent view and are registered in MauiProgram rather than found by assembly scanning (Migrate a custom renderer to a .NET MAUI handler (Microsoft Learn), https://learn.microsoft.com/en-us/dotnet/maui/migration/renderer-to-handler)
           basis: renderers that derive from a few base classes, such as VisualElementRenderer, ListViewRenderer or FrameRenderer, can be reused through shims once the ExportRenderer attributes are removed and the renderers are registered with AddHandler (Reuse custom renderers in .NET MAUI (Microsoft Learn), https://learn.microsoft.com/en-us/dotnet/maui/migration/custom-renderers)
           the tool's own choice: a C# class whose first base type has a name that ends with Renderer, such as EntryRenderer or ViewRenderer<T, TNative>, and an ExportRenderer assembly attribute that names a renderer no scanned class declares; each renderer is one finding, with the place of its ExportRenderer attribute when there is one
```

The clean example passes:

```
xamarin-maui-check: examples/clean
input: 1 solution; 2 project files; 0 packages.config; 3 C# files; 2 XAML files; 1 platform manifest; 1 other file passed over; 0 folders named bin, obj, packages, .git or .vs passed over; 0 paths excluded; 0 links not followed
config: built-in defaults: package table 7 entries; keep Xamarin.AndroidX.* and Xamarin.Google.*; layouts RelativeLayout; exclude none; minimum severity info; fail on error
rules: no-maui-equivalent (error); non-sdk-project (warning); replace-package (warning); unknown-xamarin-package (warning); custom-renderer (warning); effect (warning); removed-layout (warning); platform-head (info); legacy-target-framework (info); platform-manifest (info); forms-namespace (info); dependency-service (info); messaging-center (info); device-api (info); graphics-type (info); unreadable-file (error); scan-limit (error)
findings: 12 (4 warning, 8 info)

Projects (2)

  project                                                                style      kind                   targets            packages  error  warning  info
  examples/clean/BrightwellNotes.Android/BrightwellNotes.Android.csproj  old-style  Android head           MonoAndroid v13.0  2         0      2        4
  examples/clean/BrightwellNotes/BrightwellNotes.csproj                  SDK-style  Xamarin.Forms library  netstandard2.0     2         0      2        4

Packages (3)

  package                     versions    projects  status   use
  Xamarin.AndroidX.AppCompat  1.6.1.6     1         keep     -
  Xamarin.Essentials          1.8.1       1         replace  the APIs built into .NET MAUI; remove the package and its using directives
  Xamarin.Forms               5.0.0.2622  2         replace  Microsoft.Maui.Controls, which an SDK-style project with UseMaui brings in

Summary

  projects: 2 (1 old-style, 1 SDK-style), 1 platform head (1 Android), in 1 solution listing 2 projects
  packages: 3 in 4 references: 2 to replace, 0 with no .NET MAUI equivalent, 0 to check, 1 kept
  custom renderers: 0; effects: 0 platform effects and 0 routing effects
  C# files: 3, 3 naming Xamarin.Forms or Xamarin.Essentials (4 references)
  XAML files: 2, 2 in the Xamarin.Forms XAML namespace
  DependencyService: 0; MessagingCenter: 0; Device class: 0

Effort score (relative weights of docs/method.md, not a time estimate)

  area        findings  score
  project     4         7
  packages    3         3
  renderers   0         0
  effects     0         0
  apis        0         0
  namespaces  5         5
  layouts     0         0
  total       12        15

Rules (17)

  rule                     level    findings
  no-maui-equivalent       error    0
  non-sdk-project          warning  1
  replace-package          warning  3
  unknown-xamarin-package  warning  0
  custom-renderer          warning  0
  effect                   warning  0
  removed-layout           warning  0
  platform-head            info     1
  legacy-target-framework  info     1
  platform-manifest        info     1
  forms-namespace          info     5
  dependency-service       info     0
  messaging-center         info     0
  device-api               info     0
  graphics-type            info     0
  unreadable-file          error    0
  scan-limit               error    0

Findings (12)

  WARNING  non-sdk-project          examples/clean/BrightwellNotes.Android/BrightwellNotes.Android.csproj:2
           the project BrightwellNotes.Android is in the old project format, with no Sdk on its Project element: it lists every file and reference by hand and must become an SDK-style project to target .NET
           fix: convert the project to an SDK-style project, by hand or with the .NET Upgrade Assistant, with UseMaui set to true and .NET target frameworks; move what AssemblyInfo.cs and the old properties held into the project file

  WARNING  replace-package          examples/clean/BrightwellNotes.Android/BrightwellNotes.Android.csproj:19
           the package Xamarin.Forms 5.0.0.2622 is a Xamarin-era package: on .NET MAUI use Microsoft.Maui.Controls, which an SDK-style project with UseMaui brings in
           fix: remove the package and add the one the message names, then update the namespaces and the code that used it

  WARNING  replace-package          examples/clean/BrightwellNotes/BrightwellNotes.csproj:8
           the package Xamarin.Forms 5.0.0.2622 is a Xamarin-era package: on .NET MAUI use Microsoft.Maui.Controls, which an SDK-style project with UseMaui brings in
           fix: remove the package and add the one the message names, then update the namespaces and the code that used it

  WARNING  replace-package          examples/clean/BrightwellNotes/BrightwellNotes.csproj:9
           the package Xamarin.Essentials 1.8.1 is a Xamarin-era package: on .NET MAUI use the APIs built into .NET MAUI; remove the package and its using directives
           fix: remove the package and add the one the message names, then update the namespaces and the code that used it

  INFO     platform-head            examples/clean/BrightwellNotes.Android/BrightwellNotes.Android.csproj:2
           the project BrightwellNotes.Android is the Android head of the solution: in a .NET MAUI single project its code and resources go to Platforms/Android, or it becomes an SDK-style .NET for Android project
           fix: move the platform code and resources into the Platforms folder of a .NET MAUI single project (Platforms/Android, Platforms/iOS, Platforms/Windows), or convert the head to an SDK-style .NET for Android, .NET for iOS or WinUI project

  INFO     legacy-target-framework  examples/clean/BrightwellNotes.Android/BrightwellNotes.Android.csproj:12
           the project targets MonoAndroid v13.0, a Xamarin framework: on .NET the target is net8.0-android, or the same name for the .NET version you move to
           fix: target .NET instead: net8.0-android for Android, net8.0-ios for iOS, net8.0-maccatalyst for the Mac and net8.0-windows10.0.19041.0 for Windows (or the same names for the .NET version you move to), with the minimum OS version in SupportedOSPlatformVersion

  INFO     forms-namespace          examples/clean/BrightwellNotes.Android/MainActivity.cs:7
           the file names the Xamarin.Forms or Xamarin.Essentials namespace 2 times (0 in using directives)
           fix: replace the Xamarin.Forms namespaces with Microsoft.Maui and Microsoft.Maui.Controls, drop the Xamarin.Essentials using directives (.NET MAUI brings them in with global usings), and set the default XAML namespace to the .NET MAUI one

  INFO     platform-manifest        examples/clean/BrightwellNotes.Android/Properties/AndroidManifest.xml:1
           an Android manifest of a head project: in a .NET MAUI single project it lives in Platforms/Android, and the minimum Android version moves to SupportedOSPlatformVersion
           fix: in a single project, keep it under Platforms/Android or Platforms/iOS; take the app title, id and version from the project file, and move the minimum Android version from uses-sdk to SupportedOSPlatformVersion

  INFO     forms-namespace          examples/clean/BrightwellNotes/App.xaml:2
           the XAML declares the Xamarin.Forms XAML namespace: .NET MAUI XAML uses the .NET MAUI namespace
           fix: replace the Xamarin.Forms namespaces with Microsoft.Maui and Microsoft.Maui.Controls, drop the Xamarin.Essentials using directives (.NET MAUI brings them in with global usings), and set the default XAML namespace to the .NET MAUI one

  INFO     forms-namespace          examples/clean/BrightwellNotes/App.xaml.cs:1
           the file names the Xamarin.Forms or Xamarin.Essentials namespace 1 time (1 in using directives)
           fix: replace the Xamarin.Forms namespaces with Microsoft.Maui and Microsoft.Maui.Controls, drop the Xamarin.Essentials using directives (.NET MAUI brings them in with global usings), and set the default XAML namespace to the .NET MAUI one

  INFO     forms-namespace          examples/clean/BrightwellNotes/NotesPage.xaml:2
           the XAML declares the Xamarin.Forms XAML namespace: .NET MAUI XAML uses the .NET MAUI namespace
           fix: replace the Xamarin.Forms namespaces with Microsoft.Maui and Microsoft.Maui.Controls, drop the Xamarin.Essentials using directives (.NET MAUI brings them in with global usings), and set the default XAML namespace to the .NET MAUI one

  INFO     forms-namespace          examples/clean/BrightwellNotes/NotesPage.xaml.cs:3
           the file names the Xamarin.Forms or Xamarin.Essentials namespace 1 time (1 in using directives)
           fix: replace the Xamarin.Forms namespaces with Microsoft.Maui and Microsoft.Maui.Controls, drop the Xamarin.Essentials using directives (.NET MAUI brings them in with global usings), and set the default XAML namespace to the .NET MAUI one

This check reads the solution, project, package, C# and XAML files on disk as text and builds nothing; the code and XAML checks are a heuristic. A finding is a lead with a file and a line, the effort score is a relative weight and not a time estimate, and a clean result is not a build and not a finished migration (docs/limits.md).

RESULT: PASS - no finding at or above error (4 warning, 8 info)
```

## How the files are read

1. The solution folder is listed with a list of folders of its own and no link followed; every *.sln, *.csproj,
   packages.config, *.cs and *.xaml file is read, AndroidManifest.xml and Info.plist are noted by name, and the folders
   bin, obj, packages, .git and .vs and the paths of `--exclude` are passed over.
2. Solutions are read line by line for their projects; projects and packages.config with the safe XML reader, for
   their style, properties, platform, target frameworks and packages, with nothing evaluated.
3. C# files are read as text with comments and literals blanked out, and fixed patterns find renderers, effects,
   attributes, calls, namespaces, new expressions and Color members.
4. XAML files are read with the safe XML reader, for the Xamarin.Forms XAML namespace and its elements.
5. The checks classify every package by the package table, match renderers and effects with their export attributes,
   and add the weight of every finding to the effort score of its area.

[docs/method.md](docs/method.md) gives the details, and
[decision 2](docs/decisions/0002-read-project-files-with-a-safe-xml-reader-and-code-as-text.md) says why projects are
read with a safe XML reader and code as text.

## What it reports

| Rule | Key | Default level | Finds |
| --- | --- | --- | --- |
| `no-maui-equivalent` | `rules.noMauiEquivalent` | error | a package that `packageMap` lists with no .NET MAUI equivalent |
| `non-sdk-project` | `rules.nonSdkProject` | warning | a .csproj in the old project format |
| `replace-package` | `rules.replacePackage` | warning | a Xamarin-era package with a known replacement, such as Xamarin.Forms or Xamarin.CommunityToolkit |
| `unknown-xamarin-package` | `rules.unknownXamarinPackage` | warning | a Xamarin.* or *.Forms.* package outside the table: check for a .NET MAUI version |
| `custom-renderer` | `rules.customRenderer` | warning | a class that derives from a *Renderer type, or an ExportRenderer attribute |
| `effect` | `rules.effect` | warning | a PlatformEffect class, or an ExportEffect attribute |
| `removed-layout` | `rules.removedLayout` | warning | a layout of the `layouts` list, RelativeLayout by default, in XAML or C# |
| `platform-head` | `rules.platformHead` | info | an Android, iOS, Mac or UWP head project |
| `legacy-target-framework` | `rules.legacyTargetFramework` | info | a MonoAndroid, Xamarin.iOS, Xamarin.Mac or UAP target, with the .NET target |
| `platform-manifest` | `rules.platformManifest` | info | an AndroidManifest.xml or Info.plist outside a Platforms folder |
| `forms-namespace` | `rules.formsNamespace` | info | a C# file that names Xamarin.Forms or Xamarin.Essentials, with the count, or a XAML file in the Xamarin.Forms XAML namespace |
| `dependency-service` | `rules.dependencyService` | info | a DependencyService call or a Dependency attribute |
| `messaging-center` | `rules.messagingCenter` | info | a MessagingCenter call |
| `device-api` | `rules.deviceApi` | info | Device.RuntimePlatform, Device.OnPlatform, Device.BeginInvokeOnMainThread and other Device members, with the replacement |
| `graphics-type` | `rules.graphicsType` | info | Color members and new Rectangle or Point in a file that names Xamarin.Forms |
| `unreadable-file` | none | error | a file that cannot be read, a DOCTYPE or an entity included |
| `scan-limit` | none | error | input past the limits of a run |

The two rules of input problems are always errors. [docs/method.md](docs/method.md) says exactly what each rule looks
at and what it cannot see, and [docs/rules-and-sources.md](docs/rules-and-sources.md) gives the points of the public
pages each rule rests on.

The effort score adds, for every finding, the weight of its rule to its area: project (old format 3, platform head 2,
target framework 1, manifest 1), packages (replace 1, check 3, no equivalent 8), renderers (5), effects (3), APIs
(DependencyService, MessagingCenter, Device and graphics types, 1 each), namespaces (1) and layouts (3). It is a
relative weight to compare areas and solutions, and every report says it is not a time estimate.

## Inputs and excluded paths

| Input | What is read |
| --- | --- |
| `*.sln` | the projects it names |
| `*.csproj` | old-style or SDK-style, the properties, the platform from ProjectTypeGuids, AndroidApplication or the target frameworks, and every PackageReference |
| `packages.config` | every package with its id and version, for the project in its folder |
| `*.cs` | the text with comments and literals blanked, as a heuristic |
| `*.xaml` | the XML: the Xamarin.Forms XAML namespace and its elements |
| `AndroidManifest.xml`, `Info.plist` | their presence only |
| `--exclude <pattern>` and `exclude` | paths left out, matched relative to the folder: `*` and `?` stay in one folder, `**` crosses folders, so `Samples/**` leaves the folder Samples out |

The folders bin, obj, packages, .git and .vs are never read. [docs/inputs.md](docs/inputs.md) describes every input.

## What is not checked

The tool reads the files it is given and never guesses. It does not:

- build, restore or convert anything, so it does not see whether the app builds or runs on .NET MAUI;
- evaluate MSBuild, so properties written with `$(...)`, conditions, Directory.Build.props, central package versions
  and imported files are read as written or not at all;
- compile C#, so a renderer registered through a helper, a call through an alias, a variable or reflection, and code
  that the build writes are not seen;
- ask NuGet anything, so it does not know whether a package has a .NET version, which packages it brings in, or what
  the latest version is;
- check behavior: layouts that measure differently, default spacing, renderers kept through the shims;
- read a date or the clock, or give an estimate in time;
- decide that the migration is done: it is not a build and not a finished migration.

So a clean run means the folder holds none of the forms the rules look for, and every report says so.

## The configuration file

```json
{
  "name": "Tidewater migration inventory",
  "exclude": ["Samples/**"],
  "packageMap": [
    { "match": "Fernway.Forms.Charts", "use": null, "note": "the vendor stopped at Xamarin.Forms; pick a .NET MAUI chart library or draw the charts with Microsoft.Maui.Graphics" }
  ]
}
```

Every key is optional, and without `--config` the defaults apply. `rules` sets the level of each rule (`info`,
`warning`, `error` or `off`); `packageMap` adds entries in front of the default package table, each with `match`, a
package id or pattern, `use`, what to move to, or `null` for a package with no .NET MAUI equivalent, and an optional
`note`; `keepPackages` lists package patterns that stay as they are, `Xamarin.AndroidX.*` and `Xamarin.Google.*` by
default; `layouts` lists the layouts to report with what to use instead, RelativeLayout by default; `exclude` lists
paths to leave out; `minSeverity` sets the lowest level shown and `failOn` the lowest level that fails the run. A key
the tool does not know is an error with its line and a suggestion, and a key named twice is refused.
[docs/inputs.md](docs/inputs.md) describes every key and the default package table, and `--print-defaults` writes the
whole default configuration out.

## Formats

- `text`: for a terminal: what was read, the configuration, the rules, the projects, the packages, the summary, the
  effort score, the count of every rule, the findings with the file and line and what to change, the notes, the
  notice and the result. With `--explain` also the rule, the points of the public pages and the tool's own choice
  behind each finding.
- `json` (or `--json`): the whole report: the input, the configuration, the projects, the packages, the summary, the
  effort score, the counts per rule, every finding with its file, line and column, the totals, the result, the notes
  and the notice.
- `csv`: one record per finding, ready for a sheet: the level, the rule, the file, the line, the column, what was found
  and what to change, with CRLF line ends as RFC 4180 writes. A field that a spreadsheet could read as a formula gets a
  single quote in front. The start of the messy example:

```
level,rule,file,line,column,found,fix
error,no-maui-equivalent,examples/messy/TidewaterDriver/TidewaterDriver.csproj,12,23,the package Fernway.Forms.Charts 3.4.1 has no known .NET MAUI equivalent: the vendor stopped at Xamarin.Forms; pick a .NET MAUI chart library or draw the charts with Microsoft.Maui.Graphics,"find a library that targets .NET for Android, .NET for iOS or .NET MAUI and does the same job, rebuild the package for .NET target frameworks if you own its code, or write the feature against the platform APIs"
warning,effect,examples/messy/TidewaterDriver.Android/Effects/AndroidShadowEffect.cs,10,40,"the class AndroidShadowEffect is a PlatformEffect, exported by ExportEffect at examples/messy/TidewaterDriver.Android/Effects/AndroidShadowEffect.cs:6: on .NET MAUI the effect is registered with ConfigureEffects, with no ExportEffect or ResolutionGroupName attribute","remove the ExportEffect and ResolutionGroupName attributes, put the platform effects next to their RoutingEffect with conditional compilation, and register the pair with ConfigureEffects in MauiProgram; or move the customization to a handler"
warning,custom-renderer,examples/messy/TidewaterDriver.Android/Renderers/RoundedEntryRenderer.cs,12,41,"the class RoundedEntryRenderer derives from EntryRenderer, a Xamarin.Forms renderer, registered for RoundedEntry by ExportRenderer at examples/messy/TidewaterDriver.Android/Renderers/RoundedEntryRenderer.cs:8: renderers become handlers on .NET MAUI","move the customization to a .NET MAUI handler: a PropertyMapper entry, or a handler of its own registered with ConfigureMauiHandlers; a renderer that derives from VisualElementRenderer, ListViewRenderer, FrameRenderer or TableViewRenderer can be kept for a while through the shims, registered with AddHandler, with its ExportRenderer attribute removed"
```

- `github`: one workflow command per finding, `::error`, `::warning` or `::notice` (for info) with the file, line and
  column, which GitHub shows as an annotation in the pull request, then a summary line. The characters a command gives
  a meaning to are escaped. Two findings of the messy example:

```
::error file=examples/messy/TidewaterDriver/TidewaterDriver.csproj,line=12,col=23,title=xamarin-maui-check no-maui-equivalent::the package Fernway.Forms.Charts 3.4.1 has no known .NET MAUI equivalent: the vendor stopped at Xamarin.Forms; pick a .NET MAUI chart library or draw the charts with Microsoft.Maui.Graphics; fix: find a library that targets .NET for Android, .NET for iOS or .NET MAUI and does the same job, rebuild the package for .NET target frameworks if you own its code, or write the feature against the platform APIs
::warning file=examples/messy/TidewaterDriver.iOS/Renderers/RoundedEntryRenderer.cs,line=11,col=41,title=xamarin-maui-check custom-renderer::the class RoundedEntryRenderer derives from EntryRenderer, a Xamarin.Forms renderer, registered for RoundedEntry by ExportRenderer at examples/messy/TidewaterDriver.iOS/Renderers/RoundedEntryRenderer.cs:7: renderers become handlers on .NET MAUI; fix: move the customization to a .NET MAUI handler: a PropertyMapper entry, or a handler of its own registered with ConfigureMauiHandlers; a renderer that derives from VisualElementRenderer, ListViewRenderer, FrameRenderer or TableViewRenderer can be kept for a while through the shims, registered with AddHandler, with its ExportRenderer attribute removed
```

## Exit codes

`0`: no finding at or above the fail-on level (`error` by default). `1`: at least one finding at or above it; with the
default, a package with no .NET MAUI equivalent or a file the tool could not read; with `--fail-on warning`, projects
in the old format, packages to replace or check, renderers, effects and layouts too. `2`: a usage or input error: no
folder named, two folders named, an unknown option, an option given twice, `--explain` with the csv or github format,
a URL in place of a path, a folder that is a file or is missing, a symbolic link, an `--exclude` pattern that is not
valid, or a configuration with an unknown key, a key named twice or a value of the wrong kind. With exit code `2` the
tool gives no result and prints the problems on standard error.

## Limits

The tool reads files; it fetches nothing and connects to nothing. A run reports the forms of docs/method.md that the
folder holds. [docs/limits.md](docs/limits.md) lists what it cannot see, with the size limits: 4 MB for a file, 50,000
files and folders listed, folders nested up to 32 deep, 5,000 input files, XML of 200,000 elements nested up to 64
deep, 20,000 matches in one C# file, 500 findings listed per rule. [docs/threat-model.md](docs/threat-model.md) lists
the risks of reading these files from a pull request and their controls, and
[docs/secure-defaults.md](docs/secure-defaults.md) the defaults and how to run the tool in a pipeline.

## Architecture

Plain ES modules in `src/`, with no dependencies.

| File | Job |
| --- | --- |
| `src/cli.js` | the command line, the usage and the exit codes |
| `src/check.js` | reads the configuration, lists the folder, reads every file by its kind, and builds the report of the run with the effort score |
| `src/walk.js`, `src/files.js` | the listing of the folder with no link followed, and the bounded reading of files by their byte order mark |
| `src/xml.js` | the safe XML reader: no DOCTYPE, no entities, no recursion, with limits |
| `src/msbuild.js` | solutions, projects and packages.config: style, properties, platform, target frameworks and packages |
| `src/code.js` | C# read as text: comments and literals blanked, then the fixed patterns |
| `src/xaml.js` | XAML: the Xamarin.Forms XAML namespace by its shape, and its layouts |
| `src/project.js` | the checks of the folder, the tables of projects and packages and the summary |
| `src/glob.js` | the path and package patterns |
| `src/config.js`, `src/defaults.js` | the configuration file over the defaults, the package table and the weights |
| `src/rules.js` | the rules, their levels and the result |
| `src/report.js`, `src/csv.js`, `src/json.js`, `src/text.js`, `src/size.js`, `src/words.js` | the text, JSON, CSV and GitHub output, the strict JSON reader of the configuration, the cleaning of text from the input, number formats and compared words |
| `src/data.js` | the public pages and the points the rules rest on, in this project's own words |
| `tools/check.mjs`, `tools/example.mjs` | the repository checks, and the examples with their real output |

## Where the facts come from

| Fact | Source |
| --- | --- |
| Support for the Xamarin SDKs has ended, and Xamarin.Forms apps move to .NET MAUI | .NET website, https://dotnet.microsoft.com/platform/support/policy/xamarin |
| .NET MAUI as the evolution of Xamarin.Forms, with one project for every platform | Microsoft Learn, https://learn.microsoft.com/en-us/dotnet/maui/what-is-maui |
| Every project becomes SDK-style; the Upgrade Assistant helps and more work follows | Microsoft Learn, https://learn.microsoft.com/en-us/dotnet/maui/migration/ |
| Namespaces, the XAML namespace, Color, layouts, the Device class and incompatible packages | Microsoft Learn, https://learn.microsoft.com/en-us/dotnet/maui/migration/multi-project-to-multi-project |
| The .NET target of an Android project, and the minimum Android version | Microsoft Learn, https://learn.microsoft.com/en-us/dotnet/maui/migration/android-projects |
| Custom renderers become handlers | Microsoft Learn, https://learn.microsoft.com/en-us/dotnet/maui/migration/renderer-to-handler |
| Renderers kept through the shims, with ExportRenderer removed | Microsoft Learn, https://learn.microsoft.com/en-us/dotnet/maui/migration/custom-renderers |
| Effects registered with ConfigureEffects | Microsoft Learn, https://learn.microsoft.com/en-us/dotnet/maui/migration/effects |
| RelativeLayout only in the compatibility namespace, and layout behavior changes | Microsoft Learn, https://learn.microsoft.com/en-us/dotnet/maui/migration/layouts |
| What the .NET Upgrade Assistant converts and which packages it swaps | Microsoft Learn, https://learn.microsoft.com/en-us/dotnet/maui/migration/upgrade-assistant |
| The single project and its Platforms folders | Microsoft Learn, https://learn.microsoft.com/en-us/dotnet/maui/fundamentals/single-project |
| Dependency injection built into .NET MAUI | Microsoft Learn, https://learn.microsoft.com/en-us/dotnet/maui/fundamentals/dependency-injection |
| MessagingCenter deprecated, WeakReferenceMessenger advised | Microsoft Learn, https://learn.microsoft.com/en-us/dotnet/maui/fundamentals/messagingcenter |
| The SkiaSharp packages for .NET MAUI | Microsoft Learn, https://learn.microsoft.com/en-us/dotnet/maui/migration/skiasharp |
| The packages of the .NET MAUI Community Toolkit | Microsoft Learn, https://learn.microsoft.com/en-us/dotnet/communitytoolkit/maui/ |
| Color, Colors, Point, Rect and Size in Microsoft.Maui.Graphics | Microsoft Learn, https://learn.microsoft.com/en-us/dotnet/api/microsoft.maui.graphics |
| The CSV format | RFC 4180, https://www.rfc-editor.org/rfc/rfc4180 |
| Repeated names in a JSON object, and UTF-8 | RFC 8259, https://www.rfc-editor.org/rfc/rfc8259 |
| Formulas hidden in CSV files | OWASP, https://community.owasp.org/attacks/CSV_Injection |
| XML external entities, and refusing document type definitions | OWASP, https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html |
| Annotations from workflow commands | GitHub Docs, https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands |

[research/sources.md](research/sources.md) has a note on each page, in this project's own words.

## Background

A Xamarin app that has to move to .NET MAUI carries years of decisions with it: platform heads in the old project
format, a renderer for every control that needed a native touch, effects, plugins that never got a .NET version, pages
laid out with RelativeLayout. None of it stops the old build, so it stays until someone reads the projects, the
packages and the code side by side, which is the first thing a team does when it plans the move or brings in
developers for it. How such work is staffed and carried out is described on the page
[Xamarin Development Services](https://innerluxes.dev/application/mobile/development/xamarin).

## License

MIT
