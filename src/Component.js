/**
 * @file 组件基类
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var log = require('./log');
var utils = require('./utils');
var ComponentTree = require('./trees/ComponentTree');
var ComponentChildren = require('./ComponentChildren');

function Component(options) {
    this.componentNode = options.componentNode;
    this.tree = options.tree;

    this.initialize();
}

Component.prototype.setOutScope = function (outScope) {
    this.outScope = outScope;
};

/**
 * 初始化。子类可以覆盖这个方法，做一些初始化的工作。
 *
 * @protected
 */
Component.prototype.initialize = function () {};

Component.prototype.beforeMount = function () {};

Component.prototype.afterMount = function () {};

Component.prototype.beforeDestroy = function () {};

Component.prototype.afterDestroy = function () {};

Component.prototype.literalAttrReady = function () {};

/**
 * 组件模板。子类可以覆盖这个属性。
 *
 * @protected
 * @type {String}
 */
Component.prototype.tpl = '';

/**
 * 组件模板的 url 地址。子类可以覆盖这个属性。
 *
 * @protected
 * @type {String}
 */
Component.prototype.tplUrl = '';

/**
 * 设置组件属性。假如有如下组件：
 *
 * <ui-my-component title="${title}" name="Amy"></ui-my-component>
 *
 * 那么属性就有 title 和 name ，其中 name 的属性值不是一个表达式，所以在组件创建完成之后，就会被设置好；
 * 而 title 属性值是一个表达式，需要监听 ${title} 表达式的值及其变化，然后再设置进来。
 *
 * 设置进来的值会被直接放到组件对应的 ComponentTree 实例的 rootScope 上面去。
 *
 * @public
 * @param {string} name  属性名
 * @param {Any} value 属性值
 */
Component.prototype.setAttr = function (name, value) {
    this.tree.rootScope.set(name, value);
};

/**
 * 组件挂载到 DOM 树中去。
 *
 * @private
 */
Component.prototype.mount = function () {
    this.beforeMount();

    var div = document.createElement('div');
    div.innerHTML = this.tpl;
    this.startNode = div.firstChild;
    this.endNode = div.lastChild;

    // 组件的作用域是和外部的作用域隔开的
    this.tree = new ComponentTree({
        startNode: this.startNode,
        endNode: this.endNode,
        config: this.tree.config,
        domUpdater: this.tree.domUpdater,
        exprCalculater: this.tree.exprCalculater,
        treeVars: this.tree.treeVars,
        componentManager: this.tree.componentManager,
        componentChildren: new ComponentChildren(
            this.componentNode.firstChild,
            this.componentNode.lastChild,
            this.outScope,
            this
        )
    });
    this.tree.traverse();

    // 把组件节点放到 DOM 树中去
    var parentNode = this.componentNode.parentNode;
    utils.traverseNoChangeNodes(this.startNode, this.endNode, function (curNode) {
        parentNode.insertBefore(curNode, this.componentNode);
    }, this);
    parentNode.removeChild(this.componentNode);

    this.afterMount();
};

Component.prototype.setData = function () {
    if (!this.tree || !this.tree.rootScope) {
        throw new Error('component is not ready');
    }
    var scope = this.tree.rootScope;
    scope.set.apply(scope, arguments);
};

/**
 * 拿到到组件模板。优先检查 tpl 是否有模板，如果有了，就不再去请求了。
 *
 * @public
 * @param  {function(string)} doneFn 模板就绪后的回调函数
 */
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

/**
 * 销毁
 *
 * @public
 */
Component.prototype.destroy = function () {
    this.beforeDestroy();

    this.tree.destroy();

    this.componentNode = null;
    this.tree = null;
    this.outScope = null;
    this.startNode = null;
    this.endNode = null;

    this.afterDestroy();
};

/**
 * 隐藏模板
 *
 * @public
 */
Component.prototype.goDark = function () {
    utils.traverseNoChangeNodes(this.startNode, this.endNode, utils.goDark, this);
};

/**
 * 显示模板
 *
 * @public
 */
Component.prototype.restoreFromDark = function () {
    utils.traverseNoChangeNodes(this.startNode, this.endNode, utils.restoreFromDark, this);
};

module.exports = Component;

