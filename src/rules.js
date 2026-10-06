// The rules and the result. Each rule names the points of the public pages it rests on (src/data.js), says where it is
// the tool's own choice, and what to change: the way forward on .NET MAUI. docs/method.md says exactly what each rule
// looks at and what it cannot see. The checks themselves are in src/project.js, the reading of solutions and projects in
// src/msbuild.js, of C# in src/code.js and of XAML in src/xaml.js.

import { LEVELS } from './data.js';
import { grouped, listText, plural } from './size.js';

export const RULES = [
  {
    id: 'no-maui-equivalent',
    key: 'noMauiEquivalent',
    title: 'a package with no known .NET MAUI equivalent',
    basis: ['incompatiblePackages', 'supportEnded'],
    own: 'a package reference of a project or packages.config whose id matches an entry of packageMap with "use": null; the table names such packages only when the configuration does, because whether a library has a .NET version is a fact the tool cannot look up; an error, because the app cannot build on .NET MAUI until the package is replaced or rebuilt',
    rule: (config) => {
      const none = config.packageMap.filter((p) => p.use === null).map((p) => p.match);
      return none.length ? `a package matching ${listText(none, 4)}` : 'a package of packageMap with no equivalent (none listed)';
    },
    fix: 'find a library that targets .NET for Android, .NET for iOS or .NET MAUI and does the same job, rebuild the package for .NET target frameworks if you own its code, or write the feature against the platform APIs'
  },
  {
    id: 'non-sdk-project',
    key: 'nonSdkProject',
    title: 'a project in the old project format',
    basis: ['sdkStyleRequired', 'upgradeAssistantPackages'],
    own: 'a .csproj whose Project element has no Sdk attribute, no Sdk element and no Import with an Sdk; such a project lists every file and reference by hand and must be converted before it can target .NET',
    rule: () => 'a .csproj that is not SDK-style',
    fix: 'convert the project to an SDK-style project, by hand or with the .NET Upgrade Assistant, with UseMaui set to true and .NET target frameworks; move what AssemblyInfo.cs and the old properties held into the project file'
  },
  {
    id: 'replace-package',
    key: 'replacePackage',
    title: 'a Xamarin-era package with a known .NET MAUI replacement',
    basis: ['upgradeAssistantPackages', 'namespaceChanges', 'toolkitPackages', 'skiaPackages'],
    own: 'a package reference whose id matches an entry of packageMap that names what to use; the default table is short and each entry follows a public page; the configuration can add entries in front of it',
    rule: (config) => {
      const known = config.packageMap.filter((p) => p.use !== null).map((p) => p.match);
      return known.length ? `a package matching ${listText(known, 4)}` : 'a package of packageMap with a replacement (none listed)';
    },
    fix: 'remove the package and add the one the message names, then update the namespaces and the code that used it'
  },
  {
    id: 'unknown-xamarin-package',
    key: 'unknownXamarinPackage',
    title: 'a Xamarin-era package that is not in the table',
    basis: ['incompatiblePackages', 'androidPackagesOk'],
    own: 'a package whose id starts with Xamarin. or has Forms as one of its dot-separated parts, that packageMap does not list and keepPackages does not keep; such a package was built for Xamarin and may have no version for .NET, so it is a lead to check, not a verdict',
    rule: (config) => `a package named Xamarin.* or *.Forms.* outside packageMap${config.keepPackages.length ? ` and outside ${listText(config.keepPackages, 4)}` : ''}`,
    fix: 'check for a version of the package that targets .NET for Android, .NET for iOS or .NET MAUI; once checked, add it to packageMap with what to use, or to keepPackages when it stays'
  },
  {
    id: 'custom-renderer',
    key: 'customRenderer',
    title: 'a Xamarin.Forms custom renderer',
    basis: ['handlersReplaceRenderers', 'shimmedRenderers'],
    own: 'a C# class whose first base type has a name that ends with Renderer, such as EntryRenderer or ViewRenderer<T, TNative>, and an ExportRenderer assembly attribute that names a renderer no scanned class declares; each renderer is one finding, with the place of its ExportRenderer attribute when there is one',
    rule: () => 'a class that derives from a *Renderer type, or an ExportRenderer attribute',
    fix: 'move the customization to a .NET MAUI handler: a PropertyMapper entry, or a handler of its own registered with ConfigureMauiHandlers; a renderer that derives from VisualElementRenderer, ListViewRenderer, FrameRenderer or TableViewRenderer can be kept for a while through the shims, registered with AddHandler, with its ExportRenderer attribute removed'
  },
  {
    id: 'effect',
    key: 'effect',
    title: 'a Xamarin.Forms effect',
    basis: ['effectsReuse'],
    own: 'a C# class that derives from PlatformEffect, and an ExportEffect assembly attribute that names an effect no scanned class declares; the RoutingEffect classes are counted in the summary',
    rule: () => 'a PlatformEffect class, or an ExportEffect attribute',
    fix: 'remove the ExportEffect and ResolutionGroupName attributes, put the platform effects next to their RoutingEffect with conditional compilation, and register the pair with ConfigureEffects in MauiProgram; or move the customization to a handler'
  },
  {
    id: 'removed-layout',
    key: 'removedLayout',
    title: 'a layout that .NET MAUI does not carry over',
    basis: ['relativeLayoutCompat'],
    own: 'an element of the Xamarin.Forms XAML namespace, or a C# new expression, whose type name is in the layouts list of the configuration (RelativeLayout by default)',
    rule: (config) => (config.layouts.length ? `a layout named ${listText(config.layouts.map((l) => l.name), 4)}` : 'a layout of an empty list'),
    fix: 'rebuild the layout with the one the message names, usually a Grid with row and column definitions; the compatibility control keeps it working while you do'
  },
  {
    id: 'platform-head',
    key: 'platformHead',
    title: 'a platform head project',
    basis: ['singleProjectPlatforms', 'sdkStyleRequired', 'mauiEvolution'],
    own: 'a .csproj that is a Xamarin.Android, Xamarin.iOS or UWP project, known by its project type GUID, its target framework or its Android and iOS properties; a note, because a solution may keep one project per platform on .NET MAUI, but a single project folds the heads into Platforms folders',
    rule: () => 'an Android, iOS or UWP head project',
    fix: 'move the platform code and resources into the Platforms folder of a .NET MAUI single project (Platforms/Android, Platforms/iOS, Platforms/Windows), or convert the head to an SDK-style .NET for Android, .NET for iOS or WinUI project'
  },
  {
    id: 'legacy-target-framework',
    key: 'legacyTargetFramework',
    title: 'a Xamarin target framework',
    basis: ['androidTargets', 'supportEnded'],
    own: 'a TargetFramework or TargetFrameworks value that starts with monoandroid, xamarinios, xamarin.ios, xamarinmac, xamarintvos, xamarinwatchos or uap, and the TargetFrameworkVersion, TargetFrameworkIdentifier or TargetPlatformVersion of an old-style Android, iOS or UWP head',
    rule: () => 'a MonoAndroid, Xamarin.iOS, Xamarin.Mac or UAP target',
    fix: 'target .NET instead: net8.0-android for Android, net8.0-ios for iOS, net8.0-maccatalyst for the Mac and net8.0-windows10.0.19041.0 for Windows (or the same names for the .NET version you move to), with the minimum OS version in SupportedOSPlatformVersion'
  },
  {
    id: 'platform-manifest',
    key: 'platformManifest',
    title: 'a platform manifest of a head project',
    basis: ['singleProjectPlatforms', 'androidTargets'],
    own: 'a file named AndroidManifest.xml or Info.plist; only its presence is used, the file is not read',
    rule: () => 'an AndroidManifest.xml or Info.plist file',
    fix: 'in a single project, keep it under Platforms/Android or Platforms/iOS; take the app title, id and version from the project file, and move the minimum Android version from uses-sdk to SupportedOSPlatformVersion'
  },
  {
    id: 'forms-namespace',
    key: 'formsNamespace',
    title: 'Xamarin.Forms or Xamarin.Essentials namespaces in code or XAML',
    basis: ['namespaceChanges', 'upgradeAssistantRole'],
    own: 'a C# file that names the Xamarin.Forms or Xamarin.Essentials namespace, in a using directive or a qualified name, outside comments and strings, as one finding with the count; and a XAML file that declares the Xamarin.Forms XAML namespace, as one finding at the declaration',
    rule: () => 'a C# file that names Xamarin.Forms or Xamarin.Essentials, or a XAML file in the Xamarin.Forms XAML namespace',
    fix: 'replace the Xamarin.Forms namespaces with Microsoft.Maui and Microsoft.Maui.Controls, drop the Xamarin.Essentials using directives (.NET MAUI brings them in with global usings), and set the default XAML namespace to the .NET MAUI one'
  },
  {
    id: 'dependency-service',
    key: 'dependencyService',
    title: 'DependencyService',
    basis: ['builtInDi'],
    own: 'a call of DependencyService.Get, Register, RegisterSingleton or Resolve, and a Dependency assembly attribute; DependencyService still exists in .NET MAUI, so it is a note',
    rule: () => 'a DependencyService call or a Dependency attribute',
    fix: 'register the platform service on builder.Services in MauiProgram and take it in a constructor; remove the Dependency attribute'
  },
  {
    id: 'messaging-center',
    key: 'messagingCenter',
    title: 'MessagingCenter',
    basis: ['messagingDeprecated'],
    own: 'a call of MessagingCenter.Send, Subscribe or Unsubscribe, or a use of MessagingCenter.Instance',
    rule: () => 'a MessagingCenter call',
    fix: 'send a typed message with WeakReferenceMessenger of CommunityToolkit.Mvvm and receive it with IRecipient<T>, or use an event'
  },
  {
    id: 'device-api',
    key: 'deviceApi',
    title: 'the Xamarin.Forms Device class',
    basis: ['deviceChanges'],
    own: 'a use of Device.RuntimePlatform, Device.OnPlatform, Device.BeginInvokeOnMainThread, Device.InvokeOnMainThreadAsync, Device.StartTimer, Device.OpenUri, Device.Idiom or Device.OS in C#; the replacement is named in the message',
    rule: () => 'a member of the Device class that .NET MAUI replaces',
    fix: 'use the replacement the message names: DeviceInfo.Platform, DeviceInfo.Idiom, MainThread, the Dispatcher or Launcher.OpenAsync'
  },
  {
    id: 'graphics-type',
    key: 'graphicsType',
    title: 'Color, Rectangle and Point of Xamarin.Forms',
    basis: ['colorChanges', 'graphicsTypes'],
    own: 'in a C# file that names Xamarin.Forms, a member of Color such as Color.FromHex or Color.Red, and new Rectangle(...) or new Point(...), as one finding per file with the count; the types may come from another namespace, so it is a note',
    rule: () => 'a use of Color, Rectangle or Point in a file that names Xamarin.Forms',
    fix: 'use Microsoft.Maui.Graphics: Color with float values, Colors for named colors, Color.FromArgb for a hex string, Rect for Rectangle and Point for Point'
  },
  {
    id: 'unreadable-file',
    key: null,
    title: 'a file that cannot be read',
    basis: ['xmlNoDtd', 'jsonRepeatedNames'],
    own: 'a file over its size limit, a binary file, a file that is not valid UTF-8 or UTF-16 with its byte order mark, and a project, packages.config or XAML file that the safe XML reader refuses, a DOCTYPE or an entity included; nothing in it is checked; this rule cannot be set lower or off',
    rule: () => 'a file that the tool could not read',
    fix: 'save the file as UTF-8 and well-formed XML with no DOCTYPE; a project file never needs a DOCTYPE or an entity'
  },
  {
    id: 'scan-limit',
    key: null,
    title: 'the input is larger than the limits of a run',
    basis: ['upgradeAssistantRole'],
    own: 'a folder with more files, folders or input files than the limits of docs/limits.md, folders nested deeper, or a C# file with more matches than the reader reads; the rest is not read, so the run fails; this rule cannot be set lower or off',
    rule: () => 'a folder past a limit of the run',
    fix: 'exclude the folders that are not part of the app, or check the parts of the solution in runs of their own'
  }
];

export const ruleById = (id) => RULES.find((r) => r.id === id);

// True when a level is at or above another.
export const atOrAbove = (level, min) => LEVELS.indexOf(level) >= LEVELS.indexOf(min);

// The result: the run fails when a finding is at or above the level failOn. { pass, failOn, failing, byLevel, text }.
export function decide(findings, failOn) {
  const byLevel = { error: 0, warning: 0, info: 0 };
  for (const f of findings) byLevel[f.level] += 1;
  const failing = findings.filter((f) => atOrAbove(f.level, failOn)).length;
  const counts = ['error', 'warning', 'info'].filter((l) => byLevel[l]).map((l) => `${grouped(byLevel[l])} ${l}`);
  const text = failing
    ? `FAIL - ${plural(failing, 'finding')} at or above ${failOn}${counts.length ? ` (${counts.join(', ')})` : ''}`
    : `PASS - no finding at or above ${failOn}${counts.length ? ` (${counts.join(', ')})` : ''}`;
  return { pass: failing === 0, failOn, failing, byLevel, text };
}
