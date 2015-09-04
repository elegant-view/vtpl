// 每一条指令（ if 、 for ）都会创建一个 scope 。
// TODO: 保证每个 scope 的表达式执行顺序

function Parser(rootNode) {
    // 注意此处的 rootNode 并不一定是当前显示的 DOM 树上的根节点。
    // 因为 for 中对于每一条，都是使用的一个不存在于 DOM 树上的节点来作为 rootNode ，
    // 虽然从语义上讲不通，但是为了避免添加额外的包裹元素，这是一种行之有效的方案。
    this.rootNode = rootNode;

    var rootScope = {
        directive: undefined,
        curNode: this.rootNode
    };
    this.stack = [rootScope];
    this.updateArr = [rootScope];
}

/**
 * 单向改变数据，整个 DOM 要更新
 *
 * @public
 * @param {Object} data 数据
 */
Parser.prototype.setData = function (data) {
    checkExpressions(this.updateArr[0], data);
    for (var i = 1, il = this.updateArr.length; i < il; i++) {
        checkExpressions(this.updateArr[i], this.updateArr[i - 1].curData);
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

        // 此处对于 for 做特殊处理：
        // 如果进入了 for 循环，那么在 for 循环终止之前的所有节点，
        // 都不再归当前 parser 管了，因为 for 指令中会把这部分节点当成
        // 原始模板， for 循环出来的每一条都会是动态创建的，每一条都会新建
        // 一个小的 parser 。
        var isInFor = false;
        var children = slice(curNode.childNodes);
        for (var i = 0, il = children.length; i < il; i++) {
            var child = children[i];
            if (!child.parentNode) {
                continue;
            }

            if (!isInFor) {
                if (isIf(child)) {
                    enterIf(me, child);
                }
                else if (isIfEnd(child)) {
                    enterIfEnd(me, child);
                }
                else if (isFor(child)) {
                    isInFor = true;
                    enterFor(me, child);
                }
                else {
                    enterExpression(me, child);
                }
            }
            else if (isForEnd(child)) {
                isInFor = false;
                enterForEnd(me, child);
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
 * @param  {Parser} parser  解析器
 * @param  {Node} curNode 当前节点
 */
function enterExpression(parser, curNode) {
    var scope = parser.stack[parser.stack.length - 1];

    scope.expressionFns = scope.expressionFns || {};
    scope.updateFns = scope.updateFns || {};
    scope.nodes = scope.nodes || [];

    scope.nodes.push(curNode);

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

/**
 * if 指令开始节点
 *
 * @inner
 * @param  {Parser} parser  解析器
 * @param  {Node} curNode 当前节点
 */
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
    parser.updateArr.push(scope);

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
 * if 指令结束节点
 *
 * @inner
 * @param  {Parser} parser  解析器
 * @param  {Node} curNode 当前节点
 */
function enterIfEnd(parser, curNode) {
    var lastScope = parser.stack[parser.stack.length - 1];
    if (lastScope.directive !== 'if') {
        throw new Error('wrong `if end` directive');
    }
    parser.stack.pop();
}

/**
 * for 指令开始节点。
 * for 的语法为：
 * <!-- for: ${list} as ${item} -->
 * <!-- /for -->
 *
 * @inner
 * @param  {Parser} parser  解析器
 * @param  {Node} curNode 当前节点
 */
function enterFor(parser, curNode) {
    var forEndNode = findForEnd(curNode);
    if (!forEndNode) {
        throw new Error('the directive `for` is not correctlly closed!');
    }

    var scope = {
        directive: 'for',
        curNode: curNode
    };

    var expression = curNode.nodeValue.replace(/^\s*for:/, '');
    var listExpr = expression.match(/\$\{[^{}]+\}/)[0];
    scope.forTpl = getForTpl(curNode, forEndNode);
    scope.expressionFns = {};
    scope.expressionFns[expression] = (function (scope, expression, listExpr) {
        return function () {
            return calculateExpression(listExpr, scope.curData);
        };
    })(scope, expression, listExpr);
    scope.updateFns = {};
    scope.updateFns[expression] = [(function (scope, expression, listExpr, forTpl, forEndNode) {
        var itemParsers = [];
        var itemValueName = expression.match(/as\s+\$\{([^{}]+)\}/)[1];
        return function (expressionResult) {
            var index = 0;
            for (var key in expressionResult) {
                if (!itemParsers[index]) {
                    itemParsers[index] = createItemParser(forTpl);
                }
                else {
                    restoreParserNodes(itemParsers[index]);
                }

                var local = {index: index, key: key};
                local[itemValueName] = expressionResult[key];
                itemParsers[index].setData(extend({}, scope.curData, local));

                index++;
            }

            for (var i = index, il = itemParsers.length; i < il; i++) {
                hideParserNodes(itemParsers[i]);
            }
        };

        function createItemParser(forTpl) {
            var wrapper = document.createElement('div');
            wrapper.innerHTML = forTpl;
            var parser = new Parser(wrapper);
            parser.collectExpressions();

            var childNodes = wrapper.childNodes;
            while (childNodes.length) {
                var node = childNodes[0];
                forEndNode.parentNode.insertBefore(node, forEndNode);
            }

            return parser;
        }

        function hideParserNodes(parser) {
            for (var i = 0, il = parser.updateArr.length; i < il; i++) {
                var nodes = parser.updateArr[i].nodes;
                for (var j = 0, jl = nodes.length; j < jl; j++) {
                    var node = nodes[j];
                    var cmt = nodeGoDark(node);
                    node.cmt = cmt;
                }
            }
        }

        function restoreParserNodes(parser) {
            for (var i = 0, il = parser.updateArr.length; i < il; i++) {
                var nodes = parser.updateArr[i].nodes;
                for (var j = 0, jl = nodes.length; j < jl; j++) {
                    var node = nodes[j];
                    if (node.cmt) {
                        node.cmt.parentNode.replaceChild(node, node.cmt);
                        node.cmt = null;
                    }
                }
            }
        }
    })(scope, expression, listExpr, scope.forTpl, forEndNode)];

    parser.stack.push(scope);
    parser.updateArr.push(scope);

    function findForEnd(forStartNode) {
        var next = forStartNode;
        while ((next = next.nextSibling)) {
            if (isFor(next)) {
                return;
            }

            if (isForEnd(next)) {
                return next;
            }
        }
    }

    function getForTpl(forStartNode, forEndNode) {
        var next = forStartNode;
        var tpls = [];
        var waitForRemove = [];
        while ((next = next.nextSibling) && next !== forEndNode) {
            tpls.push(getOuterHTML(next));
            waitForRemove.push(next);
        }

        for (var i = 0, il = waitForRemove.length; i < il; i++) {
            next.parentNode.removeChild(waitForRemove[i]);
        }

        return tpls.join('');
    }
}

function enterForEnd(parser, curNode) {
    var lastScope = parser.stack[parser.stack.length - 1];
    if (lastScope.directive !== 'for') {
        throw new Error('wrong `for end` directive');
    }
    parser.stack.pop();
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

function isFor(node) {
    return isComment(node) && /^\s*for:/.test(node.nodeValue);
}

function isForEnd(node) {
    return isComment(node) && /^\s*\/for\s*/.test(node.nodeValue);
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

function getOuterHTML(el) {
    var ret;
    var wrapper;

    if (el.hasOwnProperty && el.hasOwnProperty('outerHTML')) {
        ret = el.outerHTML;
    }
    else {
        wrapper = document.createElement('div');
        wrapper.appendChild(el.cloneNode(true));
        ret = wrapper.innerHTML;
    }

    return ret;
}

function nodeGoDark(node) {
    if (!node.parentNode) {
        return;
    }

    var cmt = document.createComment('');
    node.parentNode.replaceChild(cmt, node);
    return cmt;
}

/**
 * 超级简单的 extend ，因为本库对 extend 没那高的要求，
 * 等到有要求的时候再完善。
 *
 * @inner
 * @param  {Object} target 目标对象
 * @return {Object}        最终合并后的对象
 */
function extend(target) {
    var srcs = slice(arguments, 1);
    for (var i = 0, il = srcs.length; i < il; i++) {
        for (var key in srcs[i]) {
            target[key] = srcs[i][key];
        }
    }
    return target;
}

function slice(arr, start, end) {
    return Array.prototype.slice.call(arr, start, end);
}

