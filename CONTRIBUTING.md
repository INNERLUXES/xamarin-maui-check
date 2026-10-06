# Contributing

Every change goes through a pull request and is reviewed before it is merged. The pipeline runs the tests on Linux,
Windows and macOS with Node 22 and 24, the tests with coverage, the repository checks, CodeQL, and a secure
development check of the repository itself.

Commit messages in this repository follow Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`,
with `!` for a breaking change.

This tool reads the solution, project, packages.config, C# and XAML files on disk as text; its result is an inventory
for planning, not a build and not a finished migration. A change must keep it that way: a rule reports what a file
holds, and the tool never fetches, builds, converts, runs or evaluates what it reads, and never gives an estimate in
time.

## Changing a rule

1. Describe the change in docs/method.md first: what the rule looks at and what it can and cannot see, and add what it
   cannot see to docs/limits.md. Where the tool makes its own choice, say so in `own` in src/rules.js and say why.
2. Keep the rules to what is written. A finding must point at something a reader can check in a file: a line and a
   column. Never add a rule that needs the network, a toolchain or the clock.
3. A rule says what to change, in `fix` in src/rules.js, and names the points of the public pages it rests on in
   `basis`; a new page goes into src/data.js and research/sources.md, and docs/rules-and-sources.md lists it.
4. A new rule gets a weight in `EFFORT_WEIGHTS` of src/defaults.js and a line in the table of docs/method.md; a test
   fails when a rule has no weight.
5. A run must never pass because something could not be read: a file that cannot be read and input past the limits
   are error findings, and those two rules keep no key in the configuration.
6. Add a test with the project, the C# or the XAML written inline (`sdkProject()`, `oldProject()`, `packagesConfig()`,
   `cs()`, `xaml()`, `PROJECT`, `projectWith()`, `reportOf()` and `run()` in test/helpers.js), small enough to work out
   by hand, with a near miss on each side: the form that is reported and the form next to it that is not.
7. A rule id, once released, keeps its meaning: pipelines and other tools read it from the JSON output, the CSV report
   and the GitHub annotations.

## Changing the readers

1. The XML reader (src/xml.js), the C# reader (src/code.js), the JSON reader (src/json.js), the pattern matcher
   (src/glob.js) and the listing of the folder (src/walk.js) keep lists of their own, never recursion, and read each
   character a bounded number of times. A test in test/repo.test.js fails when a function of these files calls itself.
2. A reader refuses what it does not read, with its place, rather than guess. The XML reader never learns DOCTYPE or
   entities. A form that is read is listed in docs/method.md, and a form that is not in docs/limits.md.
3. No pattern is built from a file or the configuration, and no key of the configuration takes a regular expression. A
   test fails when `new RegExp` appears in src outside src/text.js. A pattern that runs over C# starts at a fixed word
   and repeats a bounded number of times.
4. A time check in a test widens under coverage: read `process.env.NODE_V8_COVERAGE`, which the test runner sets only
   when coverage is on, and allow four times the time. Never read the flags of the process for this, because they hold
   the coverage flags of the runner in every run. Run `npm run test:coverage` before you open the pull request.
5. A file written with LF, CRLF or CR line ends, as UTF-8 with or without a byte order mark or as UTF-16 with one, must
   give the same output. The example files are stored as written (`.gitattributes`), and a test reads them with CRLF
   line ends and as UTF-16.

## Changing the configuration file

1. A new key is added to `KEYS` in src/config.js, documented in docs/inputs.md and tested with a good value and a bad
   one. Every key the tool does not know stays an error, and a key named twice stays refused.
2. A default entry of `DEFAULT_PACKAGE_MAP` in src/defaults.js names the point of a public page in
   `DEFAULT_PACKAGE_BASIS`, says why in docs/inputs.md, and updates the README. The bar for an entry is a page that
   names the replacement; a package with no equivalent stays out of the defaults, because the tool cannot look that up.

## Changing a source

1. Every point the reports show is in src/data.js, written in this project's own words, with the page it comes from. A
   short phrase of a page may be named; a long quotation may not.
2. research/sources.md lists every page with a note on what it says, and docs/rules-and-sources.md lists every rule
   with its points and what to change. A test checks all three against each other. Fetch and read a page before it is
   listed, leave out a web address that holds a number that reads like a year, and never write the date on which
   support for anything ended.

## Tests that depend on the system

A test that depends on the operating system (a symbolic link, a device, file permissions) is guarded with
`process.platform`, says why in its `t.skip`, and asserts no line of its own: a line is asserted only in a test that
runs on every system, and is worked out there with `lineOf()` of test/helpers.js or from the text itself, never written
by hand. `test/repo.test.js` fails when a guarded test asserts a line. Every other test builds its paths with
`resolve()` from names with forward slashes.

A test never reads the clock, the time zone of the machine or the locale.

## Rules for the code

- No runtime dependencies and no development dependencies. Node 22 or newer and nothing else; the tests use `node:test`.
- The tool reads the files it is given and writes only to standard output and standard error. It opens no network
  connection, runs no program and evaluates nothing it reads.
- Text from the input, file names included, goes through `safeText` before it reaches the output or an error message.
- Source files stay ASCII; write any other character as a Unicode escape, or build it from its code point.
- No file carries a date, and no file holds a number that reads like a year. Version numbers (Node 22, RFC 4180,
  5.0.0.2622) are fine. The one exception is the two XML namespaces that every Xamarin.Forms XAML file declares, in the
  XAML files of the examples only (decision 1); tests build those namespaces from pieces.
- Examples and tests use made-up companies, apps, packages and people, with hosts on the reserved `.test` domain.
- Plain words in the documents: `npm run check` fails on a short list of words that say little.

## Before you open the pull request

```
npm test
npm run test:coverage
npm run check
npm run example
```
