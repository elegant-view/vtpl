/**
 * @file 处理了事件的 ExprParser
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var ExprParser = require('./ExprParser');
var utils = require('../utils');
var Tree = require('../trees/Tree');
var ScopeModel = require('../ScopeModel');

module.exports = ExprParser.extends(
    {

        $name: 'EventExprParser',

        /**
         * 初始化
         *
         * @protected
         */
        initialize: function () {
            ExprParser.prototype.initialize.apply(this, arguments);

            this.events = {};
        },

        /**
         * 添加表达式
         *
         * @inherit
         * @protected
         * @param {Attr} attr 如果当前是元素节点，则要传入遍历到的属性，
         *                    所以attr存在与否是判断当前元素是否是文本节点的一个依据
         * @return {undefined}
         */
        addExpr: function (attr) {
            if (!attr) {
                return ExprParser.prototype.addExpr.apply(this, arguments);
            }

            var eventName = getEventName(attr.name, this.config);
            if (eventName) {
                if (this.config.getExprRegExp().test(attr.value)) {
                    this.events[eventName] = attr.value;

                    var expr = attr.value.replace(
                        this.config.getExprRegExp(),
                        function () {
                            return arguments[1];
                        }
                    );
                    this.exprCalculater.createExprFn(expr, true);

                    var me = this;
                    this.node['on' + eventName] = function (event) {
                        var localScope = new ScopeModel();
                        localScope.setParent(me.getScope());
                        me.exprCalculater.calculate(expr, true, localScope);
                    };
                }
            }
            else {
                ExprParser.prototype.addExpr.apply(this, arguments);
            }
        },

        /**
         * 销毁
         *
         * @inherit
         * @public
         */
        destroy: function () {
            utils.each(this.events, function (attrValue, eventName) {
                this.node['on' + eventName] = null;
            }, this);
            this.events = null;

            ExprParser.prototype.destroy.apply(this);
        }
    }
);

Tree.registeParser(module.exports);


function getEventName(attrName, config) {
    if (attrName.indexOf(config.eventPrefix + '-') === -1) {
        return;
    }

    return attrName.replace(config.eventPrefix + '-', '');
}

