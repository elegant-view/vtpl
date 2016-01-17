/**
 * @file scope directive parser
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import DirectiveParser from './DirectiveParser';
import ScopeModel from '../ScopeModel';
import Tree from '../trees/Tree';

const ScopeDirectiveParser = DirectiveParser.extends(
    {
        initialize(options) {
            DirectiveParser.prototype.initialize.call(this, options);

            this.startNode = options.startNode;
            this.endNode = options.endNode;

            if (!this.tree.getTreeVar('scopes')) {
                this.tree.setTreeVar('scopes', {});
            }
        },

        setScope(scopeModel) {
            this.scopeModel.setParent(scopeModel);
            scopeModel.addChild(this.scopeModel);
        },

        collectExprs() {
            let scopeName = this.startNode.nodeValue
                .replace(/\s+/g, '')
                .replace(this.config.scopeName + ':', '');
            if (scopeName) {
                let scopes = this.tree.getTreeVar('scopes');
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
        isProperNode(node, config) {
            return DirectiveParser.isProperNode(node, config)
                && node.nodeValue.replace(/\s+/, '').indexOf(config.scopeName + ':') === 0;
        },

        findEndNode(startNode, config) {
            let curNode = startNode;
            while ((curNode = curNode.nextSibling)) {
                if (isEndNode(curNode, config)) {
                    return curNode;
                }
            }
        },

        getNoEndNodeError() {
            return new Error('the scope directive is not properly ended!');
        },

        $name: 'ScopeDirectiveParser'
    }
);

function isEndNode(node, config) {
    return node.nodeType === 8
        && node.nodeValue.replace(/\s+/g, '') === config.scopeEndName;
}

Tree.registeParser(ScopeDirectiveParser);
export default ScopeDirectiveParser;
