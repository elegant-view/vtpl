var inherit = require('./inherit');
var DirectiveParser = require('./DirectiveParser');
var utils = require('./utils');
var ScopeModel = require('./ScopeModel');
var Tree = require('./Tree');

function ScopeDirectiveParser(options) {
    DirectiveParser.prototype.call(this, options);
}

ScopeDirectiveParser.prototype.initialize = function (options) {
    DirectiveParser.prototype.initialize.call(this, options);

    this.model = new ScopeModel();
    this.startNode = options.startNode;
    this.endNode = options.endNode;
};

ScopeDirectiveParser.prototype.setData = function (data) {
    this.model.setParent(data);
    return 0;
};

ScopeDirectiveParser.prototype.getData = function () {
    return this.model;
};

ScopeDirectiveParser.prototype.collectExprs = function () {
    return [
        {
            startNode: this.startNode.nextSibling,
            endNode: this.endNode.previousSibling
        }
    ];
};

ScopeDirectiveParser.isProperNode = function (node, config) {
    return DirectiveParser.isProperNode(node, config)
        && node.nodeValue.replace(/\s+/, '') === config.scopeName;
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
        && node.nodeValue.replace(/\s+/, '') === config.scopeEndName;
}
