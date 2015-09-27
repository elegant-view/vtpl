var Tree = require('./Tree');
var inherit = require('../inherit');

function ChildrenTree(options) {
    if (!options.config || !options.domUpdater
        || !options.exprCalculater || !options.treeVars
        || !options.componentManager
    ) {
        throw new Error('wrong arguments');
    }

    options.componentChildren = undefined;
    delete options.componentChildren;

    Tree.call(this, options);
}

module.exports = inherit(ChildrenTree, Tree);
