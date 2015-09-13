var parser = new EventExprParser({
    node: document.getElementById('node'),
    config: new Config()
});

parser.collectExprs();
parser.setData({
    onClick: function (event) {
        console.log('click');
    }
});