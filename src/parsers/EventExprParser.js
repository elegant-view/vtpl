/**
 * @file 处理了事件的 ExprParser
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var ExprParser = require('./ExprParser');
var inherit = require('../inherit');
var utils = require('../utils');
var Tree = require('../trees/Tree');
var ScopeModel = require('../ScopeModel');

function EventExprParser(options) {
    ExprParser.call(this, options);
}

EventExprParser.prototype.initialize = function (options) {
    ExprParser.prototype.initialize.apply(this, arguments);

    this.events = {};
};

EventExprParser.prototype.addExpr = function (attr) {
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
};

EventExprParser.prototype.destroy = function () {
    utils.each(this.events, function (attrValue, eventName) {
        this.node['on' + eventName] = null;
    }, this);
    this.events = null;

    ExprParser.prototype.destroy.call(this);
};

module.exports = inherit(EventExprParser, ExprParser);
Tree.registeParser(module.exports);


function getEventName(attrName, config) {
    if (attrName.indexOf(config.eventPrefix + '-') === -1) {
        return;
    }

    return attrName.replace(config.eventPrefix + '-', '');
}

