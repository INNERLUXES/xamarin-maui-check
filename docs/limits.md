# Limits

The tool builds nothing: it reads the solution, project, packages.config, C# and XAML files of a folder from disk,
as text. Its result is an inventory for planning, not a build and not a finished migration. It fetches nothing, runs
nothing, converts nothing, connects to no system and asks nobody anything. A finding points at a line where something
that must change was found, and a run without findings says only that the folder holds none of the forms of
docs/method.md. The effort score is a relative weight for comparing areas and solutions; it is not a time estimate.
Every report ends with a sentence that says so.

## What it cannot see

- **What the compiler sees.** C# is read as text, as a heuristic: comments and literals are blanked out and fixed
  patterns are matched. A renderer registered through a helper, a call made through an alias, a variable, `dynamic` or
  reflection, a type that comes from a `using static` or a global using, and code that the build writes are not seen.
  A class whose base type ends with Renderer is reported even when it is not a Xamarin.Forms renderer, unless its name
  reads like an interface (IRenderer).
- **What MSBuild sees.** A project is read as it is written: properties written with `$(...)`, conditions,
  Directory.Build.props, Directory.Packages.props and every imported file are not evaluated; a package version set by
  central package management shows as no version. A project file that is imported is not read on its own unless its
  name ends with .csproj.
- **Packages as a whole.** NuGet is not asked anything: the tool does not know whether a package has a version for .NET,
  which packages a package brings in, or what the latest version is. The package table holds what a public page says;
  every other Xamarin-era package is one to check.
- **Behavior.** Layouts that are carried over but measure differently (StackLayout, Grid with inferred rows, the
  *AndExpand options), default spacing, renderers that work through the shims, platform APIs that changed and the
  runtime behavior of the app are not checked.
- **Other project types.** F# and Visual Basic projects, shared projects (.shproj and .projitems), binding projects as
  such, and resources (images, fonts, Android resources) are not read.
- **Time.** The tool reads no clock and no dates, and it never says when support for anything ended
  ([decision 1](decisions/0001-read-no-clock-and-keep-dates-out-of-the-repository.md)). The effort score is not a
  time estimate.
- **What is outside the folder.** Files outside the solution folder are not read, and a project that a solution names
  but that is not in the folder is only named in a note.
- **Whether a finding matters to you.** A team may keep a renderer through the shims for a while, keep DependencyService,
  or keep one project per platform. Set the level of a rule, or turn it off, in the configuration.

## The readers

- The XML reader of src/xml.js refuses a DOCTYPE, an ENTITY declaration, an entity reference other than the five that
  XML predefines and character references, an element that is not closed, a close tag that does not match, an
  attribute named twice and text outside the root element, each with its line and column
  ([decision 2](decisions/0002-read-project-files-with-a-safe-xml-reader-and-code-as-text.md)).
- A solution is read line by line for its `Project(...)` lines.
- A file is read as UTF-8, with or without a byte order mark, or as UTF-16 with its byte order mark; UTF-16 with no
  mark, and any other encoding, is an `unreadable-file` finding.

## Size limits

Past a limit, the input is refused with exit code `2` and no result, a file is an error finding, or the listing stops
with a `scan-limit` finding.

| What | Limit |
| --- | --- |
| a solution, project, packages.config, C# or XAML file | 4 MB; a larger one is an `unreadable-file` finding |
| the configuration | 1 MB |
| files and folders of the solution listed | 50,000 |
| folders nested | 32 deep |
| solution, project, package, C#, XAML and manifest files | 5,000 |
| elements of an XML file | 200,000, nested up to 64 deep, with up to 256 attributes each |
| names and values in XML | 256 and 65,536 characters |
| matches of the patterns in one C# file | 20,000 |
| entries of a list of the configuration | 200 |
| exclude patterns | 100, of up to 200 characters |
| findings of one rule | 500 listed; the rest are counted in a note and still count for the result and the score |
| problems of the input | 20 listed; the rest are counted |

The tests check thousands of package references, renderers and calls, C# with runs of hundreds of thousands of quotes,
comments, braces and names, XML with runs of brackets, entities and attributes, deep nesting and many elements, the
billion laughs, patterns of hundreds of wildcards and folders nested past the limit, each with a time check.
