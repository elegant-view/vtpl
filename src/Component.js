/**
 * @file 组件基类
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var log = require('./log');
var utils = require('./utils');
var Tree = require('./Tree');

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
    this.children = {
        startNode: this.componentNode.firstChild,
        endNode: this.componentNode.lastChild
    };

    // 替换掉组件节点
    var childNodes = div.childNodes;
    while (childNodes.length) {
        this.componentNode.parentNode.insertBefore(childNodes[0], this.componentNode);
    }
    this.componentNode.parentNode.removeChild(this.componentNode);

    // 组件的作用域是和外部的作用域隔开的
    this.tree = new Tree(utils.extend({
        startNode: this.startNode,
        endNode: this.endNode
    }, this.treeOptions));
    this.tree.traverse();

    // 找到 children 注释节点
    this.childrenNode = findChildrenNode(this.startNode, this.endNode);

    // 将 children 放到 children 注释节点前面
    if (this.childrenNode) {
        utils.traverseNodes(this.children.startNode, this.children.endNode, function (curNode) {
            this.childrenNode.parentNode.insertBefore(curNode, this.childrenNode);
        }, this);
    }

    // children 的作用域实际上和外部作用域是一致的，所以它的父作用域要设置成外部的作用域
    this.childrenTree = new Tree(utils.extend({
        startNode: this.children.startNode,
        endNode: this.children.endNode
    }, this.treeOptions));
    this.childrenTree.rootScope.setParent(this.outScope);
    this.outScope.addChild(this.childrenTree.rootScope);
    this.childrenTree.traverse();
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

function findChildrenNode(startNode, endNode) {
    var childrenNode;
    utils.traverseNoChangeNodes(startNode, endNode, function (curNode) {
        if (curNode.nodeType === 8 && curNode.nodeValue.replace(/\s+/g, '') === 'children') {
            childrenNode = curNode;
            return true;
        }

        if (curNode.nodeType === 1 && curNode.childNodes.length) {
            childrenNode = findChildrenNode(curNode.firstChild, curNode.lastChild);
            return !!childrenNode;
        }
    });
    return childrenNode;
}

