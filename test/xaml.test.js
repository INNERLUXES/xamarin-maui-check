import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XmlError, isFormsNamespace, scanXaml } from '../src/index.js';
import { FORMS_NS, MAUI_NS, xaml } from './helpers.js';

// XAML: the Xamarin.Forms XAML namespace recognized by its shape, and the layouts of that namespace.

test('isFormsNamespace: the shape of the URI, and the URIs next to it', () => {
  assert.equal(isFormsNamespace(FORMS_NS), true);
  assert.equal(isFormsNamespace(` ${FORMS_NS} `), true);
  for (const uri of [MAUI_NS, 'http://xamarin.com/schemas/forms', 'http://xamarin.com/schemas/x1/forms', 'https://xamarin.com/schemas/1/forms', 'http://xamarin.com/schemas/1/toolkit', 'clr-namespace:Xamarin.Forms', `${FORMS_NS}/x`, 'http://xamarin.com/schemas/123456789/forms']) assert.equal(isFormsNamespace(uri), false, uri);
});

test('scanXaml: the declaration and the layouts of the Xamarin.Forms namespace, with prefixes and scopes', () => {
  const text = xaml(`    <StackLayout>
        <RelativeLayout />
        <f:RelativeLayout xmlns:f="${FORMS_NS}" />
        <c:RelativeLayout xmlns:c="clr-namespace:Acme.Compat" />
        <Grid xmlns="${MAUI_NS}"><RelativeLayout /></Grid>
    </StackLayout>`);
  const s = scanXaml(text, new Set(['RelativeLayout']));
  assert.equal(s.root, 'ContentPage');
  assert.equal(s.formsNamespace, text.indexOf('xmlns='));
  assert.deepEqual(s.layouts.map((l) => [l.name, l.offset]), [['RelativeLayout', text.indexOf('<RelativeLayout />')], ['RelativeLayout', text.indexOf('<f:RelativeLayout')]]);
  assert.equal(s.elements, 7);
  assert.deepEqual(scanXaml(text).layouts, [], 'no layouts named, none reported');
  assert.equal(scanXaml(xaml('<Grid/>', MAUI_NS)).formsNamespace, null);
  assert.throws(() => scanXaml('<!DOCTYPE x><a/>'), XmlError);
});
