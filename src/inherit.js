/**
 * @file 继承
 * @author yibuyisheng(yibuyisheng@163.com)
 */

function inherit(ChildClass, ParentClass) {
    function Cls() {}

    Cls.prototype = ParentClass.prototype;
    var childProto = ChildClass.prototype;
    ChildClass.prototype = new Cls();

    var key;
    for (key in childProto) {
        ChildClass.prototype[key] = childProto[key];
    }

    // 继承静态属性
    for (key in ParentClass) {
        if (ParentClass.hasOwnProperty(key)) {
            if (ChildClass[key] === undefined) {
                ChildClass[key] = ParentClass[key];
            }
        }
    }

    return ChildClass;
}

module.exports = inherit;
