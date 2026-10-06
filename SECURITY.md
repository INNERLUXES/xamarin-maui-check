# Security

## Reporting a problem

Write to info@innerluxes.dev with the subject line "xamarin-maui-check security", or use private vulnerability
reporting on this repository. Please do not open a public issue for a vulnerability.

Include a small made-up solution, project, C# file, XAML file or configuration that shows the problem, the command you
ran, what you expected and what happened. Use made-up companies, apps, packages and people, never the files of a real
app, and never a real credential, signing key or token, even an old one.

## Scope

In scope:

- an input that makes the tool read a file outside the solution folder and the configuration it was given, or follow a
  symbolic link or a junction
- an input that makes the tool open a network connection, fetch a URL it reads, resolve an XML entity or a DTD, run
  MSBuild, dotnet or any other program, or evaluate any part of a file
- an input that makes the tool write a file
- an input that makes the tool hang, take very long, exhaust the stack or use unbounded memory, such as very large
  files, solutions with very many files or folders, XML nested deep or with nested entities, or long runs of quotes,
  comments, brackets or names
- binary or invalid input that the tool reads as if it were a project, a C# file or a XAML file
- a file the tool fails to read and passes over without an error finding
- a form that docs/method.md says is reported but that a form of a file it says it reads hides from the tool
- a run that passes at a `failOn` level although the input holds a finding at that level that docs/method.md says is
  reported
- text from a file or a file name that rewrites the terminal through control or direction characters, starts or ends a
  GitHub workflow command, is shown unescaped in the output, or starts a formula in the CSV report
- a name such as `__proto__` that changes how objects behave inside the tool

Out of scope: the forms docs/limits.md says the tool does not see, whether an app builds or runs on .NET MAUI (a clean
result is not a build and not a finished migration), who may change the configuration in your repository, and where
your pipeline keeps the output.

Read [docs/threat-model.md](docs/threat-model.md) for the rest.
