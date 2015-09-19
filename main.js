require('./src/ScopeDirectiveParser');

var amdExports = {
    Config: require('./src/Config'),
    Tree: require('./src/Tree'),
    DirtyChecker: require('./src/DirtyChecker'),
    Parser: require('./src/Parser'),
    ForDirectiveParser: require('./src/ForDirectiveParser'),
    IfDirectiveParser: require('./src/IfDirectiveParser'),
    EventExprParser: require('./src/EventExprParser'),
    ExprParser: require('./src/ExprParser'),
    ExprCalculater: require('./src/ExprCalculater'),
    VarDirectiveParser: require('./src/VarDirectiveParser'),
    inherit: require('./src/inherit'),
    utils: require('./src/utils'),
    DomUpdater: require('./src/DomUpdater')
};
define(function (require, exports, module) {
    module.exports = amdExports;
});
