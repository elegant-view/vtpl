/**
 * @file 变量定义指令解析器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var Parser = require('./Parser');
var inherit = require('./inherit');

function VarDirectiveParser() {

}

module.exports = inherit(VarDirectiveParser, Parser);
