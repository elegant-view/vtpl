/**
 * @file for指令中用到的
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var Tree = require('./Tree');
var inherit = require('../inherit');

module.exports = Tree.extends(
    {
        initialize: function (options) {
            if (!options.config || !options.domUpdater
                || !options.exprCalculater || !options.treeVars
                || !options.componentManager
            ) {
                throw new Error('wrong arguments');
            }

            this.$super.initialize(options);

            this.componentChildren = options.componentChildren;
        }
    }
);

