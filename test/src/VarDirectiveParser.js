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