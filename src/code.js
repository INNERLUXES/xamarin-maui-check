// C# source read as text, as a documented heuristic. The file is read once and its comments and the contents of its
// string and character literals are blanked out, with line ends kept, so a renderer named in a comment or a call
// written inside a string is not seen. Then fixed patterns look for the forms docs/method.md lists: classes that derive
// from a type whose name ends with Renderer, PlatformEffect and RoutingEffect classes, the assembly attributes
// ExportRenderer, ExportEffect and Dependency, calls on DependencyService, MessagingCenter and the Device class,
// references to the Xamarin.Forms and Xamarin.Essentials namespaces, the types created with new, and members of Color.
// No C# is compiled and nothing is evaluated: a call made through an alias, a variable or reflection is not seen.

export const CODE_LIMITS = { maxCodeMatches: 20000 };

// The text with comments and the contents of string and character literals replaced by spaces; line ends are kept, so
// every offset of the result is the offset of the same place in the text. Regular, verbatim (@"..."), interpolated
// ($"...", $@"...") and raw ("""...""") strings and character literals are read; an interpolation hole is blanked with
// its string.
export function blank(text) {
  const n = text.length;
  const out = [];
  let from = 0;
  let i = 0;
  // Spaces for text[a..b), keeping the line ends.
  const spaces = (a, b) => text.slice(a, b).replace(/[^\r\n]/g, ' ');
  const cut = (a, b) => {
    out.push(text.slice(from, a), spaces(a, b));
    from = b;
  };
  while (i < n) {
    const c = text[i];
    if (c === '/' && text[i + 1] === '/') {
      let end = text.indexOf('\n', i);
      if (end < 0) end = n;
      cut(i, end);
      i = end;
    } else if (c === '/' && text[i + 1] === '*') {
      let end = text.indexOf('*/', i + 2);
      end = end < 0 ? n : end + 2;
      cut(i, end);
      i = end;
    } else if (c === '"' || ((c === '@' || c === '$') && (text[i + 1] === '"' || ((text[i + 1] === '@' || text[i + 1] === '$') && text[i + 2] === '"')))) {
      let q = i;
      let verbatim = false;
      while (text[q] === '@' || text[q] === '$') {
        if (text[q] === '@') verbatim = true;
        q += 1;
      }
      let end;
      if (text.startsWith('"""', q)) {
        let run = q;
        while (text[run] === '"') run += 1;
        const fence = text.slice(q, run);
        end = text.indexOf(fence, run);
        end = end < 0 ? n : end + fence.length;
        cut(run, Math.max(run, end - fence.length));
      } else if (verbatim) {
        end = q + 1;
        let closed = false;
        for (;;) {
          const at = text.indexOf('"', end);
          if (at < 0) {
            end = n;
            break;
          }
          if (text[at + 1] === '"') {
            end = at + 2;
            continue;
          }
          end = at + 1;
          closed = true;
          break;
        }
        cut(q + 1, closed ? end - 1 : end);
      } else {
        end = q + 1;
        while (end < n && text[end] !== '"' && text[end] !== '\n') end += text[end] === '\\' ? 2 : 1;
        end = Math.min(n, end < n && text[end] === '"' ? end + 1 : end);
        cut(q + 1, Math.max(q + 1, text[end - 1] === '"' ? end - 1 : end));
      }
      i = end;
    } else if (c === "'") {
      let end = i + 1;
      while (end < n && end - i < 12 && text[end] !== "'" && text[end] !== '\n') end += text[end] === '\\' ? 2 : 1;
      if (end < n && text[end] === "'") {
        cut(i + 1, end);
        i = end + 1;
      } else i += 1;
    } else i += 1;
  }
  out.push(text.slice(from));
  return out.join('');
}

