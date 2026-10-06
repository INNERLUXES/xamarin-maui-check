// A small safe XML reader for project files, packages.config and XAML. It reads the text once, left to right, with a
// list of open elements of its own and no recursion, and keeps the offset of every element and attribute so a finding
// can name its line and column. It refuses what it does not need and what makes XML readers unsafe: a DOCTYPE
// declaration, an ENTITY declaration and any entity reference other than the five that XML predefines and character
// references, as the OWASP cheat sheet on XML external entities advises. It also refuses an element that is not
// closed, a close tag that does not match, an attribute named twice and text outside the root element. Depth, the number
// of elements, the number of attributes of one element and the length of names and values are capped.

export const XML_LIMITS = { maxXmlDepth: 64, maxXmlElements: 200000, maxXmlAttributes: 256, maxXmlNameLength: 256, maxXmlValueLength: 65536, maxXmlText: 4096 };

export class XmlError extends Error {
  constructor(reason, offset) {
    super(reason);
    this.reason = reason;
    this.offset = offset;
  }
}

const PREDEFINED = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };

// A character that may start a name, or continue one: letters, digits, _ : . - and every character past ASCII.
const isNameStart = (c) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95 || c === 58 || c >= 0x80;
const isNameChar = (c) => isNameStart(c) || (c >= 48 && c <= 57) || c === 45 || c === 46;
const isSpace = (c) => c === 32 || c === 9 || c === 10 || c === 13;

