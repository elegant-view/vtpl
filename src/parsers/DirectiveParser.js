/**
 * @file 指令解析器抽象类。指令节点一定是注释节点
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var Parser = require('./Parser');

module.exports = Parser.extends(
    {},
    {
        isProperNode: function (node, config) {
            return node.nodeType === 8;
        },
        $name: 'DirectiveParser'
    }
);
