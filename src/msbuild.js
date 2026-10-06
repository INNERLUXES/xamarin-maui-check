// The solution and project files: a .sln read line by line for its project entries, a .csproj read with the safe XML
// reader of src/xml.js for its style (SDK-style or old-style), its properties, its target frameworks, its platform and
// its package references, and a packages.config read for its packages. Nothing is evaluated: a property written with
// $(...), a condition or an import is read as the text it holds, and an imported file is not opened.

import { attributeOf, parseXml, XmlError } from './xml.js';
import { asciiLower } from './words.js';

// The project type GUIDs of old-style Xamarin projects, in lowercase.
export const PLATFORM_GUIDS = {
  android: 'efba0ad7-5a72-4c68-af49-83d382785dcf',
  ios: 'feacfbd2-3405-455c-9665-78fe426c6842',
  uwp: 'a5a43c5b-de2a-4c0c-9213-0a381af9435a'
};

// The project type GUID of a solution folder, which is not a project.
const SOLUTION_FOLDER = '2150e333-8fdc-42a3-9474-1a3956d46de8';

// The project entries of a solution: [{ name, path, offset }], with the path in forward slashes as the solution
// writes it. Solution folders are passed over.
export function readSolution(text) {
  const out = [];
  const line = /^[ \t]*Project\("\{([0-9A-Fa-f-]{36})\}"\)[ \t]*=[ \t]*"([^"\r\n]{0,400})"[ \t]*,[ \t]*"([^"\r\n]{0,1000})"/gm;
  for (const m of text.matchAll(line)) {
    if (asciiLower(m[1]) === SOLUTION_FOLDER) continue;
    out.push({ name: m[2], path: m[3].split('\\').join('/'), offset: m.index });
  }
  return out;
}

// The platform of a target framework moniker, or null: monoandroid*, xamarinios* or xamarin.ios*, xamarinmac*,
// xamarintvos*, xamarinwatchos* and uap*.
export function legacyFramework(tfm) {
  const t = asciiLower(tfm.trim());
  if (t.startsWith('monoandroid')) return 'android';
  if (t.startsWith('xamarinios') || t.startsWith('xamarin.ios')) return 'ios';
  if (t.startsWith('xamarinmac') || t.startsWith('xamarin.mac')) return 'mac';
  if (t.startsWith('xamarintvos') || t.startsWith('xamarin.tvos')) return 'tvos';
  if (t.startsWith('xamarinwatchos') || t.startsWith('xamarin.watchos')) return 'watchos';
  if (t.startsWith('uap')) return 'uwp';
  return null;
}

// Reads a .csproj: { sdk, rootOffset, properties, packages, frameworks, platform }, where properties maps a property
// name to its first { value, offset }, packages lists { id, version, offset } and frameworks lists
// { text, platform, offset } for the legacy target frameworks the project names. Throws XmlError.
export function readProject(text, limits) {
  const { root, elements } = parseXml(text, limits);
  const top = elements[root];
  if (top.local !== 'Project') throw new XmlError(`the root element is <${top.name.slice(0, 60)}>, not <Project>`, top.offset);
  // The first <Version> child of each element, by the index of the element.
  const versionChild = new Map();
  for (const e of elements) if (e.local === 'Version' && e.parent >= 0 && !versionChild.has(e.parent)) versionChild.set(e.parent, e);
  const sdk = attributeOf(top, 'Sdk') !== null || elements.some((e) => (e.local === 'Sdk' && e.parent === root) || (e.local === 'Import' && attributeOf(e, 'Sdk') !== null));
  const properties = new Map();
  for (const e of elements) {
    if (e.parent < 0 || elements[e.parent].local !== 'PropertyGroup') continue;
    if (!properties.has(e.local)) properties.set(e.local, { value: e.text.trim(), offset: e.offset });
  }
  const packages = [];
  elements.forEach((e, index) => {
    if (e.local !== 'PackageReference') return;
    const include = attributeOf(e, 'Include');
    if (!include) return;
    const versionAttr = attributeOf(e, 'Version');
    const child = versionChild.get(index);
    packages.push({ id: include.value.trim(), version: versionAttr ? versionAttr.value.trim() : child ? child.text.trim() : '', offset: include.offset });
  });
  const prop = (name) => (properties.has(name) ? properties.get(name).value : '');
  const frameworks = [];
  for (const name of ['TargetFramework', 'TargetFrameworks']) {
    if (!properties.has(name)) continue;
    for (const tfm of prop(name).split(';').map((x) => x.trim()).filter(Boolean)) {
      const platform = legacyFramework(tfm);
      if (platform) frameworks.push({ text: tfm, platform, offset: properties.get(name).offset });
    }
  }
  const guids = asciiLower(prop('ProjectTypeGuids'));
  const identifier = asciiLower(prop('TargetFrameworkIdentifier'));
  let platform = frameworks.length ? frameworks[0].platform : null;
  if (!platform) {
    if (guids.includes(PLATFORM_GUIDS.android) || asciiLower(prop('AndroidApplication')) === 'true') platform = 'android';
    else if (guids.includes(PLATFORM_GUIDS.ios) || identifier === 'xamarin.ios') platform = 'ios';
    else if (guids.includes(PLATFORM_GUIDS.uwp) || asciiLower(prop('TargetPlatformIdentifier')) === 'uap') platform = 'uwp';
  }
  // An old-style head names its framework in properties of its own.
  if (!frameworks.length && platform === 'android' && properties.has('TargetFrameworkVersion')) frameworks.push({ text: `MonoAndroid ${prop('TargetFrameworkVersion')}`, platform, offset: properties.get('TargetFrameworkVersion').offset });
  if (!frameworks.length && platform === 'ios') {
    const at = properties.get('TargetFrameworkIdentifier') ?? properties.get('ProjectTypeGuids');
    if (at) frameworks.push({ text: 'Xamarin.iOS', platform, offset: at.offset });
  }
  if (!frameworks.length && platform === 'uwp' && properties.has('TargetPlatformVersion')) frameworks.push({ text: `UAP ${prop('TargetPlatformVersion')}`, platform, offset: properties.get('TargetPlatformVersion').offset });
  return { sdk, rootOffset: top.offset, properties, packages, frameworks, platform };
}

// Reads a packages.config: [{ id, version, offset }]. Throws XmlError.
export function readPackagesConfig(text, limits) {
  const { root, elements } = parseXml(text, limits);
  const top = elements[root];
  if (top.local !== 'packages') throw new XmlError(`the root element is <${top.name.slice(0, 60)}>, not <packages>`, top.offset);
  const out = [];
  for (const e of elements) {
    if (e.local !== 'package' || e.parent !== root) continue;
    const id = attributeOf(e, 'id');
    if (!id) throw new XmlError('a <package> element with no id', e.offset);
    const version = attributeOf(e, 'version');
    out.push({ id: id.value.trim(), version: version ? version.value.trim() : '', offset: id.offset });
  }
  return out;
}
