/**
 * @file 表达式解析器，一个文本节点或者元素节点对应一个表达式解析器实例。
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import Parser from './Parser';
import Node from '../nodes/Node';
import {line2camel} from '../utils';
import DoneChecker from '../DoneChecker';
// import log from '../log';

const EXPRESION_UPDATE_FUNCTIONS = Symbol('expressionUpdateFunctions');

/**
 * 用于去掉表达式前后缀的正则
 *
 * @type {RegExp}
 */
const EXPRESION_PURIFY_REG = /^{|}$/g;

/**
 * 匹配事件名前缀的正则
 *
 * @type {RegExp}
 */
const EVENT_PREFIX_REG = /^on-/;

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
        this.expressions = [];

        /**
         * 剩余属性更新函数，暂存作用
         *
         * @private
         * @type {Map.<string, Function>}
         */
        this.restAttributeUpdateFns = {};

        this.eventHandlers = {};
    }

    /**
     * 搜集过程
     *
     * @public
     */
    collectExprs() {
        const parserNode = this.startNode;

        const nodeType = parserNode.getNodeType();
        const exprWatcher = this.getExpressionWatcher();

        // 文本节点
        if (nodeType === Node.TEXT_NODE) {
            const nodeValue = parserNode.getNodeValue();
            if (this.isExpression(nodeValue)) {
                exprWatcher.addExpr(nodeValue);
                this.expressions.push(nodeValue);

                const updateFns = this[EXPRESION_UPDATE_FUNCTIONS][nodeValue] || [];
                updateFns.push(this.createTextNodeUpdateFn());
                this[EXPRESION_UPDATE_FUNCTIONS][nodeValue] = updateFns;

                // 设置一下nodeValue，避免用户看到表达式样子
                this.setNodeValue('');
            }
        }
        // 元素节点
        else if (nodeType === Node.ELEMENT_NODE) {
            const attributes = parserNode.getAttributes();
            const attrs = {};
            for (let i = 0, il = attributes.length; i < il; ++i) {
                const attribute = attributes[i];
                attrs[line2camel(attribute.name)] = true;

                if (Node.isEventName(attribute.name)) {
                    this.createDOMEventListener(attribute.name, attribute.value);
                }
                else if (this.isExpression(attribute.value)) {
                    exprWatcher.addExpr(attribute.value);
                    this.expressions.push(attribute.value);

                    const updateFns = this[EXPRESION_UPDATE_FUNCTIONS][attribute.value] || [];
                    attribute.name === 'ev-rest'
                        ? updateFns.push(this.createRestAttributesUpdateFn(attrs))
                        : updateFns.push(this.createElementNodeUpdateFn(attribute.name));
                    this[EXPRESION_UPDATE_FUNCTIONS][attribute.value] = updateFns;
                }
                else {
                    this.setAttr(attribute.name, attribute.value);
                }
            }
        }
    }

    /**
     * 创建DOM事件监听器。比如有这样的一个元素节点：
     *
     *   <div on-click="onClick(event)">...</div>
     *
     * 那么说明需要监听这个div元素的click事件，其回调函数是对应作用域中的onClick函数
     *
     * @private
     * @param  {string} attrName  属性名，比如`on-click`这种。
     * @param  {string} attrValue 属性值，比如`onClick(event)`这种
     */
    createDOMEventListener(attrName, attrValue) {
        if (!attrValue) {
            return;
        }

        const eventName = attrName.replace(EVENT_PREFIX_REG, '');
        if (this.eventHandlers[eventName]) {
            this.startNode.off(eventName, this.eventHandlers[eventName]);
        }

        attrValue = attrValue.replace(EXPRESION_PURIFY_REG, '');
        const exprCalculater = this.getExpressionCalculater();
        exprCalculater.createExprFn(attrValue, true);

        this.eventHandlers[eventName] = event => {
            const localScope = this.getScope().createChild();
            localScope.set('event', this.getNodesManager().wrapEvent(event));
            exprCalculater.calculate(attrValue, true, localScope, true);
            localScope.destroy();
        };
        this.startNode.on(eventName, this.eventHandlers[eventName]);
    }

    /**
     * 创建“剩余属性”的更新函数。举个例子，假设有这样一个元素节点：
     *
     *   <div name="yibuyisheng" ev-rest="restObject">...</div>
     *
     * 那么在对应作用域上的restObject发生变化之后，会取restObject上除name属性之外的所有属性，设置（setAttribute）到div元素节点上面去。
     *
     * @private
     * @param  {Map.<string, string>} restAttributes 剩余属性
     * @return {Function}
     */
    createRestAttributesUpdateFn(restAttributes) {
        const domUpdater = this.getDOMUpdater();
        const restAttributeUpdateFns = this.restAttributeUpdateFns;
        return (expressionValue, done) => {
            const doneChecker = new DoneChecker(done);

            if (expressionValue && typeof expressionValue === 'object') {
                for (let key in expressionValue) {
                    if (!(key in restAttributes) && key !== 'children') {

                        /* eslint-disable no-loop-func */
                        // 如果已经创建了，就不要重复创建了。
                        if (!restAttributeUpdateFns[key]) {
                            restAttributeUpdateFns[key] = () => this.setAttr(key, expressionValue[key]);
                        }

                        doneChecker.add(innerDone => {
                            domUpdater.addTaskFn(this.getTaskId(key), restAttributeUpdateFns[key], innerDone);
                        });
                        /* eslint-enable no-loop-func */
                    }
                }
            }

            doneChecker.complete();
        };
    }

    /**
     * 创建元素节点属性更新函数。
     *
     * @private
     * @param  {string} attributeName 属性名
     * @return {Function}
     */
    createElementNodeUpdateFn(attributeName) {
        const domUpdater = this.getDOMUpdater();
        const taskId = this.getTaskId(attributeName);
        return (expressionValue, done) => {
            domUpdater.addTaskFn(
                taskId,
                () => this.setAttr(attributeName, expressionValue),
                done
            );
        };
    }

    /**
     * 创建文本节点的文本内容更新函数。
     *
     * @protected
     * @return {Function}
     */
    createTextNodeUpdateFn() {
        const domUpdater = this.getDOMUpdater();
        return (exprValue, done) => {
            domUpdater.addTaskFn(
                this.getTaskId('nodeValue'),
                () => this.setNodeValue(exprValue),
                done
            );
        };
    }

    /**
     * 设置属性
     *
     * @protected
     * @param {string} attrName  属性名
     * @param {string} attrValue 属性值
     */
    setAttr(attrName, attrValue) {
        this.startNode.attr(attrName, attrValue);
    }

    /**
     * 设置文本节点的“nodeValue”，子类可以覆盖这个方法，以便支持html字符串的情况。
     *
     * @protected
     * @param {*} value 要设置的值
     */
    setNodeValue(value) {
        // 把假值全部转换成空字符串
        if (!value) {
            value = '';
        }
        this.startNode.setNodeValue(value);
    }

    /**
     * 初始化渲染
     *
     * @public
     * @param {function()} done 初始化DOM完毕的回调函数
     */
    initRender(done) {
        const doneChecker = new DoneChecker(done);

        const exprWatcher = this.getExpressionWatcher();
        /* eslint-disable guard-for-in */
        for (let expr in this[EXPRESION_UPDATE_FUNCTIONS]) {
            const fns = this[EXPRESION_UPDATE_FUNCTIONS][expr];

            for (let i = 0, il = fns.length; i < il; ++i) {
                /* eslint-disable no-loop-func */
                // 此处add执行是同步的。
                doneChecker.add(innerDone => fns[i](exprWatcher.calculate(expr), innerDone));
                /* eslint-enable no-loop-func */
            }
        }
        /* eslint-enable guard-for-in */

        doneChecker.complete();
    }

    /**
     * 表达式变化监听函数
     *
     * @protected
     * @override
     * @param  {Event}   event 事件对象
     * @param  {Function} done  处理完成回调函数
     */
    onExpressionChange(event, done) {
        const doneChecker = new DoneChecker(done);
        if (!this.isDark) {
            const updateFns = this[EXPRESION_UPDATE_FUNCTIONS][event.expr];
            if (updateFns && updateFns.length) {
                updateFns.forEach(fn => {
                    doneChecker.add(innerDone => fn(event.newValue, innerDone));
                });
            }
        }
        doneChecker.complete();
    }

    /**
     * 销毁
     *
     * @override
     * @protected
     */
    release() {
        this.expressions = null;
        this[EXPRESION_UPDATE_FUNCTIONS] = null;
        this.restAttributeUpdateFns = null;

        /* eslint-disable guard-for-in */
        for (let eventName in this.eventHandlers) {
            this.startNode.off(eventName, this.eventHandlers[eventName]);
        }
        /* eslint-enable guard-for-in */

        super.release();
    }

    /**
     * 节点“隐藏”起来
     *
     * @protected
     * @override
     */
    hide(done) {
        const doneChecker = new DoneChecker(done);
        // hide前面故意保留一个空格，因为DOM中不可能出现节点的属性key第一个字符为空格的，
        // 避免了冲突。
        const taskId = this.getTaskId(' hide');
        const domUpdater = this.getDOMUpdater();
        doneChecker.add(innerDone => {
            domUpdater.addTaskFn(taskId, ::this.startNode.hide, innerDone);
        });
        doneChecker.complete();
    }

    /**
     * 节点“显示”出来
     *
     * @protected
     * @override
     * @param {function()} done 完成异步操作的回调函数
     */
    show(done) {
        const doneChecker = new DoneChecker(done);
        const taskId = this.getTaskId(' hide');
        const domUpdater = this.getDOMUpdater();
        doneChecker.add(innerDone => domUpdater.addTaskFn(taskId, ::this.startNode.show, innerDone));
        doneChecker.complete();
    }

    /**
     * 根据DOM节点的属性名字拿到一个任务id。
     *
     * @protected
     * @param  {string} attrName 属性名字
     * @return {string}          任务id
     */
    getTaskId(attrName) {
        const domUpdater = this.getDOMUpdater();
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
        const nodeType = node.getNodeType();
        return nodeType === Node.ELEMENT_NODE || nodeType === Node.TEXT_NODE;
    }
}
