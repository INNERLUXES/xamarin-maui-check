# Threat model

## What the tool touches

- It reads the files named *.sln, *.csproj, packages.config, *.cs and *.xaml below the solution folder named on the
  command line, and the configuration named with `--config`. It lists the folders of the solution to find them, and
  notes AndroidManifest.xml and Info.plist by name without opening them. Nothing else is opened.
- It writes the report to standard output and its errors to standard error. It writes nothing to disk.
- It opens no network connection, fetches no URL it reads, follows no symbolic link, evaluates nothing it reads, runs
  no MSBuild, no dotnet and no other program, and reads no clock.

## What the input may hold

The solutions, projects, C# and XAML files come from a repository, and in a pipeline that checks every pull request
they may be written by whoever opened the pull request. Through them, a person can try to:

- make the tool read outside the folder or fetch something: a symbolic link or a junction in the folder, a link named
  on the command line, a file swapped for a link between the listing and the read, a DOCTYPE with an external entity
  or an external DTD in a project or XAML file, an Import of a project elsewhere, a folder path written as a web
  address;
- exhaust the memory, the stack or the time: files of megabytes, folders with tens of thousands of files, folders
  nested very deep, XML nested very deep or with entities that expand into each other (the billion laughs), C# with
  runs of hundreds of thousands of quotes, comments or names, patterns with many wildcards;
- move the result: a rule set to off, `failOn` raised, an exclude pattern that leaves out the project with the
  problem, a package listed in `keepPackages`, code written in a form the heuristic does not read;
- slip in something that is not text: a binary file named *.cs or *.csproj, bytes that are not valid UTF-8 or UTF-16;
- rewrite the terminal or break the output: control characters, ANSI escapes, direction controls and line separators in
  a file name, a package id or a version;
- start a second workflow command: a text that holds `::error`, `%`, a comma, a colon or a line break, which the GitHub
  format writes into a command;
- hide a formula in the CSV report: a package id, a version or a path that starts with `=`, `+`, `-` or `@`, which a
  spreadsheet may run when the report is opened;
- change how objects behave: a package id, a layout name or a name of the JSON named `__proto__`, `constructor` or
  `toString`.

## What could go wrong, and what stops it

| Risk | Control |
| --- | --- |
| A symbolic link makes the tool read outside the folder or walk a loop | Every link met in the listing is counted and none is followed, and a link named on the command line is refused; each file is opened with `O_NOFOLLOW` where the system has it and its type is taken from the open handle. Tests put links to a file and to a folder in the solution |
| An XML file makes the tool read a file, reach an address or expand entities | The safe XML reader refuses a DOCTYPE, an ENTITY declaration and every entity reference other than the five that XML predefines and character references, as the OWASP cheat sheet on XML external entities advises; no Import is followed. Tests give it an external entity and the billion laughs |
| The tool fetches, connects or runs something | No module of the network or of child processes is imported, nothing is evaluated, no MSBuild or dotnet is run, and a path that looks like an address is refused. A test checks the imports of src |
| The memory, the stack or the time is exhausted | Files have a size limit checked on the open handle before they are read; the listing has limits of entries, depth and files; the XML reader reads each character a bounded number of times with a list of its own and no recursion, and has limits of depth, elements, attributes, names and values; the C# reader blanks the text in one pass, every pattern starts at a fixed word and has bounded repeats, and the matches of one file are capped; patterns are matched in time bounded by their length; findings are capped per rule. Tests check the time, with limits that widen under coverage only |
| A pattern from the input is slow | No regular expression is built from the input or the configuration; exclude and package patterns are matched by a small matcher of the tool's own. A test looks for `new RegExp` in src |
| The result is moved through the input or the configuration | A file that cannot be read and input past the limits are error findings that cannot be set off; a rule set to off, every exclude pattern and the package table are named in the report. Review a change to the configuration like a change to code (docs/secure-defaults.md) |
| A binary file or bytes in another encoding are read as text | A null byte in UTF-8, an odd number of bytes or a broken pair in UTF-16, and bytes that are not valid make the file an error finding |
| Text from the input rewrites the terminal | Every text, file names included, goes through `safeText`, which removes control, line separator and direction characters and caps the length. A test puts escapes, direction controls and line separators in a package id, in every format |
| A text starts a second workflow command | The GitHub format escapes `%`, CR and LF in a message and `:` and `,` in a property; a line break never reaches a command. A test writes `%0A::error file=` and a line break with `::warning::` into a version |
| A formula runs when the CSV report is opened | A field that starts with `=`, `+`, `-`, `@`, a tab or a carriage return gets a single quote in front. The OWASP page on CSV injection says no one escape is safe in every program, so treat a report built from files you do not trust as untrusted data, and open it with formulas off |
| `__proto__` changes how objects behave | Names are kept in Map objects and sets, looked up with `Object.hasOwn`, and the JSON reader defines own properties. A test uses `__proto__`, `constructor` and `toString` as package ids, layout names and keys |
| A device or a pipe hangs the tool | A path that is not a regular file or folder is refused before it is read, and the listing passes over every entry that is not a file or a folder |
| The tool leaves files behind | Nothing is written to disk; there is no cache, no temporary file and no log. A test checks that a run leaves the folders as they were |

## Out of scope

Whether the app builds or runs on .NET MAUI, what MSBuild would evaluate, the forms of C# that docs/limits.md leaves
out, who may change the configuration in your repository, and where your pipeline keeps the output.

A clean result is not a build and not a finished migration.
