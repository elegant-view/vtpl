/**
 * @file 表达式解析器，一个文本节点或者元素节点对应一个表达式解析器实例。
 *       包含的比较重要的几个属性：
 *       - 1、node ：当前节点，是nodes/Node类型的，可能为元素节点和文本节点；
 *       - 2、exprFns ：表达式函数和节点更新函数
 *           - 1、exprFns[expr].exprFn ：计算表达式值的函数，类型是`function(ScopeModel):*`；
 *           - 2、exprFns[expr].updateFns ：根据表达式值去更新dom的函数数组，类型是`[function(*)]`。
 *       - 3、tree ：当前解析器挂靠的树。
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import ScopeModel from '../ScopeModel';

import Parser from './Parser';
import {bind} from '../utils';
import Tree from '../trees/Tree';
import Node from '../nodes/Node';
// import log from '../log';

class ExprParser extends Parser {

    /**
     * 初始化
     *
     * @inheritDoc
     * @param  {Object} options 参数
     * @param  {Node} options.node 要解析的DOM节点
     */
    constructor(options) {
        super(options);

        this.node = options.node;

        this.exprFns = {};
        this.exprOldValues = {};

        /**
         * DOM节点属性与更新属性的任务id的映射
         * @type {Object}
         */
        this.attrToDomTaskIdMap = {};

        this.isGoDark = false;
    }

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
                        function (taskId, domUpdater, exprValue, callback) {
                            var parser = this;
                            domUpdater.addTaskFn(taskId, function () {
                                parser.setAttr('nodeValue', exprValue);
                                callback && callback();
                            });
                        },
                        this,
                        domUpdater.generateNodeAttrUpdateId(this.node, 'nodeValue'),
                        domUpdater
                    )
                );
            }
            return;
        }

        // 元素节点
        if (nodeType === Node.ELEMENT_NODE) {
            var attributes = this.node.getAttributes();
            for (var i = 0, il = attributes.length; i < il; ++i) {
                var attribute = attributes[i];
                if (!isExpr(attribute.value)) {
                    this.setAttr(attribute.name, attribute.value);
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
                        attribute.name
                    )
                );
            }
        }

        function updateAttr(taskId, domUpdater, attrName, exprValue, callback) {
            domUpdater.addTaskFn(taskId, () => {
                me.setAttr(attrName, exprValue);
                callback && callback();
            });
        }

        function isExpr(expr) {
            return me.tree.getTreeVar('config').getExprRegExp().test(expr);
        }
    }

    /**
     * 设置属性
     *
     * @protected
     * @param {string} attrName  属性名
     * @param {string} attrValue 属性值
     */
    setAttr(attrName, attrValue) {
        if (Node.isEventName(attrName) || attrName === 'on-outclick') {
            let eventName = attrName.replace('on-', '');
            this.node.off(eventName);
            this.node.on(eventName, event => {
                let exprCalculater = this.tree.getTreeVar('exprCalculater');
                exprCalculater.createExprFn(attrValue, true);

                let localScope = new ScopeModel();
                localScope.setParent(this.tree.rootScope);
                localScope.set('event', event);
                exprCalculater.calculate(attrValue, true, localScope);
            });
        }
        else {
            this.node.attr(attrName, attrValue);
        }
    }

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
    }

    /**
     * 将界面更新相关函数和scopeModel关联起来，顺便记得在初始的时候刷一下界面
     *
     * @public
     */
    linkScope() {
        this.renderToDom();
        this.listenToChange(this.tree.rootScope, event => {
            this.renderToDom(event.changes);
        });
    }

    /**
     * 用当前的scopeModel扫描一下exprFns，做相应的更新。
     *
     * @protected
     * @param {Array.<Object>} changes 发生的改变
     */
    renderToDom(changes) {
        if (this.isGoDark) {
            return;
        }

        let exprFns = this.exprFns;
        let exprOldValues = this.exprOldValues;
        let scopeModel = this.tree.rootScope;

        this.renderChanges(exprFns, exprOldValues, scopeModel, changes);
    }

    // ComponentParser要复用这段代码
    renderChanges(exprFns, exprOldValues, scopeModel, changes) {
        let exprValue;
        let updateFns;
        let i;
        let j;
        let jl;
        let il;
        let expr;

        if (changes) {
            for (i = 0, il = changes.length; i < il; ++i) {
                let exprs = this.getExprsByParamName(changes[i].name) || [];

                // log.info(`param: '${changes[i].name}' changed, and will update these exprs: ${exprs}`);

                for (j = 0, jl = exprs.length; j < jl; ++j) {
                    expr = exprs[j];
                    exprValue = exprFns[expr].exprFn(scopeModel);

                    // log.info(`get the value of expr: '${expr}', it is ${exprValue}`);

                    if (this.dirtyCheck(expr, exprValue, exprOldValues[expr])) {
                        updateFns = exprFns[expr].updateFns;
                        for (let k = 0, kl = updateFns.length; k < kl; ++k) {
                            updateFns[k](exprValue);
                        }

                        exprOldValues[expr] = exprValue;
                    }
                }
            }
        }
        else {
            /* eslint-disable guard-for-in */
            for (expr in exprFns) {
            /* eslint-enable guard-for-in */
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
    }

    /**
     * 获取开始节点
     *
     * @protected
     * @inheritDoc
     * @return {Node}
     */
    getStartNode() {
        return this.node;
    }

    /**
     * 获取结束节点
     *
     * @protected
     * @inheritDoc
     * @return {Node}
     */
    getEndNode() {
        return this.node;
    }

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
    }

    /**
     * 节点“隐藏”起来
     *
     * @public
     */
    goDark() {
        if (this.isGoDark) {
            return;
        }
        // 前面故意保留一个空格，因为DOM中不可能出现节点的属性key第一个字符为空格的，
        // 避免了冲突。
        let taskId = this.getTaskId(' hide');
        let domUpdater = this.tree.getTreeVar('domUpdater');
        domUpdater.addTaskFn(taskId, () => this.node.hide());

        this.isGoDark = true;
    }

    /**
     * 节点“显示”出来
     *
     * @public
     */
    restoreFromDark() {
        if (!this.isGoDark) {
            return;
        }
        let taskId = this.getTaskId(' hide');
        let domUpdater = this.tree.getTreeVar('domUpdater');
        domUpdater.addTaskFn(taskId, () => this.node.show());

        this.isGoDark = false;
    }

    /**
     * 根据DOM节点的属性名字拿到一个任务id。
     *
     * @protected
     * @param  {string} attrName 属性名字
     * @return {string}          任务id
     */
    getTaskId(attrName) {
        return this.tree.getTreeVar('domUpdater').generateNodeAttrUpdateId(this.node, attrName);
    }

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

        var exprCalculaterObj = genMultiExprFnObj.call(this, expr, regExp);
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
            // 去掉表达式的空格。
            // 对于this.node.getNodeType()===Node.TEXT_NODE的情况来说，这可能影响显示情况，
            // 事实上，不应该用代码里面的这种空格来处理间距。
            expr = expr.replace(/^\s+/, '').replace(/\s+$/, '');

            let exprs = expr.match(regExp);
            let paramNames = [];
            for (let i = 0, il = exprs.length; i < il; ++i) {
                exprs[i] = exprs[i].slice(config.exprPrefix.length, -config.exprSuffix.length);
                let names = exprCalculater.createExprFn(exprs[i]).paramNames;
                paramNames.push.apply(paramNames, names);
            }

            // 是否是纯正的表达式
            let isPure = !(exprs.length !== 1 || expr.replace(regExp, ''));

            let calculateFn = isPure
                ? scopeModel => {
                    return exprCalculater.calculate(
                        exprs[0],
                        false,
                        scopeModel
                    );
                }
                : scopeModel => {
                    return expr.replace(regExp, (...args) => {
                        return exprCalculater.calculate(args[1], false, scopeModel);
                    });
                };

            return {
                paramNames,
                fn: calculateFn
            };
        }
    }

    /**
     * 判断节点是否是应该由当前处理器来处理
     *
     * @static
     * @param  {Node}  node 节点
     * @return {boolean}
     */
    static isProperNode(node) {
        var nodeType = node.getNodeType();
        return nodeType === Node.ELEMENT_NODE || nodeType === Node.TEXT_NODE;
    }
}

Tree.registeParser(ExprParser);
export default ExprParser;
