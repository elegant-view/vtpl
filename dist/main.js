/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(module) {/**
	 * @file vtpl主文件
	 * @author yibuyisheng(yibuyisheng@163.com)
	 */

	(function (root, factory) {
	    if (true) {
	        !(__WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.call(exports, __webpack_require__, exports, module)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    }
	    else {
	        root.Vtpl = factory();
	    }
	}(window, function () {
	    __webpack_require__(2);
	    __webpack_require__(12);
	    __webpack_require__(13);

	    var Tree = __webpack_require__(10);
	    var ExprCalculater = __webpack_require__(14);
	    var DomUpdater = __webpack_require__(15);
	    var utils = __webpack_require__(7);
	    var Config = __webpack_require__(16);
	    var NodesManager = __webpack_require__(17);

	    function Vtpl(options) {
	        options = utils.extend({
	            config: new Config()
	        }, options);

	        this.$nodesManager = new NodesManager();
	        if (options.startNode) {
	            options.startNode = this.$nodesManager.getNode(options.startNode);
	        }
	        if (options.endNode) {
	            options.endNode = this.$nodesManager.getNode(options.endNode);
	        }
	        if (options.node) {
	            options.node = this.$nodesManager.getNode(options.node);
	        }

	        this.$options = options;

	        var tree = new Tree(this.$options);
	        tree.setTreeVar('exprCalculater', new ExprCalculater());
	        tree.setTreeVar('domUpdater', new DomUpdater());
	        tree.setTreeVar('config', this.$options.config);
	        tree.setTreeVar('nodesManager', this.$nodesManager);
	        this.$tree = tree;
	    }

	    Vtpl.prototype.render = function () {
	        this.$tree.traverse();
	    };

	    Vtpl.prototype.setData = function () {
	        var scope = this.$tree.rootScope;
	        scope.set.apply(scope, arguments);
	    };

	    Vtpl.prototype.destroy = function () {
	        this.$tree.getTreeVar('exprCalculater').destroy();
	        this.$tree.getTreeVar('domUpdater').destroy();

	        this.$tree.destroy();
	        this.$nodesManager.destroy();

	        this.$nodesManager = null;
	        this.$options = null;
	        this.$tree = null;
	    };

	    Vtpl.utils = utils;
	    Vtpl.Config = Config;

	    if (typeof module !== undefined && module && module.exports) {
	        module.exports = Vtpl;
	    }

	    return Vtpl;
	}));

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)(module)))

