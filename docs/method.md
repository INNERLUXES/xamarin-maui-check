# Method

This document says exactly what the tool reads, how it reads a solution, a project, a packages.config, a C# file and a
XAML file, what each rule looks at and cannot see, how the effort score is weighed and how the report is built. The
names used here are the defaults; docs/inputs.md says how the configuration changes them. The tool reads the files of a
Xamarin.Forms, Xamarin.Android or Xamarin.iOS solution on disk as text and builds nothing. Its result is an inventory
for planning, not a build and not a finished migration: a finding points at a line that must change on the way to
.NET MAUI, and a clean run says only that the folder holds none of the forms below.

## What is read

The input is one solution folder. It is listed with a list of folders of the tool's own, with no recursion
(src/walk.js), in the order of the names. These files are read, by their names, without regard to case:

- every `*.sln`: the solution and the projects it names;
- every `*.csproj`: old-style and SDK-style projects;
- every `packages.config`: the packages of an old-style project;
- every `*.cs`: the C# code;
- every `*.xaml`: pages, views, resource dictionaries and the application;
- every `AndroidManifest.xml` and `Info.plist`, by their presence only: they are not opened.

The folders bin, obj, packages, .git and .vs are counted and passed over, in any case of letters, because they hold
build output, restored packages, history and the state of the editor, and not the code as written; so is every path
that matches an exclude pattern (`exclude` of the configuration and `--exclude`). A symbolic link (or a junction on
Windows) is counted and never followed.

Each file is read once (src/files.js), decoded by its byte order mark: UTF-16 little or big endian with one, UTF-8 with
or without one. A file that holds a null byte, bytes that are not valid UTF-8, or more than 4 MB is an
`unreadable-file` finding and nothing in it is checked.

## The safe XML reader

Projects, packages.config and XAML are XML. src/xml.js is a safe XML reader of the tool's own: it reads the text once,
left to right, with a list of open elements of its own and no recursion, and keeps the offset of every element and
attribute. It reads elements, attributes, character data, CDATA sections, comments and processing instructions, and
the five references XML predefines (`&lt;`, `&gt;`, `&amp;`, `&quot;`, `&apos;`) and character references. It refuses a
DOCTYPE, an ENTITY declaration and every other entity reference, so no entity is ever defined or expanded; and it
refuses an element that is not closed, a close tag that does not match, an attribute named twice, a `<` inside an
attribute value and text outside the root element. Depth, elements, attributes, names and values have limits
(docs/limits.md). A file it refuses is an `unreadable-file` finding with the line and column of the problem.

## How a solution and a project are read

A solution is read line by line (src/msbuild.js): each `Project("{type}") = "name", "path", "{id}"` line gives a
project, and the entries of the solution folder type are passed over. A project that a solution names but that is not
in the folder is named in a note.

A project is read with the safe XML reader. It is SDK-style when its Project element has an Sdk attribute, or it holds
an Sdk element or an Import with an Sdk attribute; otherwise it is old-style. The properties of every PropertyGroup
are read as written, the first value of each name kept; nothing is evaluated, so `$(...)` and conditions are text.
Every PackageReference with an Include gives a package, with the Version attribute or the Version element.

The platform of a project comes from, in this order: a legacy target framework in TargetFramework or TargetFrameworks
(monoandroid, xamarinios or xamarin.ios, xamarinmac or xamarin.mac, xamarintvos, xamarinwatchos, uap); the project
type GUID of Xamarin.Android, Xamarin.iOS or UWP in ProjectTypeGuids; AndroidApplication set to true; a
TargetFrameworkIdentifier of Xamarin.iOS; a TargetPlatformIdentifier of UAP. An old-style Android head names its
framework with TargetFrameworkVersion (MonoAndroid v13.0), an old-style iOS head with Xamarin.iOS, a UWP head with
TargetPlatformVersion.

A packages.config is read with the same reader: every `package` element under `packages` gives a package with its id
and version. It belongs to the project in its folder, or the nearest project folder above it.

## How C# is read

