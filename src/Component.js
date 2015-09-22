/**
 * @file 组件基类
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var log = require('./log');
var utils = require('./utils');
var ComponentTree = require('./ComponentTree');
var ComponentChildren = require('./ComponentChildren');

function Component(options) {
    this.componentNode = options.componentNode;
    this.treeOptions = options.treeOptions;
    this.outScope = options.outScope;
}

Component.prototype.tpl = '';

Component.prototype.tplUrl = '';

Component.prototype.setAttr = function (name, value) {
    this.tree.rootScope.set(name, value);
};

Component.prototype.mount = function () {
    var div = document.createElement('div');
    div.innerHTML = this.tpl;
    this.startNode = div.firstChild;
    this.endNode = div.lastChild;

    var parentNode = this.componentNode.parentNode;
    utils.traverseNoChangeNodes(this.startNode, this.endNode, function (curNode) {
        parentNode.insertBefore(curNode, this.componentNode);
    }, this);
    parentNode.removeChild(this.componentNode);

    // 组件的作用域是和外部的作用域隔开的
    this.tree = new ComponentTree(utils.extend({
        startNode: this.startNode,
        endNode: this.endNode,
        componentChildren: new ComponentChildren(
            this.componentNode.firstChild,
            this.componentNode.lastChild,
            this.outScope
        )
    }, this.treeOptions));
    this.tree.traverse();
};

Component.prototype.getTpl = function (doneFn) {
    if (this.tpl) {
        doneFn();
    }
    else if (this.tplUrl) {
        var me = this;
        utils.xhr({
            url: this.tplUrl
        }, function (data) {
            me.tpl = data.responseText;
            doneFn();
        }, function () {
            log.warn('load tpl:', me.tplUrl, 'failed!');
            doneFn();
        });
    }
};

Component.prototype.destroy = function () {

};

Component.prototype.goDark = function () {
    utils.traverseNoChangeNodes(this.startNode, this.endNode, utils.goDark, this);
};

Component.prototype.restoreFromDark = function () {
    utils.traverseNoChangeNodes(this.startNode, this.endNode, utils.restoreFromDark, this);
};

module.exports = Component;

function findChildrenNodes(startNode, endNode) {
    var childrenNodes = [];
    utils.traverseNoChangeNodes(startNode, endNode, function (curNode) {
        if (curNode.nodeType === 8 && curNode.nodeValue.replace(/\s+/g, '') === 'children') {
            childrenNodes.push(curNode);
        }
        else if (curNode.nodeType === 1 && curNode.childNodes.length) {
            Array.prototype.push.apply(childrenNodes, findChildrenNodes(curNode.firstChild, curNode.lastChild));
        }
    });
    return childrenNodes;
}