/***/ },
/* 1 */
/***/ function(module, exports) {

	module.exports = function(module) {
		if(!module.webpackPolyfill) {
			module.deprecate = function() {};
			module.paths = [];
			// module.parent = undefined by default
			module.children = [];
			module.webpackPolyfill = 1;
		}
		return module;
	}


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @file for 指令
	 * @author yibuyisheng(yibuyisheng@163.com)
	 */

	var DirectiveParser = __webpack_require__(3);
	var utils = __webpack_require__(7);
	var Tree = __webpack_require__(10);
	var Node = __webpack_require__(8);

	var ForDirectiveParser = DirectiveParser.extends(
	    {

	        initialize: function (options) {
	            DirectiveParser.prototype.initialize.apply(this, arguments);

	            this.startNode = options.startNode;
	            this.endNode = options.endNode;

	            this.tplSeg = null;
	            this.expr = null;
	            this.exprFn = null;
	            this.updateFn = null;
	            this.trees = [];
	        },

	        collectExprs: function () {
	            if (this.startNode.getNextSibling().equal(this.endNode)) {
	                return;
	            }

	            // for指令之间没有节点
	            if (this.startNode.getNextSibling().equal(this.endNode)) {
	                return;
	            }

	            var nodesManager = this.tree.getTreeVar('nodesManager');
	            this.tplSeg = nodesManager.createElement('div');
	            for (var curNode = this.startNode.getNextSibling();
	                curNode && !curNode.isAfter(this.endNode.getPreviousSibling());
	            ) {
	                var nextNode = curNode.getNextSibling();
	                this.tplSeg.appendChild(curNode);
	                curNode = nextNode;
	            }

	            var config = this.tree.getTreeVar('config');
	            var exprCalculater = this.tree.getTreeVar('exprCalculater');

	            this.expr = this.startNode.getNodeValue().match(config.getForExprsRegExp())[1];
	            this.exprFn = utils.createExprFn(config.getExprRegExp(), this.expr, exprCalculater);
	            this.updateFn = this.createUpdateFn(
	                this.startNode.getNextSibling(),
	                this.endNode.getPreviousSibling(),
	                this.startNode.getNodeValue()
	            );
	        },

	        linkScope: function () {
	            this.onChange();
	            DirectiveParser.prototype.linkScope.apply(this, arguments);
	        },

	        onChange: function () {
	            if (!this.expr) {
	                return;
	            }

	            var exprValue = this.exprFn(this.tree.rootScope);
	            if (this.dirtyCheck(this.expr, exprValue, this.exprOldValue)) {
	                this.updateFn(exprValue, this.tree.rootScope);
	            }

	            this.exprOldValue = exprValue;

	            DirectiveParser.prototype.onChange.apply(this, arguments);
	        },

	        destroy: function () {
	            utils.each(this.trees, function (tree) {
	                tree.destroy();
	            });

	            this.tplSeg = null;
	            this.expr = null;
	            this.exprFn = null;
	            this.updateFn = null;
	            this.startNode = null;
	            this.endNode = null;

	            DirectiveParser.prototype.destroy.apply(this, arguments);
	        },

	        /**
	         * 创建树
	         *
	         * @protected
	         * @return {Tree}
	         */
	        createTree: function () {
	            var parser = this;
	            var nodesManager = this.tree.getTreeVar('nodesManager');
	            var copySeg = nodesManager.createElement('div');
	            copySeg.setInnerHTML(this.tplSeg.getInnerHTML());

	            var childNodes = copySeg.getChildNodes();
	            var startNode = childNodes[0];
	            var endNode = childNodes[childNodes.length - 1];

	            var curNode = startNode;
	            while (curNode && !curNode.isAfter(endNode)) {
	                var nextNode = curNode.getNextSibling();
	                parser.endNode.getParentNode().insertBefore(curNode, parser.endNode);
	                curNode = nextNode;
	            }

	            var tree = DirectiveParser.prototype.createTree.call(
	                this,
	                this.tree,
	                startNode,
	                endNode
	            );
	            tree.traverse();
	            return tree;
	        },

	        /**
	         * 创建更新函数。
	         * 更新函数会根据迭代的数据动态地创建Tree实例：迭代了多少次，就会创建多少个。
	         * for指令下的Tree实例目前是不会销毁的，除非解析器实例被销毁。
	         * for指令下的Tree实例只会随着迭代次数的增加而增多，并不会消减。
	         *
	         * @private
	         * @param  {nodes/Node} startNode 起始节点
	         * @param  {nodes/Node} endNode   结束节点
	         * @param  {string} fullExpr  for指令中完整的表达式，比如`<!-- for: ${list} as ${item} -->`就是`for: ${list} as ${item}`。
	         * @return {function(*,ScopeModel)}           dom更新函数
	         */
	        createUpdateFn: function (startNode, endNode, fullExpr) {
	            var parser = this;
	            var config = this.tree.getTreeVar('config');
	            var domUpdater = this.tree.getTreeVar('domUpdater');
	            var itemVariableName = fullExpr.match(config.getForItemValueNameRegExp())[1];
	            var taskId = domUpdater.generateTaskId();
	            return function (exprValue, scopeModel) {
	                var index = 0;
	                for (var k in exprValue) {
	                    if (!parser.trees[index]) {
	                        parser.trees[index] = parser.createTree();
	                    }

	                    parser.trees[index].restoreFromDark();
	                    parser.trees[index].setDirtyChecker(parser.dirtyChecker);

	                    var local = {
	                        key: k,
	                        index: index
	                    };
	                    local[itemVariableName] = exprValue[k];

	                    parser.trees[index].rootScope.setParent(scopeModel);
	                    scopeModel.addChild(parser.trees[index].rootScope);

	                    parser.trees[index].setData(local);

	                    ++index;
	                }

	                domUpdater.addTaskFn(
	                    taskId,
	                    utils.bind(
	                        function (trees, index) {
	                            for (var i = index, il = trees.length; i < il; i++) {
	                                trees[i].goDark();
	                            }
	                        },
	                        null,
	                        parser.trees,
	                        index
	                    )
	                );
	            };
	        }
	    },
	    {
	        isProperNode: function (node, config) {
	            return DirectiveParser.isProperNode(node, config)
	                && config.forPrefixRegExp.test(node.getNodeValue());
	        },

	        findEndNode: function (forStartNode, config) {
	            var curNode = forStartNode;
	            while ((curNode = curNode.getNextSibling())) {
	                if (ForDirectiveParser.isForEndNode(curNode, config)) {
	                    return curNode;
	                }
	            }
	        },

	        getNoEndNodeError: function () {
	            return new Error('the `for` directive is not properly ended!');
	        },

	        isForEndNode: function (node, config) {
	            var nodeType = node.getNodeType();
	            return nodeType === Node.COMMENT_NODE
	                && config.forEndPrefixRegExp.test(node.getNodeValue());
	        },

	        $name: 'ForDirectiveParser'
	    }
	);

	Tree.registeParser(ForDirectiveParser);
	module.exports = ForDirectiveParser;



/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @file 指令解析器抽象类。指令节点一定是注释节点
	 * @author yibuyisheng(yibuyisheng@163.com)
	 */

	var Parser = __webpack_require__(4);
	var Node = __webpack_require__(8);
	var Tree = __webpack_require__(10);

	module.exports = Parser.extends(
	    {

	        /**
	         * 根据父级数创建子树。
	         *
	         * @protected
	         * @param  {Tree} parentTree 父级树
	         * @param {nodes/Node} startNode 开始节点
	         * @param {nodes/Node} endNode 结束节点
	         * @return {Tree}  创建好的子树
	         */
	        createTree: function (parentTree, startNode, endNode) {
	            var tree = new Tree({
	                startNode: startNode,
	                endNode: endNode
	            });
	            tree.setParent(this.tree);
	            tree.rootScope.setParent(parentTree.rootScope);
	            parentTree.rootScope.addChild(tree.rootScope);
	            return tree;
	        }
	    },
	    {
	        isProperNode: function (node, config) {
	            return node.getNodeType() === Node.COMMENT_NODE;
	        },

	        $name: 'DirectiveParser'
	    }
	);


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

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

	var Base = __webpack_require__(5);
	module.exports = Base.extends(
	    {

	        /**
	         * 初始化
	         *
	         * @protected
	         * @param {Object} options 来自于构造函数
	         * @param {Tree} options.tree 该解析器挂靠的树
	         */
	        initialize: function (options) {
	            this.tree = options.tree;
	        },

	        /**
	         * 绑定scope model
	         *
	         * @public
	         * @param {ScopeModel} scopeModel scope model
	         */
	        linkScope: function () {
	            this.tree.rootScope.on('change', this.onChange, this);
	            this.tree.rootScope.on('parentchange', this.onChange, this);

	            this.tree.getTreeVar('domUpdater').execute();
	        },

	        /**
	         * model 发生变化的回调函数
	         *
	         * @protected
	         */
	        onChange: function () {
	            this.tree.getTreeVar('domUpdater').execute();
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
	            var dirtyChecker = this.tree.getTreeVar('dirtyChecker');
	            var dirtyCheckerFn = dirtyChecker ? dirtyChecker.getChecker(expr) : null;
	            return (dirtyCheckerFn && dirtyCheckerFn(expr, exprValue, exprOldValue))
	                    || (!dirtyCheckerFn && exprValue !== exprOldValue);
	        },

	        /**
	         * 销毁解析器，将界面恢复成原样
	         *
	         * @public
	         */
	        destroy: function () {
	            this.tree = null;
	        }
	    },
	    {
	        $name: 'Parser'
	    }
	);


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @file 所有类的基类
	 * @author yibuyisheng(yibuyisheng@163.com)
	 */

	var inherit = __webpack_require__(6);
	var utils = __webpack_require__(7);

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
	    // 每个类都必须有一个名字
	    if (!staticProps || !staticProps.$name) {
	        throw new SyntaxError('each class must have a `$name`.');
	    }

	    var baseCls = this;

	    var cls = function () {
	        baseCls.apply(this, arguments);
	    };
	    utils.extend(cls.prototype, props);
	    utils.extend(cls, staticProps);

	    // 记录一下父类
	    cls.$superClass = baseCls;

	    return inherit(cls, baseCls);
	};

	module.exports = Base;


