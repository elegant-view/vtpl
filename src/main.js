require('./parsers/EventExprParser');
require('./parsers/ForDirectiveParser');
require('./parsers/IfDirectiveParser');
require('./parsers/ScopeDirectiveParser');
require('./parsers/VarDirectiveParser');
var Tree = require('./trees/Tree');
var ExprCalculater = require('./ExprCalculater');
var DomUpdater = require('./DomUpdater');
var utils = require('./utils');
var Config = require('./Config');

module.exports = {
    utils: require('./utils'),
    Config: Config,
    render: function (options) {
        options = utils.extend({
            config: new Config()
        }, options);

        var tree = new Tree(options);
        tree.setTreeVar('exprCalculater', new ExprCalculater());
        tree.setTreeVar('domUpdater', new DomUpdater());
        tree.setTreeVar('config', options.config);
        return tree;
    }
};
