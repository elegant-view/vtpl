var ExprParser = require('./ExprParser');
var inherit = require('./inherit');
var utils = require('./utils');

function EventExprParser(options) {
    ExprParser.call(this, options);
}

EventExprParser.prototype.initialize = function (options) {
    ExprParser.prototype.initialize.apply(this, arguments);

    this.events = {};
};

EventExprParser.prototype.setData = function (data) {
    ExprParser.prototype.setData.apply(this, arguments);

    this.curData = data;
};

EventExprParser.prototype.addExpr = function (attr) {
    if (!attr) {
        return ExprParser.prototype.addExpr.apply(this, arguments);
    }

    var eventName = getEventName(attr.name, this.config);
    if (eventName) {
        if (this.config.getExprRegExp().test(attr.value)) {
            this.events[eventName] = attr.value;

            var me = this;
            this.node['on' + eventName] = function (event) {
                utils.calculateExpression(
                    attr.value.replace(
                        me.config.getExprRegExp(),
                        function () {
                            return arguments[1];
                        }
                    ),
                    utils.extend({}, me.curData, {event: event})
                );
            };
        }
    }
    else {
        ExprParser.prototype.addExpr.apply(this, arguments);
    }
};

module.exports = inherit(EventExprParser, ExprParser);


function getEventName(attrName, config) {
    if (attrName.indexOf(config.eventPrefix + '-') === -1) {
        return;
    }

    return attrName.replace(config.eventPrefix + '-', '');
}

