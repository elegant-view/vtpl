(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
require('./src/parsers/ScopeDirectiveParser');
require('./src/parsers/ComponentParser');
require('./src/parsers/ChildrenDirectiveParser');

var amdExports = {
    Config: require('./src/Config'),
    Tree: require('./src/Tree'),
    DirtyChecker: require('./src/DirtyChecker'),
    Parser: require('./src/parsers/Parser'),
    ForDirectiveParser: require('./src/parsers/ForDirectiveParser'),
    IfDirectiveParser: require('./src/parsers/IfDirectiveParser'),
    EventExprParser: require('./src/parsers/EventExprParser'),
    ExprParser: require('./src/parsers/ExprParser'),
    ExprCalculater: require('./src/ExprCalculater'),
    VarDirectiveParser: require('./src/parsers/VarDirectiveParser'),
    inherit: require('./src/inherit'),
    utils: require('./src/utils'),
    DomUpdater: require('./src/DomUpdater'),
    ScopeModel: require('./src/ScopeModel'),
    Component: require('./src/Component'),
    ComponentManager: require('./src/ComponentManager')
};
define(function (require, exports, module) {
    module.exports = amdExports;
});

},{"./src/Component":3,"./src/ComponentManager":5,"./src/Config":7,"./src/DirtyChecker":8,"./src/DomUpdater":9,"./src/ExprCalculater":11,"./src/ScopeModel":13,"./src/Tree":14,"./src/inherit":15,"./src/parsers/ChildrenDirectiveParser":17,"./src/parsers/ComponentParser":18,"./src/parsers/EventExprParser":20,"./src/parsers/ExprParser":21,"./src/parsers/ForDirectiveParser":22,"./src/parsers/IfDirectiveParser":23,"./src/parsers/Parser":24,"./src/parsers/ScopeDirectiveParser":25,"./src/parsers/VarDirectiveParser":26,"./src/utils":27}],2:[function(require,module,exports){
var Tree = require('./Tree');
var inherit = require('./inherit');

function ChildrenTree(options) {
    if (!options.config || !options.domUpdater
        || !options.exprCalculater || !options.treeVars
    ) {
        throw new Error('wrong arguments');
    }

    options.componentChildren = undefined;
    delete options.componentChildren;

    Tree.call(this, options);
}

module.exports = inherit(ChildrenTree, Tree);

},{"./Tree":14,"./inherit":15}],3:[function(require,module,exports){
/**
 * @file 组件基类
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var log = require('./log');
var utils = require('./utils');
var ComponentTree = require('./ComponentTree');
var ComponentChildren = require('./ComponentChildren');

function Component(options) {
    this.componentNode = options.componentNode;
    this.treeOptions = options.treeOptions;
    this.outScope = options.outScope;
}

Component.prototype.tpl = '';

Component.prototype.tplUrl = '';

Component.prototype.setAttr = function (name, value) {
    this.tree.rootScope.set(name, value);
};

Component.prototype.mount = function () {
    var div = document.createElement('div');
    div.innerHTML = this.tpl;
    this.startNode = div.firstChild;
    this.endNode = div.lastChild;

    var parentNode = this.componentNode.parentNode;
    utils.traverseNoChangeNodes(this.startNode, this.endNode, function (curNode) {
        parentNode.insertBefore(curNode, this.componentNode);
    }, this);
    parentNode.removeChild(this.componentNode);

    // 组件的作用域是和外部的作用域隔开的
    this.tree = new ComponentTree(utils.extend({
        startNode: this.startNode,
        endNode: this.endNode,
        componentChildren: new ComponentChildren(
            this.componentNode.firstChild,
            this.componentNode.lastChild,
            this.outScope
        )
    }, this.treeOptions));
    this.tree.traverse();
};

Component.prototype.getTpl = function (doneFn) {
    if (this.tpl) {
        doneFn();
    }
    else if (this.tplUrl) {
        var me = this;
        utils.xhr({
            url: this.tplUrl
        }, function (data) {
            me.tpl = data.responseText;
            doneFn();
        }, function () {
            log.warn('load tpl:', me.tplUrl, 'failed!');
            doneFn();
        });
    }
};

Component.prototype.destroy = function () {

};

Component.prototype.goDark = function () {
    utils.traverseNoChangeNodes(this.startNode, this.endNode, utils.goDark, this);
};

Component.prototype.restoreFromDark = function () {
    utils.traverseNoChangeNodes(this.startNode, this.endNode, utils.restoreFromDark, this);
};

module.exports = Component;

function findChildrenNodes(startNode, endNode) {
    var childrenNodes = [];
    utils.traverseNoChangeNodes(startNode, endNode, function (curNode) {
        if (curNode.nodeType === 8 && curNode.nodeValue.replace(/\s+/g, '') === 'children') {
            childrenNodes.push(curNode);
        }
        else if (curNode.nodeType === 1 && curNode.childNodes.length) {
            Array.prototype.push.apply(childrenNodes, findChildrenNodes(curNode.firstChild, curNode.lastChild));
        }
    });
    return childrenNodes;
}


},{"./ComponentChildren":4,"./ComponentTree":6,"./log":16,"./utils":27}],4:[function(require,module,exports){
var utils = require('./utils');

function ComponentChildren(startNode, endNode, scope) {
    this.div = document.createElement('div');
    if (!startNode || !endNode) {
        this.div.innerHTML = '';
    }
    else {
        utils.traverseNodes(
            startNode,
            endNode,
            function (curNode) {
                this.div.appendChild(curNode);
            },
            this
        );
    }

    this.scope = scope;
}

ComponentChildren.prototype.getTplHtml = function () {
    return this.div.innerHTML;
};

module.exports = ComponentChildren;

},{"./utils":27}],5:[function(require,module,exports){
/**
 * @file 组件管理
 * @author yibuyisheng(yibuyisheng@163.com)
 */

function ComponentManager() {
}

var components = {};
ComponentManager.registe = function (ComponentClass) {
    components[getClassName(ComponentClass)] = ComponentClass;
};

ComponentManager.prototype.getClass = function (name) {
    return components[name];
};

module.exports = ComponentManager;

function getClassName(klass) {
    return klass.toString().match(/^function\s*(\w+?)(?=\(\w*?\))/)[1];
}

},{}],6:[function(require,module,exports){
var Tree = require('./Tree');
var inherit = require('./inherit');

function ComponentTree(options) {
    if (!options.config || !options.domUpdater
        || !options.exprCalculater || !options.treeVars
        || !options.componentChildren
    ) {
        throw new Error('wrong arguments');
    }

    Tree.call(this, options);

    this.componentChildren = options.componentChildren;
}

module.exports = inherit(ComponentTree, Tree);

},{"./Tree":14,"./inherit":15}],7:[function(require,module,exports){
/**
 * @file 配置
 * @author yibuyisheng(yibuyisheng@163.com)
 */

function Config() {
    this.exprPrefix = '${';
    this.exprSuffix = '}';

    this.ifName = 'if';
    this.elifName = 'elif';
    this.elseName = 'else';
    this.ifEndName = '/if';

    this.ifPrefixRegExp = /^\s*if:\s*/;
    this.elifPrefixRegExp = /^\s*elif:\s*/;
    this.elsePrefixRegExp = /^\s*else\s*/;
    this.ifEndPrefixRegExp = /^\s*\/if\s*/;

    this.forName = 'for';
    this.forEndName = '/for';

    this.forPrefixRegExp = /^\s*for:\s*/;
    this.forEndPrefixRegExp = /^\s*\/for\s*/;

    this.eventPrefix = 'event';

    this.varName = 'var';

    this.scopeName = 'scope';
    this.scopeEndName = '/scope';
}

Config.prototype.setExprPrefix = function (prefix) {
    this.exprPrefix = prefix;
};

Config.prototype.setExprSuffix = function (suffix) {
    this.exprSuffix = suffix;
};

Config.prototype.getExprRegExp = function () {
    if (!this.exprRegExp) {
        this.exprRegExp = new RegExp(regExpEncode(this.exprPrefix) + '(.+?)' + regExpEncode(this.exprSuffix), 'g');
    }
    this.exprRegExp.lastIndex = 0;
    return this.exprRegExp;
};

Config.prototype.getAllIfRegExp = function () {
    if (!this.allIfRegExp) {
        this.allIfRegExp = new RegExp('\\s*('
            + this.ifName + '|'
            + this.elifName + '|'
            + this.elseName + '|'
            + this.ifEndName + '):\\s*', 'g');
    }
    this.allIfRegExp.lastIndex = 0;
    return this.allIfRegExp;
};

Config.prototype.setIfName = function (ifName) {
    this.ifName = ifName;
    this.ifPrefixRegExp = new RegExp('^\\s*' + ifName + ':\\s*');
};

Config.prototype.setElifName = function (elifName) {
    this.elifName = elifName;
    this.elifPrefixRegExp = new RegExp('^\\s*' + elifName + ':\\s*');
};

Config.prototype.setElseName = function (elseName) {
    this.elseName = elseName;
    this.elsePrefixRegExp = new RegExp('^\\s*' + elseName + '\\s*');
};

Config.prototype.setIfEndName = function (ifEndName) {
    this.ifEndName = ifEndName;
    this.ifEndPrefixRegExp = new RegExp('^\\s*' + ifEndName + '\\s*');
};

Config.prototype.setForName = function (forName) {
    this.forName = forName;
    this.forPrefixRegExp = new RegExp('^\\s*' + forName + ':\\s*');
};

Config.prototype.setForEndName = function (forEndName) {
    this.forEndName = forEndName;
    this.forEndPrefixRegExp = new RegExp('^\\s*' + forEndName + '\\s*');
};

Config.prototype.getForExprsRegExp = function () {
    if (!this.forExprsRegExp) {
        this.forExprsRegExp = new RegExp('\\s*'
            + this.forName
            + ':\\s*'
            + regExpEncode(this.exprPrefix)
            + '([^' + regExpEncode(this.exprSuffix)
            + ']+)' + regExpEncode(this.exprSuffix));
    }
    this.forExprsRegExp.lastIndex = 0;
    return this.forExprsRegExp;
};

Config.prototype.getForItemValueNameRegExp = function () {
    if (!this.forItemValueNameRegExp) {
        this.forItemValueNameRegExp = new RegExp(
            'as\\s*' + regExpEncode(this.exprPrefix)
            + '([^' + regExpEncode(this.exprSuffix) + ']+)'
            + regExpEncode(this.exprSuffix)
        );
    }
    this.forItemValueNameRegExp.lastIndex = 0;
    return this.forItemValueNameRegExp;
};

Config.prototype.setEventPrefix = function (prefix) {
    this.eventPrefix = prefix;
};

Config.prototype.setVarName = function (name) {
    this.varName = name;
};

module.exports = Config;

function regExpEncode(str) {
    return '\\' + str.split('').join('\\');
}

},{}],8:[function(require,module,exports){
/**
 * @file 脏检测器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

function DirtyChecker() {
    this.checkers = {};
}

DirtyChecker.prototype.setChecker = function (expr, checkerFn) {
    this.checkers[expr] = checkerFn;
};

DirtyChecker.prototype.getChecker = function (expr) {
    return this.checkers[expr];
};

DirtyChecker.prototype.destroy = function () {
    this.checkers = null;
};

module.exports = DirtyChecker;

},{}],9:[function(require,module,exports){
/**
 * @file DOM 更新器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var utils = require('./utils');
var log = require('./log');

function DomUpdater() {
    this.tasks = {};
    this.isExecuting = false;
    this.doneFns = [];
}

var counter = 0;
DomUpdater.prototype.generateTaskId = function () {
    return counter++;
};

DomUpdater.prototype.addTaskFn = function (taskId, taskFn) {
    this.tasks[taskId] = taskFn;
};

DomUpdater.prototype.destroy = function () {
    this.tasks = null;
};

DomUpdater.prototype.execute = function (doneFn) {
    if (utils.isFunction(doneFn)) {
        this.doneFns.push(doneFn);
    }

    var me = this;
    if (!this.isExecuting) {
        this.isExecuting = true;
        requestAnimationFrame(function () {
            utils.each(me.tasks, function (taskFn) {
                try {
                    taskFn();
                }
                catch (e) {
                    log.warn(e);
                }
            });
            me.tasks = {};

            setTimeout(utils.bind(function (doneFns) {
                utils.each(doneFns, function (doneFn) {
                    doneFn();
                });
            }, null, me.doneFns));
            me.doneFns = [];

            me.isExecuting = false;
        });
    }
};

module.exports = DomUpdater;

},{"./log":16,"./utils":27}],10:[function(require,module,exports){
var utils = require('./utils');

function Event() {
    this.evnts = {};
}

Event.prototype.on = function (eventName, fn, context) {
    if (!utils.isFunction(fn)) {
        return;
    }

    this.evnts[eventName] = this.evnts[eventName] || [];

    this.evnts[eventName].push({
        fn: fn,
        context: context
    });
};

Event.prototype.trigger = function (eventName) {
    var fnObjs = this.evnts[eventName];
    if (fnObjs && fnObjs.length) {
        var args = utils.slice(arguments, 1);
        utils.each(fnObjs, function (fnObj) {
            fnObj.fn.apply(fnObj.context, args);
        });
    }
};

Event.prototype.off = function (eventName, fn) {
    if (!fn) {
        this.evnts[eventName] = null;
        return;
    }

    var fnObjs = this.evnts[eventName];
    if (fnObjs && fnObjs.length) {
        var newFnObjs = [];
        utils.each(fnObjs, function (fnObj) {
            if (fn !== fnObj.fn) {
                newFnObjs.push(fnObj);
            }
        });
        this.evnts[eventName] = newFnObjs;
    }
};

module.exports = Event;

},{"./utils":27}],11:[function(require,module,exports){
var utils = require('./utils');

function ExprCalculater() {
    this.fns = {};

    this.exprNameMap = {};
    this.exprNameRegExp = /\.?\$?([a-z|A-Z]+|([a-z|A-Z]+[0-9]+[a-z|A-Z]*))/g;
}

ExprCalculater.prototype.createExprFn = function (expr, avoidReturn) {
    avoidReturn = !!avoidReturn;
    this.fns[expr] = this.fns[expr] || {};
    if (this.fns[expr][avoidReturn]) {
        return;
    }

    var params = getVariableNamesFromExpr(this, expr);
    var fn = new Function(params, (avoidReturn ? '' : 'return ') + expr);

    this.fns[expr][avoidReturn] = {
        paramNames: params,
        fn: fn
    };
};

ExprCalculater.prototype.calculate = function (expr, avoidReturn, scopeModel) {
    var fnObj = this.fns[expr][avoidReturn];
    if (!fnObj) {
        throw new Error('no such expression function created!');
    }

    var fnArgs = [];
    for (var i = 0, il = fnObj.paramNames.length; i < il; i++) {
        var param = fnObj.paramNames[i];
        var value = scopeModel.get(param);
        fnArgs.push(value === undefined ? '' : value);
    }

    var result;
    try {
        result = fnObj.fn.apply(null, fnArgs);
    }
    catch (e) {
        result = '';
    }
    return result;
};

ExprCalculater.prototype.destroy = function () {
    this.fns = null;
    this.exprNameMap = null;
    this.exprNameRegExp = null;
};

module.exports = ExprCalculater;

/**
 * 从表达式中抽离出变量名
 *
 * @inner
 * @param {ExprCalculater} me 对应实例
 * @param  {string} expr 表达式字符串，类似于 `${name}` 中的 name
 * @return {Array.<string>}      变量名数组
 */
function getVariableNamesFromExpr(me, expr) {
    if (me.exprNameMap[expr]) {
        return me.exprNameMap[expr];
    }

    var reg = /[\$|_|a-z|A-Z]{1}(?:[a-z|A-Z|0-9|\$|_]*)/g;

    for (var names = {}, name = reg.exec(expr); name; name = reg.exec(expr)) {
        var restStr = expr.slice(name.index + name[0].length);

        // 是左值
        if (/^\s*=(?!=)/.test(restStr)) {
            continue;
        }

        // 变量名前面是否存在 `.` ，或者变量名是否位于引号内部
        if (name.index
            && (expr[name.index - 1] === '.'
                || isInQuote(
                        expr.slice(0, name.index),
                        restStr
                   )
            )
        ) {
            continue;
        }

        names[name[0]] = true;
    }

    var ret = [];
    utils.each(names, function (isOk, name) {
        if (isOk) {
            ret.push(name);
        }
    });
    me.exprNameMap[expr] = ret;

    return ret;

    function isInQuote(preStr, restStr) {
        if ((preStr.lastIndexOf('\'') + 1 && restStr.indexOf('\'') + 1)
            || (preStr.lastIndexOf('"') + 1 && restStr.indexOf('"') + 1)
        ) {
            return true;
        }
    }
}

},{"./utils":27}],12:[function(require,module,exports){
var Tree = require('./Tree');
var inherit = require('./inherit');

function ForTree(options) {
    if (!options.config || !options.domUpdater
        || !options.exprCalculater || !options.treeVars
    ) {
        throw new Error('wrong arguments');
    }

    Tree.call(this, options);

    this.componentChildren = options.componentChildren;
}

module.exports = inherit(ForTree, Tree);

},{"./Tree":14,"./inherit":15}],13:[function(require,module,exports){
var utils = require('./utils');
var Event = require('./Event');
var inherit = require('./inherit');

function ScopeModel() {
    Event.call(this);

    this.store = {};
    this.parent;
    this.children = [];
}

ScopeModel.prototype.setParent = function (parent) {
    this.parent = parent;
};

ScopeModel.prototype.addChild = function (child) {
    this.children.push(child);
};

ScopeModel.prototype.set = function (name, value) {
    if (utils.isClass(name, 'String')) {
        this.store[name] = value;
        change(this);
    }
    else if (utils.isClass(name, 'Object')) {
        utils.extend(this.store, name);
        change(this);
    }
};

ScopeModel.prototype.get = function (name) {
    if (arguments.length > 1 || name === undefined) {
        return this.store;
    }

    if (name in this.store) {
        return this.store[name];
    }

    if (this.parent) {
        return this.parent.get(name);
    }
};

module.exports = inherit(ScopeModel, Event);

function change(me) {
    me.trigger('change', me);
    utils.each(me.children, function (scope) {
        scope.trigger('parentchange', me);
    });
}

},{"./Event":10,"./inherit":15,"./utils":27}],14:[function(require,module,exports){
/**
 * @file 最终的树
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var utils = require('./utils');
var ExprCalculater = require('./ExprCalculater');
var DomUpdater = require('./DomUpdater');
var ScopeModel = require('./ScopeModel');

function Tree(options) {
    this.startNode = options.startNode;
    this.endNode = options.endNode;
    this.config = options.config;

    this.exprCalculater = options.exprCalculater || new ExprCalculater();
    this.domUpdater = options.domUpdater || new DomUpdater();

    this.tree = [];
    this.treeVars = options.treeVars || {};

    this.rootScope = new ScopeModel();
}

Tree.prototype.setTreeVar = function (name, value) {
    if (this.treeVars[name] !== undefined) {
        return false;
    }
    this.treeVars[name] = value;
    return true;
};

Tree.prototype.unsetTreeVar = function (name) {
    this.treeVars[name] = undefined;
};

Tree.prototype.getTreeVar = function (name) {
    return this.treeVars[name];
};

Tree.prototype.getScopeByName = function (name) {
    var scopes = this.getTreeVar('scopes');
    if (!scopes) {
        return;
    }
    return scopes[name];
};

Tree.prototype.traverse = function () {
    walkDom(this, this.startNode, this.endNode, this.tree, this.rootScope);
};

Tree.prototype.setData = function (data) {
    data = data || {};
    this.rootScope.set(data);
};

Tree.prototype.goDark = function () {
    utils.traverseNoChangeNodes(this.startNode, this.endNode, function (curNode) {
        if (curNode.nodeType === 1 || curNode.nodeType === 3) {
            utils.goDark(curNode);
        }
    }, this);
};

Tree.prototype.restoreFromDark = function () {
    utils.traverseNoChangeNodes(this.startNode, this.endNode, function (curNode) {
        if (curNode.nodeType === 1 || curNode.nodeType === 3) {
            utils.restoreFromDark(curNode);
        }
    }, this);
};

Tree.prototype.setDirtyChecker = function (dirtyChecker) {
    this.dirtyChecker = dirtyChecker;
};

var ParserClasses = [];

/**
 * 注册一下解析器类。
 *
 * @param  {Constructor} ParserClass 解析器类
 */
Tree.registeParser = function (ParserClass) {
    var isExitsChildClass = false;
    utils.each(ParserClasses, function (PC, index) {
        if (utils.isSubClassOf(PC, ParserClass)) {
            isExitsChildClass = true;
        }
        else if (utils.isSubClassOf(ParserClass, PC)) {
            ParserClasses[index] = ParserClass;
            isExitsChildClass = true;
        }

        return isExitsChildClass;
    });

    if (!isExitsChildClass) {
        ParserClasses.push(ParserClass);
    }
};

Tree.prototype.destroy = function () {
    walk(this.tree);

    this.startNode = null;
    this.endNode = null;
    this.config = null;

    this.exprCalculater.destroy();
    this.exprCalculater = null;

    this.domUpdater.destroy();
    this.domUpdater = null;

    this.tree = null;
    this.treeVars = null;

    if (this.dirtyChecker) {
        this.dirtyChecker.destroy();
        this.dirtyChecker = null;
    }

    function walk(parserObjs) {
        utils.each(parserObjs, function (curParserObj) {
            curParserObj.parser.destroy();

            if (curParserObj.children && curParserObj.children.length) {
                walk(curParserObj.children);
            }
        });
    }
};

module.exports = Tree;

function walkDom(tree, startNode, endNode, container, scopeModel) {
    if (startNode === endNode) {
        add(startNode);
        return;
    }

    for (var curNode = startNode; curNode;) {
        curNode = add(curNode);
    }

    function add(curNode) {
        var options = {
            startNode: curNode,
            node: curNode,
            config: tree.config,
            exprCalculater: tree.exprCalculater,
            domUpdater: tree.domUpdater,
            tree: tree
        };

        var parserObj;

        utils.each(ParserClasses, function (ParserClass) {
            parserObj = createParser(ParserClass, options);
            if (!parserObj || !parserObj.parser) {
                return;
            }

            parserObj.parser.setScope(scopeModel);

            if (utils.isArray(parserObj.collectResult)) {
                var branches = parserObj.collectResult;
                container.push({parser: parserObj.parser, children: branches});
                utils.each(branches, function (branch, i) {
                    if (!branch.startNode || !branch.endNode) {
                        return;
                    }

                    var con = [];
                    walkDom(tree, branch.startNode, branch.endNode, con, parserObj.parser.getScope());
                    branches[i] = con;
                }, this);

                if (parserObj.endNode !== endNode) {
                    curNode = parserObj.endNode.nextSibling;
                }
                else {
                    curNode = null;
                }
            }
            else {
                var con = [];
                container.push({parser: parserObj.parser, children: con});
                if (curNode.nodeType === 1 && curNode.childNodes.length) {
                    walkDom(tree, curNode.firstChild, curNode.lastChild, con, parserObj.parser.getScope());
                }

                if (curNode !== endNode) {
                    curNode = curNode.nextSibling;
                }
                else {
                    curNode = null;
                }
            }

            return true;
        }, this);

        if (!parserObj) {
            curNode = curNode.nextSibling;
        }

        return curNode;
    }
}

/**
 * 创建解析器实例，其返回值的结构为：
 * {
 *     parser: ...,
 *     collectResult: ...
 * }
 *
 * 返回值存在如下几种情况：
 *
 * 1、如果 parser 属性存在且 collectResult 为 true ，则说明当前解析器解析了所有相应的节点（包括起止节点间的节点、当前节点和子孙节点）；
 * 2、直接返回假值或者 parser 不存在，说明没有处理任何节点，当前节点不属于当前解析器处理；
 * 3、parser 存在且 collectResult 为数组，结构如下：
 *     [
 *         {
 *             startNode: Node.<...>,
 *             endNode: Node.<...>
 *         }
 *     ]
 *
 *  则说明当前是带有很多分支的节点，要依次解析数组中每个元素指定的节点范围。
 *  而且，该解析器对应的 setData() 方法将会返回整数，指明使用哪一个分支的节点。
 *
 * @inner
 * @param {Constructor} ParserClass parser 类
 * @param  {Object} options 初始化参数
 * @return {Object}         返回值
 */
function createParser(ParserClass, options) {
    var startNode = options.startNode || options.node;
    if (!ParserClass.isProperNode(startNode, options.config)) {
        return;
    }

    var endNode;
    if (ParserClass.findEndNode) {
        endNode = ParserClass.findEndNode(startNode, options.config);

        if (!endNode) {
            throw ParserClass.getNoEndNodeError();
        }
        else if (endNode.parentNode !== startNode.parentNode) {
            throw new Error('the relationship between start node and end node is not brotherhood!');
        }
    }

    var parser = new ParserClass(utils.extend(options, {
        endNode: endNode
    }));

    return {
        parser: parser,
        collectResult: parser.collectExprs(),
        endNode: endNode || options.node
    };
}




},{"./DomUpdater":9,"./ExprCalculater":11,"./ScopeModel":13,"./utils":27}],15:[function(require,module,exports){
/**
 * @file 继承
 * @author yibuyisheng(yibuyisheng@163.com)
 */

function inherit(ChildClass, ParentClass) {
    function Cls() {}

    Cls.prototype = ParentClass.prototype;
    var childProto = ChildClass.prototype;
    ChildClass.prototype = new Cls();

    var key;
    for (key in childProto) {
        ChildClass.prototype[key] = childProto[key];
    }

    // 继承静态属性
    for (key in ParentClass) {
        if (ParentClass.hasOwnProperty(key)) {
            if (ChildClass[key] === undefined) {
                ChildClass[key] = ParentClass[key];
            }
        }
    }

    return ChildClass;
}

module.exports = inherit;

},{}],16:[function(require,module,exports){
module.exports = {
    warn: function () {
        if (!console || !console.warn) {
            return;
        }

        console.warn.apply(console, arguments);
    }
};
},{}],17:[function(require,module,exports){
/**
 * @file children 指令 <!-- children -->
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var inherit = require('../inherit');
var DirectiveParser = require('./DirectiveParser');
var utils = require('../utils');
var ChildrenTree = require('../ChildrenTree');

function ChildrenDirectiveParser(options) {
    DirectiveParser.call(this, options);
}

ChildrenDirectiveParser.prototype.initialize = function (options) {
    DirectiveParser.prototype.initialize.apply(this, arguments);

    this.node = options.node;
};

ChildrenDirectiveParser.prototype.collectExprs = function () {
    var componentChildren = this.tree.componentChildren;
    if (!componentChildren) {
        return;
    }

    var div = document.createElement('div');
    div.innerHTML = componentChildren.getTplHtml();

    this.childrenTree = new ChildrenTree({
        startNode: div.firstChild,
        endNode: div.lastChild,
        config: this.tree.config,
        domUpdater: this.tree.domUpdater,
        exprCalculater: this.tree.exprCalculater,
        treeVars: this.tree.treeVars
    });
    this.childrenTree.traverse();

    this.childrenTree.rootScope.setParent(componentChildren.scope);
    componentChildren.scope.addChild(this.childrenTree.rootScope);

    while (div.childNodes.length) {
        this.node.parentNode.insertBefore(div.childNodes[0], this.node);
    }

    return true;
};

ChildrenDirectiveParser.prototype.destroy = function () {
    this.childrenTree.destroy();

    DirectiveParser.prototype.destroy.call(this);
};

ChildrenDirectiveParser.isProperNode = function (node, config) {
    return node.nodeType === 8
        && node.nodeValue.replace(/\s/g, '') === 'children';
};

module.exports = inherit(ChildrenDirectiveParser, DirectiveParser);
ChildrenTree.registeParser(module.exports);

},{"../ChildrenTree":2,"../inherit":15,"../utils":27,"./DirectiveParser":19}],18:[function(require,module,exports){
/**
 * @file 组件解析器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var inherit = require('../inherit');
var Parser = require('./Parser');
var Tree = require('../Tree');
var ComponentManager = require('../ComponentManager');
var utils = require('../utils');

function ComponentParser(options) {
    Parser.call(this, options);
}

ComponentParser.prototype.initialize = function (options) {
    Parser.prototype.initialize.apply(this, arguments);

    var componentManager = this.tree.getTreeVar('componentManager');
    if (!componentManager) {
        componentManager = new ComponentManager();
        this.tree.setTreeVar('componentManager', componentManager);
    }

    this.node = options.node;

    this.exprs = [];
    this.exprFns = {};
    this.updateFns = {};
    this.exprOldValues = {};
};

ComponentParser.prototype.collectExprs = function () {
    var curNode = this.node;

    var attributes = curNode.attributes;
    this.setLiteralAttrsFns = [];
    for (var i = 0, il = attributes.length; i < il; i++) {
        var attr = attributes[i];
        var expr = attr.nodeValue;
        if (this.config.getExprRegExp().test(expr)) {
            this.exprs.push(expr);
            if (!this.exprFns[expr]) {
                var rawExpr = expr.replace(this.config.getExprRegExp(), function () {
                    return arguments[1];
                });
                this.exprCalculater.createExprFn(rawExpr);
                this.exprFns[expr] = utils.bind(function (rawExpr, exprCalculater, scopeModel) {
                    return exprCalculater.calculate(rawExpr, false, scopeModel);
                }, null, rawExpr, this.exprCalculater);

                this.updateFns[expr] = this.updateFns[expr] || [];
                this.updateFns[expr].push(utils.bind(function (name, exprValue, component) {
                    component.setAttr(name, exprValue);
                }, null, attr.nodeName));
            }
        }
        else {
            this.setLiteralAttrsFns.push(utils.bind(function (attr, component) {
                component.setAttr(attr.nodeName, attr.nodeValue);
            }, null, attr));
        }
    }
    return true;
};

ComponentParser.prototype.setScope = function (scopeModel) {
    Parser.prototype.setScope.apply(this, arguments);

    var componentName = this.node.tagName.toLowerCase().replace('ui', '')
        .replace(/-[a-z]/g, function () {
            return arguments[0][1].toUpperCase();
        });

    var componentManager = this.tree.getTreeVar('componentManager');
    var ComponentClass = componentManager.getClass(componentName);
    if (!ComponentClass) {
        throw new Error('the component `' + componentName + '` is not registed!');
    }

    this.component = new ComponentClass({
        componentNode: this.node,
        treeOptions: {
            exprCalculater: this.tree.exprCalculater,
            domUpdater: this.tree.domUpdater,
            config: this.tree.config,
            treeVars: this.tree.treeVars
        },
        outScope: this.scopeModel
    });

    for (var i = 0, il = this.setLiteralAttrsFns.length; i < il; i++) {
        this.setLiteralAttrsFns[i](this.component);
    }

    var me = this;
    this.component.getTpl(function () {
        me.component.mount();
    });
};

ComponentParser.prototype.onChange = function () {
    if (this.isGoDark) {
        return;
    }

    var exprs = this.exprs;
    var exprOldValues = this.exprOldValues;
    for (var i = 0, il = exprs.length; i < il; i++) {
        var expr = exprs[i];
        var exprValue = this.exprFns[expr](this.scopeModel);

        if (this.dirtyCheck(expr, exprValue, exprOldValues[expr])) {
            var updateFns = this.updateFns[expr];
            for (var j = 0, jl = updateFns.length; j < jl; j++) {
                updateFns[j](exprValue, this.component);
            }
        }

        exprOldValues[expr] = exprValue;
    }

    Parser.prototype.onChange.apply(this, arguments);
};

ComponentParser.prototype.goDark = function () {
    this.component.goDark();
    this.isGoDark = true;
};

ComponentParser.prototype.restoreFromDark = function () {
    this.component.restoreFromDark();
    this.isGoDark = false;
};

ComponentParser.isProperNode = function (node, config) {
    return node.nodeType === 1 && node.tagName.toLowerCase().indexOf('ui-') === 0;
};

module.exports = inherit(ComponentParser, Parser);
Tree.registeParser(ComponentParser);

function getClass(instance) {
    return instance.constructor;
}

},{"../ComponentManager":5,"../Tree":14,"../inherit":15,"../utils":27,"./Parser":24}],19:[function(require,module,exports){
/**
 * @file 指令解析器抽象类。指令节点一定是注释节点
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var inherit = require('../inherit');
var Parser = require('./Parser');

function DirectiveParser(options) {
    Parser.call(this, options);
}

DirectiveParser.isProperNode = function (node, config) {
    return node.nodeType === 8;
};

module.exports = inherit(DirectiveParser, Parser);

},{"../inherit":15,"./Parser":24}],20:[function(require,module,exports){
/**
 * @file 处理了事件的 ExprParser
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var ExprParser = require('./ExprParser');
var inherit = require('../inherit');
var utils = require('../utils');
var Tree = require('../Tree');
var ScopeModel = require('../ScopeModel');

function EventExprParser(options) {
    ExprParser.call(this, options);
}

EventExprParser.prototype.initialize = function (options) {
    ExprParser.prototype.initialize.apply(this, arguments);

    this.events = {};
};

EventExprParser.prototype.addExpr = function (attr) {
    if (!attr) {
        return ExprParser.prototype.addExpr.apply(this, arguments);
    }

    var eventName = getEventName(attr.name, this.config);
    if (eventName) {
        if (this.config.getExprRegExp().test(attr.value)) {
            this.events[eventName] = attr.value;

            var expr = attr.value.replace(
                this.config.getExprRegExp(),
                function () {
                    return arguments[1];
                }
            );
            this.exprCalculater.createExprFn(expr, true);

            var me = this;
            this.node['on' + eventName] = function (event) {
                var localScope = new ScopeModel();
                localScope.setParent(me.getScope());
                me.exprCalculater.calculate(expr, true, localScope);
            };
        }
    }
    else {
        ExprParser.prototype.addExpr.apply(this, arguments);
    }
};

EventExprParser.prototype.destroy = function () {
    utils.each(this.events, function (attrValue, eventName) {
        this.node['on' + eventName] = null;
    }, this);
    this.events = null;

    ExprParser.prototype.destroy.call(this);
};

module.exports = inherit(EventExprParser, ExprParser);
Tree.registeParser(module.exports);


function getEventName(attrName, config) {
    if (attrName.indexOf(config.eventPrefix + '-') === -1) {
        return;
    }

    return attrName.replace(config.eventPrefix + '-', '');
}


},{"../ScopeModel":13,"../Tree":14,"../inherit":15,"../utils":27,"./ExprParser":21}],21:[function(require,module,exports){
/**
 * @file 表达式解析器，一个文本节点或者元素节点对应一个表达式解析器实例
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var Parser = require('./Parser');
var inherit = require('../inherit');
var utils = require('../utils');
var Tree = require('../Tree');

function ExprParser(options) {
    Parser.call(this, options);
}

ExprParser.prototype.initialize = function (options) {
    Parser.prototype.initialize.apply(this, arguments);

    this.node = options.node;

    this.exprs = [];
    this.exprFns = {};
    this.updateFns = {};
    this.restoreFns = {}; // 恢复原貌的函数
    this.exprOldValues = {};
};

/**
 * 搜集过程
 *
 * @public
 * @return {boolean} 返回布尔值
 */
ExprParser.prototype.collectExprs = function () {
    var curNode = this.node;

    // 文本节点
    if (curNode.nodeType === 3) {
        this.addExpr();
        return true;
    }

    // 元素节点
    if (curNode.nodeType === 1) {
        var attributes = curNode.attributes;
        for (var i = 0, il = attributes.length; i < il; i++) {
            this.addExpr(attributes[i]);
        }
        return true;
    }

    return false;
};

/**
 * 添加表达式
 *
 * @protected
 * @param {Attr} attr 如果当前是元素节点，则要传入遍历到的属性
 */
ExprParser.prototype.addExpr = function (attr) {
    var expr = attr ? attr.value : this.node.nodeValue;
    if (!this.config.getExprRegExp().test(expr)) {
        return;
    }
    addExpr(
        this,
        expr,
        attr ? createAttrUpdateFn(attr, this.domUpdater) : (function (me, curNode) {
            var taskId = me.domUpdater.generateTaskId();
            return function (exprValue) {
                me.domUpdater.addTaskFn(
                    taskId,
                    utils.bind(function (curNode, exprValue) {
                        curNode.nodeValue = exprValue;
                    }, null, curNode, exprValue)
                );
            };
        })(this, this.node)
    );

    this.restoreFns[expr] = this.restoreFns[expr] || [];
    if (attr) {
        this.restoreFns[expr].push(utils.bind(function (curNode, attrName, attrValue) {
            curNode.setAttribute(attrName, attrValue);
        }, null, this.node, attr.name, attr.value));
    }
    else {
        this.restoreFns[expr].push(utils.bind(function (curNode, nodeValue) {
            curNode.nodeValue = nodeValue;
        }, null, this.node, this.node.nodeValue));
    }
};

ExprParser.prototype.destroy = function () {
    utils.each(this.exprs, function (expr) {
        utils.each(this.restoreFns[expr], function (restoreFn) {
            restoreFn();
        }, this);
    }, this);

    this.node = null;
    this.exprs = null;
    this.exprFns = null;
    this.updateFns = null;
    this.exprOldValues = null;
    this.restoreFns = null;

    Parser.prototype.destroy.call(this);
};

/**
 * 节点“隐藏”起来
 *
 * @public
 */
ExprParser.prototype.goDark = function () {
    utils.goDark(this.node);
    this.isGoDark = true;
};

ExprParser.prototype.onChange = function () {
    if (this.isGoDark) {
        return;
    }

    var exprs = this.exprs;
    var exprOldValues = this.exprOldValues;
    for (var i = 0, il = exprs.length; i < il; i++) {
        var expr = exprs[i];
        var exprValue = this.exprFns[expr](this.scopeModel);

        if (this.dirtyCheck(expr, exprValue, exprOldValues[expr])) {
            var updateFns = this.updateFns[expr];
            for (var j = 0, jl = updateFns.length; j < jl; j++) {
                updateFns[j](exprValue);
            }
        }

        exprOldValues[expr] = exprValue;
    }

    Parser.prototype.onChange.apply(this, arguments);
};

/**
 * 节点“显示”出来
 *
 * @public
 */
ExprParser.prototype.restoreFromDark = function () {
    utils.restoreFromDark(this.node);
    this.isGoDark = false;
};

ExprParser.isProperNode = function (node) {
    return node.nodeType === 1 || node.nodeType === 3;
};

module.exports = inherit(ExprParser, Parser);
Tree.registeParser(module.exports);

function createAttrUpdateFn(attr, domUpdater) {
    var taskId = domUpdater.generateTaskId();
    return function (exprValue) {
        domUpdater.addTaskFn(
            taskId,
            utils.bind(function (attr, exprValue) {
                attr.value = exprValue;
            }, null, attr, exprValue)
        );
    };
}

function addExpr(parser, expr, updateFn) {
    parser.exprs.push(expr);
    if (!parser.exprFns[expr]) {
        parser.exprFns[expr] = createExprFn(parser, expr);
    }
    parser.updateFns[expr] = parser.updateFns[expr] || [];
    parser.updateFns[expr].push(updateFn);
}

function createExprFn(parser, expr) {
    return function (scopeModel) {
        return expr.replace(parser.config.getExprRegExp(), function () {
            parser.exprCalculater.createExprFn(arguments[1]);
            return parser.exprCalculater.calculate(arguments[1], false, scopeModel);
        });
    };
}

},{"../Tree":14,"../inherit":15,"../utils":27,"./Parser":24}],22:[function(require,module,exports){
/**
 * @file for 指令
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var inherit = require('../inherit');
var DirectiveParser = require('./DirectiveParser');
var utils = require('../utils');
var ForTree = require('../ForTree');

function ForDirectiveParser(options) {
    DirectiveParser.call(this, options);
}

ForDirectiveParser.prototype.initialize = function (options) {
    DirectiveParser.prototype.initialize.apply(this, arguments);

    this.startNode = options.startNode;
    this.endNode = options.endNode;
};

ForDirectiveParser.prototype.collectExprs = function () {
    if (this.startNode.nextSibling === this.endNode) {
        return;
    }

    var tplSeg = document.createElement('div');
    utils.traverseNodes(this.startNode, this.endNode, function (curNode) {
        if (curNode === this.startNode || curNode === this.endNode) {
            return;
        }

        tplSeg.appendChild(curNode);
    }, this);
    this.tplSeg = tplSeg;

    this.expr = this.startNode.nodeValue.match(this.config.getForExprsRegExp())[1];
    this.exprFn = utils.createExprFn(this.config.getExprRegExp(), this.expr, this.exprCalculater);
    this.updateFn = createUpdateFn(
        this,
        this.startNode.nextSibling,
        this.endNode.previousSibling,
        this.config,
        this.startNode.nodeValue
    );

    return true;
};

ForDirectiveParser.prototype.onChange = function () {
    if (!this.expr) {
        return;
    }

    var exprValue = this.exprFn(this.scopeModel);
    if (this.dirtyCheck(this.expr, exprValue, this.exprOldValue)) {
        this.updateFn(exprValue, this.scopeModel);
    }

    this.exprOldValue = exprValue;

    DirectiveParser.prototype.onChange.apply(this, arguments);
};

ForDirectiveParser.prototype.destroy = function () {
    utils.traverseNodes(this.tplSeg.firstChild, this.tplSeg.lastChild, function (curNode) {
        this.endNode.parentNode.insertBefore(curNode, this.endNode);
    }, this);

    utils.each(this.trees, function (tree) {
        tree.destroy();
    });

    this.tplSeg = null;
    this.expr = null;
    this.exprFn = null;
    this.updateFn = null;
    this.startNode = null;
    this.endNode = null;
    DirectiveParser.prototype.destroy.call(this);
};

ForDirectiveParser.isProperNode = function (node, config) {
    return DirectiveParser.isProperNode(node, config)
        && config.forPrefixRegExp.test(node.nodeValue);
};

ForDirectiveParser.findEndNode = function (forStartNode, config) {
    var curNode = forStartNode;
    while ((curNode = curNode.nextSibling)) {
        if (isForEndNode(curNode, config)) {
            return curNode;
        }
    }
};

ForDirectiveParser.getNoEndNodeError = function () {
    return new Error('the for directive is not properly ended!');
};

module.exports = inherit(ForDirectiveParser, DirectiveParser);
ForTree.registeParser(module.exports);

function isForEndNode(node, config) {
    return node.nodeType === 8 && config.forEndPrefixRegExp.test(node.nodeValue);
}

function createUpdateFn(parser, startNode, endNode, config, fullExpr) {
    var trees = [];
    parser.trees = trees;
    var itemVariableName = fullExpr.match(parser.config.getForItemValueNameRegExp())[1];
    var taskId = parser.domUpdater.generateTaskId();
    return function (exprValue, scopeModel) {
        var index = 0;
        for (var k in exprValue) {
            if (!trees[index]) {
                trees[index] = createTree(parser, config);
            }

            trees[index].restoreFromDark();
            trees[index].setDirtyChecker(parser.dirtyChecker);

            var local = {
                key: k,
                index: index
            };
            local[itemVariableName] = exprValue[k];

            trees[index].rootScope.setParent(scopeModel);
            scopeModel.addChild(trees[index].rootScope);

            trees[index].setData(local);

            index++;
        }

        parser.domUpdater.addTaskFn(taskId, utils.bind(function (trees, index) {
            for (var i = index, il = trees.length; i < il; i++) {
                trees[i].goDark();
            }
        }, null, trees, index));
    };
}

function createTree(parser, config) {
    var copySeg = parser.tplSeg.cloneNode(true);
    var startNode = copySeg.firstChild;
    var endNode = copySeg.lastChild;
    utils.traverseNodes(startNode, endNode, function (curNode) {
        parser.endNode.parentNode.insertBefore(curNode, parser.endNode);
    });

    var tree = new ForTree({
        startNode: startNode,
        endNode: endNode,
        config: config,
        domUpdater: parser.tree.domUpdater,
        exprCalculater: parser.tree.exprCalculater,
        treeVars: parser.tree.treeVars,
        componentChildren: parser.tree.componentChildren
    });
    tree.traverse();
    return tree;
}

},{"../ForTree":12,"../inherit":15,"../utils":27,"./DirectiveParser":19}],23:[function(require,module,exports){
/**
 * @file if 指令
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var DirectiveParser = require('./DirectiveParser');
var inherit = require('../inherit');
var utils = require('../utils');
var Tree = require('../Tree');

function IfDirectiveParser(options) {
    DirectiveParser.call(this, options);
}

IfDirectiveParser.prototype.initialize = function (options) {
    DirectiveParser.prototype.initialize.apply(this, arguments);

    this.startNode = options.startNode;
    this.endNode = options.endNode;
    this.config = options.config;

    this.exprs = [];
    this.exprFns = {};

    this.handleBranchesTaskId = this.domUpdater.generateTaskId();
};

IfDirectiveParser.prototype.collectExprs = function () {
    var branches = [];
    var branchIndex = -1;

    utils.traverseNodes(this.startNode, this.endNode, function (curNode) {
        var nodeType = getIfNodeType(curNode, this.config);

        if (nodeType) {
            setEndNode(curNode, branches, branchIndex);

            branchIndex++;
            branches[branchIndex] = branches[branchIndex] || {};

            // 是 if 节点或者 elif 节点，搜集表达式
            if (nodeType < 3) {
                var expr = curNode.nodeValue.replace(this.config.getAllIfRegExp(), '');
                this.exprs.push(expr);

                if (!this.exprFns[expr]) {
                    this.exprFns[expr] = utils.createExprFn(this.config.getExprRegExp(), expr, this.exprCalculater);
                }
            }
            else if (nodeType === 3) {
                this.hasElseBranch = true;
            }
        }
        else {
            if (!branches[branchIndex].startNode) {
                branches[branchIndex].startNode = curNode;
            }
        }

        curNode = curNode.nextSibling;
        if (!curNode || curNode === this.endNode) {
            setEndNode(curNode, branches, branchIndex);
            return true;
        }
    }, this);

    this.branches = branches;
    return branches;

    function setEndNode(curNode, branches, branchIndex) {
        if (branchIndex + 1 && branches[branchIndex].startNode) {
            branches[branchIndex].endNode = curNode.previousSibling;
        }
    }
};

IfDirectiveParser.prototype.onChange = function () {
    var exprs = this.exprs;
    for (var i = 0, il = exprs.length; i < il; i++) {
        var expr = exprs[i];
        var exprValue = this.exprFns[expr](this.scopeModel);
        if (exprValue) {
            this.domUpdater.addTaskFn(
                this.handleBranchesTaskId,
                utils.bind(handleBranches, null, this.branches, i)
            );
            return;
        }
    }

    if (this.hasElseBranch) {
        this.domUpdater.addTaskFn(
            this.handleBranchesTaskId,
            utils.bind(handleBranches, null, this.branches, i)
        );
        return;
    }
};

IfDirectiveParser.prototype.destroy = function () {
    this.startNode = null;
    this.endNode = null;
    this.config = null;
    this.exprs = null;
    this.exprFns = null;

    DirectiveParser.prototype.destroy.call(this);
};

IfDirectiveParser.isProperNode = function (node, config) {
    return getIfNodeType(node, config) === 1;
};

IfDirectiveParser.findEndNode = function (ifStartNode, config) {
    var curNode = ifStartNode;
    while ((curNode = curNode.nextSibling)) {
        if (isIfEndNode(curNode, config)) {
            return curNode;
        }
    }
};

IfDirectiveParser.getNoEndNodeError = function () {
    return new Error('the if directive is not properly ended!');
};

module.exports = inherit(IfDirectiveParser, DirectiveParser);
Tree.registeParser(module.exports);

function handleBranches(branches, showIndex) {
    utils.each(branches, function (branch, j) {
        var fn = j === showIndex ? 'restoreFromDark' : 'goDark';
        utils.each(branch, function (parserObj) {
            parserObj.parser[fn]();
        });
    });
}

function isIfEndNode(node, config) {
    return getIfNodeType(node, config) === 4;
}

function getIfNodeType(node, config) {
    if (node.nodeType !== 8) {
        return;
    }

    if (config.ifPrefixRegExp.test(node.nodeValue)) {
        return 1;
    }

    if (config.elifPrefixRegExp.test(node.nodeValue)) {
        return 2;
    }

    if (config.elsePrefixRegExp.test(node.nodeValue)) {
        return 3;
    }

    if (config.ifEndPrefixRegExp.test(node.nodeValue)) {
        return 4;
    }
}

},{"../Tree":14,"../inherit":15,"../utils":27,"./DirectiveParser":19}],24:[function(require,module,exports){
/**
 * @file 解析器的抽象基类
 * @author yibuyisheng(yibuyisheng@163.com)
 */

/**
 * 构造函数
 *
 * @constructor
 * @param {Object} options 配置参数，一般可能会有如下内容：
 *                         {
 *                             startNode: ...,
 *                             endNode: ...,
 *                             node: ...,
 *                             config: ...
 *                         }
 *                         具体是啥可以参加具体的子类
 */
function Parser(options) {
    this.initialize(options);
}

/**
 * 初始化
 *
 * @protectedß
 * @param {Object} options 来自于构造函数
 */
Parser.prototype.initialize = function (options) {
    this.exprCalculater = options.exprCalculater;
    this.config = options.config;
    this.domUpdater = options.domUpdater;
    this.tree = options.tree;
};

Parser.prototype.setScope = function (scopeModel) {
    this.scopeModel = scopeModel;

    this.scopeModel.on('change', this.onChange, this);
    this.scopeModel.on('parentchange', this.onChange, this);
};

Parser.prototype.onChange = function () {
    this.domUpdater.execute();
};

Parser.prototype.getScope = function () {
    return this.scopeModel;
};

Parser.prototype.setData = function (data) {
    this.scopeModel.set(data);
};

/**
 * 隐藏相关元素
 *
 * @public
 */
Parser.prototype.goDark = function () {};

/**
 * 显示相关元素
 *
 * @public
 */
Parser.prototype.restoreFromDark = function () {};

/**
 * 搜集表达式，生成表达式函数和 DOM 更新函数
 *
 * @abstract
 * @public
 */
Parser.prototype.collectExprs = function () {};

Parser.prototype.dirtyCheck = function (expr, exprValue, exprOldValue) {
    var dirtyCheckerFn = this.dirtyChecker ? this.dirtyChecker.getChecker(expr) : null;
    return (dirtyCheckerFn && dirtyCheckerFn(expr, exprValue, exprOldValue))
            || (!dirtyCheckerFn && exprValue !== exprOldValue);
};

Parser.prototype.setDirtyChecker = function (dirtyChecker) {
    this.dirtyChecker = dirtyChecker;
};

/**
 * 销毁解析器，将界面恢复成原样
 */
Parser.prototype.destroy = function () {
    this.exprCalculater = null;
    this.config = null;
    this.domUpdater = null;
    this.tree = null;
    this.dirtyChecker = null;
};

module.exports = Parser;

},{}],25:[function(require,module,exports){
var inherit = require('../inherit');
var DirectiveParser = require('./DirectiveParser');
var utils = require('../utils');
var ScopeModel = require('../ScopeModel');
var Tree = require('../Tree');

function ScopeDirectiveParser(options) {
    DirectiveParser.call(this, options);
}

ScopeDirectiveParser.prototype.initialize = function (options) {
    DirectiveParser.prototype.initialize.call(this, options);

    this.startNode = options.startNode;
    this.endNode = options.endNode;

    if (!this.tree.getTreeVar('scopes')) {
        this.tree.setTreeVar('scopes', {});
    }
};

ScopeDirectiveParser.prototype.setScope = function (scopeModel) {
    this.scopeModel.setParent(scopeModel);
    scopeModel.addChild(this.scopeModel);
};

ScopeDirectiveParser.prototype.collectExprs = function () {
    var scopeName = this.startNode.nodeValue
        .replace(/\s+/g, '')
        .replace(this.config.scopeName + ':', '');
    if (scopeName) {
        var scopes = this.tree.getTreeVar('scopes');
        this.scopeModel = new ScopeModel();
        scopes[scopeName] = scopes[scopeName] || [];
        scopes[scopeName].push(this.scopeModel);
    }

    return [
        {
            startNode: this.startNode.nextSibling,
            endNode: this.endNode.previousSibling
        }
    ];
};

ScopeDirectiveParser.isProperNode = function (node, config) {
    return DirectiveParser.isProperNode(node, config)
        && node.nodeValue.replace(/\s+/, '').indexOf(config.scopeName + ':') === 0;
};

ScopeDirectiveParser.findEndNode = function (startNode, config) {
    var curNode = startNode;
    while ((curNode = curNode.nextSibling)) {
        if (isEndNode(curNode, config)) {
            return curNode;
        }
    }
};

ScopeDirectiveParser.getNoEndNodeError = function () {
    return new Error('the scope directive is not properly ended!');
};

module.exports = inherit(ScopeDirectiveParser, DirectiveParser);
Tree.registeParser(module.exports);

function isEndNode(node, config) {
    return node.nodeType === 8
        && node.nodeValue.replace(/\s+/g, '') === config.scopeEndName;
}

},{"../ScopeModel":13,"../Tree":14,"../inherit":15,"../utils":27,"./DirectiveParser":19}],26:[function(require,module,exports){
/**
 * @file 变量定义指令解析器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var DirectiveParser = require('./DirectiveParser');
var inherit = require('../inherit');
var Tree = require('../Tree');

function VarDirectiveParser(options) {
    DirectiveParser.call(this, options);

    this.node = options.node;
}

VarDirectiveParser.prototype.collectExprs = function () {
    var expr = this.node.nodeValue.replace(this.config.varName + ':', '');
    this.exprCalculater.createExprFn(expr);

    var leftValueName = expr.match(/\s*.+(?=\=)/)[0].replace(/\s+/g, '');

    var me = this;
    this.exprFn = function (scopeModel) {
        var oldValue = scopeModel.get(leftValueName);
        var newValue = me.exprCalculater.calculate(expr, false, scopeModel);
        if (oldValue !== newValue) {
            scopeModel.set(leftValueName, newValue);
        }
    };
};

VarDirectiveParser.prototype.setScope = function (scopeModel) {
    DirectiveParser.prototype.setScope.apply(this, arguments);
    this.exprFn(this.scopeModel);
};

// VarDirectiveParser.prototype.onChange = function () {
//     this.exprFn(this.scopeModel);
// };

VarDirectiveParser.isProperNode = function (node, config) {
    return node.nodeType === 8
        && node.nodeValue.replace(/^\s+/, '').indexOf(config.varName + ':') === 0;
};


module.exports = inherit(VarDirectiveParser, DirectiveParser);
Tree.registeParser(VarDirectiveParser);


},{"../Tree":14,"../inherit":15,"./DirectiveParser":19}],27:[function(require,module,exports){
/**
 * @file 一堆项目里面常用的方法
 * @author yibuyisheng(yibuyisheng@163.com)
 */

exports.slice = function (arr, start, end) {
    return Array.prototype.slice.call(arr, start, end);
};

exports.goDark = function (node) {
    if (node.nodeType === 1) {
        node.style.display = 'none';
    }
    else if (node.nodeType === 3) {
        node.__text__ = node.nodeValue;
        node.nodeValue = '';
    }
};

exports.restoreFromDark = function (node) {
    if (node.nodeType === 1) {
        node.style.display = null;
    }
    else if (node.nodeType === 3) {
        if (node.__text__ !== undefined) {
            node.nodeValue = node.__text__;
            node.__text__ = undefined;
        }
    }
};

exports.createExprFn = function (exprRegExp, expr, exprCalculater) {
    expr = expr.replace(exprRegExp, function () {
        return arguments[1];
    });
    exprCalculater.createExprFn(expr);

    return function (scopeModel) {
        return exprCalculater.calculate(expr, false, scopeModel);
    };
};

/**
 * 超级简单的 extend ，因为本库对 extend 没那高的要求，
 * 等到有要求的时候再完善。
 *
 * @inner
 * @param  {Object} target 目标对象
 * @return {Object}        最终合并后的对象
 */
exports.extend = function (target) {
    var srcs = exports.slice(arguments, 1);
    for (var i = 0, il = srcs.length; i < il; i++) {
        /* eslint-disable guard-for-in */
        for (var key in srcs[i]) {
            target[key] = srcs[i][key];
        }
        /* eslint-enable guard-for-in */
    }
    return target;
};

exports.traverseNoChangeNodes = function (startNode, endNode, nodeFn, context) {
    for (var curNode = startNode;
        curNode && curNode !== endNode;
        curNode = curNode.nextSibling
    ) {
        if (nodeFn.call(context, curNode)) {
            return;
        }
    }

    nodeFn.call(context, endNode);
};

exports.traverseNodes = function (startNode, endNode, nodeFn, context) {
    var nodes = [];
    for (var curNode = startNode;
        curNode && curNode !== endNode;
        curNode = curNode.nextSibling
    ) {
        nodes.push(curNode);
    }

    nodes.push(endNode);

    exports.each(nodes, nodeFn, context);
};

exports.each = function (arr, fn, context) {
    if (exports.isArray(arr)) {
        for (var i = 0, il = arr.length; i < il; i++) {
            if (fn.call(context, arr[i], i, arr)) {
                break;
            }
        }
    }
    else if (typeof arr === 'object') {
        for (var k in arr) {
            if (fn.call(context, arr[k], k, arr)) {
                break;
            }
        }
    }
};

function isClass(obj, clsName) {
    return Object.prototype.toString.call(obj) === '[object ' + clsName + ']';
}

exports.isArray = function (arr) {
    return isClass(arr, 'Array');
};

exports.isNumber = function (obj) {
    return isClass(obj, 'Number');
};

exports.isFunction = function (obj) {
    return isClass(obj, 'Function');
};

exports.isClass = isClass;

exports.bind = function (fn, thisArg) {
    if (!exports.isFunction(fn)) {
        return;
    }

    var bind = Function.prototype.bind || function () {
        var args = arguments;
        var obj = args.length > 0 ? args[0] : undefined;
        var me = this;
        return function () {
            var totalArgs = Array.prototype.concat.apply(Array.prototype.slice.call(args, 1), arguments);
            return me.apply(obj, totalArgs);
        };
    };
    return bind.apply(fn, [thisArg].concat(Array.prototype.slice.call(arguments, 2)));
};

exports.isSubClassOf = function (SubClass, SuperClass) {
    return SubClass.prototype instanceof SuperClass;
};

exports.xhr = function (options, loadFn, errorFn) {
    options = exports.extend({
        method: 'GET'
    }, options);

    var xhr = new XMLHttpRequest();
    xhr.onerror = errorFn;
    xhr.onload = loadFn;
    xhr.open(options.method, options.url, true);
    setHeaders(options.headers, xhr);
    xhr.send(options.body);
};

function setHeaders(headers, xhr) {
    if (!headers) {
        return;
    }

    for (var k in headers) {
        if (!headers.hasOwnProperty(k)) {
            continue;
        }
        xhr.setRequestHeader(k, headers[k]);
    }
}



},{}]},{},[1])