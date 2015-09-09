var Config = require('../../src/config');
var ExprParser = require('../../src/ExprParser');

describe('ExprParser', function () {
    var config;

    beforeAll(function () {
        config = new Config();
    });

    it('${name}', function () {
        var parser = new ExprParser({
            node: document.getElementById('test1').childNodes[0],
            config: config
        });
        parser.collectExprs();
        parser.setData({name: 'zhangsan'});
        parser.setData({name: 'lisi'});
        parser.destroy();
    });

    it('${student.name}', function () {
        var parser = new ExprParser({
            node: document.getElementById('test2').childNodes[0],
            config: config
        });
        parser.collectExprs();
        parser.setData({student: {name: 'student\'s name'}});
        parser.destroy();
    });

    it('${3-1}', function () {
        var parser = new ExprParser({
            node: document.getElementById('test3').childNodes[0],
            config: config
        });
        parser.collectExprs();
        parser.setData({});
        parser.destroy();
    });

    it('${age - 1}', function () {
        var parser = new ExprParser({
            node: document.getElementById('test4').childNodes[0],
            config: config
        });
        parser.collectExprs();
        parser.setData({age: 20});
        parser.destroy();
    });
});