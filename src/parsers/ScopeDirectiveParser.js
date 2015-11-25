/**
 * @file scope directive parser
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var DirectiveParser = require('./DirectiveParser');
var ScopeModel = require('../ScopeModel');
var Tree = require('../trees/Tree');

module.exports = DirectiveParser.extends(
    {
        $name: 'ScopeDirectiveParser',
        initialize: function (options) {
            DirectiveParser.prototype.initialize.call(this, options);

            this.startNode = options.startNode;
            this.endNode = options.endNode;

            if (!this.tree.getTreeVar('scopes')) {
                this.tree.setTreeVar('scopes', {});
            }
        },

        setScope: function (scopeModel) {
            this.scopeModel.setParent(scopeModel);
            scopeModel.addChild(this.scopeModel);
        },

        collectExprs: function () {
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
        }
    },
    {
        isProperNode: function (node, config) {
            return DirectiveParser.isProperNode(node, config)
                && node.nodeValue.replace(/\s+/, '').indexOf(config.scopeName + ':') === 0;
        },

        findEndNode: function (startNode, config) {
            var curNode = startNode;
            while ((curNode = curNode.nextSibling)) {
                if (isEndNode(curNode, config)) {
                    return curNode;
                }
            }
        },

        getNoEndNodeError: function () {
            return new Error('the scope directive is not properly ended!');
        }
    }
);

Tree.registeParser(module.exports);

function isEndNode(node, config) {
    return node.nodeType === 8
        && node.nodeValue.replace(/\s+/g, '') === config.scopeEndName;
}
