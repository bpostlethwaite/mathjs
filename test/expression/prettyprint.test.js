// test parser

var assert = require('assert'),
    math = require('../../index'),
    prettyPrint = require('../../lib/function/expression/prettyprint.js');

describe('prettyprint', function() {

  it ('should be a method', function () {
    assert.ok(typeof(math.prettyprint) === "function");
  });

  it ('should return a string', function () {

    var res = math.prettyprint('sqrt(x^a)');
    assert.ok(typeof(res) === "string");

  });

  it ('should substitute scope variables with correct precision', function () {

      var funcStr = "a + b*x";
      var scope = {a : 1.2, b : 2.3}
      var options = {precision : 6}
      var res = math.prettyprint(funcStr, scope, options)
      assert.equal(res, "1.20000 + (2.30000 * x)")

  });

  it ('should substitute scope variables and simplify', function () {

      var funcStr = "a + b*x";
      var scope = {a : 1.2, b : 2.3}
      var options = {doSimplify : true}
      var res = math.prettyprint(funcStr, scope, options)
      assert.equal(res, "1.20 + 2.30x")
      
      var funcStr = "a + b*x";
      var scope = {a : 0, b : 1}
      var options = {doSimplify : true}
      var res = math.prettyprint(funcStr, scope, options)
      assert.equal(res, "x")

      var funcStr= "a + b*x - c*x^2 + d*x^3 + e*x^4";
      var scope = {a : 0.0, b : 2132123.21321, c : -212.22, d : 0.0, e : 1e-19};
      var options = {doSimplify : true};
      var res = math.prettyprint(funcStr, scope, options)
      assert.equal(res, "2.13e+6x + 212x^2 + 1.00e-19x^4")

      var funcStr = 'a + h*e^( -(x-x0)^2/(2*w^2) )';
      var scope = {a : 0.0, h : 1, x0 : -212.22, w : 1};
      var options = {doSimplify : true}
      var res = math.prettyprint(funcStr, scope, options)
      assert.equal(res, "e^((-(x + 212)^2) / (2(1.00)^2))")

      var funcStr = 'a + b*cos(2*c*x) + c*sin(x)';
      var scope = {a : 0.0, b : 1, c : 1.321213};
      var options = {doSimplify : true}
      var res = math.prettyprint(funcStr, scope, options)
      assert.equal(res, "cos(2(1.32)x) + 1.32sin(x)")

      var funcStr = 'a + b*e^(x+1)';
      var scope = {a : 12, b : 2};
      var options = {doSimplify : true}
      var res = math.prettyprint(funcStr, scope, options)
      assert.equal(res, "12.0 + 2.00e^(x + 1)")
      
  });

  it ('should substitute scope variables and print using Tex', function () {

      var funcStr = "a + b*x";
      var scope = {a : 1.2, b : 2.3}
      var options = {doTex : true}
      var res = math.prettyprint(funcStr, scope, options)
      assert.equal(res, "{1.20}+{{2.30} \\, {x}}")
      
      var funcStr = "a + b*x";
      var scope = {a : 0, b : 1}
      var options = {doTex : true}
      var res = math.prettyprint(funcStr, scope, options)
      assert.equal(res, "{0.00}+{{1.00} \\, {x}}")

      var funcStr= "a + b*x - c*x^2 + d*x^3 + e*x^4";
      var scope = {a : 0.0, b : 2132123.21321, c : -212.22, d : 0.0, e : 1e-19};
      var options = {doTex : true};
      var res = math.prettyprint(funcStr, scope, options)
      assert.equal(res, "{{{{0.00}+{{2.13 \\cdot 10^{+6}} \\, {x}}}-{\\left({-212}\\right) \\cdot {x^{2}}}}+{{0.00} \\cdot {x^{3}}}}+{{1.00 \\cdot 10^{-19}} \\cdot {x^{4}}}")

      var funcStr = 'a + h*e^( -(x-x0)^2/(2*w^2) )';
      var scope = {a : 0.0, h : 1, x0 : -212.22, w : 1};
      var options = {doTex : true}
      var res = math.prettyprint(funcStr, scope, options)
      assert.equal(res, "{0.00}+{{1.00} \\cdot {e^{\\frac{-\\left({{x}-{-212}}\\right)^{2}}{{2} \\cdot {{1.00}^{2}}}}}}")

      var funcStr = 'a + b*cos(2*c*x) + c*sin(x)';
      var scope = {a : 0.0, b : 1, c : 1.321213};
      var options = {doTex : true}
      var res = math.prettyprint(funcStr, scope, options)
      assert.equal(res, "{{0.00}+{{1.00} \\, {\\cos\\left({{{{2} \\cdot {1.32}} \\, {x}}}\\right)}}}+{{1.32} \\, {\\sin\\left({{x}}\\right)}}")

      var funcStr = 'a + b*e^(x+1)';
      var scope = {a : 12, b : 2};
      var options = {doTex : true}
      var res = math.prettyprint(funcStr, scope, options)
      assert.equal(res, "{12.0}+{{2.00} \\cdot {e^{{x}+{1}}}}")

  });

  it ('should substitute scope variables, simplify and print using Tex', function () {

      var funcStr = "a + b*x";
      var scope = {a : 0, b : 1}
      var options = {doSimplify : true, doTex : true}
      var res = math.prettyprint(funcStr, scope, options)
      assert.equal(res, "x")

      var funcStr= "a + b*x - c*x^2 + d*x^3 + e*x^4";
      var scope = {a : 0.0, b : 2132123.21321, c : -212.22, d : 0.0, e : 1e-19};
      var options = {doSimplify : true, doTex : true}
      var res = math.prettyprint(funcStr, scope, options)
      assert.equal(res, "{{{2.13 \\cdot 10^{+6}} \\, {x}}+{{212} \\cdot {x^{2}}}}+{{1.00 \\cdot 10^{-19}} \\cdot {x^{4}}}")

      var funcStr = 'a + h*e^( -(x-x0)^2/(2*w^2) )';
      var scope = {a : 0.0, h : 1, x0 : -212.22, w : 1};
      var options = {doSimplify : true, doTex : true}
      var res = math.prettyprint(funcStr, scope, options)
      assert.equal(res, "e^{\\frac{-\\left({{x}+{212}}\\right)^{2}}{{2} \\cdot {{1.00}^{2}}}}")

      var funcStr = 'a + b*cos(2*c*x) + c*sin(x)';
      var scope = {a : 0.0, b : 1, c : 1.321213};
      var options = {doSimplify : true, doTex : true}
      var res = math.prettyprint(funcStr, scope, options)
      assert.equal(res, "{\\cos\\left({{{2} \\cdot \\left({{1.32} \\, {x}}\\right)}}\\right)}+{{1.32} \\, {\\sin\\left({{x}}\\right)}}")

      var funcStr = 'a + b*e^(x+1)';
      var scope = {a : 12, b : 2};
      var options = {doSimplify : true, doTex : true}
      var res = math.prettyprint(funcStr, scope, options)
      assert.equal(res, "{12.0}+{{2.00} \\cdot {e^{{x}+{1}}}}")

  });

  it ('should substitute scope variables with +/- errors', function () {

      var funcStr = 'a + b*e^(x+1)';
      var scope = {a : "(12 +/- 2.321)", b : "(1.213 +/- 0.021)"};
      var res = math.prettyprint(funcStr, scope)
      assert.equal(res, "(12 +/- 2.321) + ((1.213 +/- 0.021) * (e ^ (x + 1)))")

  });

  it ('should substitute scope variables with +/- errors using Tex', function () {

      var funcStr = 'a + b*e^(x+1)';
      var scope = {a : "(12 +/- 2.321)", b : "(1.213 +/- 0.021)"};
      var options = {doTex : true}
      var res = math.prettyprint(funcStr, scope, options)
      assert.equal(res, "{{12}\\pm{2.321}}+{{{1.213}\\pm{0.021}} \\cdot {e^{{x}+{1}}}}")

  });

});
