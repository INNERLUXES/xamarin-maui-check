# Changes

## 1.0.0

First release.

- Lists what must change to move a Xamarin.Forms, Xamarin.Android or Xamarin.iOS solution to .NET MAUI, from its files
  alone: every *.sln, *.csproj (old-style and SDK-style), packages.config, *.cs and *.xaml file below the solution
  folder, and AndroidManifest.xml and Info.plist by their presence, with bin, obj, packages, .git and .vs passed over
  and `--exclude` patterns left out. Builds nothing, restores nothing, fetches nothing, follows no symbolic link and
  reads no clock.
- A safe XML reader with no dependency for projects, packages.config and XAML: one pass with no recursion, limits of
  depth, elements, attributes, names and values, and no DOCTYPE, no ENTITY declaration and no entity other than the
  five that XML predefines and character references, as the OWASP advice on XML external entities says.
- C# read as text, as a documented heuristic: comments and every kind of literal blanked with line ends kept, then
  fixed patterns for renderer classes, PlatformEffect and RoutingEffect classes, the ExportRenderer, ExportEffect and
  Dependency attributes, DependencyService, MessagingCenter and Device calls, the Xamarin.Forms and Xamarin.Essentials
  namespaces, types created with new and Color members.
- XAML read for the Xamarin.Forms XAML namespace, recognized by its shape, and its elements, with prefixes and scopes.
- Fifteen rules in three levels: a package with no known .NET MAUI equivalent (`no-maui-equivalent`), a project in the
  old format (`non-sdk-project`), a package with a known replacement (`replace-package`), a Xamarin-era package to
  check (`unknown-xamarin-package`), a custom renderer (`custom-renderer`), an effect (`effect`), a layout that .NET
  MAUI does not carry over (`removed-layout`), a platform head (`platform-head`), a Xamarin target framework
  (`legacy-target-framework`), a platform manifest (`platform-manifest`), the Xamarin.Forms namespaces in C# and XAML
  (`forms-namespace`), DependencyService (`dependency-service`), MessagingCenter (`messaging-center`), the Device class
  (`device-api`) and Color, Rectangle and Point (`graphics-type`); and two rules of input problems that cannot be
  lowered (`unreadable-file`, `scan-limit`).
- A short default package table that follows public pages, and a configuration that adds to it, with null for a
  package with no equivalent.
- A table of the projects with their style, kind, targets, packages and findings, a table of the packages with their
  status and replacement, a summary, and an effort score per area from documented weights, which is a relative weight
  and not a time estimate.
- A configuration file in strict JSON over documented defaults: the level of every rule, the package table, the
  packages kept, the layouts, the paths left out, the minimum severity and the level that fails the run; a key the tool
  does not know is an error with its line and a suggestion, and a key named twice is refused.
- Reports as text, JSON, CSV with one row per finding (`--format csv`) and GitHub workflow commands (`--format github`)
  that show each finding as an annotation; every finding has its file, line and column; `--min-severity`, `--fail-on`,
  `--explain` with the rule, the sources and the tool's own choice, and `--print-defaults`. Exit code `0` when no
  finding is at or above the fail-on level, `1` when one is, `2` for a usage or input error, with no result.
- An inventory for planning, not a build and not a finished migration: every report says so.
- Release packages come with a CycloneDX SBOM, SHA-256 checksums and a build provenance attestation, after the SSDF gate
  of the repository.