A C# file is read as text by src/code.js. This is a heuristic: no C# is compiled. The file is read once and its
comments (`//` and `/* */`) and the contents of its literals are blanked out with spaces, line ends kept, so offsets
stay the same: regular strings with their escapes, verbatim strings (`@"..."` with `""` inside), interpolated strings
(`$"..."`, `$@"..."`, the holes blanked with the string), raw strings (`"""..."""`) and character literals. So a call
in a comment or a string is not seen. Then fixed patterns are matched, each starting at a fixed word:

- `class Name : Base` (with type parameters and constraints): the first base type, by the last part of its name. A
  base that ends with Renderer, other than one named like an interface (IRenderer), is a renderer; PlatformEffect is a
  platform effect; RoutingEffect is a routing effect;
- `[assembly: Attribute(...)]` with Attribute one of ExportRenderer, ExportEffect and Dependency, with or without the
  Attribute suffix and a namespace, and the `typeof(...)` names inside;
- `DependencyService.Get`, `Register`, `RegisterSingleton` and `Resolve`;
- `MessagingCenter.Send`, `Subscribe`, `Unsubscribe` and `Instance`;
- `Device.` followed by RuntimePlatform, OnPlatform, BeginInvokeOnMainThread, InvokeOnMainThreadAsync, StartTimer,
  OpenUri, Idiom or OS;
- `Xamarin.Forms` and `Xamarin.Essentials` as names, and the using directives that name them;
- `new Type(` or `new Type {`, with the type by the last part of its name and as written;
- `Color.Member`, unless Color is qualified by another namespace than Xamarin.Forms.

## How XAML is read

A XAML file is read with the safe XML reader by src/xaml.js. The namespace of every element is worked out from the
`xmlns` and `xmlns:prefix` declarations of the element and its ancestors. The Xamarin.Forms XAML namespace is
recognized by its shape: a URI that starts with http://xamarin.com/schemas/, then a number, then /forms; the tool
never writes the URI out. A file that declares it is in the Xamarin.Forms XAML namespace.

## The rules

### `no-maui-equivalent`

Reports a package reference, of a project or a packages.config, whose id matches an entry of `packageMap` with
`"use": null`, with the `note` of the entry. The default table holds no such entry: the list is the team's, filled as
packages are checked. An error, because the app does not build on .NET MAUI until the package is replaced or rebuilt.

### `non-sdk-project`

Reports a project that is not SDK-style, at its Project element. Such a project lists its files and references by
hand, and every project must become SDK-style to run on .NET.

### `replace-package`

Reports a package reference whose id matches an entry of `packageMap` with a `use`, with what to move to. The entries
of the configuration come first, then the default table of docs/inputs.md; ids are compared without regard to case.

### `unknown-xamarin-package`

Reports a package reference whose id starts with `Xamarin.` or has `Forms` as one of its dot-separated parts, that
`packageMap` does not list and `keepPackages` does not keep. Such a package was built for Xamarin and may have no
version for .NET: a lead to check, not a verdict.

### `custom-renderer`

Reports each class whose first base type ends with Renderer, at the base type, with the place of the ExportRenderer
attribute that names it (the one in the same file first); and each ExportRenderer attribute that names a renderer no
scanned class declares. Renderers become handlers on .NET MAUI, or stay for a while through the shims.

### `effect`

Reports each class that derives from PlatformEffect, with the place of its ExportEffect attribute, and each
ExportEffect attribute that names an effect no scanned class declares. The RoutingEffect classes are counted in the
summary.

### `removed-layout`

Reports each element of the Xamarin.Forms XAML namespace, and each C# `new` expression, whose type name is in `layouts`
(RelativeLayout by default), with what to use instead. An element of another namespace, such as a compatibility
prefix or the .NET MAUI namespace, is not reported.

### `platform-head`

Reports a project whose platform is Android, iOS, the Mac or UWP, at its Project element, as a note: in a .NET MAUI
single project its code and resources go to a Platforms folder, or it becomes an SDK-style .NET for Android, .NET for
iOS or WinUI project.

### `legacy-target-framework`

Reports each Xamarin target framework of a project, at its property, with the .NET target that takes its place, such
as net8.0-android, or the same name for the .NET version a team moves to. watchOS has no target on .NET.

