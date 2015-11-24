require('./src/parsers/ScopeDirectiveParser');

var amdExports = {
    Config: require('./src/Config'),
    Tree: require('./src/trees/Tree'),
    DirtyChecker: require('./src/DirtyChecker'),
    Parser: require('./src/parsers/Parser'),
    ForDirectiveParser: require('./src/parsers/ForDirectiveParser'),
    IfDirectiveParser: require('./src/parsers/IfDirectiveParser'),
    EventExprParser: require('./src/parsers/EventExprParser'),
    ExprParser: require('./src/parsers/ExprParser'),
    ExprCalculater: require('./src/ExprCalculater'),
    VarDirectiveParser: require('./src/parsers/VarDirectiveParser'),
    inherit: require('./src/inherit'),
    utils: require('./src/utils'),
    DomUpdater: require('./src/DomUpdater'),
    ScopeModel: require('./src/ScopeModel')
};
define(function (require, exports, module) {
    module.exports = amdExports;
});
