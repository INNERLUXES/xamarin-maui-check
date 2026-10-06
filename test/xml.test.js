import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XML_LIMITS, XmlError, attributeOf, decodeReferences, parseXml } from '../src/index.js';

// The safe XML reader: elements, attributes and text with their offsets, and what it refuses.

const refused = (text, limits) => {
  try {
    parseXml(text, limits);
  } catch (error) {
    assert.ok(error instanceof XmlError, error.message);
    return error;
  }
  return assert.fail('not refused');
};

test('xml: elements, attributes, prefixes, text, comments, CDATA and processing instructions', () => {
  const text = '<?xml version="1.0"?>\n<!-- a comment -->\n<a:Root xmlns:a="urn:x" b=\'1\' c="x &amp; &lt;y&gt; &#65;&#x42;">\n  <Child>  some text <![CDATA[<raw>]]> &quot;q&quot;</Child>\n  <Empty/>\n</a:Root>\n';
  const { root, elements } = parseXml(text);
  assert.equal(root, 0);
  assert.deepEqual(elements.map((e) => [e.name, e.prefix, e.local, e.depth, e.parent]), [['a:Root', 'a', 'Root', 0, -1], ['Child', '', 'Child', 1, 0], ['Empty', '', 'Empty', 1, 0]]);
  assert.equal(attributeOf(elements[0], 'c').value, 'x & <y> AB');
  assert.equal(attributeOf(elements[0], 'b').value, '1');
  assert.equal(attributeOf(elements[0], 'z'), null);
  assert.equal(elements[1].text, '  some text <raw> "q"');
  assert.equal(elements[0].offset, text.indexOf('<a:Root'));
  assert.equal(attributeOf(elements[0], 'b').offset, text.indexOf("b='1'"));
  assert.equal(parseXml(`${String.fromCharCode(0xfeff)}<a/>`).elements[0].name, 'a', 'a byte order mark is skipped');
});

test('xml: a DOCTYPE, an ENTITY and an entity reference XML does not predefine are refused, as the OWASP advice says', () => {
  assert.match(refused('<!DOCTYPE a [<!ENTITY x SYSTEM "file:///etc/passwd">]>\n<a>&x;</a>').reason, /a DOCTYPE declaration; the reader refuses document type definitions/);
  assert.match(refused('<!doctype a>\n<a/>').reason, /DOCTYPE/);
  assert.match(refused('<a><!ENTITY x "y"></a>').reason, /an ENTITY declaration/);
  assert.match(refused('<a>&x;</a>').reason, /an entity reference &x; that XML does not predefine/);
  assert.match(refused('<a b="&lol9;"/>').reason, /&lol9;/);
  assert.match(refused('<a>&#0;</a>').reason, /to a character that XML does not allow/);
  assert.match(refused('<a>& b</a>').reason, /an entity reference that XML does not predefine/);
  assert.match(refused('<a><!ELEMENT x ANY></a>').reason, /a markup declaration the reader does not read/);
});

test('xml: what is not well-formed is refused with its offset', () => {
  const cases = [
    ['<a>', /the element <a> is not closed/],
    ['<a></b>', /the close tag <\/b> does not match <a>/],
    ['<a/></a>', /has no open element/],
    ['<a b="1" b="2"/>', /the attribute b appears twice/],
    ['<a b=1/>', /an attribute value in quotes was expected/],
    ['<a b="1/>', /an attribute value that is not closed/],
    ['<a b="<"/>', /a < inside an attribute value/],
    ['<a b="1"c="2"/>', /a space was expected before an attribute/],
    ['<a b/>', /an = was expected/],
    ['text<a/>', /text outside the root element/],
    ['<a/><b/>', /a second root element/],
    ['', /no root element/],
    ['<!-- open', /a comment that is not closed/],
    ['<?xml', /a processing instruction that is not closed/],
    ['<a><![CDATA[x</a>', /a CDATA section that is not closed/],
    ['<![CDATA[x]]><a/>', /a CDATA section outside the root element/],
    ['<a>]]></a>', /the sequence \]\]> in character data/],
    ['<1a/>', /a name was expected for an element/],
    ['<a></a  x>', /a > was expected at the end of the close tag/],
    ['<a', /the element <a> is not closed/]
  ];
  for (const [text, reason] of cases) assert.match(refused(text).reason, reason, text);
  assert.equal(refused('<a>\n<b></c></a>').offset, 7);
});

test('xml: the limits of depth, elements, attributes, names and values', () => {
  assert.match(refused(`${'<a>'.repeat(70)}${'</a>'.repeat(70)}`).reason, /nested more than 64 deep/);
  assert.match(refused(`<r>${'<a/>'.repeat(20)}</r>`, { maxXmlElements: 10 }).reason, /more than 10 elements/);
  assert.match(refused(`<a ${Array.from({ length: 5 }, (_, i) => `x${i}="1"`).join(' ')}/>`, { maxXmlAttributes: 3 }).reason, /more than 3 attributes/);
  assert.match(refused(`<${'n'.repeat(300)}/>`).reason, /a name longer than 256/);
  assert.match(refused(`<a b="${'v'.repeat(30)}"/>`, { maxXmlValueLength: 10 }).reason, /an attribute value longer than 10/);
  assert.match(refused(`<a>${'t'.repeat(30)}</a>`, { maxXmlValueLength: 10 }).reason, /character data longer than 10/);
  assert.equal(parseXml(`<a>${'t'.repeat(5000)}</a>`).elements[0].text.length, XML_LIMITS.maxXmlText, 'the text kept is capped');
  assert.equal(decodeReferences('plain'), 'plain');
  assert.equal(decodeReferences('&apos;&#x1F600;'), `'${String.fromCodePoint(0x1f600)}`);
});