### `platform-manifest`

Reports an AndroidManifest.xml or Info.plist that is not already under a Platforms folder, at its first line, as a
note: in a single project it lives under Platforms/Android or Platforms/iOS. The file is not opened.

### `forms-namespace`

Reports a C# file that names Xamarin.Forms or Xamarin.Essentials outside comments and strings, once, at the first
name, with the count and the count of using directives; and a XAML file that declares the Xamarin.Forms XAML
namespace, once, at the declaration.

### `dependency-service`

Reports each DependencyService call and each Dependency assembly attribute, as a note: DependencyService still exists
in .NET MAUI, and the dependency injection built into .NET MAUI is the way forward.

### `messaging-center`

Reports each MessagingCenter call, as a note: MessagingCenter is deprecated, and WeakReferenceMessenger is advised.

### `device-api`

Reports each use of a member of the Device class that .NET MAUI replaces, with its replacement: DeviceInfo.Platform,
DeviceInfo.Idiom, MainThread, the dispatcher or Launcher.OpenAsync.

### `graphics-type`

In a C# file that names Xamarin.Forms, reports the uses of Color members and of `new Rectangle(...)` and
`new Point(...)` (unqualified or qualified by Xamarin.Forms), once per file, at the first, with the count. The types
may come from System.Drawing or another namespace, so it is a note.

### `unreadable-file`

Reports a solution, project, packages.config, C# or XAML file that cannot be read: over 4 MB, binary, not valid UTF-8
or UTF-16 with its byte order mark, or XML the safe XML reader refuses, a DOCTYPE or an entity included. Nothing in
such a file is checked. This rule has no key and is always an error, so a run never passes because a file could not be
read.

### `scan-limit`

Reports a folder past a limit of docs/limits.md: more files and folders than the listing reads, folders nested more
than 32 deep, more input files, or a C# file with more matches than the reader reads. The rest is not read, so the run
fails. This rule has no key and is always an error.

## The effort score

Every finding of a rule that is not off adds the weight of its rule to the score of its area, whether or not it is
shown by `--min-severity`. The weights are in src/defaults.js (`EFFORT_WEIGHTS`):

| Area | Rule | Weight |
| --- | --- | --- |
| project | `non-sdk-project` | 3 |
| project | `platform-head` | 2 |
| project | `legacy-target-framework` | 1 |
| project | `platform-manifest` | 1 |
| packages | `replace-package` | 1 |
| packages | `unknown-xamarin-package` | 3 |
| packages | `no-maui-equivalent` | 8 |
| renderers | `custom-renderer` | 5 |
| effects | `effect` | 3 |
| apis | `dependency-service`, `messaging-center`, `device-api`, `graphics-type` | 1 each |
| namespaces | `forms-namespace` | 1 |
| layouts | `removed-layout` | 3 |

The tool's own choice: a package with a known replacement is a swap; one to check costs a look and maybe a swap; one
with no equivalent costs a new library or a rebuild. A renderer is a handler to write; an effect is a registration to
move; a layout is a page to rebuild; a project in the old format is a conversion. The score is a relative weight, to
compare the areas of one solution and one solution with another; it is not a time estimate.

## The report

Every finding has its rule, its level, the file, the line and the column, what was found and what to change; with
`--explain`, also the rule, the points of the public pages it rests on and the tool's own choice. Findings are sorted by
level, then file, line, column and rule. A rule lists at most 500 findings; the rest are counted in a note and still
count for the result and the score. The table of projects gives, for each project, its style, its kind (a platform
head, a Xamarin.Forms library or a library), its targets, its packages and its findings by level, a file belonging to
the project of the nearest project folder above it; the table of packages gives every package id with its versions,
the projects that reference it, its status (replace, no equivalent, check, keep or other) and what to use; the
summary counts the projects, the heads, the packages, the renderers, the effects, the C# and XAML files and the calls.

The run fails when a finding is at or above the fail-on level (`error` by default): exit code `1`; otherwise `0`. A
usage or input error gives `2` and no result.
