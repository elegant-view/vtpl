var Tree = require('./Tree');
var inherit = require('../inherit');

function ForTree(options) {
    if (!options.config || !options.domUpdater
        || !options.exprCalculater || !options.treeVars
        || !options.componentManager
    ) {
        throw new Error('wrong arguments');
    }

    Tree.call(this, options);

    this.componentChildren = options.componentChildren;
}

module.exports = inherit(ForTree, Tree);
