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

import ScopeModel from '../ScopeModel';

import Parser from './Parser';
import {bind} from '../utils';
import Tree from '../trees/Tree';
import Node from '../nodes/Node';
import log from '../log';

const ExprParser = Parser.extends(
    {

        /**
         * 初始化
         *
         * @inheritDoc
         * @param  {Object} options 参数
         * @param  {Node} options.node 要解析的DOM节点
         */
        initialize(options) {
            Parser.prototype.initialize.apply(this, arguments);

            this.node = options.node;

            this.exprFns = {};
            this.exprOldValues = {};

            /**
             * DOM节点属性与更新属性的任务id的映射
             * @type {Object}
             */
            this.attrToDomTaskIdMap = {};

            /**
             * 变量名到表达式的映射。也就是说这个表达式依赖于这个变量，
             * 只要这个变量发生了改变，这个表达式的值就可能发生改变。
             * @type {Object}
             */
            this.$paramNameToExprMap = {};
        },

        /**
         * 搜集过程
         *
         * @public
         */
        collectExprs() {
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
                        bind(
                            function (taskId, domUpdater, node, exprValue) {
                                var parser = this;
                                domUpdater.addTaskFn(taskId, function () {
                                    parser.setTextNodeValue(node, exprValue);
                                });
                            },
                            this,
                            domUpdater.generateNodeAttrUpdateId(this.node, 'nodeValue'),
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
                        this.setAttr(this.node, attribute.name, attribute.value);
                        continue;
                    }
                    this.addExpr(
                        this.exprFns,
                        attribute.value,
                        bind(
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
                    me.setAttr(node, attrName, exprValue);
                });
            }

            function isExpr(expr) {
                return me.tree.getTreeVar('config').getExprRegExp().test(expr);
            }
        },

        setTextNodeValue(textNode, value) {
            textNode.setNodeValue(value);
        },

        setAttr(node, attrName, attrValue) {
            if (Node.isEventName(attrName)) {
                node.on(attrName.replace('on-', ''), event => {
                    let exprCalculater = this.tree.getTreeVar('exprCalculater');
                    exprCalculater.createExprFn(attrValue, true);

                    let localScope = new ScopeModel();
                    localScope.setParent(this.tree.rootScope);
                    localScope.set('event', event);
                    exprCalculater.calculate(attrValue, true, localScope);
                });
            }
            else {
                node.attr(attrName, attrValue);
            }
        },

        /**
         * 添加表达式
         *
         * @protected
         * @param {Object} mountObj 挂靠在的对象
         * @param {string} expr   表达式，比如： `${name}` 或者 `prefix string ${name}suffix string`
         * @param {function(*)} updateFn 根据表达式值更新界面的函数
         */
        addExpr(mountObj, expr, updateFn) {
            if (!mountObj[expr]) {
                var calculaterObj = this.createExprFn(expr);

                this.addParamName2ExprMap(calculaterObj.paramNames, expr);

                mountObj[expr] = {
                    exprFn: calculaterObj.fn,
                    updateFns: [updateFn]
                };
            }
            else {
                mountObj[expr].updateFns.push(updateFn);
            }
        },

        // 添加变量名到表达式的映射
        addParamName2ExprMap(names, expr) {
            for (var i = 0, il = names.length; i < il; ++i) {
                var paramName = names[i];
                var exprArr = this.$paramNameToExprMap[paramName] || [];
                exprArr.push(expr);
                this.$paramNameToExprMap[paramName] = exprArr;
            }
        },

        linkScope() {
            this.renderToDom(this.exprFns, this.exprOldValues, this.tree.rootScope);
            Parser.prototype.linkScope.call(this);
        },

        // 在model发生改变的时候计算一下表达式的值->脏检测->更新界面。
        onChange(model, changes) {
            if (this.isGoDark) {
                return;
            }

            this.renderToDom(this.exprFns, this.exprOldValues, this.tree.rootScope, changes);
            Parser.prototype.onChange.apply(this, arguments);
        },

        // 用当前的scopeModel扫描一下exprFns，做相应的更新。
        renderToDom(exprFns, exprOldValues, scopeModel, changes) {
            var exprValue;
            var updateFns;
            var i;
            var j;
            var jl;
            var il;
            var expr;

            if (changes) {
                for (i = 0, il = changes.length; i < il; ++i) {
                    var exprs = this.$paramNameToExprMap[changes[i].name] || [];

                    // log.info(`param: '${changes[i].name}' changed, and will update these exprs: ${exprs}`);

                    for (j = 0, jl = exprs.length; j < jl; ++j) {
                        expr = exprs[j];
                        exprValue = exprFns[expr].exprFn(scopeModel);

                        // log.info(`get the value of expr: '${expr}', it is ${exprValue}`);

                        if (this.dirtyCheck(expr, exprValue, exprOldValues[expr])) {
                            updateFns = exprFns[expr].updateFns;
                            for (var k = 0, kl = updateFns.length; k < kl; ++k) {
                                updateFns[k](exprValue);
                            }

                            exprOldValues[expr] = exprValue;
                        }
                    }
                }
            }
            else {
                for (expr in exprFns) {
                    exprValue = exprFns[expr].exprFn(scopeModel);

                    if (this.dirtyCheck(expr, exprValue, exprOldValues[expr])) {
                        updateFns = exprFns[expr].updateFns;
                        for (j = 0, jl = updateFns.length; j < jl; j++) {
                            updateFns[j](exprValue);
                        }

                        exprOldValues[expr] = exprValue;
                    }
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
        getStartNode() {
            return this.node;
        },

        /**
         * 获取结束节点
         *
         * @protected
         * @inheritDoc
         * @return {Node}
         */
        getEndNode() {
            return this.node;
        },

        /**
         * 销毁
         *
         * @inheritDoc
         */
        destroy() {
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
        goDark() {
            this.node.hide();
            this.isGoDark = true;
        },

        /**
         * 节点“显示”出来
         *
         * @public
         */
        restoreFromDark() {
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
        getTaskId(attrName) {
            if (!this.attrToDomTaskIdMap[attrName]) {
                this.attrToDomTaskIdMap[attrName] = this.tree.getTreeVar('domUpdater').generateTaskId();
            }
            return this.attrToDomTaskIdMap[attrName];
        },

        /**
         * 创建根据scopeModel计算表达式值的函数
         *
         * 此处要分两种情况：
         * 1、expr并不是纯正的表达式，如`==${name}==`。
         * 2、expr是纯正的表达式，如`${name}`。
         * 对于不纯正表达式的情况，此处的返回值肯定是字符串；
         * 而对于纯正的表达式，此处就不要将其转换成字符串形式了。
         *
         * @protected
         * @param  {string} expr   含有表达式的字符串
         * @return {function(Scope):*}
         */
        createExprFn(expr) {
            var parser = this;

            var config = parser.tree.getTreeVar('config');
            var exprCalculater = parser.tree.getTreeVar('exprCalculater');
            var regExp = config.getExprRegExp();

            var exprCalculaterObj = genMultiExprFnObj(expr, regExp);
            return exprCalculaterObj;

            /**
             * 生成计算表达式值的函数，并拿到该表达式所依赖的变量名，
             * 这样就可以在后面数据变化的时候，选择性地更新表达式值。
             *
             * @inner
             * @param  {string} expr   原始的表达式，可能包含干扰字符串，比如`---${name}---`
             * @param  {RegExp} regExp 能匹配出表达式的正则对象
             * @return {Object}
             */
            function genMultiExprFnObj(expr, regExp) {
                var exprs = expr.match(regExp);
                var paramNames = [];
                for (var i = 0, il = exprs.length; i < il; ++i) {
                    exprs[i] = exprs[i].slice(config.exprPrefix.length, -config.exprSuffix.length);
                    var names = exprCalculater.createExprFn(exprs[i]).paramNames;
                    paramNames.push.apply(paramNames, names);
                }

                // 是否是纯正的表达式
                var isPure = !(exprs.length !== 1 || expr.replace(regExp, ''));

                var calculateFn = isPure
                    ? function (scopeModel) {
                        return exprCalculater.calculate(
                            exprs[0],
                            false,
                            scopeModel
                        );
                    }
                    : function (scopeModel) {
                        return expr.replace(regExp, function () {
                            return exprCalculater.calculate(arguments[1], false, scopeModel);
                        });
                    };

                return {
                    paramNames: paramNames,
                    fn: calculateFn
                };
            }
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
        isProperNode(node) {
            var nodeType = node.getNodeType();
            return nodeType === Node.ELEMENT_NODE || nodeType === Node.TEXT_NODE;
        },

        $name: 'ExprParser'
    }
);

Tree.registeParser(ExprParser);
export default ExprParser;
