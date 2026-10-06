# Tidewater Driver: a Xamarin.Forms app before the move to .NET MAUI

A made-up courier company has a delivery app for its drivers, `TidewaterDriver.sln`, written with Xamarin.Forms: a
shared library `TidewaterDriver` and two platform heads, `TidewaterDriver.Android` and `TidewaterDriver.iOS`. The team
plans the move to .NET MAUI and wants the inventory first. The solution holds what such an inventory finds:

- the two heads are old-style projects, one targeting MonoAndroid v13.0 by `TargetFrameworkVersion`, the other
  Xamarin.iOS by its project type GUID; the iOS head keeps its packages in a `packages.config`;
- the shared library references Xamarin.Forms, Xamarin.Essentials and Xamarin.CommunityToolkit, which have known
  replacements, `Xamarin.Plugins.RouteSketch`, a Xamarin plugin to check, and `Fernway.Forms.Charts`, a chart package
  that `../config.json` lists with no .NET MAUI equivalent;
- `RoundedEntry` has a custom renderer on each platform, registered with ExportRenderer, and the Android head has a
  shadow effect with ExportEffect and ResolutionGroupName, next to its RoutingEffect in the shared library;
- the Android head registers its route store with the Dependency attribute, and the view model takes it from
  DependencyService, sends a message with MessagingCenter, and uses Device.BeginInvokeOnMainThread and
  Device.RuntimePlatform;
- the delivery page is laid out with a RelativeLayout, and the code uses Color.FromHex, Color.Gray and a Rectangle;
- the Android manifest and the iOS Info.plist sit in the heads.

It also holds what must not be reported: a renderer left in `obj`, a renderer of a restored package in `packages`, a
call in a comment and one in a string, Android's own `Android.Graphics.Color`, the AndroidX binding the Android head
keeps, and the folder `Samples`, which `../config.json` leaves out with `"exclude": ["Samples/**"]`.

```
node bin/xamarin-maui-check.js examples/messy --config examples/config.json
```

The company, the app, the packages Fernway.Forms.Charts, Xamarin.Plugins.RouteSketch and Saltmarsh.Geo and every
person are made up, and the app ids start with `test.example`. The project files leave out the MSBuild XML namespace,
which MSBuild does not need, and the Info.plist leaves out its DOCTYPE; the XAML files declare the two namespaces a
Xamarin.Forms XAML file needs. The solution, projects, C# and XAML are made-up input for the tool, not code of this
repository.
