(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
require('./src/parsers/ScopeDirectiveParser');

var amdExports = {
    Config: require('./src/Config'),
    Tree: require('./src/trees/Tree'),
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
    ScopeModel: require('./src/ScopeModel')
};
define(function (require, exports, module) {
    module.exports = amdExports;
});

},{"./src/Config":3,"./src/DirtyChecker":4,"./src/DomUpdater":5,"./src/ExprCalculater":7,"./src/ScopeModel":8,"./src/inherit":9,"./src/parsers/EventExprParser":12,"./src/parsers/ExprParser":13,"./src/parsers/ForDirectiveParser":14,"./src/parsers/IfDirectiveParser":15,"./src/parsers/Parser":16,"./src/parsers/ScopeDirectiveParser":17,"./src/parsers/VarDirectiveParser":18,"./src/trees/Tree":20,"./src/utils":21}],2:[function(require,module,exports){
/**
 * @file 所有类的基类
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var inherit = require('./inherit');
var utils = require('./utils');

function Base() {
    this.initialize.apply(this, arguments);
}

Base.prototype.initialize = function () {};

/**
 * 继承
 *
 * @static
 * @param  {Object} props       普通属性
 * @param  {Object} staticProps 静态属性
 * @return {Class}             子类
 */
Base.extends = function (props, staticProps) {
    var baseCls = this;

    var cls = function () {
        baseCls.apply(this, arguments);
    };
    utils.extend(cls.prototype, props, {$super: baseCls.prototype});
    utils.extend(cls, staticProps);

    return inherit(cls, baseCls);
};

module.exports = Base;

},{"./inherit":9,"./utils":21}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
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

/**
 * 给指定节点的指定属性设置值
 *
 * TODO: 完善
 *
 * @static
 * @param {Node} node  DOM节点
 * @param {string} name  节点属性名
 * @param {Object} value 节点属性值
 * @return {*}
 */
DomUpdater.setAttr = function (node, name, value) {
    // 目前仅处理元素节点，以后是否处理其他类型的节点，以后再说
    if (node.nodeType !== 1) {
        return;
    }

    if (name === 'style' && utils.isPureObject(value)) {
        return DomUpdater.setStyle(node, value);
    }

    node.setAttribute(name, value);
};

DomUpdater.setStyle = function (node, styleObj) {
    for (var k in styleObj) {
        node.style[k] = styleObj[k];
    }
};

module.exports = DomUpdater;

},{"./log":10,"./utils":21}],6:[function(require,module,exports){
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

},{"./utils":21}],7:[function(require,module,exports){
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

},{"./utils":21}],8:[function(require,module,exports){
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
    else if (utils.isPureObject(name)) {
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

},{"./Event":6,"./inherit":9,"./utils":21}],9:[function(require,module,exports){
/**
 * @file 继承
 * @author yibuyisheng(yibuyisheng@163.com)
 */

function inherit(ChildClass, ParentClass) {
    function Cls() {}

    Cls.prototype = ParentClass.prototype;
    var childProto = ChildClass.prototype;
    ChildClass.prototype = new Cls();
    ChildClass.prototype.constructor = ChildClass;

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

},{}],10:[function(require,module,exports){
module.exports = {
    warn: function () {
        if (!console || !console.warn) {
            return;
        }

        console.warn.apply(console, arguments);
    }
};
},{}],11:[function(require,module,exports){
/**
 * @file 指令解析器抽象类。指令节点一定是注释节点
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var Parser = require('./Parser');

module.exports = Parser.extends(
    {},
    {
        isProperNode: function (node, config) {
            return node.nodeType === 8;
        }
    }
);

},{"./Parser":16}],12:[function(require,module,exports){
/**
 * @file 处理了事件的 ExprParser
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var ExprParser = require('./ExprParser');
var utils = require('../utils');
var Tree = require('../trees/Tree');
var ScopeModel = require('../ScopeModel');

module.exports = ExprParser.extends(
    {

        /**
         * 初始化
         *
         * @protected
         */
        initialize: function () {
            this.$super.initialize.apply(this, arguments);

            this.events = {};
        },

        /**
         * 添加表达式
         *
         * @inherit
         * @protected
         * @param {Attr} attr 如果当前是元素节点，则要传入遍历到的属性，
         *                    所以attr存在与否是判断当前元素是否是文本节点的一个依据
         * @return {undefined}
         */
        addExpr: function (attr) {
            if (!attr) {
                return this.$super.addExpr(arguments);
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
                this.$super.addExpr(arguments);
            }
        },

        /**
         * 销毁
         *
         * @inherit
         * @public
         */
        destroy: function () {
            utils.each(this.events, function (attrValue, eventName) {
                this.node['on' + eventName] = null;
            }, this);
            this.events = null;

            this.$super.destroy(this);
        }
    }
);

Tree.registeParser(module.exports);


function getEventName(attrName, config) {
    if (attrName.indexOf(config.eventPrefix + '-') === -1) {
        return;
    }

    return attrName.replace(config.eventPrefix + '-', '');
}


},{"../ScopeModel":8,"../trees/Tree":20,"../utils":21,"./ExprParser":13}],13:[function(require,module,exports){
/**
 * @file 表达式解析器，一个文本节点或者元素节点对应一个表达式解析器实例
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var Parser = require('./Parser');
var utils = require('../utils');
var Tree = require('../trees/Tree');
var DomUpdater = require('../DomUpdater');

module.exports = Parser.extends(
    {

        /**
         * 初始化
         *
         * @inheritDoc
         * @param  {Object} options 参数
         * @param  {Node} options.node DOM节点
         */
        initialize: function (options) {
            this.$super.initialize(options);

            this.node = options.node;

            this.exprs = [];
            this.exprFns = {};
            this.updateFns = {};
            // 恢复原貌的函数
            this.restoreFns = {};
            this.exprOldValues = {};
        },

        /**
         * 搜集过程
         *
         * @public
         * @return {boolean} 返回布尔值
         */
        collectExprs: function () {
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
        },

        /**
         * 添加表达式
         *
         * @protected
         * @param {Attr} attr 如果当前是元素节点，则要传入遍历到的属性，
         *                    所以attr存在与否是判断当前元素是否是文本节点的一个依据
         */
        addExpr: function (attr) {
            var expr = attr ? attr.value : this.node.nodeValue;
            if (!this.config.getExprRegExp().test(expr)) {
                return;
            }
            addExpr(
                this,
                expr,
                attr ? createAttrUpdateFn(this.node, attr.name, this.domUpdater) : (function (me, curNode) {
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
        },

        /**
         * 获取开始节点
         *
         * @protected
         * @inheritDoc
         * @return {Node}
         */
        getStartNode: function () {
            return this.node;
        },

        /**
         * 获取结束节点
         *
         * @protected
         * @inheritDoc
         * @return {Node}
         */
        getEndNode: function () {
            return this.node;
        },

        /**
         * 销毁
         *
         * @inheritDoc
         */
        destroy: function () {
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
        },

        /**
         * 节点“隐藏”起来
         *
         * @public
         */
        goDark: function () {
            utils.goDark(this.node);
            this.isGoDark = true;
        },

        /**
         * 在model发生改变的时候计算一下表达式的值->脏检测->更新界面。
         *
         * @protected
         */
        onChange: function () {
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

            this.$super.onChange();
        },

        /**
         * 节点“显示”出来
         *
         * @public
         */
        restoreFromDark: function () {
            utils.restoreFromDark(this.node);
            this.isGoDark = false;
        }
    },
    {

        /**
         * 判断节点是否是应该由当前处理器来处理
         *
         * @static
         * @param  {Node}  node 节点
         * @return {boolean}
         */
        isProperNode: function (node) {
            return node.nodeType === 1 || node.nodeType === 3;
        }
    }
);

Tree.registeParser(module.exports);

/**
 * 创建DOM节点属性更新函数
 *
 * @inner
 * @param  {Node} node    DOM中的节点
 * @param {string} name 要更新的属性名
 * @param  {DomUpdater} domUpdater DOM更新器
 * @return {function(Object)}      更新函数
 */
function createAttrUpdateFn(node, name, domUpdater) {
    var taskId = domUpdater.generateTaskId();
    return function (exprValue) {
        domUpdater.addTaskFn(
            taskId,
            utils.bind(function (node, name, exprValue) {
                DomUpdater.setAttr(node, name, exprValue);
            }, null, node, name, exprValue)
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

/**
 * 创建根据scopeModel计算表达式值的函数
 *
 * @inner
 * @param  {Parser} parser 解析器实例
 * @param  {string} expr   含有表达式的字符串
 * @return {function(Scope):*}
 */
function createExprFn(parser, expr) {
    return function (scopeModel) {
        // 此处要分两种情况：
        // 1、expr并不是纯正的表达式，如`==${name}==`。
        // 2、expr是纯正的表达式，如`${name}`。
        // 对于不纯正表达式的情况，此处的返回值肯定是字符串；
        // 而对于纯正的表达式，此处就不要将其转换成字符串形式了。

        var regExp = parser.config.getExprRegExp();

        var possibleExprCount = expr.match(new RegExp(utils.regExpEncode(parser.config.exprPrefix), 'g'));
        possibleExprCount = possibleExprCount ? possibleExprCount.length : 0;

        // 不纯正
        if (possibleExprCount !== 1 || expr.replace(regExp, '')) {
            return expr.replace(regExp, function () {
                parser.exprCalculater.createExprFn(arguments[1]);
                return parser.exprCalculater.calculate(arguments[1], false, scopeModel);
            });
        }

        // 纯正
        var pureExpr = expr.slice(parser.config.exprPrefix.length, -parser.config.exprSuffix.length);
        parser.exprCalculater.createExprFn(pureExpr);
        return parser.exprCalculater.calculate(pureExpr, false, scopeModel);
    };
}

},{"../DomUpdater":5,"../trees/Tree":20,"../utils":21,"./Parser":16}],14:[function(require,module,exports){
/**
 * @file for 指令
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var DirectiveParser = require('./DirectiveParser');
var utils = require('../utils');
var ForTree = require('../trees/ForTree');

module.exports = DirectiveParser.extends(
    {
        initialize: function (options) {
            this.$super.initialize(arguments);

            this.startNode = options.startNode;
            this.endNode = options.endNode;
        },

        collectExprs: function () {
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
        },

        onChange: function () {
            if (!this.expr) {
                return;
            }

            var exprValue = this.exprFn(this.scopeModel);
            if (this.dirtyCheck(this.expr, exprValue, this.exprOldValue)) {
                this.updateFn(exprValue, this.scopeModel);
            }

            this.exprOldValue = exprValue;

            this.$super.onChange(arguments);
        },

        destroy: function () {
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
            this.$super.destroy(this);
        }
    },
    {
        isProperNode: function (node, config) {
            return DirectiveParser.isProperNode(node, config)
                && config.forPrefixRegExp.test(node.nodeValue);
        },

        findEndNode: function (forStartNode, config) {
            var curNode = forStartNode;
            while ((curNode = curNode.nextSibling)) {
                if (isForEndNode(curNode, config)) {
                    return curNode;
                }
            }
        },

        getNoEndNodeError: function () {
            return new Error('the `for` directive is not properly ended!');
        }
    }
);

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
        exprCalculater: parser.tree.exprCalculater
    });
    tree.setParent(parser.tree);
    tree.traverse();
    return tree;
}

},{"../trees/ForTree":19,"../utils":21,"./DirectiveParser":11}],15:[function(require,module,exports){
/**
 * @file if 指令
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var DirectiveParser = require('./DirectiveParser');
var utils = require('../utils');
var Tree = require('../trees/Tree');

module.exports = DirectiveParser.extends(
    {
        initialize: function (options) {
            this.$super.initialize(options);

            this.startNode = options.startNode;
            this.endNode = options.endNode;
            this.config = options.config;

            this.exprs = [];
            this.exprFns = {};

            this.handleBranchesTaskId = this.domUpdater.generateTaskId();
        },

        collectExprs: function () {
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
                            this.exprFns[expr] = utils.createExprFn(
                                this.config.getExprRegExp(),
                                expr,
                                this.exprCalculater
                            );
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
        },

        onChange: function () {
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
        },

        destroy: function () {
            this.startNode = null;
            this.endNode = null;
            this.config = null;
            this.exprs = null;
            this.exprFns = null;

            DirectiveParser.prototype.destroy.call(this);
        }
    },
    {
        isProperNode: function (node, config) {
            return getIfNodeType(node, config) === 1;
        },

        findEndNode: function (ifStartNode, config) {
            var curNode = ifStartNode;
            while ((curNode = curNode.nextSibling)) {
                if (isIfEndNode(curNode, config)) {
                    return curNode;
                }
            }
        },

        getNoEndNodeError: function () {
            return new Error('the if directive is not properly ended!');
        }
    }
);

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

},{"../trees/Tree":20,"../utils":21,"./DirectiveParser":11}],16:[function(require,module,exports){
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

var Base = require('../Base');
module.exports = Base.extends(
    {

        /**
         * 初始化
         *
         * @protected
         * @param {Object} options 来自于构造函数
         */
        initialize: function (options) {
            this.exprCalculater = options.exprCalculater;
            this.config = options.config;
            this.domUpdater = options.domUpdater;
            this.tree = options.tree;
        },

        /**
         * 绑定scope model
         *
         * @public
         * @param {ScopeModel} scopeModel scope model
         */
        setScope: function (scopeModel) {
            this.scopeModel = scopeModel;

            this.scopeModel.on('change', this.onChange, this);
            this.scopeModel.on('parentchange', this.onChange, this);
        },

        /**
         * model 发生变化的回调函数
         *
         * @protected
         */
        onChange: function () {
            this.domUpdater.execute();
        },

        /**
         * 获取scope model
         *
         * @public
         * @return {ScopeModel} scope model对象
         */
        getScope: function () {
            return this.scopeModel;
        },

        /**
         * 向scope model里面设置数据
         *
         * @public
         * @param {Object} data 要设置的数据
         */
        setData: function (data) {
            this.scopeModel.set(data);
        },

        /**
         * 隐藏当前parser实例相关的节点。具体子类实现
         *
         * @public
         * @abstract
         */
        goDark: function () {},

        /**
         * 显示相关元素
         *
         * @public
         * @abstract
         */
        restoreFromDark: function () {},

        /**
         * 获取解析器当前状态下的开始DOM节点。
         *
         * 由于有的解析器会将之前的节点移除掉，那么就会对遍历带来影响了，
         * 所以此处提供两个获取开始节点和结束节点的方法。
         *
         * @public
         * @return {Node} DOM节点对象
         */
        getStartNode: function () {
            return this.startNode;
        },

        /**
         * 获取解析器当前状态下的结束DOM节点
         *
         * @public
         * @return {Node} 节点对象
         */
        getEndNode: function () {
            return this.endNode;
        },

        /**
         * 搜集表达式，生成表达式函数和 DOM 更新函数。具体子类实现
         *
         * @abstract
         * @public
         */
        collectExprs: function () {},

        /**
         * 脏检测。默认会使用全等判断。
         *
         * @public
         * @param  {string} expr         要检查的表达式
         * @param  {*} exprValue    表达式当前计算出来的值
         * @param  {*} exprOldValue 表达式上一次计算出来的值
         * @return {boolean}              两次的值是否相同
         */
        dirtyCheck: function (expr, exprValue, exprOldValue) {
            var dirtyCheckerFn = this.dirtyChecker ? this.dirtyChecker.getChecker(expr) : null;
            return (dirtyCheckerFn && dirtyCheckerFn(expr, exprValue, exprOldValue))
                    || (!dirtyCheckerFn && exprValue !== exprOldValue);
        },

        /**
         * 设置脏检测器
         *
         * @public
         * @param {DirtyChecker} dirtyChecker 脏检测器
         */
        setDirtyChecker: function (dirtyChecker) {
            this.dirtyChecker = dirtyChecker;
        },

        /**
         * 销毁解析器，将界面恢复成原样
         *
         * @public
         */
        destroy: function () {
            this.exprCalculater = null;
            this.config = null;
            this.domUpdater = null;
            this.tree = null;
            this.dirtyChecker = null;
        }
    }
);

},{"../Base":2}],17:[function(require,module,exports){
/**
 * @file scope directive parser
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var DirectiveParser = require('./DirectiveParser');
var ScopeModel = require('../ScopeModel');
var Tree = require('../trees/Tree');

module.exports = DirectiveParser.extends(
    {
        initialize: function (options) {
            DirectiveParser.prototype.initialize.call(this, options);

            this.startNode = options.startNode;
            this.endNode = options.endNode;

            if (!this.tree.getTreeVar('scopes')) {
                this.tree.setTreeVar('scopes', {});
            }
        },

        setScope: function (scopeModel) {
            this.scopeModel.setParent(scopeModel);
            scopeModel.addChild(this.scopeModel);
        },

        collectExprs: function () {
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
        }
    },
    {
        isProperNode: function (node, config) {
            return DirectiveParser.isProperNode(node, config)
                && node.nodeValue.replace(/\s+/, '').indexOf(config.scopeName + ':') === 0;
        },

        findEndNode: function (startNode, config) {
            var curNode = startNode;
            while ((curNode = curNode.nextSibling)) {
                if (isEndNode(curNode, config)) {
                    return curNode;
                }
            }
        },

        getNoEndNodeError: function () {
            return new Error('the scope directive is not properly ended!');
        }
    }
);

Tree.registeParser(module.exports);

function isEndNode(node, config) {
    return node.nodeType === 8
        && node.nodeValue.replace(/\s+/g, '') === config.scopeEndName;
}

},{"../ScopeModel":8,"../trees/Tree":20,"./DirectiveParser":11}],18:[function(require,module,exports){
/**
 * @file 变量定义指令解析器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var DirectiveParser = require('./DirectiveParser');
var Tree = require('../trees/Tree');

module.exports = DirectiveParser.extends(
    {
        initialize: function (options) {
            this.$super.initialize(options);

            this.node = options.node;
        },

        collectExprs: function () {
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
        },

        setScope: function (scopeModel) {
            DirectiveParser.prototype.setScope.apply(this, arguments);
            this.exprFn(this.scopeModel);
        },

        /**
         * 获取开始节点
         *
         * @protected
         * @inheritDoc
         * @return {Node}
         */
        getStartNode: function () {
            return this.node;
        },

        /**
         * 获取结束节点
         *
         * @protected
         * @inheritDoc
         * @return {Node}
         */
        getEndNode: function () {
            return this.node;
        }
    },
    {
        isProperNode: function (node, config) {
            return node.nodeType === 8
                && node.nodeValue.replace(/^\s+/, '').indexOf(config.varName + ':') === 0;
        }
    }
);

Tree.registeParser(module.exports);


},{"../trees/Tree":20,"./DirectiveParser":11}],19:[function(require,module,exports){
/**
 * @file for指令中用到的
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var Tree = require('./Tree');

module.exports = Tree.extends(
    {
        initialize: function (options) {
            if (!options.config
                || !options.domUpdater
                || !options.exprCalculater
            ) {
                throw new Error('wrong arguments');
            }

            this.$super.initialize(options);
        }
    }
);


},{"./Tree":20}],20:[function(require,module,exports){
/**
 * @file 最终的树
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var utils = require('../utils');
var ExprCalculater = require('../ExprCalculater');
var DomUpdater = require('../DomUpdater');
var ScopeModel = require('../ScopeModel');
var Base = require('../Base');

var ParserClasses = [];

module.exports = Base.extends(
    {
        initialize: function (options) {
            this.$super.initialize(options);

            this.startNode = options.startNode;
            this.endNode = options.endNode;
            this.config = options.config;

            this.exprCalculater = options.exprCalculater || new ExprCalculater();
            this.domUpdater = options.domUpdater || new DomUpdater();
            this.dirtyChecker = options.dirtyChecker;

            this.tree = [];
            this.treeVars = {};

            this.rootScope = new ScopeModel();
        },

        /**
         * 设置绑定在树上面的额外变量。这些变量有如下特性：
         * 1、无法覆盖；
         * 2、在获取treeVars上面某个变量的时候，如果当前树取出来是undefined，那么就会到父级树的treeVars上去找，以此类推。
         *
         * @public
         * @param {string} name  变量名
         * @param {*} value 变量值
         * @return {boolean} 是否设置成功
         */
        setTreeVar: function (name, value) {
            if (this.treeVars[name] !== undefined) {
                return false;
            }
            this.treeVars[name] = value;
            return true;
        },

        unsetTreeVar: function (name) {
            this.treeVars[name] = undefined;
        },

        getTreeVar: function (name) {
            var val = this.treeVars[name];
            if (val === undefined && this.$parent !== undefined) {
                val = this.$parent.getTreeVar(name);
            }
            return val;
        },

        setParent: function (parent) {
            this.$parent = parent;
        },

        getScopeByName: function (name) {
            var scopes = this.getTreeVar('scopes');
            if (!scopes) {
                return;
            }
            return scopes[name];
        },

        traverse: function () {
            walkDom(this, this.startNode, this.endNode, this.tree, this.rootScope);
        },

        setData: function (data) {
            data = data || {};
            this.rootScope.set(data);
        },

        goDark: function () {
            utils.traverseNoChangeNodes(this.startNode, this.endNode, function (curNode) {
                if (curNode.nodeType === 1 || curNode.nodeType === 3) {
                    utils.goDark(curNode);
                }
            }, this);
        },

        restoreFromDark: function () {
            utils.traverseNoChangeNodes(this.startNode, this.endNode, function (curNode) {
                if (curNode.nodeType === 1 || curNode.nodeType === 3) {
                    utils.restoreFromDark(curNode);
                }
            }, this);
        },

        setDirtyChecker: function (dirtyChecker) {
            this.dirtyChecker = dirtyChecker;
        },

        destroy: function () {
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
        },

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
        createParser: function (ParserClass, options) {
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
                endNode: endNode || options.node
            };
        }
    },
    {
        /**
         * 注册一下解析器类。
         *
         * @param  {Constructor} ParserClass 解析器类
         */
        registeParser: function (ParserClass) {
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
        }
    }
);


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
            parserObj = tree.createParser(ParserClass, options);
            if (!parserObj || !parserObj.parser) {
                return;
            }
            parserObj.collectResult = parserObj.parser.collectExprs();

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
                    curNode = parserObj.parser.getEndNode().nextSibling;
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
                    curNode = parserObj.parser.getEndNode().nextSibling;
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





},{"../Base":2,"../DomUpdater":5,"../ExprCalculater":7,"../ScopeModel":8,"../utils":21}],21:[function(require,module,exports){
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

/**
 * 是否是一个纯对象，满足如下条件：
 *
 * 1、除了内置属性之外，没有其他继承属性；
 * 2、constructor 是 Object
 *
 * @param {Any} obj 待判断的变量
 * @return {boolean}
 */
exports.isPureObject = function (obj) {
    if (!isClass(obj, 'Object')) {
        return false;
    }

    for (var k in obj) {
        if (!obj.hasOwnProperty(k)) {
            return false;
        }
    }

    return true;
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

/**
 * 对传入的字符串进行创建正则表达式之前的转义，防止字符串中的一些字符成为关键字。
 *
 * @param  {string} str 待转义的字符串
 * @return {string}     转义之后的字符串
 */
exports.regExpEncode = function regExpEncode(str) {
    return '\\' + str.split('').join('\\');
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