# Inputs

## The folder

```
xamarin-maui-check <solution folder> [--exclude <pattern>]... [--config <file>]
```

Name one folder: the folder of the solution, the one that holds the .sln and the project folders. Every file below it
of the kinds in the table is read; the folders bin, obj, packages, .git and .vs are passed over, in any case of
letters, and so is every path that matches an exclude pattern. A folder that is a file, a symbolic link or missing
stops the run with exit code `2`. Check two solutions in two runs.

The paths in the report are relative to the folder you run the command in, with forward slashes on every system,
followed by the line.

## The files

| File | What is read |
| --- | --- |
| `*.sln` | the `Project(...)` lines: the name and path of every project, solution folders passed over |
| `*.csproj` | old-style and SDK-style: the Sdk of the Project element, the properties of every PropertyGroup (TargetFramework, TargetFrameworks, TargetFrameworkVersion, TargetFrameworkIdentifier, TargetPlatformIdentifier, TargetPlatformVersion, ProjectTypeGuids, AndroidApplication) and every PackageReference with its Include and its Version attribute or element |
| `packages.config` | every `package` element with its id and version; it belongs to the project in its folder |
| `*.cs` | the text, with comments and literals blanked: the forms of docs/method.md |
| `*.xaml` | the XML: the namespaces declared and the elements of the Xamarin.Forms XAML namespace |
| `AndroidManifest.xml`, `Info.plist` | only that the file is there; it is not opened |

Names are compared without regard to case, so `App.CSPROJ` and `PACKAGES.CONFIG` are read too. A file is read as
UTF-8, with or without a byte order mark, or as UTF-16 with its byte order mark.

## Exclude patterns

`--exclude <pattern>` and `exclude` of the configuration leave paths of the folder out. A pattern is matched against
the path relative to the folder, with forward slashes: `*` is any run of characters but a slash, `?` one character but
a slash, `**` any run of characters with slashes, and `**/` any run of folders, none included. A folder is left out
when the pattern matches its path or its path with a slash after it, so `Samples/**` leaves out the folder Samples and
all below it, and `**/Tests/**` every folder named Tests. A pattern may not be absolute, hold a backslash or `..`, or
be longer than 200 characters. The patterns of `--exclude` add to those of the configuration.

## The configuration file

The configuration is one JSON object, read by a strict reader of RFC 8259 (no comments, no trailing comma, no name
given twice). Every key is optional; without `--config` the defaults apply, and `--print-defaults` writes them out. A
key the tool does not know is an error with its line and a suggestion, and stops the run with exit code `2`.

```json
{
  "name": "Tidewater migration inventory",
  "exclude": ["Samples/**"],
  "rules": { "graphicsType": "off", "customRenderer": "error" },
  "packageMap": [
    { "match": "Fernway.Forms.Charts", "use": null, "note": "the vendor stopped at Xamarin.Forms" },
    { "match": "Acme.Forms.Popups", "use": "Acme.Maui.Popups" }
  ],
  "keepPackages": ["Xamarin.AndroidX.*", "Xamarin.Google.*", "Xamarin.Kotlin.*"],
  "layouts": [{ "name": "RelativeLayout", "use": "Grid" }],
  "minSeverity": "info",
  "failOn": "error"
}
```

| Key | Value | Default |
| --- | --- | --- |
| `name` | a text of 1 to 120 characters, shown in the report | none |
| `rules` | an object of rule keys to `info`, `warning`, `error` or `off` | below |
| `packageMap` | up to 200 entries, added in front of the default table: `match`, `use` and `note` | the table below |
| `packageMap[].match` | a NuGet package id, or a pattern of ids where `*` is any run of characters and `?` one character, compared without regard to case: letters, digits, `.`, `_`, `-`, `*` and `?` | |
| `packageMap[].use` | what to move to, a text of 1 to 300 characters, or `null` for a package with no .NET MAUI equivalent, which is reported by `no-maui-equivalent` | |
| `packageMap[].note` | an optional text of 1 to 300 characters, shown after the message | |
| `keepPackages` | up to 200 patterns of package ids that stay as they are and are never reported | `Xamarin.AndroidX.*`, `Xamarin.Google.*` |
| `layouts` | up to 200 entries: `name` and `use` | `RelativeLayout` |
| `layouts[].name` | the name of a layout type, such as RelativeLayout | |
| `layouts[].use` | what to use instead, a text of 1 to 300 characters | |
| `exclude` | up to 200 path patterns | none |
| `minSeverity` | the lowest level shown: `info`, `warning` or `error` | `info` |
| `failOn` | the lowest level that fails the run | `error` |

