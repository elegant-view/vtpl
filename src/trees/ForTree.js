/**
 * @file for指令中用到的
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var Tree = require('./Tree');

module.exports = Tree.extends(
    {
        initialize: function (options) {
            if (!options.config
                || !options.domUpdater
                || !options.exprCalculater
            ) {
                throw new Error('wrong arguments');
            }

            this.$super.initialize(options);
        }
    }
);

