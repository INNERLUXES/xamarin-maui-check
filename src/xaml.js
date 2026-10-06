// XAML read with the safe XML reader of src/xml.js. A page, a view or an application written for Xamarin.Forms declares
// the Xamarin.Forms XAML namespace, usually as its default namespace. That namespace is a URI on xamarin.com under
// /schemas/, then a number, then /forms; the tool recognizes it by that shape and never writes the URI out. It reports
// where the namespace is declared, and every element of that namespace whose name is one of the layouts that .NET MAUI
// does not carry over (the layouts list of the configuration).

import { parseXml } from './xml.js';

const FORMS_PREFIX = 'http://xamarin.com/schemas/';
const FORMS_SUFFIX = '/forms';

// True when a namespace URI is the Xamarin.Forms XAML namespace: http://xamarin.com/schemas/<digits>/forms.
export function isFormsNamespace(uri) {
  const u = String(uri).trim();
  if (!u.startsWith(FORMS_PREFIX) || !u.endsWith(FORMS_SUFFIX)) return false;
  const middle = u.slice(FORMS_PREFIX.length, u.length - FORMS_SUFFIX.length);
  return /^[0-9]{1,8}$/.test(middle);
}

// What a XAML file holds: { elements, formsNamespace, layouts, root }, where formsNamespace is the offset of the first
// declaration of the Xamarin.Forms XAML namespace or null, and layouts lists { name, offset } for every element of that
// namespace named in the set layoutNames. Throws XmlError.
export function scanXaml(text, layoutNames = new Set(), limits = undefined) {
  const { root, elements } = parseXml(text, limits);
  // The namespace each prefix stands for, per element: a Map built from the parent's, so that no lookup climbs the tree.
  const scopes = [];
  let formsNamespace = null;
  const layouts = [];
  elements.forEach((e, index) => {
    let scope = e.parent >= 0 ? scopes[e.parent] : new Map();
    for (const a of e.attributes) {
      if (a.name !== 'xmlns' && !a.name.startsWith('xmlns:')) continue;
      if (scope === (e.parent >= 0 ? scopes[e.parent] : scope)) scope = new Map(scope);
      scope.set(a.name === 'xmlns' ? '' : a.name.slice(6), a.value);
      if (formsNamespace === null && isFormsNamespace(a.value)) formsNamespace = a.offset;
    }
    scopes[index] = scope;
    const ns = scope.get(e.prefix) ?? '';
    if (isFormsNamespace(ns) && layoutNames.has(e.local)) layouts.push({ name: e.local, offset: e.offset });
  });
  return { elements: elements.length, formsNamespace, layouts, root: elements[root].local };
}
