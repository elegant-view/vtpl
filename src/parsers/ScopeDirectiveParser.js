var inherit = require('../inherit');
var DirectiveParser = require('./DirectiveParser');
var utils = require('../utils');
var ScopeModel = require('../ScopeModel');
var Tree = require('../trees/Tree');

function ScopeDirectiveParser(options) {
    DirectiveParser.call(this, options);
}

ScopeDirectiveParser.prototype.initialize = function (options) {
    DirectiveParser.prototype.initialize.call(this, options);

    this.startNode = options.startNode;
    this.endNode = options.endNode;

    if (!this.tree.getTreeVar('scopes')) {
        this.tree.setTreeVar('scopes', {});
    }
};

ScopeDirectiveParser.prototype.setScope = function (scopeModel) {
    this.scopeModel.setParent(scopeModel);
    scopeModel.addChild(this.scopeModel);
};

ScopeDirectiveParser.prototype.collectExprs = function () {
    var scopeName = this.startNode.nodeValue
        .replace(/\s+/g, '')
        .replace(this.config.scopeName + ':', '');
    if (scopeName) {
        var scopes = this.tree.getTreeVar('scopes');
        this.scopeModel = new ScopeModel();
        scopes[scopeName] = scopes[scopeName] || [];
        scopes[scopeName].push(this.scopeModel);
    }

    return [
        {
            startNode: this.startNode.nextSibling,
            endNode: this.endNode.previousSibling
        }
    ];
};

ScopeDirectiveParser.isProperNode = function (node, config) {
    return DirectiveParser.isProperNode(node, config)
        && node.nodeValue.replace(/\s+/, '').indexOf(config.scopeName + ':') === 0;
};

ScopeDirectiveParser.findEndNode = function (startNode, config) {
    var curNode = startNode;
    while ((curNode = curNode.nextSibling)) {
        if (isEndNode(curNode, config)) {
            return curNode;
        }
    }
};

ScopeDirectiveParser.getNoEndNodeError = function () {
    return new Error('the scope directive is not properly ended!');
};

module.exports = inherit(ScopeDirectiveParser, DirectiveParser);
Tree.registeParser(module.exports);

function isEndNode(node, config) {
    return node.nodeType === 8
        && node.nodeValue.replace(/\s+/g, '') === config.scopeEndName;
}
