function Parser(rootNode) {
    this.rootNode = rootNode;
    this.stack = [
        {
            directive: undefined,
            curNode: this.rootNode
        }
    ];
}

/**
 * 单向改变数据，整个 DOM 要更新
 *
 * @public
 * @param {Object} data 数据
 */
Parser.prototype.setData = function (data) {
    checkExpressions(this.stack[0], data);
    for (var i = 1, il = this.stack.length; i < il; i++) {
        checkExpressions(this.stack[i], this.stack[i - 1].curData);
    }

    function checkExpressions(scope, previousScopeData) {
        scope.curData = extend(scope.curData || {}, previousScopeData || {});
        scope.expressionOldValues = scope.expressionOldValues || {};
        for (var expression in scope.updateFns) {
            var expressionValue = scope.expressionFns[expression]();
            if (isEqual(expressionValue, scope.expressionOldValues[expression])) {
                continue;
            }
            for (var j = 0, jl = scope.updateFns[expression].length; j < jl; j++) {
                scope.updateFns[expression][j](expressionValue);
            }
        }
    }
};

/**
 * 搜集 DOM 中的表达式
 *
 * @public
 */
Parser.prototype.collectExpressions = function () {
    var me = this;
    walk(this.rootNode);

    function walk(curNode) {
        if (!curNode) {
            return;
        }

        var children = curNode.childNodes;
        for (var i = 0, il = children.length; i < il; i++) {
            var child = children[i];
            if (isIf(child)) {
                enterIf(me, child);
            }
            else {
                enterExpression(me, child);
            }
        }
    }
};

/**
 * 当前的节点中有 `${name}` 、 `${9 - 1}` 这种表达式，
 * 注意这些表达式不是 if 、 for 这种指令里面的表达式，
 * 就是一些脱离于指令的一些表达式。这种表达式不会新建 scope
 *
 * @inner
 */
function enterExpression(parser, curNode) {
    var scope = parser.stack[parser.stack.length - 1];

    scope.expressionFns = scope.expressionFns || {};
    scope.updateFns = scope.updateFns || {};

    // 文本节点
    if (curNode.nodeType === 3) {
        if (!/\$\{([^{}]+)\}/.test(curNode.nodeValue)) {
            return;
        }

        addExpression(curNode.nodeValue, scope, (function (curNode) {
            return function (expressionResult) {
                curNode.nodeValue = expressionResult;
            };
        })(curNode));
    }
    // 元素节点，只看属性中有没有表达式
    else if (curNode.nodeType === 1) {
        var attributes = curNode.attributes;
        for (var i = 0, il = attributes.length; i < il; i++) {
            var attribute = attributes[i];
            if (!/\$\{([^{}]+)\}/.test(attribute.value)) {
                continue;
            }

            addExpression(attribute.value, scope, (function (curNode, attrName) {
                return function (expressionResult) {
                    curNode.setAttribute(attrName, expressionResult);
                };
            })(curNode, attribute.name));
        }
    }

    function addExpression(expression, scope, updateFn) {
        if (!scope.expressionFns[expression]) {
            scope.expressionFns[expression] = createExpressionFunction(expression, scope);
        }

        scope.updateFns[expression] = scope.updateFns[expression] || [];
        scope.updateFns[expression].push(updateFn);
    }

    function createExpressionFunction(expression, scope) {
        return function () {
            return expression.replace(/\$\{([^{}]+)\}/g, function () {
                if (arguments.length < 2) {
                    return '';
                }
                return calculateExpression(arguments[1], scope.curData);
            });
        };
    }
}

