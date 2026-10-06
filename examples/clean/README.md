# Brightwell Notes: a small app with little to change

A made-up company has a notes app, `BrightwellNotes.sln`, written with Xamarin.Forms 5: an SDK-style shared library
and an old-style Android head. It has no custom renderer, no effect, no DependencyService, no MessagingCenter and no
RelativeLayout, and its only packages are Xamarin.Forms, Xamarin.Essentials and an AndroidX binding. The inventory
still lists what every Xamarin.Forms app must change: the head project to convert, its target framework, the two
packages to replace and the Xamarin.Forms namespaces, as warnings and notes. It passes at the default fail-on level of
error.

```
node bin/xamarin-maui-check.js examples/clean
```

The company, the app and every person are made up. The solution, projects, C# and XAML are made-up input for the tool,
not code of this repository.
