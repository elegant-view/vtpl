/**
 * @file 继承
 * @author yibuyisheng(yibuyisheng@163.com)
 */

function inherit(ChildClass, ParentClass) {
    var childProto = ChildClass.prototype;
    ChildClass.prototype = new ParentClass({});

    var key;
    for (key in childProto) {
        if (childProto.hasOwnProperty(key)) {
            ChildClass.prototype[key] = childProto[key];
        }
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
