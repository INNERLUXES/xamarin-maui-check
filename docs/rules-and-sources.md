# Rules and sources

Every rule rests on points of public pages, written in this project's own words; this document lists them, with the
choices that are the tool's own and what to change. The same points are in src/data.js and are shown by `--explain`;
research/sources.md has a longer note on each page. The tool reads the solution, project, package, C# and XAML files on
disk as text: a point says what a page says, and a finding says what a file holds. The result is an inventory for
planning, not a build and not a finished migration.

## The rules

| Rule | Default level | Points |
| --- | --- | --- |
| `no-maui-equivalent` | error | `incompatiblePackages`, `supportEnded` |
| `non-sdk-project` | warning | `sdkStyleRequired`, `upgradeAssistantPackages` |
| `replace-package` | warning | `upgradeAssistantPackages`, `namespaceChanges`, `toolkitPackages`, `skiaPackages` |
| `unknown-xamarin-package` | warning | `incompatiblePackages`, `androidPackagesOk` |
| `custom-renderer` | warning | `handlersReplaceRenderers`, `shimmedRenderers` |
| `effect` | warning | `effectsReuse` |
| `removed-layout` | warning | `relativeLayoutCompat` |
| `platform-head` | info | `singleProjectPlatforms`, `sdkStyleRequired`, `mauiEvolution` |
| `legacy-target-framework` | info | `androidTargets`, `supportEnded` |
| `platform-manifest` | info | `singleProjectPlatforms`, `androidTargets` |
| `forms-namespace` | info | `namespaceChanges`, `upgradeAssistantRole` |
| `dependency-service` | info | `builtInDi` |
| `messaging-center` | info | `messagingDeprecated` |
| `device-api` | info | `deviceChanges` |
| `graphics-type` | info | `colorChanges`, `graphicsTypes` |
| `unreadable-file` | error, always | `xmlNoDtd`, `jsonRepeatedNames` |
| `scan-limit` | error, always | `upgradeAssistantRole` |

### `no-maui-equivalent`

A package with no known .NET MAUI equivalent.

- `incompatiblePackages` (Manually upgrade a Xamarin.Forms app to a multi-project .NET MAUI app (Microsoft Learn)): Xamarin.Forms NuGet packages are generally not compatible with .NET unless rebuilt for .NET target frameworks; without a compatible version, a package is rebuilt, taken in a preview or replaced.
- `supportEnded` (Xamarin Support Policy (.NET website)): support for the Xamarin SDKs, Xamarin.Forms included, has ended with no further fixes or updates, and the policy points Xamarin.Forms apps to .NET MAUI and Xamarin.Android and Xamarin.iOS apps to .NET for Android and .NET for iOS.

The tool's own choice: a package reference of a project or packages.config whose id matches an entry of packageMap with "use": null; the table names such packages only when the configuration does, because whether a library has a .NET version is a fact the tool cannot look up; an error, because the app cannot build on .NET MAUI until the package is replaced or rebuilt.

What to change: find a library that targets .NET for Android, .NET for iOS or .NET MAUI and does the same job, rebuild the package for .NET target frameworks if you own its code, or write the feature against the platform APIs.

### `non-sdk-project`

A project in the old project format.

- `sdkStyleRequired` (Upgrade from Xamarin to .NET (Microsoft Learn)): every project must become an SDK-style project to run on .NET, while a multi-project solution does not have to become a single project.
- `upgradeAssistantPackages` (Upgrade a Xamarin.Forms app to a .NET MAUI app with the .NET Upgrade Assistant (Microsoft Learn)): the Upgrade Assistant converts the projects to SDK-style, sets UseMaui, removes the Xamarin.Forms and Xamarin.Essentials packages, replaces Xamarin.CommunityToolkit with the .NET MAUI Community Toolkit and swaps the SkiaSharp packages.

The tool's own choice: a .csproj whose Project element has no Sdk attribute, no Sdk element and no Import with an Sdk; such a project lists every file and reference by hand and must be converted before it can target .NET.

What to change: convert the project to an SDK-style project, by hand or with the .NET Upgrade Assistant, with UseMaui set to true and .NET target frameworks; move what AssemblyInfo.cs and the old properties held into the project file.

