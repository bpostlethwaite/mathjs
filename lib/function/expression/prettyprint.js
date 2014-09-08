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
   *     math.prettyprint(expr)
   *     math.prettyprint(expr, scope)
   *     math.prettyprint([expr1, expr2, expr3, ...])
   *     math.prettyprint([expr1, expr2, expr3, ...], scope)
   *
   * Example:
   *
   *     math.prettyprint('x^x^(x+1)');            // "x^x^(x + 1)"
   *
   *     var scope = {a:3}
   *     math.prettyprint('a * x', scope);         // "3x"
   *
   *     scope = {a:1, b: 0}
   *     math.prettyprint('a * x + b * x', scope); // "x"
   *
   *
   *
   * @param {String | String[] | Matrix} expr
   * @param {Scope | Object} [scope]
   * @return {*} res
   * @throws {Error}
   */
  math.prettyprint = function (expr, scope, precision) {
    // if (arguments.length != 1 && arguments.length != 2) {
    //   throw new util.error.ArgumentsError('prettyprint', arguments.length, 1, 2);
    // }

    if (!scope) scope = {};

    if (isString(expr)) {
      // prettyprint a single expression
      var node = math.parse(expr);
      enablePretty(node, scope, precision);
      return node.toString();
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

  function operatorNodetoString () {
    /*
     * Replaces OperatorNode.prototype.toString
     * so that when toString is called this
     * instance function is called instead.
     */
    
    var params = this.params;
    var op = this.op;
    var tmp, lminus, rminus;

    var lprec = ["+","-"] // lower precedence

    switch (params.length) {
      case 1:
      if (op == '-') {
        // special case: unary minus
        return '-' + params[0].toString();
      }
      else {
        // for example '5!'
        return params[0].toString() + op;
      }


      case 2: // for example '2+3'
      var lhs = params[0].toString()
        , rhs = params[1].toString()
        , spc = " "


      /*
       * DEAL WITH 1's and 0's
       * want 1 * x -> x
       * x * 1 -> x
       * 1 * 1 -> 1
       * 0 * x -> "0"
       * sin(x) * 0 -> "0"
       */
      if (Number(lhs) === 1 && op === "*")
        return rhs;

      if (Number(rhs) === 1 && op === "*")
        return lhs;

      if (Number(lhs) === 0)
        return (precedence(this) === 8) ? rhs : "0";

      if (Number(rhs) === 0)
        return (precedence(this) === 8) ? lhs : "0";

      /*
       * DEAL WITH MULTIPLICATIONS
       * 3 * x -> 3x
       * x * 3 -> 3x
       * 3 * 3 -> 3(3)
       * x * x -> x(x)
       * 2 * 3 * x -> 2(3)x
       * 2 * 3 {other op} x -> 2(3){other op}x
       */
      if (op === "*") {

        if (!isNaN(lhs) !== !isNaN(rhs)) {
          // if ONE of the values is an expression not a number
          // move the number to the left hand side and resolve
          // signs

          if (!isNaN(rhs)) {
            // expression on left, move to right
            tmp = rhs;
            rhs = lhs;
            lhs = tmp;
          }

          rminus = /^-.*/.test(rhs);
          lminus = /^-.*/.test(lhs);

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
          }
        
          if (!isNaN(lhs) && !isNaN(rhs[0])) {
            // if lhs is a number of the rhs exp starts with 
            // number put "( )" around the number in the rhs exp
            rhs_node = math.parse(rhs)
            rhs_op = rhs_node.op
            rhs_params = rhs_node.params

            if (rhs_op === "*") {
                // remove "*"    
                return lhs + "(" + rhs_params[0] + ")" + rhs_params[1];
            }
            else {
                // otherwise put the operator after ")"
                return lhs + "(" + rhs_params[0] + ")" + rhs_op + rhs_params[1];
            }

          }
          else {
            // otherwise just remove the "*" operator
            return lhs + rhs;
          }

        }
        else {
          // if two numbers are being multiplied
          if (!isNaN(lhs[lhs.length-2])) { 
              // if lhs has (number), do not wrap "( )" around rhs
              return lhs + rhs;
          }
          else {
              // otherwise, wrap rhs
              return lhs + "(" + rhs + ")";
          }
        }
      }


      /*
       * DEAL WITH ADDITIONS ON NEGATIVES
       * 3 + -x -> 3 - x
       */
      if (op === "+") {
        // if right hand side is negative
        if (/^-.*/.test(rhs)) {
          op = '-';
          rhs = rhs.substr(1);
        }
      }

      /*
       * DEAL WITH SUBTRACTION ON NEGATIVES
       * 3 + -x -> 3 - x
       */
      if (op === "-") {
        // if right hand side is negative
        if (/^-.*/.test(rhs)) {
          op = '+';
          rhs = rhs.substr(1);
        }
      }

      /*
       * determine precedence of this
       * node and adjacent nodes.
       */
      if (op === "^")
        spc = ""

      if (params[0] instanceof OperatorNode) {

        if (precedence(this) >= precedence(params[0]))
          lhs = lhs;
        else
          lhs = "(" + lhs + ")";
      }

      if (params[1] instanceof OperatorNode) {

        if (precedence(this) >= precedence(params[1]))
          rhs = rhs;
        else
          rhs = "(" + rhs + ")";
      }

      return lhs + spc + op + spc + rhs;

      default: // this should occur. format as a function call
      return op + '(' + this.params.join(', ') + ')';

    }
  };


  function symbolNodetoString (scope, precision) {
    if (!precision) precision = 5;
    return function () {
      var value = scope[this.name];
      if (isNumber(value))
        return Number(value)
               .toPrecision(precision)
               .toString();
      else
        return this.name;
    };
  }

  function enablePretty (node, scope, precision) {
    /**
     * Over-ride Object.prototype.toString
     * method with an Object.toString method.
     *
     */
    
    var symbols = node.find({
      type: SymbolNode
    });

    var operators = node.find({
      type: OperatorNode
    });

    symbols.forEach( function (o) {
      o.toString = symbolNodetoString(scope, precision)
    });

    operators.forEach( function (o) {
      o.toString = operatorNodetoString
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

  function round(number, decimals) {
    return parseFloat(number.toFixed(decimals));
  }

};
