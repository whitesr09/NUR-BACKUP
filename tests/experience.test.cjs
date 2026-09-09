const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const appearance = require('../web/nur-experience.js');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, 'web', name), 'utf8');

test('defaults preserve the original NUR design and all sections', () => {
  const value = appearance.defaults();
  assert.equal(value.theme, 'midnight');
  assert.equal(value.background, 'artwork');
  assert.deepEqual(value.hidden, []);
  assert.deepEqual(value.order, appearance.sections.map(section => section.id));
});

test('unknown and malformed settings cannot inject arbitrary palette or layout values', () => {
  const value = appearance.normalize({theme:'unknown',motion:'wrong',density:'wrong',background:'wrong',fontScale:Infinity,order:['tasks','tasks','bad','light'],hidden:['bad','light','prayers']});
  assert.equal(value.theme, 'midnight');
  assert.equal(value.motion, 'system');
  assert.equal(value.density, 'comfortable');
  assert.equal(value.background, 'artwork');
  assert.equal(value.fontScale, 1);
  assert.deepEqual(value.order.slice(0,2), ['tasks','light']);
  assert.equal(new Set(value.order).size, appearance.sections.length);
  assert.deepEqual(appearance.normalize(null), appearance.defaults());
});

test('font scale is bounded and section reordering does not mutate the input', () => {
  assert.equal(appearance.normalize({fontScale:8}).fontScale,1.25);
  assert.equal(appearance.normalize({fontScale:0}).fontScale,.9);
  const order=appearance.defaults().order;
  const result=appearance.move(order,'tasks',-1);
  assert.deepEqual(order,appearance.defaults().order);
  assert.equal(result[1],'tasks');
  assert.deepEqual(appearance.move(order,'light',-1),order);
  assert.deepEqual(appearance.move(order,'unknown',1),order);
});

test('system appearance resolves light and dark palettes correctly', () => {
  const settings=appearance.normalize({theme:'system'});
  assert.equal(appearance.resolveTheme(settings,true).dark,true);
  assert.equal(appearance.resolveTheme(settings,false).dark,false);
  for(const [name,palette] of Object.entries(appearance.palettes)){
    assert.equal(appearance.resolveTheme({theme:name},false),palette);
    for(const key of ['bg','surface','card','text','muted','line','accent','accentInk','track','soft']) assert.match(palette[key],/^#[0-9a-f]{6,8}$/i);
  }
});

test('every JavaScript entrypoint compiles and the experience loads after the existing modules', () => {
  const expected=['app.js','v2-persistent-items.js','nur-power-data.js','nur-level3.js','v2-motion.js','nur-experience.js','nur-vault.js','nur-vault-ui.js'];
  for(const file of [...expected,'sw.js']) new vm.Script(read(file),{filename:file});
  const html=read('index.html');
  assert.match(html,/href="nur-experience\.css"/);
  assert.match(html,/href="nur-vault\.css"/);
  const files=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(files,expected);
  assert.equal(html.includes('material-components'),false);
});