### `replace-package`

A Xamarin-era package with a known .NET MAUI replacement.

- `upgradeAssistantPackages` (Upgrade a Xamarin.Forms app to a .NET MAUI app with the .NET Upgrade Assistant (Microsoft Learn)): the Upgrade Assistant converts the projects to SDK-style, sets UseMaui, removes the Xamarin.Forms and Xamarin.Essentials packages, replaces Xamarin.CommunityToolkit with the .NET MAUI Community Toolkit and swaps the SkiaSharp packages.
- `namespaceChanges` (Manually upgrade a Xamarin.Forms app to a multi-project .NET MAUI app (Microsoft Learn)): the Xamarin.Forms namespaces become Microsoft.Maui and Microsoft.Maui.Controls namespaces, the Xamarin.Essentials features are part of .NET MAUI, and the default XAML namespace changes to the .NET MAUI one.
- `toolkitPackages` (.NET MAUI Community Toolkit documentation (Microsoft Learn)): the .NET MAUI Community Toolkit ships as NuGet packages for .NET MAUI projects, CommunityToolkit.Maui and CommunityToolkit.Maui.Markup.
- `skiaPackages` (Reuse SkiaSharp code in .NET MAUI (Microsoft Learn)): the Xamarin.Forms SkiaSharp packages are removed and SkiaSharp.Views.Maui.Controls is added, and the types of SkiaSharp.Views.Forms move to the SkiaSharp.Views.Maui namespaces.

The tool's own choice: a package reference whose id matches an entry of packageMap that names what to use; the default table is short and each entry follows a public page; the configuration can add entries in front of it.

What to change: remove the package and add the one the message names, then update the namespaces and the code that used it.

### `unknown-xamarin-package`

A Xamarin-era package that is not in the table.

- `incompatiblePackages` (Manually upgrade a Xamarin.Forms app to a multi-project .NET MAUI app (Microsoft Learn)): Xamarin.Forms NuGet packages are generally not compatible with .NET unless rebuilt for .NET target frameworks; without a compatible version, a package is rebuilt, taken in a preview or replaced.
- `androidPackagesOk` (Manually upgrade a Xamarin.Forms app to a multi-project .NET MAUI app (Microsoft Learn)): Android apps can still use NuGet packages that target monoandroid, and .NET Standard libraries with no dependency on a Xamarin-only framework stay compatible.

The tool's own choice: a package whose id starts with Xamarin. or has Forms as one of its dot-separated parts, that packageMap does not list and keepPackages does not keep; such a package was built for Xamarin and may have no version for .NET, so it is a lead to check, not a verdict.

What to change: check for a version of the package that targets .NET for Android, .NET for iOS or .NET MAUI; once checked, add it to packageMap with what to use, or to keepPackages when it stays.

### `custom-renderer`

A Xamarin.Forms custom renderer.

- `handlersReplaceRenderers` (Migrate a custom renderer to a .NET MAUI handler (Microsoft Learn)): .NET MAUI replaces custom renderers with handlers, which map each property to its own method, create no parent view and are registered in MauiProgram rather than found by assembly scanning.
- `shimmedRenderers` (Reuse custom renderers in .NET MAUI (Microsoft Learn)): renderers that derive from a few base classes, such as VisualElementRenderer, ListViewRenderer or FrameRenderer, can be reused through shims once the ExportRenderer attributes are removed and the renderers are registered with AddHandler.

The tool's own choice: a C# class whose first base type has a name that ends with Renderer, such as EntryRenderer or ViewRenderer<T, TNative>, and an ExportRenderer assembly attribute that names a renderer no scanned class declares; each renderer is one finding, with the place of its ExportRenderer attribute when there is one.

What to change: move the customization to a .NET MAUI handler: a PropertyMapper entry, or a handler of its own registered with ConfigureMauiHandlers; a renderer that derives from VisualElementRenderer, ListViewRenderer, FrameRenderer or TableViewRenderer can be kept for a while through the shims, registered with AddHandler, with its ExportRenderer attribute removed.

### `effect`

