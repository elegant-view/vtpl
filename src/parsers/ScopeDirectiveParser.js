/**
 * @file scope directive parser
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import DirectiveParser from './DirectiveParser';
import ScopeModel from '../ScopeModel';
import Tree from '../trees/Tree';

class ScopeDirectiveParser extends DirectiveParser {
    constructor(options) {
        super(options);

        this.startNode = options.startNode;
        this.endNode = options.endNode;

        if (!this.tree.getTreeVar('scopes')) {
            this.tree.setTreeVar('scopes', {});
        }
    }

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

    static isProperNode(node, config) {
        return DirectiveParser.isProperNode(node, config)
            && node.nodeValue.replace(/\s+/, '').indexOf(config.scopeName + ':') === 0;
    }

    static findEndNode(startNode, config) {
        let curNode = startNode;
        while ((curNode = curNode.nextSibling)) {
            if (isEndNode(curNode, config)) {
                return curNode;
            }
        }
    }

    static getNoEndNodeError() {
        return new Error('the scope directive is not properly ended!');
    }
}

function isEndNode(node, config) {
    return node.nodeType === 8
        && node.nodeValue.replace(/\s+/g, '') === config.scopeEndName;
}

Tree.registeParser(ScopeDirectiveParser);
export default ScopeDirectiveParser;
