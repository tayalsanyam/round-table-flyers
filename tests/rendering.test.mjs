import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

async function moduleAt(path) {
  const source = fs.readFileSync(path, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
}

test('Header/footer preserve flyer dimensions; logo scaling keeps proportions and original source', async () => {
  const calls = [];
  globalThis.Image = class {
    naturalWidth = 600;
    naturalHeight = 400;
    set src(v) {
      this.source = v;
      queueMicrotask(() => this.onload());
    }
  };
  const { compose, layout } = await moduleAt('lib/composite.ts');
  const context = {
    clearRect() {},
    fillRect(...a) { calls.push(['fill', ...a]); },
    drawImage(...a) { calls.push(['draw', ...a]); },
    save() {},
    restore() {},
    beginPath() {},
    rect() {},
    clip() {},
    roundRect() {},
    fill() {},
    fillText(...a) { calls.push(['text', ...a]); },
    measureText(t) { return { width: t.length * 12 }; },
    font: '',
    fillStyle: '',
    textBaseline: 'alphabetic',
    textAlign: 'left',
  };
  const canvas = { getContext() { return context; } };
  const flyer = { naturalWidth: 1080, naturalHeight: 1350 };
  const logo = { id: 'x', url: '/original.png' };
  const design = { background: '#000000', bandEnabled: true, bandPlacement: 'header', tags: [], textLayers: [], logoLayouts: [] };
  await compose(canvas, flyer, [logo], design);
  assert.equal(canvas.width, 1080);
  assert.equal(canvas.height, 1631);
  assert.equal(calls.filter(c => c[0] === 'draw')[0][1], flyer);
  assert.deepEqual(calls.filter(c => c[0] === 'draw')[0].slice(2), [0, 281]);
  assert.equal(layout(1080, 1350, 2, 'footer', true).bandY, 1350);
  assert.equal(layout(1080, 1350, 2, 'reserved-top', true).outputHeight, 1350);
  assert.throws(() => layout(1080, 1350, 12, 'reserved-top', true), /more space/);
});

test('Tags and text use flyer coordinates and stay inside the artwork', async () => {
  const calls = [];
  const ctx = {
    fillRect(...a) { calls.push(['fill', this.fillStyle, ...a]); },
    drawImage() {},
    measureText(t) { return { width: t.length * 12 }; },
    beginPath() {},
    roundRect() {},
    fill() {},
    fillText(...a) { calls.push(['text', ...a]); },
    save() {},
    rect(...a) { calls.push(['clipBounds', ...a]); },
    clip() {},
    restore() {},
    font: '',
    fillStyle: '',
    textBaseline: 'alphabetic',
    textAlign: 'left',
  };
  const c = { getContext: () => ctx };
  const { compose } = await moduleAt('lib/composite.ts');
  const d = {
    background: '#00aa55',
    bandEnabled: true,
    bandPlacement: 'header',
    tags: [{ text: 'Go Go Green', x: 50, y: 12, font: 'Modern', size: 2.1, color: '#fff' }],
    textLayers: [{ id: '1', text: 'Community together', font: 'Modern', size: 5, x: 50, y: 20, align: 'center', color: '#fff' }],
    logoLayouts: [],
  };
  const l = await compose(c, { naturalWidth: 1080, naturalHeight: 1350 }, [{ url: '/original.png', id: 'x' }], d);
  assert.ok(calls.some(x => x[0] === 'fill' && x[1] === '#00aa55'));
  assert.ok(calls.some(x => x[0] === 'text' && x[1] === 'Go Go Green'));
  const clip = calls.find(x => x[0] === 'clipBounds');
  assert.ok(clip);
  assert.equal(clip[2], l.flyerY + 1080 * 0.025);
  assert.equal(clip[4], 1350 - 2 * 1080 * 0.025);
});
