/**
 * @file children 指令 <!-- children --> ，只有组件中才会存在该指令
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var inherit = require('../inherit');
var DirectiveParser = require('./DirectiveParser');
var ChildrenTree = require('../trees/ChildrenTree');

function ChildrenDirectiveParser(options) {
    DirectiveParser.call(this, options);
}

ChildrenDirectiveParser.prototype.initialize = function (options) {
    DirectiveParser.prototype.initialize.apply(this, arguments);

    this.node = options.node;
};

ChildrenDirectiveParser.prototype.collectExprs = function () {
    var componentChildren = this.tree.componentChildren;
    if (!componentChildren) {
        return;
    }

    var div = document.createElement('div');
    div.innerHTML = componentChildren.getTplHtml();

    this.childrenTree = new ChildrenTree({
        startNode: div.firstChild,
        endNode: div.lastChild,
        config: this.tree.config,
        domUpdater: this.tree.domUpdater,
        exprCalculater: this.tree.exprCalculater,
        treeVars: this.tree.treeVars,
        componentManager: this.tree.componentManager
    });
    this.childrenTree.traverse();

    this.childrenTree.rootScope.setParent(componentChildren.scope);
    componentChildren.scope.addChild(this.childrenTree.rootScope);

    while (div.childNodes.length) {
        this.node.parentNode.insertBefore(div.childNodes[0], this.node);
    }

    return true;
};

/**
 * 获取开始节点
 *
 * @protected
 * @inheritDoc
 * @return {Node}
 */
ChildrenDirectiveParser.prototype.getStartNode = function () {
    if (!this.childrenTree) {
        return this.node;
    }
    return this.childrenTree.startNode;
};

/**
 * 获取结束节点
 *
 * @protected
 * @inheritDoc
 * @return {Node}
 */
ChildrenDirectiveParser.prototype.getEndNode = function () {
    return this.node;
};

ChildrenDirectiveParser.prototype.destroy = function () {
    this.childrenTree.destroy();

    this.node = null;
    this.childrenTree = null;

    DirectiveParser.prototype.destroy.call(this);
};

ChildrenDirectiveParser.isProperNode = function (node, config) {
    return node.nodeType === 8
        && node.nodeValue.replace(/\s/g, '') === 'children';
};

module.exports = inherit(ChildrenDirectiveParser, DirectiveParser);
ChildrenTree.registeParser(module.exports);
