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
import Node from '../nodes/Node';
import {line2camel, isPureObject, isExpr} from '../utils';
import DomUpdater from '../DomUpdater';
// import log from '../log';

const EXPRESION_UPDATE_FUNCTIONS = Symbol('expressionUpdateFunctions');

export default class ExprParser extends Parser {

    /**
     * 初始化
     *
     * @inheritDoc
     * @param  {Object} options 参数
     * @param  {Node} options.node 要解析的DOM节点
     */
    constructor(options) {
        super(options);

        this[EXPRESION_UPDATE_FUNCTIONS] = {};
    }

    /**
     * 搜集过程
     *
     * @public
     */
    collectExprs() {
        const parserNode = this.startNode;

        const domUpdater = this.tree.getTreeVar('domUpdater');
        if (!(domUpdater instanceof DomUpdater)) {
            throw new Error('the tree has no DOM updater');
        }

        const nodeType = parserNode.getNodeType();
        const exprWatcher = this.tree.getExprWatcher();

        // 文本节点
        if (nodeType === Node.TEXT_NODE) {
            const nodeValue = parserNode.getNodeValue();
            if (isExpr(nodeValue)) {
                exprWatcher.addExpr(nodeValue);

                const updateFns = this[EXPRESION_UPDATE_FUNCTIONS][nodeValue] || [];
                updateFns.push((exprValue, callback) => {
                    domUpdater.addTaskFn(
                        this.getTaskId('nodeValue'),
                        () => {
                            this.setAttr('nodeValue', exprValue);
                            callback && callback();
                        }
                    );
                });
                this[EXPRESION_UPDATE_FUNCTIONS][nodeValue] = updateFns;
            }
        }
        // 元素节点
        else if (nodeType === Node.ELEMENT_NODE) {
            const attributes = parserNode.getAttributes();
            const attrs = {};
            for (let i = 0, il = attributes.length; i < il; ++i) {
                const attribute = attributes[i];
                attrs[line2camel(attribute.name)] = true;

                if (!isExpr(attribute.value)) {
                    this.setAttr(attribute.name, attribute.value);
                    continue;
                }

                if (Node.isEventName(attribute.name) || attribute.name === 'on-outclick') {
                    this.setEvent(attribute.name, attribute.value);
                }
                else {
                    exprWatcher.addExpr(attribute.value);

                    const updateFns = this[EXPRESION_UPDATE_FUNCTIONS][attribute.value] || [];
                    attribute.name === 'd-rest'
                        ? updateFns.push(setRestAttrs.bind(this, attrs))
                        : updateFns.push(
                            updateAttr.bind(this, this.getTaskId(attribute.name), attribute.name)
                        );
                    this[EXPRESION_UPDATE_FUNCTIONS][attribute.value] = updateFns;
                }
            }
        }

        function setRestAttrs(attrs, value) {
            this.setRestAttrs(value, attrs);
        }

        function updateAttr(taskId, attrName, exprValue, callback) {
            domUpdater.addTaskFn(taskId, () => {
                this.setAttr(attrName, exprValue);
                callback && callback();
            });
        }
    }

    setRestAttrs(value, attrs) {
        if (!value || typeof value !== 'object') {
            return;
        }

        for (let key in value) {
            if (!(key in attrs)) {
                this.setAttr(key, value[key]);
            }
        }
    }

    setEvent(attrName, attrValue) {
        if (!attrValue) {
            return;
        }

        let eventName = attrName.replace('on-', '');
        this.startNode.off(eventName);
        this.startNode.on(eventName, event => {
            attrValue = attrValue.replace(/^\${|}$/g, '');

            let exprCalculater = this.tree.getTreeVar('exprCalculater');
            exprCalculater.createExprFn(attrValue, true);

            let localScope = new ScopeModel();
            localScope.setParent(this.tree.rootScope);
            localScope.set('event', event);
            exprCalculater.calculate(attrValue, true, localScope, true);
        });
    }

    /**
     * 设置属性
     *
     * @protected
     * @param {string} attrName  属性名
     * @param {string} attrValue 属性值
     */
    setAttr(attrName, attrValue) {
        if (attrName === 'nodeValue') {
            this.setNodeValue(attrValue);
        }
        else {
            this.startNode.attr(attrName, attrValue);
        }
    }

    /**
     * 设置文本节点的“nodeValue”，此处对html的情况也做了支持
     *
     * @private
     * @param {*} value 要设置的值
     */
    setNodeValue(value) {
        this.startNode.setNodeValue(value);
    }

    /**
     * 将界面更新相关函数和scopeModel关联起来，顺便记得在初始的时候刷一下界面
     *
     * @public
     */
    linkScope() {
        let exprWatcher = this.tree.getExprWatcher();
        exprWatcher.on('change', event => {
            let updateFns = this[EXPRESION_UPDATE_FUNCTIONS][event.expr];
            // 此处并不会处理isGoDark为true的情况，因为Node那边处理了。
            if (updateFns && updateFns.length) {
                updateFns.forEach(fn => fn(event.newValue));
            }
        });
    }

    initRender() {
        let exprWatcher = this.tree.getExprWatcher();
        for (let expr in this[EXPRESION_UPDATE_FUNCTIONS]) {
            if (!this[EXPRESION_UPDATE_FUNCTIONS].hasOwnProperty(expr)) {
                continue;
            }

            const fns = this[EXPRESION_UPDATE_FUNCTIONS][expr];
            fns.forEach(execute.bind(null, expr));
        }

        function execute(expr, fn) {
            fn(exprWatcher.calculate(expr));
        }
    }

    /**
     * 销毁
     *
     * @inheritDoc
     */
    destroy() {
        this[EXPRESION_UPDATE_FUNCTIONS] = null;

        super.destroy();
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
        domUpdater.addTaskFn(taskId, () => this.startNode.hide());

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
        domUpdater.addTaskFn(taskId, () => this.startNode.show());

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
        const domUpdater = this.tree.getTreeVar('domUpdater');
        return domUpdater.generateNodeAttrUpdateId(this.startNode, attrName);
    }

    /**
     * 判断节点是否是应该由当前处理器来处理
     *
     * @static
     * @param  {Node}  node 节点
     * @return {boolean}
     */
    static isProperNode(node) {
        let nodeType = node.getNodeType();
        return nodeType === Node.ELEMENT_NODE || nodeType === Node.TEXT_NODE;
    }
}