// The text of an attribute value or of character data with its references replaced. Only &lt; &gt; &amp; &quot;
// &apos; and character references are read; any other reference is refused, so no entity can be defined or expanded.
export function decodeReferences(raw, at = 0) {
  if (!raw.includes('&')) return raw;
  let out = '';
  let from = 0;
  for (let i = raw.indexOf('&'); i >= 0; i = raw.indexOf('&', from)) {
    out += raw.slice(from, i);
    const end = raw.indexOf(';', i);
    const name = end > i && end - i <= 12 ? raw.slice(i + 1, end) : '';
    let value = null;
    if (Object.hasOwn(PREDEFINED, name)) value = PREDEFINED[name];
    else if (/^#[0-9]{1,7}$/.test(name)) value = Number(name.slice(1));
    else if (/^#x[0-9A-Fa-f]{1,6}$/.test(name)) value = parseInt(name.slice(2), 16);
    if (value === null) throw new XmlError(`an entity reference${name ? ` &${name.slice(0, 20)};` : ''} that XML does not predefine; the reader refuses entities`, at + i);
    if (typeof value === 'number') {
      if (value === 0 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff)) throw new XmlError(`a character reference &${name}; to a character that XML does not allow`, at + i);
      value = String.fromCodePoint(value);
    }
    out += value;
    from = end + 1;
  }
  return out + raw.slice(from);
}

// Reads one XML document. Returns { root, elements } where elements is the list of every element in document order:
// { name, prefix, local, attributes: [{ name, value, offset }], offset, depth, parent, text }, parent being the index of
// the parent element or -1, and text the character data directly inside the element, capped. Throws XmlError.
export function parseXml(text, limits = XML_LIMITS) {
  const lim = { ...XML_LIMITS, ...limits };
  const n = text.length;
  const elements = [];
  const open = [];
  let root = -1;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  const fail = (reason, at = i) => {
    throw new XmlError(reason, at);
  };
  const closeOf = (marker, what, start) => {
    const end = text.indexOf(marker, i);
    if (end < 0) fail(`${what} that is not closed`, start);
    return end;
  };
  const readName = (what) => {
    const start = i;
    if (i >= n || !isNameStart(text.charCodeAt(i))) fail(`a name was expected for ${what}`);
    while (i < n && isNameChar(text.charCodeAt(i))) {
      i += 1;
      if (i - start > lim.maxXmlNameLength) fail(`a name longer than ${lim.maxXmlNameLength} characters`, start);
    }
    return text.slice(start, i);
  };
  const skip = () => {
    while (i < n && isSpace(text.charCodeAt(i))) i += 1;
  };
  const addText = (value, at) => {
    if (open.length === 0) {
      if (value.trim() !== '') fail('text outside the root element', at);
      return;
    }
    const el = elements[open.at(-1)];
    if (el.text.length < lim.maxXmlText) el.text = (el.text + value).slice(0, lim.maxXmlText);
  };

  while (i < n) {
    if (text.charCodeAt(i) !== 60) {
      const start = i;
      const next = text.indexOf('<', i);
      const end = next < 0 ? n : next;
      const raw = text.slice(start, end);
      if (raw.length > lim.maxXmlValueLength) fail(`character data longer than ${lim.maxXmlValueLength} characters`, start);
      if (raw.includes('>') && raw.includes(']]>')) fail('the sequence ]]> in character data', start + raw.indexOf(']]>'));
      addText(decodeReferences(raw, start), start);
      i = end;
      continue;
    }
    const start = i;
    if (text.startsWith('<?', i)) {
      i = closeOf('?>', 'a processing instruction', start) + 2;
      continue;
    }
    if (text.startsWith('<!--', i)) {
      i += 4;
      i = closeOf('-->', 'a comment', start) + 3;
      continue;
    }
    if (text.startsWith('<![CDATA[', i)) {
      i += 9;
      const end = closeOf(']]>', 'a CDATA section', start);
      if (open.length === 0) fail('a CDATA section outside the root element', start);
      addText(text.slice(i, end), start);
      i = end + 3;
      continue;
    }
    if (text.startsWith('<!', i)) {
      const word = text.slice(i + 2, i + 9).toUpperCase();
      if (word.startsWith('DOCTYPE')) fail('a DOCTYPE declaration; the reader refuses document type definitions, as the OWASP advice on XML external entities says', start);
      if (word.startsWith('ENTITY')) fail('an ENTITY declaration; the reader refuses entities', start);
      fail('a markup declaration the reader does not read', start);
    }
    if (text.startsWith('</', i)) {
      i += 2;
      const name = readName('a close tag');
      skip();
      if (text[i] !== '>') fail('a > was expected at the end of the close tag');
      i += 1;
      if (open.length === 0) fail(`the close tag </${name.slice(0, 60)}> has no open element`, start);
      const top = elements[open.at(-1)];
      if (top.name !== name) fail(`the close tag </${name.slice(0, 60)}> does not match <${top.name.slice(0, 60)}>`, start);
      open.pop();
      continue;
    }
    i += 1;
    if (open.length === 0 && root >= 0) fail('a second root element', start);
    const name = readName('an element');
    const attributes = [];
    const seen = new Set();
    let selfClosing = false;
    for (;;) {
      const before = i;
      skip();
      if (i >= n) fail(`the element <${name.slice(0, 60)}> is not closed`, start);
      if (text.startsWith('/>', i)) {
        i += 2;
        selfClosing = true;
        break;
      }
      if (text[i] === '>') {
        i += 1;
        break;
      }
      if (i === before) fail('a space was expected before an attribute');
      const at = i;
      const attr = readName('an attribute');
      if (seen.has(attr)) fail(`the attribute ${attr.slice(0, 60)} appears twice in one element`, at);
      seen.add(attr);
      if (attributes.length >= lim.maxXmlAttributes) fail(`more than ${lim.maxXmlAttributes} attributes in one element`, at);
      skip();
      if (text[i] !== '=') fail('an = was expected after the attribute name');
      i += 1;
      skip();
      const quote = text[i];
      if (quote !== '"' && quote !== "'") fail('an attribute value in quotes was expected');
      const valueStart = i + 1;
      const end = text.indexOf(quote, valueStart);
      if (end < 0) fail('an attribute value that is not closed', at);
      const raw = text.slice(valueStart, end);
      if (raw.length > lim.maxXmlValueLength) fail(`an attribute value longer than ${lim.maxXmlValueLength} characters`, at);
      if (raw.includes('<')) fail('a < inside an attribute value', valueStart + raw.indexOf('<'));
      attributes.push({ name: attr, value: decodeReferences(raw, valueStart), offset: at });
      i = end + 1;
    }
    if (open.length >= lim.maxXmlDepth) fail(`elements nested more than ${lim.maxXmlDepth} deep`, start);
    if (elements.length >= lim.maxXmlElements) fail(`more than ${lim.maxXmlElements} elements`, start);
    const colon = name.indexOf(':');
    const index = elements.length;
    elements.push({ name, prefix: colon < 0 ? '' : name.slice(0, colon), local: colon < 0 ? name : name.slice(colon + 1), attributes, offset: start, depth: open.length, parent: open.length ? open.at(-1) : -1, text: '' });
    if (root < 0) root = index;
    if (!selfClosing) open.push(index);
  }
  if (open.length) fail(`the element <${elements[open.at(-1)].name.slice(0, 60)}> is not closed`, elements[open.at(-1)].offset);
  if (root < 0) fail('no root element', 0);
  return { root, elements };
}

// The value of an attribute of an element, or null.
export function attributeOf(element, name) {
  const a = element.attributes.find((x) => x.name === name);
  return a ? a : null;
}
