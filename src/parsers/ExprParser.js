/**
 * @file 表达式解析器，一个文本节点或者元素节点对应一个表达式解析器实例。
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import Parser from './Parser';
import Node from '../nodes/Node';
import {line2camel, isExpr} from '../utils';
import DoneChecker from '../DoneChecker';
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
        this.expressions = [];
    }

    /**
     * 搜集过程
     *
     * @public
     */
    collectExprs() {
        const parserNode = this.startNode;

        const domUpdater = this.getDOMUpdater();

        const nodeType = parserNode.getNodeType();
        const exprWatcher = this.getExpressionWatcher();

        // 文本节点
        if (nodeType === Node.TEXT_NODE) {
            const nodeValue = parserNode.getNodeValue();
            if (isExpr(nodeValue)) {
                exprWatcher.addExpr(nodeValue);
                this.expressions.push(nodeValue);

                const updateFns = this[EXPRESION_UPDATE_FUNCTIONS][nodeValue] || [];
                updateFns.push((exprValue, callback) => {
                    domUpdater.addTaskFn(
                        this.getTaskId('nodeValue'),
                        () => this.setAttr('nodeValue', exprValue),
                        callback
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

                if (Node.isEventName(attribute.name) || attribute.name === 'on-outclick') {
                    this.setEvent(attribute.name, attribute.value);
                }
                else if (!isExpr(attribute.value)) {
                    this.setAttr(attribute.name, attribute.value);
                }
                else {
                    exprWatcher.addExpr(attribute.value);
                    this.expressions.push(attribute.value);

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
            domUpdater.addTaskFn(
                taskId,
                () => this.setAttr(attrName, exprValue),
                callback
            );
        }
    }

    setRestAttrs(value, attrs) {
        if (!value || typeof value !== 'object') {
            return;
        }

        for (let key in value) {
            if (!(key in attrs) && key !== 'children') {
                this.setAttr(key, value[key]);
            }
        }
    }

    setEvent(attrName, attrValue) {
        if (!attrValue) {
            return;
        }

        const eventName = attrName.replace('on-', '');
        this.startNode.off(eventName);
        this.startNode.on(eventName, event => {
            attrValue = attrValue.replace(/^\${|}$/g, '');

            const exprCalculater = this.getExpressionCalculater();
            exprCalculater.createExprFn(attrValue, true);

            const localScope = this.getScope().createChild();
            localScope.set('event', event);
            exprCalculater.calculate(attrValue, true, localScope, true);
            localScope.destroy();
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
     * 设置文本节点的“nodeValue”
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
     * 将界面更新相关函数和scopeModel关联起来，顺便记得在初始的时候刷一下界面
     *
     * @public
     */
    linkScope() {}

    /**
     * 初始化渲染
     *
     * @public
     * @param {function()} done 初始化DOM完毕的回调函数
     */
    initRender(done) {
        const doneChecker = new DoneChecker(done);

        const exprWatcher = this.getExpressionWatcher();
        for (let expr in this[EXPRESION_UPDATE_FUNCTIONS]) {
            if (!this[EXPRESION_UPDATE_FUNCTIONS].hasOwnProperty(expr)) {
                continue;
            }

            const fns = this[EXPRESION_UPDATE_FUNCTIONS][expr];

            fns.forEach(execute.bind(null, expr));
        }
        doneChecker.complete();

        function execute(expr, fn) {
            doneChecker.add(done => {
                fn(exprWatcher.calculate(expr), done);
            });
        }
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