// A name, and a name qualified by up to twenty others, as the patterns below write them out:
// [A-Za-z_][A-Za-z0-9_]{0,200} and (?:name\s*\.\s*){0,20}name. Every pattern starts at a fixed word, so a failed match
// gives up after a bounded number of steps.
const CLASS_BASE = /\bclass\s+([A-Za-z_][A-Za-z0-9_]{0,200})(?:\s*<[^<>{};]{0,400}>)?\s*:\s*((?:[A-Za-z_][A-Za-z0-9_]{0,200}\s*\.\s*){0,20}[A-Za-z_][A-Za-z0-9_]{0,200})/g;
const ASSEMBLY_ATTRIBUTE = /\[\s*assembly\s*:\s*((?:[A-Za-z_][A-Za-z0-9_]{0,200}\s*\.\s*){0,20}[A-Za-z_][A-Za-z0-9_]{0,200})\s*\(/g;
const TYPEOF = /\btypeof\s*\(\s*((?:[A-Za-z_][A-Za-z0-9_]{0,200}\s*\.\s*){0,20}[A-Za-z_][A-Za-z0-9_]{0,200})\s*[)<]/g;
const NEW_TYPE = /\bnew\s+((?:[A-Za-z_][A-Za-z0-9_]{0,200}\s*\.\s*){0,20}[A-Za-z_][A-Za-z0-9_]{0,200})\s*[({]/g;
const DEPENDENCY_CALL = /\bDependencyService\s*\.\s*(Get|Register|RegisterSingleton|Resolve)\b/g;
const MESSAGING_CALL = /\bMessagingCenter\s*\.\s*(Send|Subscribe|Unsubscribe|Instance)\b/g;
const DEVICE_MEMBER = /\bDevice\s*\.\s*(RuntimePlatform|OnPlatform|BeginInvokeOnMainThread|InvokeOnMainThreadAsync|StartTimer|OpenUri|Idiom|OS)\b/g;
const FORMS_REFERENCE = /\bXamarin\s*\.\s*(Forms|Essentials)\b/g;
const USING_FORMS = /^[ \t]*(?:global[ \t]+)?using[ \t]+(?:static[ \t]+)?(?:[A-Za-z_][A-Za-z0-9_]{0,200}[ \t]*=[ \t]*)?Xamarin\.(?:Forms|Essentials)\b/gm;
const COLOR_MEMBER = /\bColor\s*\.\s*([A-Z][A-Za-z0-9_]{0,100})\b/g;

// The last part of a qualified name: "Xamarin.Forms.Platform.Android.EntryRenderer" is "EntryRenderer".
export const localName = (qualified) => {
  const parts = qualified.split('.');
  return parts[parts.length - 1].trim();
};

// The names in the typeof(...) calls of an attribute that starts at offset, up to its closing parenthesis.
function typeofNames(code, offset) {
  let depth = 0;
  let end = offset;
  for (; end < code.length && end - offset < 1600; end += 1) {
    if (code[end] === '(') depth += 1;
    else if (code[end] === ')') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  const names = [];
  TYPEOF.lastIndex = 0;
  for (const m of code.slice(offset, end + 1).matchAll(TYPEOF)) names.push(localName(m[1]));
  return names;
}

// What a C# file holds: { renderers, routingEffects, platformEffects, exportRenderers, exportEffects, dependencies,
// dependencyCalls, messaging, device, formsReferences, formsUsings, firstForms, created, colors, limited }, each list
// with offsets into the text.
export function scanCode(text, limits = CODE_LIMITS) {
  const lim = { ...CODE_LIMITS, ...limits };
  const code = blank(text);
  let matches = 0;
  let limited = false;
  const all = (pattern) => {
    const out = [];
    pattern.lastIndex = 0;
    for (const m of code.matchAll(pattern)) {
      matches += 1;
      if (matches > lim.maxCodeMatches) {
        limited = true;
        break;
      }
      out.push(m);
    }
    return out;
  };
  const r = { renderers: [], routingEffects: [], platformEffects: [], exportRenderers: [], exportEffects: [], dependencies: [], dependencyCalls: [], messaging: [], device: [], formsReferences: 0, formsUsings: 0, firstForms: null, created: [], colors: [], limited: false };
  for (const m of all(CLASS_BASE)) {
    const base = localName(m[2]);
    const at = m.index + m[0].length - m[2].length;
    if (base === 'PlatformEffect') r.platformEffects.push({ name: m[1], base, offset: at });
    else if (base === 'RoutingEffect') r.routingEffects.push({ name: m[1], base, offset: at });
    // A base named like an interface, IRenderer or IVisualElementRenderer, is not a renderer class.
    else if (base.length > 'Renderer'.length && base.endsWith('Renderer') && !(base[0] === 'I' && base[1] >= 'A' && base[1] <= 'Z')) r.renderers.push({ name: m[1], base, offset: at });
  }
  for (const m of all(ASSEMBLY_ATTRIBUTE)) {
    const name = localName(m[1]).replace(/Attribute$/, '');
    const offset = m.index;
    if (name === 'ExportRenderer') {
      const [control = '', renderer = ''] = typeofNames(code, m.index + m[0].length - 1);
      r.exportRenderers.push({ control, renderer, offset });
    } else if (name === 'ExportEffect') {
      const [effect = ''] = typeofNames(code, m.index + m[0].length - 1);
      r.exportEffects.push({ effect, offset });
    } else if (name === 'Dependency') {
      const [service = ''] = typeofNames(code, m.index + m[0].length - 1);
      r.dependencies.push({ service, offset });
    }
  }
  for (const m of all(DEPENDENCY_CALL)) r.dependencyCalls.push({ member: m[1], offset: m.index });
  for (const m of all(MESSAGING_CALL)) r.messaging.push({ member: m[1], offset: m.index });
  for (const m of all(DEVICE_MEMBER)) r.device.push({ member: m[1], offset: m.index });
  const refs = all(FORMS_REFERENCE);
  r.formsReferences = refs.length;
  r.firstForms = refs.length ? refs[0].index : null;
  r.formsUsings = all(USING_FORMS).length;
  for (const m of all(NEW_TYPE)) r.created.push({ name: localName(m[1]), qualified: m[1].replace(/\s+/g, ''), offset: m.index });
  for (const m of all(COLOR_MEMBER)) {
    // Color qualified by another namespace, such as Android.Graphics.Color, is not the Xamarin.Forms one.
    const before = code.slice(Math.max(0, m.index - 40), m.index).trimEnd();
    if (before.endsWith('.') && !/\bForms\s*\.$/.test(before)) continue;
    r.colors.push({ member: m[1], offset: m.index });
  }
  r.limited = limited;
  return r;
}
