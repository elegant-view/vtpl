/**
 * @file vtpl主文件
 * @author yibuyisheng(yibuyisheng@163.com)
 */

require('./parsers/ForDirectiveParser');
require('./parsers/IfDirectiveParser');
require('./parsers/ExprParser');

var Tree = require('./trees/Tree');
var ExprCalculater = require('./ExprCalculater');
var DomUpdater = require('./DomUpdater');
var utils = require('./utils');
var Config = require('./Config');
var NodesManager = require('./nodes/NodesManager');

function Vtpl(options) {
    options = utils.extend({
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

Vtpl.prototype.render = function () {
    this.$tree.traverse();
};

Vtpl.prototype.setData = function () {
    var scope = this.$tree.rootScope;
    scope.set.apply(scope, arguments);
};

Vtpl.prototype.destroy = function () {
    this.$tree.getTreeVar('exprCalculater').destroy();
    this.$tree.getTreeVar('domUpdater').destroy();

    this.$tree.destroy();
    this.$nodesManager.destroy();

    this.$nodesManager = null;
    this.$options = null;
    this.$tree = null;
};

Vtpl.utils = utils;
Vtpl.Config = Config;

module.exports = Vtpl;

