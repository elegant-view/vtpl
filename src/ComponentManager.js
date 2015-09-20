/**
 * @file 组件管理
 * @author yibuyisheng(yibuyisheng@163.com)
 */

function ComponentManager() {
}

var components = {};
ComponentManager.registe = function (ComponentClass) {
    components[getClassName(ComponentClass)] = ComponentClass;
};

ComponentManager.prototype.getClass = function (name) {
    return components[name];
};

module.exports = ComponentManager;

function getClassName(klass) {
    return klass.toString().match(/^function\s*(\w+?)(?=\(\w*?\))/)[1];
}
