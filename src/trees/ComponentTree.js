var Tree = require('./Tree');
var inherit = require('../inherit');
var ComponentParser = require('../parsers/ComponentParser');
var Event = require('../Event');

function ComponentTree(options) {
    if (!options.config
        || !options.domUpdater
        || !options.exprCalculater
        || !options.treeVars
        || !options.componentChildren
        || !options.componentManager
    ) {
        throw new Error('wrong arguments');
    }

    Tree.call(this, options);

    this.componentChildren = options.componentChildren;
    this.componentEvent = new Event();
}

ComponentTree.prototype.createParser = function (ParserClass, options) {
    var instance = Tree.prototype.createParser.apply(this, arguments);

    if (instance && ParserClass === ComponentParser) {
        instance.parser.setComponentEvent(this.componentEvent);
    }

    return instance;
};

module.exports = inherit(ComponentTree, Tree);
