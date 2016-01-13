/**
 * @file 表达式解析器，一个文本节点或者元素节点对应一个表达式解析器实例。
 *       包含的比较重要的几个属性：
 *       - 1、node ：当前节点，是nodes/Node类型的，可能为元素节点和文本节点；
 *       - 2、exprFns ：表达式函数和节点更新函数
 *           - 1、exprFns[i].exprFn ：计算表达式值的函数，类型是`function(ScopeModel):*`；
 *           - 2、exprFns[i].updateFns ：根据表达式值去更新dom的函数数组，类型是`[function(*)]`。
 *       - 3、tree ：当前解析器挂靠的树。
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var Parser = require('./Parser');
var utils = require('../utils');
var Tree = require('../trees/Tree');
var Node = require('../nodes/Node');

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
                        this.exprFns,
                        nodeValue,
                        utils.bind(
                            function (taskId, domUpdater, node, exprValue) {
                                var parser = this;
                                domUpdater.addTaskFn(taskId, function () {
                                    parser.setTextNodeValue(node, exprValue);
                                });
                            },
                            this,
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
                        this.exprFns,
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

        setTextNodeValue: function (textNode, value) {
            textNode.setNodeValue(value);
        },

        /**
         * 添加表达式
         *
         * @protected
         * @param {Object} mountObj 挂靠在的对象
         * @param {string} expr   表达式，比如： `${name}` 或者 `prefix string ${name}suffix string`
         * @param {function(*)} updateFn 根据表达式值更新界面的函数
         */
        addExpr: function (mountObj, expr, updateFn) {
            if (!mountObj[expr]) {
                mountObj[expr] = {
                    exprFn: this.createExprFn(expr),
                    updateFns: [updateFn]
                };
            }
            else {
                mountObj[expr].updateFns.push(updateFn);
            }
        },

        linkScope: function () {
            this.renderToDom(this.exprFns, this.exprOldValues, this.tree.rootScope);
            Parser.prototype.linkScope.call(this);
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
            this.renderToDom(this.exprFns, this.exprOldValues, this.tree.rootScope);
            Parser.prototype.onChange.apply(this, arguments);
        },

        renderToDom: function (exprFns, exprOldValues, scopeModel) {
            for (var expr in exprFns) {
                var exprValue = exprFns[expr].exprFn(scopeModel);

                if (this.dirtyCheck(expr, exprValue, exprOldValues[expr])) {
                    var updateFns = exprFns[expr].updateFns;
                    for (var j = 0, jl = updateFns.length; j < jl; j++) {
                        updateFns[j](exprValue);
                    }

                    exprOldValues[expr] = exprValue;
                }
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
            this.node = null;
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