An entry of `packageMap` whose `match` is the same as a default entry, without regard to case, takes its place; the
other lists replace their defaults as a whole. A value given twice in a list is kept once. `--min-severity` and
`--fail-on` on the command line win over the configuration. No key takes a regular expression.

### The default package table

| Package | Use on .NET MAUI | Page |
| --- | --- | --- |
| `Xamarin.Forms` | Microsoft.Maui.Controls, which an SDK-style project with UseMaui brings in | the Upgrade Assistant page |
| `Xamarin.Essentials` | the APIs built into .NET MAUI; remove the package and its using directives | the multi-project upgrade guide |
| `Xamarin.CommunityToolkit` | CommunityToolkit.Maui, the .NET MAUI Community Toolkit | the Upgrade Assistant page |
| `Xamarin.CommunityToolkit.Markup` | CommunityToolkit.Maui.Markup | the .NET MAUI Community Toolkit documentation |
| `Xamarin.Forms.Maps` | Microsoft.Maui.Controls.Maps | the namespace table of the multi-project upgrade guide |
| `Xamarin.Forms.DualScreen` | Microsoft.Maui.Controls.Foldable | the namespace table of the multi-project upgrade guide |
| `SkiaSharp.Views.Forms` | SkiaSharp.Views.Maui.Controls | the SkiaSharp page |

The table is short on purpose: each entry follows a public page (src/defaults.js names the point of each), and the
table holds no package with no equivalent, because whether a library has a .NET version is a fact the tool cannot look
up. A package outside the table whose id starts with `Xamarin.` or has `Forms` as one of its dot-separated parts is
reported by `unknown-xamarin-package` as one to check. Add what you have checked to `packageMap`: a replacement with
its `use`, or a package with no equivalent with `"use": null`.

### Why some packages are kept

`keepPackages` starts with `Xamarin.AndroidX.*` and `Xamarin.Google.*`: these are bindings of Android libraries that
still target .NET for Android, and the multi-project upgrade guide says Android apps can keep using packages that
target monoandroid. Add other bindings once you have checked them.

### Why the layouts list holds RelativeLayout

The layout page says RelativeLayout needs the compatibility namespace in .NET MAUI and is not advised, with Grid in its
place. Other layouts are carried over, with changes of behavior the page describes; add one to the list if your team
wants each use of it reported.

## The keys of rules

| Key | Rule | Default |
| --- | --- | --- |
| `rules.noMauiEquivalent` | `no-maui-equivalent` | error |
| `rules.nonSdkProject` | `non-sdk-project` | warning |
| `rules.replacePackage` | `replace-package` | warning |
| `rules.unknownXamarinPackage` | `unknown-xamarin-package` | warning |
| `rules.customRenderer` | `custom-renderer` | warning |
| `rules.effect` | `effect` | warning |
| `rules.removedLayout` | `removed-layout` | warning |
| `rules.platformHead` | `platform-head` | info |
| `rules.legacyTargetFramework` | `legacy-target-framework` | info |
| `rules.platformManifest` | `platform-manifest` | info |
| `rules.formsNamespace` | `forms-namespace` | info |
| `rules.dependencyService` | `dependency-service` | info |
| `rules.messagingCenter` | `messaging-center` | info |
| `rules.deviceApi` | `device-api` | info |
| `rules.graphicsType` | `graphics-type` | info |

`unreadable-file` and `scan-limit` have no key: they are always errors. Setting a rule to `off` leaves it out of the
findings, the counts and the effort score, and a note names it.
