/**
 * @file for指令中用到的
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var Tree = require('./Tree');

module.exports = Tree.extends(
    {
        $name: 'ForTree',
        initialize: function (options) {
            if (!options.config
                || !options.domUpdater
                || !options.exprCalculater
            ) {
                throw new Error('wrong arguments');
            }

            Tree.prototype.initialize.apply(this, arguments);
        }
    }
);

