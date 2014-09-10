module.exports = function (math) {
  var util = require('../../util/index'),
      OperatorNode = require('../../expression/node/OperatorNode'),
      SymbolNode = require('../../expression/node/SymbolNode'),
      collection = require('../../type/collection'),
      isString = util.string.isString,
      isNumber = util.number.isNumber,
      isCollection = collection.isCollection;

  /**
   * Pretty print an expression.
   *
   * Syntax:
   *
   *   math.prettyprint(expr)
   *   math.prettyprint(expr, scope)
   *   math.prettyprint(expr, scope, options)
   *   math.prettyprint([expr1, expr2, expr3, ...])
   *   math.prettyprint([expr1, expr2, expr3, ...], scope)
   *   math.prettyprint([expr1, expr2, expr3, ...], scope, options)
   *
   * Example:
   *
   *   math.prettyprint('x^x^(x+1)'); // => "x^x^(x+1)"
   *
   *   var scope = {a:3};
   *   math.prettyprint('a * x', scope); // => "(3)*x"
   *
   *   var scope = {a:1, b: 0};
   *   var options = {precision: 3, doSimplify: true};
   *   math.prettyprint('a * x + b * x', scope, options); // => "x"
   *
   *   var scope = {a:4};
   *   var options = {precision: 1, doTex: true};
   *   math.prettyprint('a * cos(x)', scope, options); // => "{{4}} \, {\cos(x)}}"
   *
   *   var scope = {a:"(12.0+1.2)"};
   *   var options = {doTex: true};
   *   math.prettyprint('a*x', scope, options); // => "{{12.0}\pm{1.3}} \, {x}"
   *
   * Default Options:
   *
   * options = {
   *   precision : 3,
   *   doSimplify : false,
   *   doTex : false
   * }
   *
   * @param {String | String[] | Matrix} expr
   * @param {Scope | Object} [scope]
   * @return {*} res
   * @throws {Error}
   */
  math.prettyprint = function (expr, scope, options) {
    // if (arguments.length != 1 && arguments.length != 2) {
    //   throw new util.error.ArgumentsError('prettyprint', arguments.length, 1, 2);
    // }

    if (!scope) scope = {};

    options = options || {};
    var precision = !isNaN(options.precision) ? options.precision : 3;
    var doSimplify = options.doSimplify | false;
    var doTex = options.doTex | false;
  
    if (isString(expr)) {
      // prettyprint a single expression
      var node = math.parse(expr);
      overwriteOperatorNode(node, scope, doSimplify, doTex);
      overwriteSymbolNode(node, scope, precision, doSimplify, doTex);
      if (!doTex) {
          return node.toString();
      }
      else {
          // TODO add support for Simplify+Tex case
          return node.toTex();
      }
    }
    else if (isCollection(expr)) {
      // prettyprint an array or matrix with expressions
      return collection.deepMap(expr, function (elem) {
        var node = math.parse(elem);
        return node.toString();
      });
    }
    else {
      // oops
      throw new TypeError('String or matrix expected');
    }
  };

  function operatorNodetoString (scope, doSimplify, doTex) {
    /*
     * Replaces OperatorNode.prototype.toString
     * so that when toString is called this
     * instance function is called instead.
     */

    function scopeLookup (name, scope) {
      // 
      var value = scope[name];
      if (isNumber(value)) {
          return Number(value).toString();
      }
      else if (isString(value)) {
          return value
      }
      else {
          return name
      }
    };

    function formatUnary (params, op) {
      // format unary nodes
      var out;
      if (op == '-') {
        // special case: unary minus
        out = '-' + params[0].toString();
      }
      else {
        // for example '5!'
        out = params[0].toString() + op;
      }
      return out
    };

    function simplifyMult (out, lhs_scope, rhs_scope, _this) {
      /*
       * DEAL WITH MULTIPLICATIONS
       * 3 * x -> 3x
       * x * 3 -> 3x
       * 3 * 3 -> 3(3)
       * x * x -> x(x)
       * 2 * 3 * x -> 2(3)x
       * 2 * 3 {other op} x -> 2(3){other op}x
       */
      var tmp, lminus, rminus;
      var lhs = out[0];
      var rhs = out[4];

      if (!isNaN(lhs_scope) !== !isNaN(rhs_scope)) {
        // if ONE of the values is an expression not a number
        // move the number to the left hand side and resolve
        // signs

        if (!isNaN(rhs_scope)) {
          // expression on left, move to right
          tmp = rhs;
          rhs = lhs;
          lhs = tmp;
          out[0] = lhs;
          out[4] = rhs;
        }

        rminus = /^-.*/.test(rhs_scope);
        lminus = /^-.*/.test(lhs_scope);
        if (rminus) {
          rhs = rhs.substr(1);
          if (lminus) {
            // two negatives cancel
            lhs = lhs.substr(1);
          }
          else {
            // swap the right minus to the left
            lhs = '-' + lhs;
          }
          out[0] = lhs;
          out[4] = rhs;
        }

        if (!isNaN(lhs_scope) && !isNaN(rhs_scope[0])) {
          // if lhs is a number of the rhs exp starts with
          // number put "( )" around the number in the rhs exp
          rhs_node = math.parse(rhs)
          rhs_op = rhs_node.op
          rhs_params = rhs_node.params
          if (rhs_op === "*") {
              // remove "*"
              out = [lhs, "(", rhs_params[0], ")", rhs_params[1]];
          }
          else {
              // otherwise put the operator after ")"
              out = [lhs, "(", rhs_params[0], ")", rhs_op, rhs_params[1]];
          }
        }
        else {
          // otherwise just remove the "*" operator
          out = [lhs, rhs];
        }
      }
      else {
        // if two numbers are being multiplied
        if (!isNaN(lhs_scope[lhs_scope.length-2])) {
            // if lhs has (number), do not wrap "( )" around rhs
            out = [lhs, rhs];
        }
        else {
            // otherwise, wrap rhs
            out = [lhs, "(", rhs, ")"];
        }
      }
      return out
    };

    function simplifyAddSubOnNegs (out) {
      /*
       * DEAL WITH ADDITIONS and SUBTRACTION ON NEGATIVES
       * 3 + -x -> 3 - x
       * 3 - -x -> 3 + x
       */
      var op = out[2];
      var rhs = out[4];
      if (op === "+") {
        // if right hand side is negative
        if (/^-.*/.test(rhs)) {
          out[2] = '-';
          out[4] = rhs.substr(1);
        }
      }
      if (op === "-") {
        // if right hand side is negative
        if (/^-.*/.test(rhs)) {
          out[2] = '+';
          out[4] = rhs.substr(1);
        }
      }
      return out
    };

    function formatPrecedence (out, _this, params) {
      /*
       * Determine precedence of this
       * node and adjacent nodes.
       */
      if (params[0] instanceof OperatorNode) {
        if (precedence(_this) < precedence(params[0]))
          out[0] = "(" + out[0] + ")";
      }
      if (params[1] instanceof OperatorNode) {
        if (precedence(_this) < precedence(params[1]))
          out[4] = "(" + out[4] + ")";
      }
      return out
    };

    function simplifyOnesZeros (out, lhs_scope, rhs_scope, _this) {
      /*
       * DEAL WITH 1's and 0's
       * want 1 * x -> x
       * x * 1 -> x
       * 1 * 1 -> 1
       * 0 * x -> "0"
       * sin(x) * 0 -> "0"
       */
      var op = out[2];
      var lhs = out[0];
      var rhs = out[4];
      if (Number(lhs_scope) === 1 && op === "*") {
        out = ['','','','',rhs];
      }
      else if (Number(rhs_scope) === 1 && op === "*") {
        out = [lhs,'','','',''];
      }
      else if (Number(lhs_scope) === 0) {
        if (precedence(_this) === 8) {
          out = ['','','','',rhs];
        }
        else {
          out = ['','','','',"0"];
        }
      }
      else if (Number(rhs_scope) === 0) {
        if (precedence(_this) === 8) {
          out = [lhs,'','','',''];
        }
        else {
          out = ['0','','','',];
        }
      }
      return out
    };

    return function () {
      var params = this.params;
      var op = this.op;
      var _this = this;
      var out;  // initialize output

      switch (params.length) {
        case 1: // for example '5!'
          out = formatUnary(params, op);
          return out

        case 2: // for example '2+3'
          var lhs = params[0].toString(),  // both sides of the node to string
              rhs = params[1].toString();
          var lhs_scope = scopeLookup(lhs, scope),  // scope variables
              rhs_scope = scopeLookup(rhs, scope), 
          out = [lhs, ' ', op, ' ', rhs];  // default output 

          if (doSimplify) {
            out = simplifyOnesZeros(out, lhs_scope, rhs_scope, _this);
          }

          if (op === "*") {
            out[1] = '';
            out[3] = '';
            if (doSimplify) {
              out = simplifyMult(out, lhs_scope, rhs_scope, _this);
            }
          }
          else if (op === "+" || op === "-") {
            if (doSimplify) {
              out = simplifyAddSubOnNegs(out);
            }
          }
          else if (op === "^") {
            out[1] = '';
            out[3] = '';
          }

        out = formatPrecedence(out, _this, params);

        return out.join('');

        default: // this should occur. format as a function call
          out = op + '(', this.params.join(', ') + ')';
          return out
      }
    };
  };

  function symbolNodetoString (scope, precision, doSimplify, doTex) {
    return function () {
      var value = scope[this.name];
      if (isNumber(value)) {
        if (doSimplify) {
          // Inject with correct precision level
          return Number(value)
                 .toPrecision(precision)
                 .toString();
        }
        else if (doTex) {
          // TODO add support for Simplify+Tex case
          return Number(value)
                 .toPrecision(precision)
                 .toTex();
        }
        else {
          // Default case.
          // Every scope value is injected with wrapping '(' ')'
          return '(' + Number(value)
                 .toPrecision(precision)
                 .toString() + ')';
        }
      }
      else if (isString(value)) {
        return value
      }
      else {
        return this.name
      }
    };
  }
  
  function overwriteOperatorNode (node, scope, doSimplify, doTex) {
    /**
     * Over-ride Object.prototype.toString
     * method with an Object.toString method
     */
    var operators = node.find({
      type: OperatorNode
    });
    operators.forEach( function (o) {
      o.toString = operatorNodetoString(scope, doSimplify, doTex)
    });
  };

  function overwriteSymbolNode (node, scope, precision, doSimplify, doTex) {
    /**
     * Over-ride Object.prototype.toString
     * method with an Object.toString method
     */
    var symbols = node.find({
      type: SymbolNode
    });
    symbols.forEach( function (o) {
      o.toString = symbolNodetoString(scope, precision, doSimplify, doTex)
    });
  };

  function precedence (node) {
    /*
     * Precendence hack for deciding if we
     * should pretty print brackets or not.
     */
    var prec = null;
    var precs = {
      "^" :1    // power
    , "!" :2    // factorial
    , "'" :3    // transpose
    , ":" :4    // range [GUESSING AT THIS]
    , "/" :5    // divide
    , "./":5    // element-wise divide
    , "*" :6    // multiply
    , ".*":6    // element-wise multiply
    , "%" :7    // mod
    , "+" :8    // add
    , "-" :8    // subtract
    , "in":9    // unit conversion
    , "<" :10   // smaller
    , ">" :10   // larger
    , "<=":10   // smaller or equal to
    , ">=":10   // larger or equal to
    , "==":11   // equal to
    , "!=":11   // unequal
    , "=" :12   // assignment
    }
    if (node.op)
      prec = precs[node.op]
    return prec
  }

};
