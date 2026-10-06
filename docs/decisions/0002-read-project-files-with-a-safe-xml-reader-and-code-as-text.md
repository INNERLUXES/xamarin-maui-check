# 2. Read project files with a safe XML reader, and code as text

## Status

Accepted

## Context

The facts the checks need sit in four kinds of files. A .csproj, a packages.config and a XAML file are XML. A .sln is
a text format of its own, with one line per project. A C# file is a program: a renderer can be registered through a
helper and a call made through an alias, and only the compiler knows the result.

XML readers are a known place for trouble: a DOCTYPE can define entities that expand into each other until the memory
runs out, or name an external entity that makes the reader open a file or an address. A project file never needs a
DOCTYPE or an entity, and neither does a XAML file. A general XML library would bring code the project does not review
and features it must then turn off.

Building the solution would answer every question about the code, but it would need the .NET SDK, the Android and iOS
workloads and often a Mac, would restore packages from the network, and would run MSBuild targets from the repository
under review, which in a pipeline that checks pull requests may be written by anyone.

## Decision

1. Projects, packages.config and XAML are read by src/xml.js, a safe XML reader of the tool's own: one pass, a list of
   its own and no recursion, limits of depth, elements, attributes, names and values. It refuses a DOCTYPE, an ENTITY
   declaration and every entity reference other than the five that XML predefines and character references, as the
   OWASP cheat sheet on XML external entities advises. A file it refuses is an `unreadable-file` finding with its place.
2. A project is read as written: its properties and package references are text, and nothing is evaluated, imported or
   restored.
3. C# is read as text by src/code.js: comments and literals are blanked out with their line ends kept, then fixed
   patterns that each start at a fixed word are matched. It is a heuristic, and the forms it reads and those it does
   not are listed in docs/method.md and docs/limits.md.
4. The tool never runs MSBuild, dotnet or any other program, and never evaluates anything it reads.

## Consequences

- The tool needs no .NET SDK, no workloads, no Mac and no network, runs in seconds on a large solution, and the same
  files give the same report on Linux, Windows and macOS.
- It is a heuristic: a renderer registered in an unusual way, a call through an alias, and properties set by imports
  or conditions are not read as the compiler and MSBuild would. The report says so, docs/limits.md lists the forms, and
  every rule can be set to info or off.
- A file with a DOCTYPE is refused even when its DOCTYPE is harmless; such a file is not a normal project or XAML file,
  and a person can look at it.
