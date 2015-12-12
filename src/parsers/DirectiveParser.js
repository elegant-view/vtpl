/**
 * @file 指令解析器抽象类。指令节点一定是注释节点
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var Parser = require('./Parser');
var Node = require('../nodes/Node');

module.exports = Parser.extends(
    {},
    {
        isProperNode: function (node, config) {
            return node.nodeType === Node.COMMENT_NODE;
        },

        $name: 'DirectiveParser'
    }
);