/***/ },
/* 6 */
/***/ function(module, exports) {

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


/***/ },
/* 7 */
/***/ function(module, exports) {

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

	/**
	 * 将字符串中的驼峰命名方式改为短横线的形式
	 *
	 * @public
	 * @param  {string} str 要转换的字符串
	 * @return {string}
	 */
	exports.camel2line = function (str) {
	    return str.replace(/[A-Z]/g, function (matched, index) {
	        if (index === 0) {
	            return matched.toLowerCase();
	        }
	        return '-' + matched.toLowerCase();
	    });
	};

	/**
	 * 将字符串中的短横线命名方式改为驼峰的形式
	 *
	 * @public
	 * @param  {string} str 要转换的字符串
	 * @return {string}
	 */
	exports.line2camel = function (str) {
	    return str.replace(/-[a-z]/g, function (matched) {
	        return matched[1].toUpperCase();
	    });
	};

	exports.distinctArr = function (arr, hashFn) {
	    hashFn = exports.isFunction(hashFn) ? hashFn : function (elem) {
	        return String(elem);
	    };
	    var obj = {};
	    for (var i = 0, il = arr.length; i < il; ++i) {
	        obj[hashFn(arr[i])] = arr[i];
	    }

	    var ret = [];
	    for (var key in obj) {
	        if (!obj.hasOwnProperty(key)) {
	            continue;
	        }

	        ret.push(obj[key]);
	    }

	    return ret;
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




/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @file 实现一套本库需要的节点类，将所有直接操作DOM的代码都封装在这里。
	 *       如无特别说明，以`$`符号开头的成员变量是受保护的，以`$$`符号开头的成员变量是私有的。
	 * @author yibuyisheng(yibuyisheng@163.com)
	 */

	var Base = __webpack_require__(5);
	var utils = __webpack_require__(7);
	var Event = __webpack_require__(9);

	var Node = Base.extends(
	    {
	        initialize: function (node, manager) {
	            Base.prototype.initialize.apply(this, arguments);

	            // 弱弱地判断一下node是不是节点
	            if (!node || node.ownerDocument !== document) {
	                throw new TypeError('wrong `node` argument');
	            }

	            this.$node = node;
	            this.$manager = manager;

	            this.$event = new Event();
	            this.$nodeEventFns = {};
	        },

	        getNodeType: function () {
	            return this.$node.nodeType;
	        },

	        getChildNodes: function () {
	            var nodes = [];
	            var childNodes = this.$node.childNodes;
	            for (var i = 0, il = childNodes.length; i < il; ++i) {
	                nodes.push(this.$manager.getNode(childNodes[i]));
	            }
	            return nodes;
	        },

	        equal: function (node) {
	            return this.$node === node.$node;
	        },

	        getParentNode: function () {
	            var parentNode = this.$node.parentNode
	                || (this.$commentNode && this.$commentNode.parentNode);
	            if (!parentNode) {
	                return null;
	            }

	            return this.$manager.getNode(parentNode);
	        },

	        getNextSibling: function () {
	            var nextSibling = this.$node.nextSibling
	                || (this.$commentNode && this.$commentNode.nextSibling);
	            if (!nextSibling) {
	                return null;
	            }

	            return this.$manager.getNode(nextSibling);
	        },

	        getPreviousSibling: function () {
	            var previousSibling = this.$node.previousSibling
	                || (this.$commentNode && this.$commentNode.previousSibling);
	            if (!previousSibling) {
	                return null;
	            }

	            return this.$manager.getNode(previousSibling);
	        },

	        getAttribute: function (name) {
	            return this.$node.getAttribute(name);
	        },

	        setAttribute: function (name, value) {
	            this.$node.setAttribute(name, value);
	        },

	        getAttributes: function () {
	            return this.$node.attributes;
	        },

	        getNodeValue: function () {
	            return this.$node.nodeValue;
	        },

	        setNodeValue: function (value) {
	            this.$node.nodeValue = value;
	        },

	        appendChild: function (node) {
	            this.$node.appendChild(node.$node);
	        },

	        cloneNode: function () {
	            return this.$manager.getNode(this.$node.cloneNode.apply(this.$node, arguments));
	        },

	        insertBefore: function (newNode, referenceNode) {
	            return this.$manager.getNode(
	                this.$node.insertBefore(newNode.$node, referenceNode.$node)
	            );
	        },

	        getInnerHTML: function () {
	            return this.$node.innerHTML;
	        },

	        setInnerHTML: function (html) {
	            this.$node.innerHTML = html;
	        },

	        /**
	         * 判断当前节点是否和node是兄弟关系，并且在node之后。
	         *
	         * @public
	         * @param  {Node}  node 要对比的节点
	         * @return {boolean}
	         */
	        isAfter: function (node) {
	            if (!this.isBrotherWith(node)
	                || this.equal(node)
	            ) {
	                return false;
	            }

	            for (var curNode = node.$node; curNode; curNode = curNode.nextSibling) {
	                if (curNode === this.$node) {
	                    return true;
	                }
	            }

	            return false;
	        },

	        isBrotherWith: function (node) {
	            return this.getParentNode().equal(node.getParentNode());
	        },

	        /**
	         * 获取或设定属性值。
	         * 如果参数只有一个，并且第一个参数是字符串类型，说明是获取属性值；
	         * 如果参数有两个，并且第一个参数是字符串类型，说明是设置属性值；
	         *
	         * TODO: 完善
	         *
	         * @param {string} name  节点属性名
	         * @param {*=} value 节点属性值
	         * @return {*}
	         */
	        attr: function (name, value) {
	            // 只有一个参数，那就归到获取属性的范畴
	            if (arguments.length === 1) {
	                return this.getAttribute(name);
	            }

	            if (this.getNodeType() === Node.ELEMENT_NODE) {
	                if (name === 'style' && utils.isPureObject(value)) {
	                    return this.setStyle(value);
	                }

	                if (name === 'class') {
	                    return this.setClass(value);
	                }

	                if (Node.isEventName(name)) {
	                    return this.on(name.replace('on', ''), value);
	                }

	                // 外部点击事件
	                if (name === 'onoutclick') {
	                    return this.on('outclick', value);
	                }
	            }

	            this.setAttribute(name, value);
	        },

	        setClass: function (klass) {
	            if (!klass) {
	                return;
	            }

	            this.$node.className = this.getClassList(klass).join(' ');
	        },

	        setStyle: function (styleObj) {
	            for (var k in styleObj) {
	                if (styleObj.hasOwnProperty(k)) {
	                    this.$node.style[k] = styleObj[k];
	                }
	            }
	        },

	        on: function (eventName, callback) {
	            this.$event.on(eventName, callback);

	            var me = this;
	            if (!utils.isFunction(this.$nodeEventFns[eventName])) {
	                if (eventName === 'outclick') {
	                    this.$nodeEventFns[eventName] = function (event) {
	                        event = event || window.event;
	                        if (me.$node !== event.target && !me.$node.contains(event.target)) {
	                            me.$event.trigger(eventName, event);
	                        }
	                    };
	                    window.addEventListener('click', this.$nodeEventFns[eventName]);
	                }
	                else {
	                    this.$nodeEventFns[eventName] = function (event) {
	                        event = event || window.event;
	                        me.$event.trigger(eventName, event);
	                    };
	                    this.$node.addEventListener(eventName, this.$nodeEventFns[eventName]);
	                }
	            }
	        },

	        off: function (eventName, callback) {
	            this.$event.off(eventName, callback);

	            if (this.$event.isAllRemoved()) {
	                var eventFn;
	                eventFn = this.$nodeEventFns[eventName];
	                if (eventName === 'outclick') {
	                    window.removeEventListener('click', eventFn);
	                }
	                else {
	                    this.$node.removeEventListener(eventName, this.$nodeEventFns[eventName]);
	                }
	                this.$nodeEventFns[eventName] = null;
	            }
	        },

	        show: function () {
	            if (this.$node.parentNode || !this.$commentNode) {
	                return;
	            }

	            var parentNode = this.$commentNode.parentNode;
	            if (parentNode) {
	                parentNode.replaceChild(this.$node, this.$commentNode);
	            }
	        },

	        hide: function () {
	            if (!this.$node.parentNode) {
	                return;
	            }

	            var parentNode = this.$node.parentNode;
	            if (parentNode) {
	                if (!this.$commentNode) {
	                    this.$commentNode = document.createComment('node placeholder');
	                    this.$commentNode.$nodeId = ++this.$manager.$idCounter;
	                }
	                parentNode.replaceChild(this.$commentNode, this.$node);
	            }
	        },

	        isInDom: function () {
	            return !!this.$node.parentNode;
	        },

	        /**
	         * 销毁，做一些清理工作：
	         * 1、清理outclick；
	         * 2、清理事件；
	         *
	         * @public
	         */
	        destroy: function () {
	            this.$event.off();

	            for (var eventName in this.$nodeEventFns) {
	                var eventFn = this.$nodeEventFns[eventName];
	                if (eventName === 'outclick') {
	                    window.removeEventListener('click', eventFn);
	                }
	                else {
	                    this.$node.removeEventListener(eventName, eventFn);
	                }
	            }
	        }
	    },
	    {
	        $name: 'Node',

	        ELEMENT_NODE: 1,
	        ATTRIBUTE_NODE: 2,
	        TEXT_NODE: 3,
	        CDATA_SECTION_NODE: 4,
	        ENTITY_REFERENCE_NODE: 5,
	        ENTITY_NODE: 6,
	        PROCESSING_INSTRUCTION_NODE: 7,
	        COMMENT_NODE: 8,
	        DOCUMENT_NODE: 9,
	        DOCUMENT_TYPE_NODE: 10,
	        DOCUMENT_FRAGMENT_NODE: 11,
	        NOTATION_NODE: 12,

	        eventList: ('blur focus focusin focusout load resize scroll unload click dblclick '
	            + 'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave '
	            + 'change select submit keydown keypress keyup error contextmenu').split(' '),

	        getClassList: function (klass) {
	            var klasses = [];
	            if (utils.isClass(klass, 'String')) {
	                klasses = klass.split(' ');
	            }
	            else if (utils.isPureObject(klass)) {
	                for (var k in klass) {
	                    if (klass[k]) {
	                        klasses.push(klass[k]);
	                    }
	                }
	            }
	            else if (utils.isArray(klass)) {
	                klasses = klass;
	            }

	            return utils.distinctArr(klasses);
	        },

	        isEventName: function (str) {
	            var eventList = this.eventList;

	            if (str.indexOf('on') !== 0) {
	                return;
	            }
	            str = str.slice(2);
	            for (var i = 0, il = eventList.length; i < il; ++i) {
	                if (str === eventList[i]) {
	                    return true;
	                }
	            }

	            return false;
	        },

	        /**
	         * 将NodeList转换成真正的数组
	         *
	         * @static
	         * @param {(NodeList|Array.<Node>)} nodeList DOM节点列表
	         * @return {Array.<Node>}
	         */
	        toArray: function (nodeList) {
	            if (utils.isArray(nodeList)) {
	                return nodeList;
	            }

	            try {
	                return utils.slice(nodeList, 0);
	            }
	            catch (e) {
	                // IE8 及更早版本将 NodeList 实现为一个 COM 对象，因此只能一个一个遍历出来。
	                var list = [];
	                for (var i = 0, il = nodeList.length; i < il; ++i) {
	                    list.push(nodeList[i]);
	                }
	                return list;
	            }
	        },

	        /**
	         * 遍历DOM树
	         *
	         * @static
	         * @param {Node} startNode 起始节点
	         * @param {Node} endNode 终止节点
	         * @param {function(Node):(Node|undefined|boolean)} iterateFn 迭代函数。
	         *                                                            如果这个函数返回了一个Node对象，则把这个Node对象当成下一个要遍历的节点
	         * @return {boolean} 如果是true，说明在遍历子节点的时候中途中断了，不需要继续遍历了。
	         */
	        iterate: function (startNode, endNode, iterateFn) {
	            if (!utils.isFunction(iterateFn)) {
	                return;
	            }

	            var curNode = startNode;
	            while (curNode) {
	                var nextNode = iterateFn(curNode);

	                if (Node.ELEMENT_NODE === curNode.getNodeType()) {
	                    var childNodes = curNode.getChildNodes();
	                    if (childNodes.length) {
	                        if (true === Node.iterate(
	                            childNodes[0],
	                            childNodes[childNodes.length - 1],
	                            iterateFn)
	                        ) {
	                            curNode = null;
	                            return true;
	                        }
	                    }
	                }

	                if (nextNode === true) {
	                    return true;
	                }
	                else if (nextNode instanceof Node) {
	                    if (!nextNode.isAfter(curNode)) {
	                        throw new Error('wrong next node');
	                    }

	                    curNode = nextNode;
	                }
	                else if (!nextNode) {
	                    curNode = curNode.getNextSibling();
	                }

	                if (curNode && curNode.isAfter(endNode)) {
	                    curNode = null;
	                }

	            }
	        }
	    }
	);

	module.exports = Node;


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @file 事件
	 * @author yibuyisheng(yibuyisheng@163.com)
	 */

	var utils = __webpack_require__(7);

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
	    if (arguments.length === 0) {
	        this.events = {};
	    }

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

	Event.prototype.isAllRemoved = function () {
	    var eventName;
	    var fn;
	    if (arguments.length === 0 || arguments.length > 2) {
	        throw new TypeError('wrong arguments');
	    }

	    if (arguments.length >= 1 && utils.isClass(arguments[0], 'String')) {
	        eventName = arguments[0];
	    }
	    if (arguments.length === 2 && utils.isFunction(arguments[1])) {
	        fn = arguments[1];
	    }

	    var fnObjs = this.events[eventName];
	    if (fnObjs && fnObjs.length) {
	        if (fn) {
	            for (var i = 0, il = fnObjs.length; i < il; ++i) {
	                var fnObj = fnObjs[i];
	                if (fnObj.fn === fn) {
	                    return false;
	                }
	            }
	        }

	        // 只传了eventName，没有传callback，存在eventName对应的回调函数
	        return false;
	    }

	    return true;
	};

	module.exports = Event;


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @file 最终的树
	 * @author yibuyisheng(yibuyisheng@163.com)
	 */

	var utils = __webpack_require__(7);
	var ScopeModel = __webpack_require__(11);
	var Base = __webpack_require__(5);
	var Node = __webpack_require__(8);

	var ParserClasses = [];

	module.exports = Base.extends(
	    {

	        /**
	         * 树的初始化方法。
	         *
	         * @protected
	         * @param  {Object} options 初始化参数
	         * @param {nodes/Node} options.startNode 这棵树要解析的dom块的开始节点
	         * @param {nodes/Node} options.endNode 这棵树要解析的dom块的结束节点
	         */
	        initialize: function (options) {
	            Base.prototype.initialize.apply(this, arguments);

	            this.startNode = options.startNode;
	            this.endNode = options.endNode;

	            this.treeVars = {};
	            this.$parsers = [];

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

	        /**
	         * 获取绑定到树上的额外变量
	         *
	         * @public
	         * @param  {string} name                  变量名
	         * @param  {boolean=} shouldNotFindInParent 如果在当前树中没找到，是否到父级树中去找。
	         *                                         true就代表不去，false就代表要去
	         * @return {*}
	         */
	        getTreeVar: function (name, shouldNotFindInParent) {
	            var val = this.treeVars[name];
	            if (!shouldNotFindInParent
	                && val === undefined
	                && this.$parent !== undefined
	            ) {
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

	        /**
	         * 遍历DOM树，生成解析器类->搜集指令和表达式并生成相应的DOM更新函数->绑定ScopeModel
	         *
	         * @public
	         */
	        traverse: function () {
	            var me = this;
	            Node.iterate(this.startNode, this.endNode, function (node) {
	                var options = {
	                    startNode: node,
	                    node: node,
	                    tree: me
	                };

	                var parser;
	                for (var i = 0, il = ParserClasses.length; i < il; ++i) {
	                    var ParserClass = ParserClasses[i];
	                    parser = me.createParser(ParserClass, options);

	                    if (!parser) {
	                        continue;
	                    }
	                    me.$parsers.push(parser);

	                    parser.collectExprs();
	                    // 将解析器对象和对应树的scope绑定起来
	                    parser.linkScope();
	                    break;
	                }

	                if (!parser) {
	                    // if (node.getNodeType() === Node.COMMENT_NODE) {
	                    //     return;
	                    // }
	                    throw new Error('no such parser');
	                }

	                if (parser.getStartNode().equal(parser.getEndNode())) {
	                    return;
	                }

	                var nextNode = parser.getEndNode().getNextSibling();
	                if (!nextNode || nextNode.isAfter(me.endNode)) {
	                    return true;
	                }
	                return nextNode;
	            });
	        },

	        setData: function (data) {
	            data = data || {};
	            this.rootScope.set(data);
	        },

	        goDark: function () {
	            var node = this.startNode;
	            while (node) {
	                var nodeType = node.getNodeType();
	                if (nodeType === Node.ELEMENT_NODE || nodeType === Node.TEXT_NODE) {
	                    node.hide();
	                }

	                node = node.getNextSibling();
	                if (!node || node.equal(this.endNode)) {
	                    break;
	                }
	            }
	        },

	        restoreFromDark: function () {
	            var node = this.startNode;
	            while (node) {
	                var nodeType = node.getNodeType();
	                if (nodeType === Node.ELEMENT_NODE || nodeType === Node.TEXT_NODE) {
	                    node.show();
	                }

	                node = node.getNextSibling();
	                if (!node || node.equal(this.endNode)) {
	                    break;
	                }
	            }
	        },

	        setDirtyChecker: function (dirtyChecker) {
	            this.dirtyChecker = dirtyChecker;
	        },

	        destroy: function () {
	            walk(this.$parsers);

	            this.startNode = null;
	            this.endNode = null;
	            this.config = null;

	            this.$parser = null;
	            this.treeVars = null;

	            if (this.dirtyChecker) {
	                this.dirtyChecker.destroy();
	                this.dirtyChecker = null;
	            }

	            function walk(parsers) {
	                utils.each(parsers, function (parser) {
	                    parser.destroy();
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
	            var config = this.getTreeVar('config');
	            if (!ParserClass.isProperNode(startNode, config)) {
	                return;
	            }

	            var endNode;
	            if (ParserClass.findEndNode) {
	                endNode = ParserClass.findEndNode(startNode, config);

	                if (!endNode) {
	                    throw ParserClass.getNoEndNodeError();
	                }
	                else if (endNode.parentNode !== startNode.parentNode) {
	                    throw new Error('the relationship between start node and end node is not brotherhood!');
	                }
	            }

	            var parser = new ParserClass(
	                utils.extend(
	                    options,
	                    {
	                        endNode: endNode
	                    }
	                )
	            );

	            return parser;
	        }
	    },
	    {

	        /**
	         * 注册一下解析器类。
	         *
	         * 解析器类的命中规则是：
	         *
	         * 当遇到一个节点的时候，会严格按照ParserClasses数组的顺序来判断当前的节点是否归该解析器类处理（isProperNode）。
	         * 所以，越是靠前的解析器类，就拥有越高的优先级。
	         *
	         * 在注册解析器类的时候，这个顺序就会定下来，并且子类拥有比父类更高的优先级。
	         *
	         * @param  {Constructor} ParserClass 解析器类
	         */
	        registeParser: function (ParserClass) {
	            ParserClasses.push(ParserClass);

	            ParserClasses.sort(function (prev, next) {
	                return utils.isSubClassOf(prev, next) ? -1 : 1;
	            });
	        },

	        $name: 'Tree'
	    }
	);








/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	var utils = __webpack_require__(7);
	var Event = __webpack_require__(9);
	var inherit = __webpack_require__(6);

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
	        change(this, {name: name, value: value});
	    }
	    else if (utils.isPureObject(name)) {
	        utils.extend(this.store, name);
	        change(this, name);
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

	function change(me, changeObj) {
	    me.trigger('change', me, changeObj);
	    utils.each(me.children, function (scope) {
	        scope.trigger('parentchange', me, changeObj);
	    });
	}


/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @file if 指令
	 * @author yibuyisheng(yibuyisheng@163.com)
	 */

	var DirectiveParser = __webpack_require__(3);
	var utils = __webpack_require__(7);
	var Tree = __webpack_require__(10);
	var Node = __webpack_require__(8);

	var IfDirectiveParser = DirectiveParser.extends(
	    {
	        initialize: function (options) {
	            DirectiveParser.prototype.initialize.apply(this, arguments);

	            this.startNode = options.startNode;
	            this.endNode = options.endNode;

	            this.exprs = [];
	            this.exprFns = {};
	            this.$branchTrees = [];

	            var domUpdater = this.tree.getTreeVar('domUpdater');
	            this.handleBranchesTaskId = domUpdater.generateTaskId();
	        },

	        collectExprs: function () {
	            var branchNodeStack = [];
	            var me = this;
	            var config = this.tree.getTreeVar('config');
	            Node.iterate(this.startNode, this.endNode, function (node) {
	                var ifNodeType = getIfNodeType(node, me.tree.getTreeVar('config'));
	                // if
	                if (ifNodeType === IfDirectiveParser.IF_START) {
	                    if (branchNodeStack.length) {
	                        throw new Error('wrong `if` directive syntax');
	                    }
	                    branchNodeStack.push({node: node, type: ifNodeType});
	                }
	                // elif
	                else if (ifNodeType === IfDirectiveParser.ELIF
	                    || ifNodeType === IfDirectiveParser.ELSE
	                ) {
	                    if (!branchNodeStack.length
	                        || (
	                            // 前面一个分支既不是`if`，也不是`elif`
	                            branchNodeStack[branchNodeStack.length - 1].type !== IfDirectiveParser.IF_START
	                            && branchNodeStack[branchNodeStack.length - 1].type !== IfDirectiveParser.ELIF
	                        )
	                    ) {
	                        throw new Error('wrong `if` directive syntax');
	                    }
	                    branchNodeStack.push({node: node, type: ifNodeType});
	                }
	                // /if
	                else if (ifNodeType === IfDirectiveParser.IF_END) {
	                    branchNodeStack.push({node: node, type: ifNodeType});
	                }

	                // 是 if 节点或者 elif 节点，搜集表达式
	                if (ifNodeType === IfDirectiveParser.IF_START
	                    || ifNodeType === IfDirectiveParser.ELIF
	                ) {
	                    var expr = node.getNodeValue().replace(config.getAllIfRegExp(), '');
	                    me.exprs.push(expr);

	                    if (!me.exprFns[expr]) {
	                        me.exprFns[expr] = utils.createExprFn(
	                            config.getExprRegExp(),
	                            expr,
	                            me.tree.getTreeVar('exprCalculater')
	                        );
	                    }
	                }

	                if (ifNodeType === IfDirectiveParser.ELSE) {
	                    me.$$hasElseBranch = true;
	                }
	            });

	            for (var i = 0, il = branchNodeStack.length - 1; i < il; ++i) {
	                var curNode = branchNodeStack[i];
	                var nextNode = branchNodeStack[i + 1];

	                var curNodeNextSibling = curNode.node.getNextSibling();
	                // curNode 和 nextNode 之间没有节点
	                if (curNodeNextSibling.equal(nextNode.node)) {
	                    this.$branchTrees.push(null);
	                }
	                else {
	                    var tree = this.createTree(
	                        this.tree,
	                        curNodeNextSibling,
	                        nextNode.node.getPreviousSibling()
	                    );
	                    this.$branchTrees.push(tree);
	                    tree.traverse();
	                }
	            }
	        },

	        linkScope: function () {
	            DirectiveParser.prototype.linkScope.apply(this, arguments);
	            this.onChange();
	        },

	        onChange: function () {
	            var domUpdater = this.tree.getTreeVar('domUpdater');
	            var exprs = this.exprs;
	            var showIndex;
	            for (var i = 0, il = exprs.length; i < il; i++) {
	                var expr = exprs[i];
	                var exprValue = this.exprFns[expr](this.tree.rootScope);
	                if (exprValue) {
	                    showIndex = i;
	                    break;
	                }
	            }

	            if (this.$$hasElseBranch) {
	                showIndex = i;
	            }

	            domUpdater.addTaskFn(
	                this.handleBranchesTaskId,
	                utils.bind(handleBranches, null, this.$branchTrees, showIndex)
	            );
	        },

	        destroy: function () {
	            for (var i = 0, il = this.$branchTrees.length; i < il; ++i) {
	                var branchTree = this.$branchTrees[i];
	                branchTree.destroy();
	            }

	            this.startNode = null;
	            this.endNode = null;
	            this.exprs = null;
	            this.exprFns = null;
	            this.handleBranchesTaskId = null;
	            this.branchTrees = null;

	            DirectiveParser.prototype.destroy.call(this);
	        }
	    },
	    {
	        isProperNode: function (node, config) {
	            return getIfNodeType(node, config) === IfDirectiveParser.IF_START;
	        },

	        findEndNode: function (ifStartNode, config) {
	            var curNode = ifStartNode;
	            while ((curNode = curNode.getNextSibling())) {
	                if (isIfEndNode(curNode, config)) {
	                    return curNode;
	                }
	            }
	        },

	        getNoEndNodeError: function () {
	            return new Error('the if directive is not properly ended!');
	        },

	        $name: 'IfDirectiveParser',

	        IF_START: 1,
	        ELIF: 2,
	        ELSE: 3,
	        IF_END: 4
	    }
	);

	module.exports = IfDirectiveParser;
	Tree.registeParser(module.exports);

	function handleBranches(branches, showIndex) {
	    utils.each(branches, function (branchTree, j) {
	        if (!branchTree) {
	            return;
	        }

	        var fn = j === showIndex ? 'restoreFromDark' : 'goDark';
	        branchTree[fn]();
	    });
	}

	function isIfEndNode(node, config) {
	    return getIfNodeType(node, config) === IfDirectiveParser.IF_END;
	}

	function getIfNodeType(node, config) {
	    var nodeType = node.getNodeType();
	    if (nodeType !== Node.COMMENT_NODE) {
	        return;
	    }

	    var nodeValue = node.getNodeValue();
	    if (config.ifPrefixRegExp.test(nodeValue)) {
	        return IfDirectiveParser.IF_START;
	    }

	    if (config.elifPrefixRegExp.test(nodeValue)) {
	        return IfDirectiveParser.ELIF;
	    }

	    if (config.elsePrefixRegExp.test(nodeValue)) {
	        return IfDirectiveParser.ELSE;
	    }

	    if (config.ifEndPrefixRegExp.test(nodeValue)) {
	        return IfDirectiveParser.IF_END;
	    }
	}


/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @file 表达式解析器，一个文本节点或者元素节点对应一个表达式解析器实例。
	 *       包含的比较重要的几个属性：
	 *       - 1、node ：当前节点，是nodes/Node类型的，可能为元素节点和文本节点；
	 *       - 2、exprs ：当前节点上所有的表达式，比如：['----${name}', '$name']；
	 *       - 3、exprFns ：表达式函数和节点更新函数
	 *           - 1、exprFns[i].exprFn ：计算表达式值的函数，类型是`function(ScopeModel):*`；
	 *           - 2、exprFns[i].updateFns ：根据表达式值去更新dom的函数数组，类型是`[function(*)]`。
	 *       - 4、tree ：当前解析器挂靠的树。
	 * @author yibuyisheng(yibuyisheng@163.com)
	 */

	var Parser = __webpack_require__(4);
	var utils = __webpack_require__(7);
	var Tree = __webpack_require__(10);
	var Node = __webpack_require__(8);

	module.exports = Parser.extends(
	    {

	        /**
	         * 初始化
	         *
	         * @inheritDoc
	         * @param  {Object} options 参数
	         * @param  {Node} options.node 要解析的DOM节点
	         */
	        initialize: function (options) {
	            Parser.prototype.initialize.apply(this, arguments);

	            this.node = options.node;

	            this.exprs = [];
	            this.exprFns = {};
	            this.exprOldValues = {};

	            /**
	             * DOM节点属性与更新属性的任务id的映射
	             * @type {Object}
	             */
	            this.attrToDomTaskIdMap = {};
	        },

	        /**
	         * 搜集过程
	         *
	         * @public
	         */
	        collectExprs: function () {
	            var me = this;
	            var nodeType = this.node.getNodeType();
	            var domUpdater = this.tree.getTreeVar('domUpdater');

	            // 文本节点
	            if (nodeType === Node.TEXT_NODE) {
	                var nodeValue = this.node.getNodeValue();
	                if (isExpr(nodeValue)) {
	                    this.addExpr(
	                        nodeValue,
	                        utils.bind(
	                            function (taskId, domUpdater, node, exprValue) {
	                                domUpdater.addTaskFn(taskId, function () {
	                                    node.setNodeValue(exprValue);
	                                });
	                            },
	                            null,
	                            domUpdater.generateTaskId(),
	                            domUpdater,
	                            this.node
	                        )
	                    );
	                }
	                return;
	            }

	            // 元素节点
	            if (nodeType === Node.ELEMENT_NODE) {
	                var attributes = this.node.getAttributes();
	                for (var i = 0, il = attributes.length; i < il; i++) {
	                    var attribute = attributes[i];
	                    if (!isExpr(attribute.value)) {
	                        continue;
	                    }
	                    this.addExpr(
	                        attribute.value,
	                        utils.bind(
	                            updateAttr,
	                            null,
	                            this.getTaskId(attribute.name),
	                            domUpdater,
	                            this.node,
	                            attribute.name
	                        )
	                    );
	                }
	            }

	            function updateAttr(taskId, domUpdater, node, attrName, exprValue) {
	                domUpdater.addTaskFn(taskId, function () {
	                    node.attr(attrName, exprValue);
	                });
	            }

	            function isExpr(expr) {
	                return me.tree.getTreeVar('config').getExprRegExp().test(expr);
	            }
	        },

	        /**
	         * 添加表达式
	         *
	         * @private
	         * @param {string} expr     表达式，比如： `${name}` 或者 `prefix string ${name}suffix string`
	         * @param {function(*)} updateFn 根据表达式值更新界面的函数
	         */
	        addExpr: function (expr, updateFn) {
	            if (!this.exprFns[expr]) {
	                this.exprs.push(expr);
	                this.exprFns[expr] = {
	                    exprFn: this.createExprFn(expr),
	                    updateFns: [updateFn]
	                };
	            }
	            else {
	                this.exprFns[expr].updateFns.push(updateFn);
	            }
	        },

	        linkScope: function () {
	            // 拿scope里面的数据初始化一下
	            var exprs = this.exprs;
	            var exprOldValues = this.exprOldValues;
	            for (var i = 0, il = exprs.length; i < il; i++) {
	                var expr = exprs[i];
	                var exprValue = this.exprFns[expr].exprFn(this.tree.rootScope);

	                var updateFns = this.exprFns[expr].updateFns;
	                for (var j = 0, jl = updateFns.length; j < jl; j++) {
	                    updateFns[j](exprValue);
	                }

	                exprOldValues[expr] = exprValue;
	            }

	            Parser.prototype.linkScope.call(this);
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
	            this.node = null;
	            this.exprs = null;
	            this.exprFns = null;
	            this.exprOldValues = null;
	            this.attrToDomTaskIdMap = null;

	            Parser.prototype.destroy.call(this);
	        },

	        /**
	         * 节点“隐藏”起来
	         *
	         * @public
	         */
	        goDark: function () {
	            this.node.hide();
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
	                var exprValue = this.exprFns[expr].exprFn(this.tree.rootScope);

	                if (this.dirtyCheck(expr, exprValue, exprOldValues[expr])) {
	                    var updateFns = this.exprFns[expr].updateFns;
	                    for (var j = 0, jl = updateFns.length; j < jl; j++) {
	                        updateFns[j](exprValue);
	                    }
	                }

	                exprOldValues[expr] = exprValue;
	            }

	            Parser.prototype.onChange.apply(this, arguments);
	        },

	        /**
	         * 节点“显示”出来
	         *
	         * @public
	         */
	        restoreFromDark: function () {
	            this.node.show();
	            this.isGoDark = false;
	        },

	        /**
	         * 根据DOM节点的属性名字拿到一个任务id。
	         *
	         * @protected
	         * @param  {string} attrName 属性名字
	         * @return {string}          任务id
	         */
	        getTaskId: function (attrName) {
	            if (!this.attrToDomTaskIdMap[attrName]) {
	                this.attrToDomTaskIdMap[attrName] = this.tree.getTreeVar('domUpdater').generateTaskId();
	            }
	            return this.attrToDomTaskIdMap[attrName];
	        },

	        /**
	         * 创建根据scopeModel计算表达式值的函数
	         *
	         * @protected
	         * @param  {string} expr   含有表达式的字符串
	         * @return {function(Scope):*}
	         */
	        createExprFn: function (expr) {
	            var parser = this;
	            return function (scopeModel) {
	                // 此处要分两种情况：
	                // 1、expr并不是纯正的表达式，如`==${name}==`。
	                // 2、expr是纯正的表达式，如`${name}`。
	                // 对于不纯正表达式的情况，此处的返回值肯定是字符串；
	                // 而对于纯正的表达式，此处就不要将其转换成字符串形式了。

	                var config = parser.tree.getTreeVar('config');
	                var exprCalculater = parser.tree.getTreeVar('exprCalculater');
	                var regExp = config.getExprRegExp();

	                var possibleExprCount = expr.match(new RegExp(utils.regExpEncode(config.exprPrefix), 'g'));
	                possibleExprCount = possibleExprCount ? possibleExprCount.length : 0;

	                // 不纯正
	                if (possibleExprCount !== 1 || expr.replace(regExp, '')) {
	                    return expr.replace(regExp, function () {
	                        exprCalculater.createExprFn(arguments[1]);
	                        return exprCalculater.calculate(arguments[1], false, scopeModel);
	                    });
	                }

	                // 纯正
	                var pureExpr = expr.slice(config.exprPrefix.length, -config.exprSuffix.length);
	                exprCalculater.createExprFn(pureExpr);
	                return exprCalculater.calculate(pureExpr, false, scopeModel);
	            };
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
	            var nodeType = node.getNodeType();
	            return nodeType === Node.ELEMENT_NODE || nodeType === Node.TEXT_NODE;
	        },

	        $name: 'ExprParser'
	    }
	);

	Tree.registeParser(module.exports);



/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @file 表达式计算器
	 * @author yibuyisheng(yibuyisheng@163.com)
	 */

	var utils = __webpack_require__(7);

	function ExprCalculater() {
	    this.fns = {};

	    this.exprNameMap = {};
	    this.exprNameRegExp = /\.?\$?([a-z|A-Z]+|([a-z|A-Z]+[0-9]+[a-z|A-Z]*))/g;
	}

	ExprCalculater.prototype.createExprFn = function (expr, avoidReturn) {
	    if (expr === 'klass') {
	        throw new Error('`klass` is the preserved word for `class`');
	    }
	    // 对expr='class'进行下转换
	    if (expr === 'class') {
	        expr = 'klass';
	    }

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
	    // 对expr='class'进行下转换
	    if (expr === 'class') {
	        expr = 'klass';
	    }

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


/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @file DOM 更新器
	 * @author yibuyisheng(yibuyisheng@163.com)
	 */

	var utils = __webpack_require__(7);

	function DomUpdater() {
	    this.tasks = {};
	    this.isExecuting = false;
	    this.doneFns = [];
	    this.counter = 0;
	}

	DomUpdater.prototype.generateTaskId = function () {
	    return this.counter++;
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
	                // try {
	                //     taskFn();
	                // }
	                // catch (e) {
	                //     log.warn(e);
	                // }
	                taskFn();
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


/***/ },
/* 16 */
/***/ function(module, exports) {

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


/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @file 管理节点的工具
	 * @author yibuyisheng(yibuyisheng@163.com)
	 */

	var Base = __webpack_require__(5);
	var Node = __webpack_require__(8);

	var NodesManager = Base.extends(
	    {
	        initialize: function () {
	            this.$idCounter = 0;
	            this.$nodesMap = {};
	        },

	        /**
	         * 根据 domNode 拿到对应的经过包装的 nodes/Node 实例
	         *
	         * @public
	         * @param  {Node} domNode dom节点
	         * @return {nodes/Node}      nodes/Node 实例
	         */
	        getNode: function (domNode) {
	            var nodeId = domNode.$nodeId;

	            if (!nodeId) {
	                nodeId = domNode.$nodeId = ++this.$idCounter;
	                this.$nodesMap[nodeId] = new Node(domNode, this);
	            }

	            return this.$nodesMap[nodeId];
	        },

	        /**
	         * 销毁所有的节点
	         *
	         * @public
	         */
	        destroy: function () {
	            for (var id in this.$nodesMap) {
	                this.$nodesMap[id].destroy();
	            }
	        },

	        createElement: function () {
	            return this.getNode(document.createElement.apply(document, arguments));
	        }
	    },
	    {
	        $name: 'NodesManager'
	    }
	);


	module.exports = NodesManager;


/***/ }
/******/ ]);