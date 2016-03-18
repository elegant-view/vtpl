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
import Node from '../nodes/Node';
import {forEach, line2camel, isPureObject} from '../utils';
// import log from '../log';

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

        this.node = options.node;

        this.isGoDark = false;

        this.$exprUpdateFns = {};
    }

    /**
     * 搜集过程
     *
     * @public
     */
    collectExprs() {
        let nodeType = this.node.getNodeType();
        let domUpdater = this.tree.getTreeVar('domUpdater');
        let exprWatcher = this.tree.getExprWatcher();

        // 文本节点
        if (nodeType === Node.TEXT_NODE) {
            let nodeValue = this.node.getNodeValue();
            if (isExpr(nodeValue)) {
                exprWatcher.addExpr(nodeValue);

                let updateFns = this.$exprUpdateFns[nodeValue] || [];
                updateFns.push((exprValue, callback) => {
                    let parser = this;
                    domUpdater.addTaskFn(
                        this.getTaskId('nodeValue'),
                        () => {
                            parser.setAttr('nodeValue', exprValue);
                            callback && callback();
                        }
                    );
                });
                this.$exprUpdateFns[nodeValue] = updateFns;
            }
            return;
        }

        // 元素节点
        if (nodeType === Node.ELEMENT_NODE) {
            let attributes = this.node.getAttributes();
            let attrs = {};
            for (let i = 0, il = attributes.length; i < il; ++i) {
                let attribute = attributes[i];
                attrs[line2camel(attribute.name)] = true;

                if (!isExpr.call(this, attribute.value)) {
                    this.setAttr(attribute.name, attribute.value);
                    continue;
                }

                if (Node.isEventName(attribute.name) || attribute.name === 'on-outclick') {
                    this.setEvent(attribute.name, attribute.value);
                }
                else {
                    exprWatcher.addExpr(attribute.value);

                    let updateFns = this.$exprUpdateFns[attribute.value] || [];
                    attribute.name === 'd-rest'
                        ? updateFns.push(value => this.setRestAttrs(value, attrs))
                        : updateFns.push(
                            bind(updateAttr, this, this.getTaskId(attribute.name), domUpdater, attribute.name)
                        );
                    this.$exprUpdateFns[attribute.value] = updateFns;
                }
            }
        }

        function updateAttr(taskId, domUpdater, attrName, exprValue, callback) {
            domUpdater.addTaskFn(taskId, () => {
                this.setAttr(attrName, exprValue);
                callback && callback();
            });
        }

        function isExpr(expr) {
            return /\$\{(.+?)}/.test(expr);
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
        this.node.off(eventName);
        this.node.on(eventName, event => {
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
            this.node.attr(attrName, attrValue);
        }
    }

    /**
     * 设置文本节点的“nodeValue”，此处对html的情况也做了支持
     *
     * @private
     * @param {*} value 要设置的值
     */
    setNodeValue(value) {
        if (isPureObject(value) && value.type === 'html') {
            let nodesManager = this.tree.getTreeVar('nodesManager');
            let fragment = nodesManager.createDocumentFragment();
            fragment.setInnerHTML(value.html);
            let childNodes = fragment.getChildNodes();

            let baseNode;
            if (this.startNode && this.endNode) {
                baseNode = this.startNode;
            }
            else {
                baseNode = this.node;
            }

            for (let childNode of childNodes) {
                baseNode.getParentNode().insertBefore(childNode, baseNode);
            }

            this.node.setNodeValue('');
            removeNodes(this.startNode, this.endNode);

            this.startNode = childNodes[0];
            this.endNode = childNodes[childNodes.length - 1];
        }
        else {
            if (this.startNode && this.endNode) {
                removeNodes(this.startNode, this.endNode);
                this.startNode = this.endNode = null;
            }

            this.node.setNodeValue(value);
        }

        function removeNodes(startNode, endNode) {
            let delayFns = [];
            for (let curNode = startNode;
                curNode && !curNode.isAfter(endNode);
                curNode = curNode.getNextSibling()
            ) {
                delayFns.push(
                    bind(curNode => curNode.remove(), null, curNode)
                );
            }
            for (let fn of delayFns) {
                fn();
            }
        }
    }

    /**
     * 将界面更新相关函数和scopeModel关联起来，顺便记得在初始的时候刷一下界面
     *
     * @public
     */
    linkScope() {
        let exprWatcher = this.tree.getExprWatcher();
        exprWatcher.on('change', event => {
            let updateFns = this.$exprUpdateFns[event.expr];
            // 此处并不会处理isGoDark为true的情况，因为Node那边处理了。
            if (updateFns && updateFns.length) {
                forEach(updateFns, fn => fn(event.newValue));
            }
        });
    }

    initRender() {
        let exprWatcher = this.tree.getExprWatcher();
        forEach(this.$exprUpdateFns, (fns, expr) => {
            forEach(fns, fn => fn(exprWatcher.calculate(expr)));
        });
    }

    /**
     * 获取开始节点
     *
     * @protected
     * @inheritDoc
     * @return {Node}
     */
    getStartNode() {
        if (this.startNode) {
            return this.startNode;
        }

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
        if (this.endNode) {
            return this.endNode;
        }

        return this.node;
    }

    /**
     * 销毁
     *
     * @inheritDoc
     */
    destroy() {
        this.node = null;
        this.$exprUpdateFns = null;

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