function enterIf(parser, curNode) {
    var ifEndNode = findIfEnd(curNode);
    if (!ifEndNode) {
        throw new Error('the directive `if` is not correctlly closed!');
    }

    var scope = {
        directive: 'if',
        curNode: curNode
    };

    var expression = curNode.nodeValue.replace(/^\s*if:/, '');
    scope.expressionFns = {};
    scope.expressionFns[expression] = (function (scope, expression) {
        return function () {
            return calculateExpression(expression, scope.curData);
        };
    })(scope, expression);
    scope.updateFns = {};
    scope.updateFns[expression] = [(function (ifStartNode, ifEndNode) {
        return function (expressionResult) {
            toggleChildNodes(expressionResult, ifStartNode, ifEndNode);
        };
    })(curNode, ifEndNode)];

    parser.stack.push(scope);

    function findIfEnd(ifStartNode) {
        var next = ifStartNode;
        while ((next = next.nextSibling)) {
            if (isIf(next)) {
                return;
            }

            if (isIfEnd(next)) {
                return next;
            }
        }
    }

    function toggleChildNodes(isShow, ifStartNode, ifEndNode) {
        var nextNode = curNode;
        while ((nextNode = nextNode.nextSibling) && nextNode !== ifEndNode) {
            if (nextNode.nodeType === 3) {
                var span = document.createElement('span');
                span.innerHTML = nextNode.nodeValue;
                var parentNode = nextNode.parentNode;
                parentNode.replaceChild(span, nextNode);
                nextNode = span;
            }
            if (!isShow) {
                addClass(nextNode, ['hide']);
            }
            else {
                removeClass(nextNode, ['hide']);
            }
        }
    }
}

/**
 * 计算表达式的值
 *
 * @inner
 * @param  {string} expression 表达式字符串，类似于 `${name}`
 * @param  {Object} curData    当前表达式对应的数据
 * @return {string}            计算结果
 */
function calculateExpression(expression, curData) {
    expression = expression.replace(/\$\{([^{}]+)\}/g, function () {
        if (arguments.length < 2) {
            return '';
        }
        return arguments[1];
    });

    var fnArgs = [];
    var params = [];
    for (var key in curData) {
        fnArgs.push(key);
        params.push(curData[key]);
    }
    return (new Function(fnArgs, 'return ' + expression)).apply(null, params);
}

function isEqual(a, b) {
    return a === b;
}

/**
 * 是否是注释节点
 *
 * @inner
 * @param  {Node}  node 节点
 * @return {boolean}     true 表明是注释节点
 */
function isComment(node) {
    return node.nodeType === 8;
}

/**
 * 是否是 if 指令起始节点
 *
 * @inner
 * @param  {Node}  node 节点
 * @return {boolean}     true 表明是起始节点
 */
function isIf(node) {
    return isComment(node) && /^\s*if:/.test(node.nodeValue);
}

/**
 * 是否是 if 指令的结束节点
 *
 * @inner
 * @param  {Node}  node 节点
 * @return {boolean}     true 表明是结束节点
 */
function isIfEnd(node) {
    return isComment(node) && /^\s*\/if\s*$/.test(node.nodeValue);
}

/**
 * 给元素添加类
 *
 * @inner
 * @param {Element} element 元素
 * @param {Array.<string>} klasses 类的数组
 */
function addClass(element, klasses) {
    classesManage(element, klasses, true);
}

/**
 * 移除指定的类
 *
 * @inner
 * @param {Element} element 元素
 * @param {Array.<string>} klasses 类的数组
 */
function removeClass(element, klasses) {
    classesManage(element, klasses, false);
}

function classesManage(element, klasses, newKlassesValue) {
    var previousKlasses = element.className.split(/\s+/);
    var curKlass = {};
    for (var i = 0, il = previousKlasses.length; i < il; i++) {
        curKlass[previousKlasses[i]] = true;
    }
    for (i = 0, il = klasses.length; i < il; i++) {
        curKlass[klasses[i]] = newKlassesValue;
    }

    var curKlassArr = [];
    for (var klass in curKlass) {
        if (curKlass[klass]) {
            curKlassArr.push(klass);
        }
    }
    element.className = curKlassArr.join(' ');
}

/**
 * 超级简单的 extend ，因为本库对 extend 没那高的要求，
 * 等到有要求的时候再完善。
 *
 * @inner
 * @param  {Object} target 目标对象
 * @param  {Object} src    源对象
 * @return {Object}        最终合并后的对象
 */
function extend(target, src) {
    for (var key in src) {
        target[key] = src[key];
    }
    return target;
}