A Xamarin.Forms effect.

- `effectsReuse` (Reuse effects in .NET MAUI (Microsoft Learn)): Xamarin.Forms effects can be reused once the ExportEffect and ResolutionGroupName attributes are removed, the platform effects sit with the routing effect, and the effect is registered with ConfigureEffects.

The tool's own choice: a C# class that derives from PlatformEffect, and an ExportEffect assembly attribute that names an effect no scanned class declares; the RoutingEffect classes are counted in the summary.

What to change: remove the ExportEffect and ResolutionGroupName attributes, put the platform effects next to their RoutingEffect with conditional compilation, and register the pair with ConfigureEffects in MauiProgram; or move the customization to a handler.

### `removed-layout`

A layout that .NET MAUI does not carry over.

- `relativeLayoutCompat` (Layout behavior changes from Xamarin.Forms (Microsoft Learn)): RelativeLayout needs the compatibility namespace in .NET MAUI and is not advised, with Grid advised instead, and other layouts measure and space their children differently.

The tool's own choice: an element of the Xamarin.Forms XAML namespace, or a C# new expression, whose type name is in the layouts list of the configuration (RelativeLayout by default).

What to change: rebuild the layout with the one the message names, usually a Grid with row and column definitions; the compatibility control keeps it working while you do.

### `platform-head`

A platform head project.

- `singleProjectPlatforms` (Target multiple platforms from .NET MAUI single project (Microsoft Learn)): a .NET MAUI single project keeps platform code and resources in a Platforms folder with one child folder per platform, with one app manifest and one cross-platform entry point.
- `sdkStyleRequired` (Upgrade from Xamarin to .NET (Microsoft Learn)): every project must become an SDK-style project to run on .NET, while a multi-project solution does not have to become a single project.
- `mauiEvolution` (What is .NET MAUI? (Microsoft Learn)): .NET MAUI is the evolution of Xamarin.Forms, with its controls rebuilt for performance and extensibility, and one project can target Android, iOS, macOS and Windows.

The tool's own choice: a .csproj that is a Xamarin.Android, Xamarin.iOS or UWP project, known by its project type GUID, its target framework or its Android and iOS properties; a note, because a solution may keep one project per platform on .NET MAUI, but a single project folds the heads into Platforms folders.

What to change: move the platform code and resources into the Platforms folder of a .NET MAUI single project (Platforms/Android, Platforms/iOS, Platforms/Windows), or convert the head to an SDK-style .NET for Android, .NET for iOS or WinUI project.

### `legacy-target-framework`

A Xamarin target framework.

- `androidTargets` (Xamarin.Android project migration (Microsoft Learn)): a .NET for Android project is SDK-style with a target such as net8.0-android, and the minimum Android version moves from the uses-sdk element of AndroidManifest.xml to SupportedOSPlatformVersion.
- `supportEnded` (Xamarin Support Policy (.NET website)): support for the Xamarin SDKs, Xamarin.Forms included, has ended with no further fixes or updates, and the policy points Xamarin.Forms apps to .NET MAUI and Xamarin.Android and Xamarin.iOS apps to .NET for Android and .NET for iOS.

The tool's own choice: a TargetFramework or TargetFrameworks value that starts with monoandroid, xamarinios, xamarin.ios, xamarinmac, xamarintvos, xamarinwatchos or uap, and the TargetFrameworkVersion, TargetFrameworkIdentifier or TargetPlatformVersion of an old-style Android, iOS or UWP head.

What to change: target .NET instead: net8.0-android for Android, net8.0-ios for iOS, net8.0-maccatalyst for the Mac and net8.0-windows10.0.19041.0 for Windows (or the same names for the .NET version you move to), with the minimum OS version in SupportedOSPlatformVersion.

### `platform-manifest`

A platform manifest of a head project.

- `singleProjectPlatforms` (Target multiple platforms from .NET MAUI single project (Microsoft Learn)): a .NET MAUI single project keeps platform code and resources in a Platforms folder with one child folder per platform, with one app manifest and one cross-platform entry point.
- `androidTargets` (Xamarin.Android project migration (Microsoft Learn)): a .NET for Android project is SDK-style with a target such as net8.0-android, and the minimum Android version moves from the uses-sdk element of AndroidManifest.xml to SupportedOSPlatformVersion.

