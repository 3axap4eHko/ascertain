import ascertain, { optional, $keys, $values } from '../index';

const fixture = {
  a: 1, b: 'test', c: true, d: [1, 2, 3, 4, 5], e: { f: 1 }, f() {
  }, g: null, h: new Date(),
};


describe('Ascertain test suite', () => {
  it('Should throw an error for null or undefined schema', () => {
    const isValid = ascertain(null);
    expect(() => isValid(fixture)).toThrow('Invalid schema value null');
  });

  it('Should throw an error for null or undefined target', () => {
    const isValid = ascertain({});
    expect(() => isValid(null)).toThrow('Invalid value null specified by path [root]');
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
    ['Optional does not exist', { z: optional(true) }, fixture],
    ['Keys', { e: { [$keys]: /^\w+$/ } }, fixture],
    ['Values', { e: { [$values]: Number } }, fixture],
  ])('Should validate schema type %s positive', (title, schema, target) => {
    const isValid = ascertain(schema);
    expect(() => isValid(target)).not.toThrow();
  });

  it.each([
    ['Number', { c: Number }, fixture, 'expected Number'],
    ['String', { a: String }, fixture, 'expected String'],
    ['Boolean', { b: Boolean }, fixture, 'expected Boolean'],
    ['Function', { a: Function }, fixture, 'expected Function'],
    ['Array', { e: Array }, fixture, 'expected Array'],
    ['Array items', { d: [String] }, fixture, 'one of String'],
    ['Object', { c: Object }, fixture, 'expected Object'],
    ['Object properties', { e: { d: Number } }, fixture, 'any value'],
    ['RegExp', { b: /^testing$/ }, fixture, 'matching /^testing$/'],
    ['Set', { c: new Set([]) }, fixture, 'expected one of []'],
    ['Value', { c: false }, fixture, 'expected false'],
    ['Null', { a: null }, fixture, 'Invalid schema value null'],
    ['Null', { g: null }, fixture, 'Invalid schema value null'],
    ['Optional exists', { c: optional(false) }, fixture, 'expected false'],
    ['Optional does not exist', { z: optional(null) }, fixture, 'Invalid schema value null'],
    ['Keys', { e: { [$keys]: Number } }, fixture, 'expected Number'],
    ['Values', { e: { [$values]: String } }, fixture, 'expected String'],
    ['Array schema', [], {}, 'expected Array'],
    ['Non object target', {}, 2, 'expected Object'],
  ])('Should validate schema type %s negative', (title, schema, target, message) => {
    const isValid = ascertain(schema);
    expect(() => isValid(target)).toThrow(message);
  });

});
