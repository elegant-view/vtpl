/**
 * @file vtpl主文件
 * @author yibuyisheng(yibuyisheng@163.com)
 */

/* eslint-disable no-unused-vars */
import ForDirectiveParser from './parsers/ForDirectiveParser';
import IfDirectiveParser from './parsers/IfDirectiveParser';
import DirectiveParser from './parsers/DirectiveParser';
import ExprParser from './parsers/ExprParser';
import VarDirectiveParser from './parsers/VarDirectiveParser';
/* eslint-enable no-unused-vars */

import Tree from './trees/Tree';
import ExprCalculater from './ExprCalculater';
import DomUpdater from './DomUpdater';
import {extend} from './utils';
import Config from './Config';
import NodesManager from './nodes/NodesManager';

class VTpl {
    constructor(options) {
        options = extend({
            config: new Config()
        }, options);

        this.$nodesManager = new NodesManager();
        if (options.startNode) {
            options.startNode = this.$nodesManager.getNode(options.startNode);
        }
        if (options.endNode) {
            options.endNode = this.$nodesManager.getNode(options.endNode);
        }
        if (options.node) {
            options.node = this.$nodesManager.getNode(options.node);
        }

        this.$options = options;

        var tree = new Tree(this.$options);
        tree.setTreeVar('exprCalculater', new ExprCalculater());
        tree.setTreeVar('domUpdater', new DomUpdater());
        tree.setTreeVar('config', this.$options.config);
        tree.setTreeVar('nodesManager', this.$nodesManager);
        this.$tree = tree;
    }

    render() {
        this.$tree.compile();
        this.$tree.link();
        this.$tree.getTreeVar('domUpdater').start();
        this.$tree.initRender();
    }

    setData() {
        var scope = this.$tree.rootScope;
        scope.set.apply(scope, arguments);
    }

    destroy() {
        this.$tree.getTreeVar('exprCalculater').destroy();
        this.$tree.getTreeVar('domUpdater').destroy();

        this.$tree.destroy();
        this.$nodesManager.destroy();

        this.$nodesManager = null;
        this.$options = null;
        this.$tree = null;
    }
}

export default VTpl;