The tool's own choice: a file named AndroidManifest.xml or Info.plist; only its presence is used, the file is not read.

What to change: in a single project, keep it under Platforms/Android or Platforms/iOS; take the app title, id and version from the project file, and move the minimum Android version from uses-sdk to SupportedOSPlatformVersion.

### `forms-namespace`

Xamarin.Forms or Xamarin.Essentials namespaces in code or XAML.

- `namespaceChanges` (Manually upgrade a Xamarin.Forms app to a multi-project .NET MAUI app (Microsoft Learn)): the Xamarin.Forms namespaces become Microsoft.Maui and Microsoft.Maui.Controls namespaces, the Xamarin.Essentials features are part of .NET MAUI, and the default XAML namespace changes to the .NET MAUI one.
- `upgradeAssistantRole` (Upgrade from Xamarin to .NET (Microsoft Learn)): the .NET Upgrade Assistant can upgrade a multi-project Xamarin.Forms app, and in most cases the app needs more work after it has run.

The tool's own choice: a C# file that names the Xamarin.Forms or Xamarin.Essentials namespace, in a using directive or a qualified name, outside comments and strings, as one finding with the count; and a XAML file that declares the Xamarin.Forms XAML namespace, as one finding at the declaration.

What to change: replace the Xamarin.Forms namespaces with Microsoft.Maui and Microsoft.Maui.Controls, drop the Xamarin.Essentials using directives (.NET MAUI brings them in with global usings), and set the default XAML namespace to the .NET MAUI one.

### `dependency-service`

DependencyService.

- `builtInDi` (Dependency injection in .NET MAUI (Microsoft Learn)): .NET MAUI has dependency injection built in: services are registered on MauiAppBuilder.Services in MauiProgram and passed to constructors.

The tool's own choice: a call of DependencyService.Get, Register, RegisterSingleton or Resolve, and a Dependency assembly attribute; DependencyService still exists in .NET MAUI, so it is a note.

What to change: register the platform service on builder.Services in MauiProgram and take it in a constructor; remove the Dependency attribute.

### `messaging-center`

MessagingCenter.

- `messagingDeprecated` (Publish and subscribe to messages (Microsoft Learn)): MessagingCenter is deprecated, and WeakReferenceMessenger of the CommunityToolkit.Mvvm package, or plain events, are advised instead.

The tool's own choice: a call of MessagingCenter.Send, Subscribe or Unsubscribe, or a use of MessagingCenter.Instance.

What to change: send a typed message with WeakReferenceMessenger of CommunityToolkit.Mvvm and receive it with IRecipient<T>, or use an event.

### `device-api`

The Xamarin.Forms Device class.

- `deviceChanges` (Manually upgrade a Xamarin.Forms app to a multi-project .NET MAUI app (Microsoft Learn)): the Device class of Xamarin.Forms is replaced by several types: RuntimePlatform and OnPlatform by DeviceInfo.Platform, BeginInvokeOnMainThread by MainThread.BeginInvokeOnMainThread, StartTimer by the dispatcher and OpenUri by Launcher.OpenAsync.

The tool's own choice: a use of Device.RuntimePlatform, Device.OnPlatform, Device.BeginInvokeOnMainThread, Device.InvokeOnMainThreadAsync, Device.StartTimer, Device.OpenUri, Device.Idiom or Device.OS in C#; the replacement is named in the message.

What to change: use the replacement the message names: DeviceInfo.Platform, DeviceInfo.Idiom, MainThread, the Dispatcher or Launcher.OpenAsync.

### `graphics-type`

Color, Rectangle and Point of Xamarin.Forms.

- `colorChanges` (Manually upgrade a Xamarin.Forms app to a multi-project .NET MAUI app (Microsoft Learn)): the Xamarin.Forms Color struct is replaced by the Color and Colors classes of Microsoft.Maui.Graphics, with float values and no implicit conversion to System.Drawing.Color.
- `graphicsTypes` (Microsoft.Maui.Graphics Namespace (Microsoft Learn, .NET API browser)): the Microsoft.Maui.Graphics namespace holds the Color and Colors classes and the Point, Rect and Size structures.

