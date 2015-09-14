require(['/dist/main'], function (main) {
    var parser = new main.EventExprParser({
        node: document.getElementById('node'),
        config: new main.Config(),
        exprCalculater: new main.ExprCalculater()
    });

    parser.collectExprs();
    parser.setData({
        onClick: function (event) {
            console.log('click');
        }
    });
});