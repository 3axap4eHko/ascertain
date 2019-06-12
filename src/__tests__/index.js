import ascertain, { optional } from '../index';

const fixture = {
  a: 1, b: 'test', c: true, d: [1, 2, 3, 4, 5], e: { f: 1 }, f() {
  }, g: null,
};

describe('Ascertain test suite', () => {
  it('Should throw an error for null or undefined schema', () => {
    const isValid = ascertain(null);
    expect(() => isValid(fixture)).toThrow('Invalid schema null');
    expect(() => ascertain(null, fixture)).toThrow('Invalid schema null');
  });

  it('Should throw an error for null or undefined target', () => {
    const isValid = ascertain({});
    expect(() => isValid(null)).toThrow('Invalid value by path [root]');
    expect(() => ascertain({}, null)).toThrow('Invalid value by path [root]');
  });

  it.each([
    ['Number', { a: Number }, fixture],
    ['String', { b: String }, fixture],
    ['Boolean', { c: Boolean }, fixture],
    ['Function', { f: Function }, fixture],
    ['Array', { d: Array }, fixture],
    ['Array items', { d: [Number] }, fixture],
    ['Object', { e: Object }, fixture],
    ['Object properties', { e: { f: Number } }, fixture],
    ['RegExp', { b: /^test$/ }, fixture],
    ['Set', { c: new Set([true, false]) }, fixture],
    ['Value', { c: true }, fixture],
    ['Optional exists', { c: optional(true) }, fixture],
    ['Optional does not exist', { h: optional(true) }, fixture],
  ])('Should validate schema type %s positive', (title, schema, target) => {
    const isValid = ascertain(schema);
    expect(() => isValid(target)).not.toThrow();
    expect(() => ascertain(schema, target)).not.toThrow();
  });

  it.each([
    ['Number', { c: Number }, fixture],
    ['String', { a: String }, fixture],
    ['Boolean', { b: Boolean }, fixture],
    ['Function', { a: Function }, fixture],
    ['Array', { e: Array }, fixture],
    ['Array items', { d: [String] }, fixture],
    ['Object', { c: Object }, fixture],
    ['Object properties', { e: { d: Number } }, fixture],
    ['RegExp', { b: /^testing$/ }, fixture],
    ['Set', { c: new Set([]) }, fixture],
    ['Value', { c: false }, fixture],
    ['Null', { a: null }, fixture],
    ['Null', { g: null }, fixture],
    ['Optional exists', { c: optional(false) }, fixture],
    ['Optional does not exist', { h: optional(null) }, fixture],
    ['Array schema', [], {}],
    ['Non object target', { }, 2],
  ])('Should validate schema type %s negative', (title, schema, target) => {
    const isValid = ascertain(schema);
    expect(() => isValid(target)).toThrow();
    expect(() => ascertain(schema, target)).toThrow();
  });

});