The tool's own choice: in a C# file that names Xamarin.Forms, a member of Color such as Color.FromHex or Color.Red, and new Rectangle(...) or new Point(...), as one finding per file with the count; the types may come from another namespace, so it is a note.

What to change: use Microsoft.Maui.Graphics: Color with float values, Colors for named colors, Color.FromArgb for a hex string, Rect for Rectangle and Point for Point.

### `unreadable-file`

A file that cannot be read.

- `xmlNoDtd` (XML External Entity Prevention Cheat Sheet (OWASP)): an XML reader that resolves external entities of untrusted input can expose files or reach other systems, and the safest defense is to refuse document type definitions altogether.
- `jsonRepeatedNames` (RFC 8259, The JSON Data Interchange Format): when an object repeats a name the behavior of the software that reads it cannot be predicted, so the JSON reader of this tool refuses a repeated name.

The tool's own choice: a file over its size limit, a binary file, a file that is not valid UTF-8 or UTF-16 with its byte order mark, and a project, packages.config or XAML file that the safe XML reader refuses, a DOCTYPE or an entity included; nothing in it is checked; this rule cannot be set lower or off.

What to change: save the file as UTF-8 and well-formed XML with no DOCTYPE; a project file never needs a DOCTYPE or an entity.

### `scan-limit`

The input is larger than the limits of a run.

- `upgradeAssistantRole` (Upgrade from Xamarin to .NET (Microsoft Learn)): the .NET Upgrade Assistant can upgrade a multi-project Xamarin.Forms app, and in most cases the app needs more work after it has run.

The tool's own choice: a folder with more files, folders or input files than the limits of docs/limits.md, folders nested deeper, or a C# file with more matches than the reader reads; the rest is not read, so the run fails; this rule cannot be set lower or off.

What to change: exclude the folders that are not part of the app, or check the parts of the solution in runs of their own.

## The points

