/**
 * @file vtpl主文件
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import ForDirectiveParser from './parsers/ForDirectiveParser';
import IfDirectiveParser from './parsers/IfDirectiveParser';
import DirectiveParser from './parsers/DirectiveParser';
import ExprParser from './parsers/ExprParser';
import VarDirectiveParser from './parsers/VarDirectiveParser';
import HTMLExprParser from './parsers/HTMLExprParser';

import Tree from './trees/Tree';
import ExprCalculater from './ExprCalculater';
import DomUpdater from './DomUpdater';
import {extend, isSubClassOf, isClass} from './utils';
import Config from './Config';
import NodesManager from './nodes/NodesManager';
import Parser from './parsers/Parser';

const TREE = Symbol('tree');

/**
 * VTpl
 *
 * @class
 */
export default class VTpl {

    /**
     * constructor
     *
     * @public
     * @param  {Object} options 参数
     */
    constructor(options) {
        options = extend({
            config: new Config()
        }, options);

        const nodesManager = new NodesManager();
        if (options.startNode) {
            options.startNode = nodesManager.getNode(options.startNode);
        }
        if (options.endNode) {
            options.endNode = nodesManager.getNode(options.endNode);
        }
        if (options.node) {
            options.node = nodesManager.getNode(options.node);
        }

        let tree = new Tree(options);
        tree.setTreeVar('exprCalculater', new ExprCalculater());
        tree.setTreeVar('domUpdater', new DomUpdater());
        tree.setTreeVar('nodesManager', nodesManager);

        tree.setTreeVar('parserClasses', []);
        tree.setTreeVar('config', options.config);

        this[TREE] = tree;

        // 注册一批解析器
        this.registerParser(ForDirectiveParser);
        this.registerParser(IfDirectiveParser);
        this.registerParser(DirectiveParser);
        this.registerParser(ExprParser);
        this.registerParser(VarDirectiveParser);
        this.registerParser(HTMLExprParser);
    }

    /**
     * 获取节点管理器
     *
     * @public
     * @return {NodesManager}
     */
    get nodesManager() {
        return this[TREE].getTreeVar('nodesManager');
    }

    /**
     * 获取tree
     *
     * @public
     * @return {Tree}
     */
    get tree() {
        return this[TREE];
    }

    /**
     * 设置表达式相等判断函数
     *
     * @public
     * @param {string} expr    表达式
     * @param {Function} handler 相等比较函数
     */
    setExprEqualFn(expr, handler) {
        const exprWatcher = this[TREE].getExprWatcher();
        exprWatcher.setExprEqualFn(expr, handler);
    }

    /**
     * 设置表达式值克隆函数
     *
     * @public
     * @param {string} expr    表达式
     * @param {Function} handler 克隆函数
     */
    setExprCloneFn(expr, handler) {
        const exprWatcher = this[TREE].getExprWatcher();
        exprWatcher.setExprCloneFn(expr, handler);
    }

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
     * @public
     * @param  {Class} parserClass 解析器类
     */
    registerParser(parserClass) {
        if (!isSubClassOf(parserClass, Parser)) {
            throw new TypeError('wrong parser class');
        }

        const parserClasses = this[TREE].getTreeVar('parserClasses');

        let i = 0;
        let il;
        for (i = 0, il = parserClasses.length; i < il; ++i) {
            if (parserClasses[i].getPriority() < parserClass.getPriority()) {
                break;
            }
        }
        parserClasses.splice(i, 0, parserClass);
    }

    /**
     * 第一次渲染。
     * 注意，此处有坑：
     * 如果这样写代码：
     *
     * // template.html
     * <!-- if: a -->
     * yibuyisheng1
     * <!-- else -->
     * yibuyisheng
     * <!-- /if -->
     *
     * // test.js
     * vtpl.render(() => {
     * 	console.log(1);
     * });
     * vtpl.setData('name', 'yibuyisheng', {
     * 	done() {
     * 		console.log(2);
     * 	}
     * });
     *
     * 此段代码会先打印2，然后再打印1，因为setData并没有触发模板中表达式的改变，所以setData的回调函数相当于是同步的，
     * 而render的回调函数是异步的，所以会后执行。也就是说，此处还没有render完，就执行了setData回调。
     *
     * @public
     * @param  {Function} done 渲染完成回调函数
     */
    render(done) {
        this[TREE].compile();
        this[TREE].link();
        this[TREE].getTreeVar('domUpdater').start();
        this[TREE].initRender(done);
    }

    /**
     * 设置数据
     *
     * @public
     * @param {string} name    key
     * @param {*} value   值
     * @param {Object} options 附加参数
     */
    setData(name, value, options) {
        const scope = this[TREE].rootScope;
        if (isClass(name, 'String')) {
            options = options || {};
            scope.set(name, value, options.isSilent, options.done);
        }
        else {
            options = value || {};
            scope.set(name, options.isSilent, options.done);
        }
    }

    /**
     * 销毁
     *
     * @public
     */
    destroy() {
        const nodesManager = this[TREE].getTreeVar('nodesManager');
        const exprCalculater = this[TREE].getTreeVar('exprCalculater');
        const domUpdater = this[TREE].getTreeVar('domUpdater');

        this[TREE].destroy();
        this[TREE] = null;

        exprCalculater.destroy();
        domUpdater.destroy();
        nodesManager.destroy();
    }
}
