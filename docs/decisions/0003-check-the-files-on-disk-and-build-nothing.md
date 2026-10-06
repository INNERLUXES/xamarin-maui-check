# 3. Check the files on disk, and build nothing

## Status

Accepted

## Context

Some facts about a migration live elsewhere: whether a NuGet package has a version for .NET, which packages it brings
in, whether a renderer still works through the shims, whether the app builds and runs on .NET MAUI. A check could ask
NuGet about every package, run the .NET Upgrade Assistant, or build the solution. Each would need the network and
often credentials for private feeds, would make the result depend on the state of a server, would change files or run
code from the repository, and would let a file in a pull request make the pipeline reach an address it names.

What a team needs first, to plan a migration, is a list of what must change and where: the projects, the packages, the
renderers, the effects, the APIs and the pages, as the repository holds them.

## Decision

1. The tool reads the files of the solution folder and the configuration, and nothing else. It fetches nothing,
   restores nothing, builds nothing, converts nothing, runs no program and calls no service.
2. A package is classified by a short table that follows public pages, and by the team's own entries in the
   configuration; a Xamarin-era package outside the table is one to check, never a verdict. The table holds no package
   with no equivalent by default, because that is a fact the tool cannot look up.
3. The tool lists what to change and what to change it to; it does not change it. Converting projects is the job of
   the .NET Upgrade Assistant or of the team, and the report says what is left either way.

## Consequences

- The result depends only on the files, and a run needs no network access, no secret and no toolchain.
- Whether the app builds and runs on .NET MAUI is not checked (docs/limits.md); a clean result is not a build and not
  a finished migration.
- A team keeps its own list of checked packages in the configuration, reviewed like code, and the inventory gets
  sharper as the list grows.