| Point | Page | What it says |
| --- | --- | --- |
| `supportEnded` | Xamarin Support Policy (.NET website) | support for the Xamarin SDKs, Xamarin.Forms included, has ended with no further fixes or updates, and the policy points Xamarin.Forms apps to .NET MAUI and Xamarin.Android and Xamarin.iOS apps to .NET for Android and .NET for iOS |
| `mauiEvolution` | What is .NET MAUI? (Microsoft Learn) | .NET MAUI is the evolution of Xamarin.Forms, with its controls rebuilt for performance and extensibility, and one project can target Android, iOS, macOS and Windows |
| `sdkStyleRequired` | Upgrade from Xamarin to .NET (Microsoft Learn) | every project must become an SDK-style project to run on .NET, while a multi-project solution does not have to become a single project |
| `upgradeAssistantRole` | Upgrade from Xamarin to .NET (Microsoft Learn) | the .NET Upgrade Assistant can upgrade a multi-project Xamarin.Forms app, and in most cases the app needs more work after it has run |
| `namespaceChanges` | Manually upgrade a Xamarin.Forms app to a multi-project .NET MAUI app (Microsoft Learn) | the Xamarin.Forms namespaces become Microsoft.Maui and Microsoft.Maui.Controls namespaces, the Xamarin.Essentials features are part of .NET MAUI, and the default XAML namespace changes to the .NET MAUI one |
| `colorChanges` | Manually upgrade a Xamarin.Forms app to a multi-project .NET MAUI app (Microsoft Learn) | the Xamarin.Forms Color struct is replaced by the Color and Colors classes of Microsoft.Maui.Graphics, with float values and no implicit conversion to System.Drawing.Color |
| `deviceChanges` | Manually upgrade a Xamarin.Forms app to a multi-project .NET MAUI app (Microsoft Learn) | the Device class of Xamarin.Forms is replaced by several types: RuntimePlatform and OnPlatform by DeviceInfo.Platform, BeginInvokeOnMainThread by MainThread.BeginInvokeOnMainThread, StartTimer by the dispatcher and OpenUri by Launcher.OpenAsync |
| `incompatiblePackages` | Manually upgrade a Xamarin.Forms app to a multi-project .NET MAUI app (Microsoft Learn) | Xamarin.Forms NuGet packages are generally not compatible with .NET unless rebuilt for .NET target frameworks; without a compatible version, a package is rebuilt, taken in a preview or replaced |
| `androidPackagesOk` | Manually upgrade a Xamarin.Forms app to a multi-project .NET MAUI app (Microsoft Learn) | Android apps can still use NuGet packages that target monoandroid, and .NET Standard libraries with no dependency on a Xamarin-only framework stay compatible |
| `androidTargets` | Xamarin.Android project migration (Microsoft Learn) | a .NET for Android project is SDK-style with a target such as net8.0-android, and the minimum Android version moves from the uses-sdk element of AndroidManifest.xml to SupportedOSPlatformVersion |
| `handlersReplaceRenderers` | Migrate a custom renderer to a .NET MAUI handler (Microsoft Learn) | .NET MAUI replaces custom renderers with handlers, which map each property to its own method, create no parent view and are registered in MauiProgram rather than found by assembly scanning |
| `shimmedRenderers` | Reuse custom renderers in .NET MAUI (Microsoft Learn) | renderers that derive from a few base classes, such as VisualElementRenderer, ListViewRenderer or FrameRenderer, can be reused through shims once the ExportRenderer attributes are removed and the renderers are registered with AddHandler |
| `effectsReuse` | Reuse effects in .NET MAUI (Microsoft Learn) | Xamarin.Forms effects can be reused once the ExportEffect and ResolutionGroupName attributes are removed, the platform effects sit with the routing effect, and the effect is registered with ConfigureEffects |
| `relativeLayoutCompat` | Layout behavior changes from Xamarin.Forms (Microsoft Learn) | RelativeLayout needs the compatibility namespace in .NET MAUI and is not advised, with Grid advised instead, and other layouts measure and space their children differently |
| `upgradeAssistantPackages` | Upgrade a Xamarin.Forms app to a .NET MAUI app with the .NET Upgrade Assistant (Microsoft Learn) | the Upgrade Assistant converts the projects to SDK-style, sets UseMaui, removes the Xamarin.Forms and Xamarin.Essentials packages, replaces Xamarin.CommunityToolkit with the .NET MAUI Community Toolkit and swaps the SkiaSharp packages |
| `singleProjectPlatforms` | Target multiple platforms from .NET MAUI single project (Microsoft Learn) | a .NET MAUI single project keeps platform code and resources in a Platforms folder with one child folder per platform, with one app manifest and one cross-platform entry point |
| `builtInDi` | Dependency injection in .NET MAUI (Microsoft Learn) | .NET MAUI has dependency injection built in: services are registered on MauiAppBuilder.Services in MauiProgram and passed to constructors |
| `messagingDeprecated` | Publish and subscribe to messages (Microsoft Learn) | MessagingCenter is deprecated, and WeakReferenceMessenger of the CommunityToolkit.Mvvm package, or plain events, are advised instead |
| `skiaPackages` | Reuse SkiaSharp code in .NET MAUI (Microsoft Learn) | the Xamarin.Forms SkiaSharp packages are removed and SkiaSharp.Views.Maui.Controls is added, and the types of SkiaSharp.Views.Forms move to the SkiaSharp.Views.Maui namespaces |
| `toolkitPackages` | .NET MAUI Community Toolkit documentation (Microsoft Learn) | the .NET MAUI Community Toolkit ships as NuGet packages for .NET MAUI projects, CommunityToolkit.Maui and CommunityToolkit.Maui.Markup |
| `graphicsTypes` | Microsoft.Maui.Graphics Namespace (Microsoft Learn, .NET API browser) | the Microsoft.Maui.Graphics namespace holds the Color and Colors classes and the Point, Rect and Size structures |
| `csvRecords` | RFC 4180, Common Format and MIME Type for Comma-Separated Values (CSV) Files | each record of a CSV file is on its own line, ended by CRLF, the first line may be a header, and a field that holds a comma, a double quote or a line break is put in double quotes, with a double quote inside it written twice |
| `csvInjection` | CSV Injection (OWASP) | a spreadsheet may read a cell that starts with =, +, -, @ or some white space as a formula, and no one escape is safe in every program that opens the file |
| `jsonUtf8` | RFC 8259, The JSON Data Interchange Format | JSON text exchanged between systems must be UTF-8 |
| `jsonRepeatedNames` | RFC 8259, The JSON Data Interchange Format | when an object repeats a name the behavior of the software that reads it cannot be predicted, so the JSON reader of this tool refuses a repeated name |
| `xmlNoDtd` | XML External Entity Prevention Cheat Sheet (OWASP) | an XML reader that resolves external entities of untrusted input can expose files or reach other systems, and the safest defense is to refuse document type definitions altogether |
| `githubAnnotations` | Workflow commands for GitHub Actions (GitHub Docs) | a line of output such as ::warning file=...,line=...::message becomes an annotation on that file and line in the run |

