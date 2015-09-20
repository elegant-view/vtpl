/**
 * @file 指令解析器抽象类。指令节点一定是注释节点
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var inherit = require('../inherit');
var Parser = require('./Parser');

function DirectiveParser(options) {
    Parser.call(this, options);
}

DirectiveParser.isProperNode = function (node, config) {
    return node.nodeType === 8;
};

module.exports = inherit(DirectiveParser, Parser);
