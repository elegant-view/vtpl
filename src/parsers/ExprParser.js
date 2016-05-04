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

                if (Node.isEventName(attribute.name) || attribute.name === 'on-outclick') {
                    this.setEvent(attribute.name, attribute.value);
                }
                else if (!isExpr(attribute.value)) {
                    this.setAttr(attribute.name, attribute.value);
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

            const localScope = new ScopeModel();
            localScope.setParent(this.getScope());
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
     * 设置文本节点的“nodeValue”
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
        const exprWatcher = this.getExpressionWatcher();
        exprWatcher.on('change', (event, done) => {
            const doneChecker = new DoneChecker(done);
            const updateFns = this[EXPRESION_UPDATE_FUNCTIONS][event.expr];
            // 此处并不会处理isDark为true的情况，因为Node那边处理了。
            if (updateFns && updateFns.length) {
                updateFns.forEach(fn => {
                    doneChecker.add(done => {
                        fn(event.newValue, done);
                    });
                });
            }
            doneChecker.complete();
        });
    }

    /**
     * 初始化渲染
     *
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
     * @param {function()} done 完成异步操作的回调函数
     */
    goDark(done) {
        const doneChecker = new DoneChecker(done);
        if (this.isDark) {
            // 保证一下异步
            doneChecker.complete();
            return;
        }

        doneChecker.add(done => {
            super.goDark(done);
        });

        // hide前面故意保留一个空格，因为DOM中不可能出现节点的属性key第一个字符为空格的，
        // 避免了冲突。
        const taskId = this.getTaskId(' hide');
        const domUpdater = this.getDOMUpdater();
        doneChecker.add(done => {
            domUpdater.addTaskFn(taskId, () => {
                this.startNode.hide();
                done();
            });
        });

        doneChecker.complete();
    }

    /**
     * 节点“显示”出来
     *
     * @public
     * @param {function()} done 完成异步操作的回调函数
     */
    restoreFromDark(done) {
        const doneChecker = new DoneChecker(done);

        if (!this.isDark) {
            doneChecker.complete();
            return;
        }

        doneChecker.add(done => {
            super.restoreFromDark(done);
        });

        const taskId = this.getTaskId(' hide');
        const domUpdater = this.getDOMUpdater();
        doneChecker.add(done => {
            domUpdater.addTaskFn(taskId, () => {
                this.startNode.show();
                done();
            });
        });

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
