require(['/dist/main'], function (main) {
    var VarDirectiveParser = main.VarDirectiveParser;
    var Config = main.Config;
    var ExprCalculater = main.ExprCalculater;

    var node = document.getElementById('node');

    var parser = new VarDirectiveParser({
        node: node.firstChild,
        config: new Config,
        exprCalculater: new ExprCalculater()
    });

    parser.collectExprs();

    var data = {};
    parser.setData(data);
    console.log(data);
});