/**
 * @file children 指令 <!-- children -->
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var inherit = require('../inherit');
var DirectiveParser = require('./DirectiveParser');
var utils = require('../utils');
var ChildrenTree = require('../ChildrenTree');

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
        treeVars: this.tree.treeVars
    });
    this.childrenTree.traverse();

    this.childrenTree.rootScope.setParent(componentChildren.scope);
    componentChildren.scope.addChild(this.childrenTree.rootScope);

    while (div.childNodes.length) {
        this.node.parentNode.insertBefore(div.childNodes[0], this.node);
    }

    return true;
};

ChildrenDirectiveParser.prototype.destroy = function () {
    this.childrenTree.destroy();

    DirectiveParser.prototype.destroy.call(this);
};

ChildrenDirectiveParser.isProperNode = function (node, config) {
    return node.nodeType === 8
        && node.nodeValue.replace(/\s/g, '') === 'children';
};

module.exports = inherit(ChildrenDirectiveParser, DirectiveParser);
ChildrenTree.registeParser(module.exports);