## The pages

| Page | Address |
| --- | --- |
| Xamarin Support Policy (.NET website) | https://dotnet.microsoft.com/platform/support/policy/xamarin |
| What is .NET MAUI? (Microsoft Learn) | https://learn.microsoft.com/en-us/dotnet/maui/what-is-maui |
| Upgrade from Xamarin to .NET (Microsoft Learn) | https://learn.microsoft.com/en-us/dotnet/maui/migration/ |
| Manually upgrade a Xamarin.Forms app to a multi-project .NET MAUI app (Microsoft Learn) | https://learn.microsoft.com/en-us/dotnet/maui/migration/multi-project-to-multi-project |
| Xamarin.Android project migration (Microsoft Learn) | https://learn.microsoft.com/en-us/dotnet/maui/migration/android-projects |
| Migrate a custom renderer to a .NET MAUI handler (Microsoft Learn) | https://learn.microsoft.com/en-us/dotnet/maui/migration/renderer-to-handler |
| Reuse custom renderers in .NET MAUI (Microsoft Learn) | https://learn.microsoft.com/en-us/dotnet/maui/migration/custom-renderers |
| Reuse effects in .NET MAUI (Microsoft Learn) | https://learn.microsoft.com/en-us/dotnet/maui/migration/effects |
| Layout behavior changes from Xamarin.Forms (Microsoft Learn) | https://learn.microsoft.com/en-us/dotnet/maui/migration/layouts |
| Upgrade a Xamarin.Forms app to a .NET MAUI app with the .NET Upgrade Assistant (Microsoft Learn) | https://learn.microsoft.com/en-us/dotnet/maui/migration/upgrade-assistant |
| Target multiple platforms from .NET MAUI single project (Microsoft Learn) | https://learn.microsoft.com/en-us/dotnet/maui/fundamentals/single-project |
| Dependency injection in .NET MAUI (Microsoft Learn) | https://learn.microsoft.com/en-us/dotnet/maui/fundamentals/dependency-injection |
| Publish and subscribe to messages (Microsoft Learn) | https://learn.microsoft.com/en-us/dotnet/maui/fundamentals/messagingcenter |
| Reuse SkiaSharp code in .NET MAUI (Microsoft Learn) | https://learn.microsoft.com/en-us/dotnet/maui/migration/skiasharp |
| .NET MAUI Community Toolkit documentation (Microsoft Learn) | https://learn.microsoft.com/en-us/dotnet/communitytoolkit/maui/ |
| Microsoft.Maui.Graphics Namespace (Microsoft Learn, .NET API browser) | https://learn.microsoft.com/en-us/dotnet/api/microsoft.maui.graphics |
| RFC 4180, Common Format and MIME Type for Comma-Separated Values (CSV) Files | https://www.rfc-editor.org/rfc/rfc4180 |
| RFC 8259, The JSON Data Interchange Format | https://www.rfc-editor.org/rfc/rfc8259 |
| CSV Injection (OWASP) | https://community.owasp.org/attacks/CSV_Injection |
| XML External Entity Prevention Cheat Sheet (OWASP) | https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html |
| Workflow commands for GitHub Actions (GitHub Docs) | https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands |
