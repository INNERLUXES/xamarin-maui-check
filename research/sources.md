# Sources

The public pages the checks of this tool are based on, each with a short note in this project's own words on what the
page says and which parts of the tool lean on it. Nothing here is a copy of a page: read the page itself for its exact
wording. src/data.js holds the pages and the points the reports show, and test/data.test.js checks that every page in
src/data.js is listed here.
Each page was fetched and read before it was listed.

The tool reads the solutions, projects, packages.config, C# and XAML files of a Xamarin solution on disk as text and
builds nothing; its result is an inventory for planning, not a build and not a finished migration, and its effort
score is a relative weight, not a time estimate. These notes say what the pages say so a reader can follow a finding
back to its source; they are not advice on how to migrate any one app. The pages were chosen with web addresses that
hold no number that reads like a year, and the notes name no release and no end of support by its date.

The Microsoft Learn pages are versioned by .NET release; the addresses here leave the version out, so they open the
current one. Where a page shows a target such as net8.0-android, the tool names that target as an example and says to
use the same name for the .NET version a team moves to.

## Xamarin and .NET MAUI

### Xamarin Support Policy (.NET website)

https://dotnet.microsoft.com/platform/support/policy/xamarin

The support policy of the Xamarin SDKs: Xamarin.Android, Xamarin.iOS, Xamarin.Mac and Xamarin.Forms. Support has
ended, and no further fixes, updates or new platform APIs come for them. The policy points Xamarin.Android, Xamarin.iOS
and Xamarin.Mac apps to .NET for Android, .NET for iOS and .NET for Mac, and Xamarin.Forms apps to .NET MAUI, and links
to the upgrade guides on Microsoft Learn. `no-maui-equivalent` and `legacy-target-framework` lean on it: a package or a
target that stays on Xamarin stays on an SDK that no longer gets fixes.

### What is .NET MAUI? (Microsoft Learn)

https://learn.microsoft.com/en-us/dotnet/maui/what-is-maui

The overview of .NET MAUI. It is the evolution of Xamarin.Forms, extended to the desktop, with its controls rebuilt for
performance and extensibility; one project can target Android, iOS, macOS and Windows, with platform code where it is
needed. The device APIs that Xamarin.Essentials held are part of it. `platform-head` leans on it.

### Upgrade from Xamarin to .NET (Microsoft Learn)

https://learn.microsoft.com/en-us/dotnet/maui/migration/

The entry page of the upgrade guides, with the project types that can move to .NET. Every project must become an
SDK-style project, projects do not need to be rewritten, and a multi-project solution does not have to become one
project. The .NET Upgrade Assistant can upgrade a multi-project Xamarin.Forms app, and the app usually needs more work
after it has run. `non-sdk-project`, `platform-head` and `forms-namespace` lean on it, and so does the choice to list
what must change rather than change it.

### Manually upgrade a Xamarin.Forms app to a multi-project .NET MAUI app (Microsoft Learn)

https://learn.microsoft.com/en-us/dotnet/maui/migration/multi-project-to-multi-project

The step by step guide for a Xamarin.Forms library and its platform projects. It lists the namespace changes from
Xamarin.Forms to Microsoft.Maui and Microsoft.Maui.Controls, says that Xamarin.Essentials is part of .NET MAUI and that
the default XAML namespace changes to the .NET MAUI one, and gives tables of API changes: the Color struct replaced by
the Color and Colors classes of Microsoft.Maui.Graphics, RelativeLayout kept only as a compatibility control, and the
Device class replaced by DeviceInfo, MainThread, the dispatcher and Launcher. It says Xamarin.Forms packages are
generally not compatible with .NET unless rebuilt, that Android apps can still use packages that target monoandroid,
and what to do when no compatible version exists. `forms-namespace`, `graphics-type`, `device-api`,
`replace-package`, `unknown-xamarin-package` and `no-maui-equivalent` lean on it.

### Xamarin.Android project migration (Microsoft Learn)

https://learn.microsoft.com/en-us/dotnet/maui/migration/android-projects

How a Xamarin.Android project becomes a .NET for Android project: an SDK-style project with a target such as
net8.0-android, MSBuild properties that changed, and the minimum Android version moving from the uses-sdk element of
AndroidManifest.xml to SupportedOSPlatformVersion. `legacy-target-framework` and `platform-manifest` lean on it.

### Migrate a custom renderer to a .NET MAUI handler (Microsoft Learn)

https://learn.microsoft.com/en-us/dotnet/maui/migration/renderer-to-handler

.NET MAUI replaces custom renderers with handlers. A handler maps each property of the control to a method of its own
through a property mapper, creates no extra parent view, splits the creation, setup and cleanup of the platform view
into methods, and is registered with ConfigureMauiHandlers in MauiProgram instead of being found by assembly scanning.
`custom-renderer` leans on it.

### Reuse custom renderers in .NET MAUI (Microsoft Learn)

https://learn.microsoft.com/en-us/dotnet/maui/migration/custom-renderers

Renderers that derive from a few base classes, such as VisualElementRenderer, ListViewRenderer, FrameRenderer or
TableViewRenderer, can be kept for a while through shims: the ExportRenderer attributes are removed, the Xamarin.Forms
namespaces replaced, and the renderer registered with AddHandler. The page names moving to handlers as the other way.
`custom-renderer` leans on it, and its fix names both ways.

### Reuse effects in .NET MAUI (Microsoft Learn)

https://learn.microsoft.com/en-us/dotnet/maui/migration/effects

Xamarin.Forms effects can still be used: the ResolutionGroupName and ExportEffect attributes are removed, the platform
effects are put next to their routing effect, with conditional compilation in a single project, and the pair is
registered with ConfigureEffects. `effect` leans on it.

### Layout behavior changes from Xamarin.Forms (Microsoft Learn)

https://learn.microsoft.com/en-us/dotnet/maui/migration/layouts

How layouts behave differently on .NET MAUI: explicit sizes are honored, Grid rows and columns must be declared, stack
layouts do not subdivide space and the *AndExpand options have no effect on the new ones, default spacing is zero, and
RelativeLayout needs the compatibility namespace and is not advised, with Grid advised in its place. `removed-layout`
leans on it.

### Upgrade a Xamarin.Forms app to a .NET MAUI app with the .NET Upgrade Assistant (Microsoft Learn)

https://learn.microsoft.com/en-us/dotnet/maui/migration/upgrade-assistant

What the .NET Upgrade Assistant does to a Xamarin.Forms solution: it converts the projects to SDK-style, sets the
.NET target frameworks and UseMaui, removes the Xamarin.Forms and Xamarin.Essentials packages, replaces
Xamarin.CommunityToolkit with the .NET MAUI Community Toolkit, swaps the SkiaSharp packages for their .NET MAUI
versions and replaces the Xamarin.Forms namespaces; more work is needed after it. `replace-package` and
`non-sdk-project` lean on it, and its list of packages is the start of the default package table.

### Target multiple platforms from .NET MAUI single project (Microsoft Learn)

https://learn.microsoft.com/en-us/dotnet/maui/fundamentals/single-project

A .NET MAUI single project keeps shared resources in one place, has one app manifest for the title, id and version,
one cross-platform entry point, and a Platforms folder with one child folder per platform for the code and resources
of that platform. `platform-head` and `platform-manifest` lean on it.

### Dependency injection in .NET MAUI (Microsoft Learn)

https://learn.microsoft.com/en-us/dotnet/maui/fundamentals/dependency-injection

.NET MAUI has dependency injection built in: types are registered on the Services of the MauiAppBuilder in
MauiProgram, and passed to constructors when they are resolved. `dependency-service` leans on it for its way forward.

### Publish and subscribe to messages (Microsoft Learn)

https://learn.microsoft.com/en-us/dotnet/maui/fundamentals/messagingcenter

MessagingCenter is deprecated; the page advises WeakReferenceMessenger of the CommunityToolkit.Mvvm package, with typed
messages and recipients, or plain events for local cases, and maps the Send, Subscribe and Unsubscribe calls to the
messenger. `messaging-center` leans on it.

### Reuse SkiaSharp code in .NET MAUI (Microsoft Learn)

https://learn.microsoft.com/en-us/dotnet/maui/migration/skiasharp

The Xamarin.Forms SkiaSharp packages are removed and SkiaSharp.Views.Maui.Controls is added; the types of
SkiaSharp.Views.Forms move to the SkiaSharp.Views.Maui namespaces, and SkiaSharp is set up with UseSkiaSharp. The
entry for SkiaSharp.Views.Forms in the default package table follows it.

### .NET MAUI Community Toolkit documentation (Microsoft Learn)

https://learn.microsoft.com/en-us/dotnet/communitytoolkit/maui/

The .NET MAUI Community Toolkit is a set of NuGet packages of behaviors, converters, effects and helpers for .NET MAUI
projects; its packages are CommunityToolkit.Maui and CommunityToolkit.Maui.Markup. The entries for
Xamarin.CommunityToolkit and its markup package in the default package table follow it.

### Microsoft.Maui.Graphics Namespace (Microsoft Learn, .NET API browser)

https://learn.microsoft.com/en-us/dotnet/api/microsoft.maui.graphics

The reference of the Microsoft.Maui.Graphics namespace: it holds the Color and Colors classes and the Point, Rect and
Size structures. `graphics-type` leans on it for the types that take the place of Rectangle and Point.

## Output and safe reading

### RFC 4180, Common Format and MIME Type for Comma-Separated Values (CSV) Files

https://www.rfc-editor.org/rfc/rfc4180

The CSV format: one record a line, ended by CRLF, an optional header line, and a field with a comma, a double quote or
a line break put in double quotes, with a double quote inside written twice. The CSV report follows it.

### RFC 8259, The JSON Data Interchange Format

https://www.rfc-editor.org/rfc/rfc8259

The JSON format. JSON exchanged between systems must be UTF-8. When the names of an object are not unique, the
behavior of the software that reads it is unpredictable, so the JSON reader of the configuration refuses a name given
twice.

### CSV Injection (OWASP)

https://community.owasp.org/attacks/CSV_Injection

A spreadsheet may read a cell that starts with =, +, -, @ or some white space as a formula, and no one escape is safe in
every program that opens the file. The CSV report puts a single quote in front of such a field, and the threat model
says to open a report built from files you do not trust with formulas turned off.

### XML External Entity Prevention Cheat Sheet (OWASP)

https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html

An XML reader that resolves external entities of input it does not trust can expose local files, reach other systems
or run out of memory on nested entities, and the safest defense is to turn document type definitions off altogether.
The XML reader of src/xml.js reads no DOCTYPE and no entity declaration and expands no entity other than the five that
XML predefines and character references, and a file that holds one is an `unreadable-file` finding.

### Workflow commands for GitHub Actions (GitHub Docs)

https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands

The error, warning and notice commands with file, line, col and title parameters create annotations on a file and a
line of the repository. The GitHub format writes one command per finding and escapes what a command gives a meaning
to.
