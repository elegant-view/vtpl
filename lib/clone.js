define(['exports', './utils', './Data'], function (exports, _utils, _Data) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.default = clone;

    var _Data2 = _interopRequireDefault(_Data);

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
            default: obj
        };
    }

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
        return typeof obj;
    } : function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
    };

    /**
     * 拷贝对象
     *
     * @param {*} value 要拷贝的
     * @param {number=} deep 拷贝的深度，默认全部拷贝
     * @param {function(*,Number):*} customizer.i.clone 克隆函数
     * @return {*}
     */
    function clone(value, deep) {
        if (deep === undefined) {
            deep = Number.POSITIVE_INFINITY;
        }
        if (deep <= 0) {
            return value;
        }

        var typeOfValue = typeof value === 'undefined' ? 'undefined' : _typeof(value);

        // 基本类型
        if (typeOfValue === 'undefined' || typeOfValue === 'boolean' || typeOfValue === 'string' || typeOfValue === 'number'
        // 不考虑Safari5、Chrome7之前`typeof [正则]`也是function的问题
         || typeOfValue === 'function' || value === null) {
            return value;
        }

        var className = (0, _utils.getClassNameOf)(value);

        // 包装类型和日期
        if (className === 'Number' || className === 'Boolean' || className === 'String' || className === 'Date') {
            return new { Number: Number, Boolean: Boolean, String: String, Date: Date }[className](value.valueOf());
        }

        if (className === 'Array') {
            var _ret = function () {
                var ret = [];
                (0, _utils.forEach)(value, function (item) {
                    ret.push(clone(item, deep - 1));
                });
                return {
                    v: ret
                };
            }();

            if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
        }

        if (value instanceof _Data2.default) {
            return value.clone();
        }

        // 遍历对象属性，所以此处只能克隆可枚举的属性
        var ret = {};
        /* eslint-disable guard-for-in */
        for (var key in value) {
            /* eslint-enable guard-for-in */
            ret[key] = clone(value[key], deep - 1);
        }
        return ret;
    }
});