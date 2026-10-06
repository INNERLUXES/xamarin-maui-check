# 1. Read no clock, and keep dates out of the repository

## Status

Accepted

## Context

A migration check tempts a tool to look at the calendar: how long ago support for Xamarin ended, how many days a team
has left, how old a package version is, how many weeks the work might take. Each of these would make the same files
give a different result on a different day, so a pipeline that passed yesterday could fail today with no change to the
repository, and two people reading the same commit could see two reports. The output could never be saved and
compared, and an estimate in days would read as a promise the files cannot back.

The checks do not need a date. Whether a project is SDK-style, which packages it references, where a renderer is and
which layout a page uses can all be read from the files as they are.

## Decision

1. The tool reads no clock, no time zone and no locale. It never prints the current time, never says when support for
   anything ended, never says how old a version is, and never gives an estimate in time. The same files and
   configuration give the same output on every machine and on every day.
2. The effort score is a relative weight of the findings, from documented weights; it is not a time estimate, and
   every report says so.
3. No file of this repository holds a date or a number that reads like a year: not the licence, not the changelog, not
   the documents, not the comments of the code, not the tests. `npm run check` and a test fail on any word of four
   digits that starts with 19 or 20. The examples hold no date at all, and their versions and GUIDs are chosen so that
   none of them reads like a year.
4. One narrow exception: every Xamarin.Forms XAML file declares two XML namespaces whose URIs hold a number that reads
   like a year, and an example XAML file must declare them to be a real input. The checks blank these two exact
   values, in double quotes, in the XAML files of the examples only, before they look for a year; every other file,
   and every other part of these files, is checked in full. The tool itself recognizes the Xamarin.Forms XAML
   namespace by its shape and never writes it out, and the tests build it from pieces. A test checks that the
   exception stays that narrow.
5. A package version is not a year and is not caught: 5.0.0.2622, 1.8.1 and v13.0 hold no word of four digits that
   starts with 19 or 20. A test of test/repo.test.js runs the pattern over such values and checks that none of them is
   caught, and that a year in the same place still is; the pattern is the same in the tests and in tools/check.mjs.

## Consequences

- The output of a run can be saved in the repository (`examples/output`) and compared on every change, because it does
  not move with the calendar.
- The report holds no date, no deadline and no estimate in time; a team plans with the inventory and the relative
  score, and puts dates in its own plan.
- The limits of the tool are chosen so that none of them reads like a year, and a check catches one that does.
