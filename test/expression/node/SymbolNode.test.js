// test SymbolNode
var assert = require('assert'),
    approx = require('../../../tools/approx'),
    math = require('../../../index')(),
    Node = require('../../../lib/expression/node/Node'),
    ConstantNode = require('../../../lib/expression/node/ConstantNode'),
    SymbolNode = require('../../../lib/expression/node/SymbolNode');

describe('SymbolNode', function() {

  it ('should throw an error when evaluating an undefined symbol', function () {
    var scope = {};
    var s = new SymbolNode('foo');
    assert.throws(function () {s.compile(math).eval(scope)}, Error);
  });

  it ('should compile a SymbolNode', function () {
    var s = new SymbolNode('a');

    var expr = s.compile(math);
    var scope = {a: 5};
    assert.equal(expr.eval(scope), 5);
    assert.throws(function () {expr.eval({})}, Error);

    var s2 = new SymbolNode('sqrt');
    var expr2 = s2.compile(math);
    var scope2 = {};
    assert.strictEqual(expr2.eval(scope2), math.sqrt);
  });

  it ('should find a SymbolNode', function () {
    // TODO
  });

  it ('should match a SymbolNode', function () {
    // TODO
  });

  it ('should stringify a SymbolNode', function () {
    var s = new SymbolNode('foo');

    assert.equal(s.toString(), 'foo');
  });

});
