import ascertain from '../index';

const fixture = {
  a: 1, b: 'test', c: true, d: [1, 2, 3, 4, 5], e: { f: 1 }, f() {}
};

describe('Ascertain test suite', () => {
  it.each([
    ['Number', { a: Number }],
    ['String', { b: String }],
    ['Boolean', { c: Boolean }],
    ['Function', { f: Function }],
    ['Array', { d: Array }],
    ['Array items', { d: [Number] }],
    ['Object', { e: Object }],
    ['Object properties', { e: { f: Number } }],
    ['RegExp', { b: /^test$/ }],
    ['Set', { c: new Set([true, false]) }],
  ])('Should validate schema type %s positive', (title, schema) => {
    const isValid = ascertain(schema);
    expect(() => isValid(fixture)).not.toThrow();
  });

  it.each([
    ['Number', { c: Number }],
    ['String', { a: String }],
    ['Boolean', { b: Boolean }],
    ['Function', { a: Function }],
    ['Array', { e: Array }],
    ['Array items', { d: [String] }],
    ['Object', { d: Object }],
    ['Object properties', { e: { d: Number } }],
    ['RegExp', { b: /^testing$/ }],
    ['Set', { c: new Set([]) }],
  ])('Should validate schema type %s negative', (title, schema) => {
    const isValid = ascertain(schema);
    expect(() => isValid(fixture)).toThrow();
  });

});
