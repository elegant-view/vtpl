/**
 * @file vtpl主文件
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import ForDirectiveParser from './parsers/ForDirectiveParser';
import IfDirectiveParser from './parsers/IfDirectiveParser';
import DirectiveParser from './parsers/DirectiveParser';
import ExprParser from './parsers/ExprParser';
import VarDirectiveParser from './parsers/VarDirectiveParser';

import Tree from './trees/Tree';
import ExprCalculater from './ExprCalculater';
import DomUpdater from './DomUpdater';
import {extend, isSubClassOf} from './utils';
import Config from './Config';
import NodesManager from './nodes/NodesManager';
import Parser from './parsers/Parser';

export default class VTpl {
    constructor(options) {
        options = extend({
            config: new Config()
        }, options);

        this.nodesManager = new NodesManager();
        if (options.startNode) {
            options.startNode = this.nodesManager.getNode(options.startNode);
        }
        if (options.endNode) {
            options.endNode = this.nodesManager.getNode(options.endNode);
        }
        if (options.node) {
            options.node = this.nodesManager.getNode(options.node);
        }

        this.$options = options;

        let tree = new Tree(this.$options);
        tree.setTreeVar('exprCalculater', new ExprCalculater());
        tree.setTreeVar('domUpdater', new DomUpdater());
        tree.setTreeVar('config', this.$options.config);
        tree.setTreeVar('nodesManager', this.nodesManager);
        tree.setTreeVar('parserClasses', []);
        this.$tree = tree;

        // 注册一批解析器
        this.registerParser(ForDirectiveParser);
        this.registerParser(IfDirectiveParser);
        this.registerParser(DirectiveParser);
        this.registerParser(ExprParser);
        this.registerParser(VarDirectiveParser);
    }

    setExprEqualFn(expr, handler) {
        let exprWatcher = this.$tree.getExprWatcher();
        exprWatcher.setExprEqualFn(expr, handler);
    }

    setExprCloneFn(expr, handler) {
        let exprWatcher = this.$tree.getExprWatcher();
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
     * @param  {Class} parserClass 解析器类
     */
    registerParser(parserClass) {
        if (!isSubClassOf(parserClass, Parser)) {
            throw new TypeError('wrong parser class');
        }

        let parserClasses = this.$tree.getTreeVar('parserClasses');
        let hasInserted = false;
        /* eslint-disable guard-for-in */
        for (let i in parserClasses) {
        /* eslint-enable guard-for-in */
            let klass = parserClasses[i];
            if (isSubClassOf(parserClass, klass)) {
                hasInserted = true;
                parserClasses.splice(i, 0, parserClass);
                break;
            }
        }
        if (!hasInserted) {
            parserClasses.push(parserClass);
        }
    }

    render() {
        this.$tree.compile();
        this.$tree.link();
        this.$tree.getTreeVar('domUpdater').start();
        this.$tree.initRender();
    }

    setData(...args) {
        let scope = this.$tree.rootScope;
        scope.set.apply(scope, args);
    }

    destroy() {
        this.$tree.getTreeVar('exprCalculater').destroy();
        this.$tree.getTreeVar('domUpdater').destroy();

        this.$tree.destroy();
        this.nodesManager.destroy();

        this.nodesManager = null;
        this.$options = null;
        this.$tree = null;
    }
}
