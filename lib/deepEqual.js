define(['exports', './utils', './Data'], function (exports, _utils, _Data) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.default = deepEqual;

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

    function unwrap(value) {
        if ((0, _utils.isClass)(value, 'Number') || (0, _utils.isClass)(value, 'Boolean') || (0, _utils.isClass)(value, 'String') || (0, _utils.isClass)(value, 'Date')) {
            return value.valueOf();
        }

        return value;
    }

    function isBaseType(value) {
        var typeOfValue = typeof value === 'undefined' ? 'undefined' : _typeof(value);
        return typeOfValue === 'undefined' || typeOfValue === 'boolean' || typeOfValue === 'string' || typeOfValue === 'number' || typeOfValue === 'function' || value === null || (0, _utils.isClass)(value, 'Number') || (0, _utils.isClass)(value, 'Boolean') || (0, _utils.isClass)(value, 'String') || (0, _utils.isClass)(value, 'Date');
    }

    function deepEqual(value1, value2) {
        // 基类型比较
        if (isBaseType(value1) || isBaseType(value2)) {
            return unwrap(value1) === unwrap(value2);
        }

        var className1 = (0, _utils.getClassNameOf)(value1);
        var className2 = (0, _utils.getClassNameOf)(value2);

        // 类型不同
        if (className1 !== className2) {
            return false;
        }

        if (className1 === 'Array') {
            if (value1.length !== value2.length) {
                return false;
            }

            for (var i = 0, il = value1.length; i < il; ++i) {
                if (!deepEqual(value1[i], value2[i])) {
                    return false;
                }
            }

            return true;
        }

        if (value1 instanceof _Data2.default) {
            return value1.equals(value2);
        }

        /* eslint-disable guard-for-in */
        var keys = {};
        for (var key in value1) {
            keys[key] = true;
        }
        for (var key in value2) {
            keys[key] = true;
        }

        for (var key in keys) {
            if (value1[key] !== value2[key] && !deepEqual(value1[key], value2[key])) {
                return false;
            }
        }
        return true;
        /* eslint-enable guard-for-in */
    }
});
//# sourceMappingURL=/Users/baidu/elegant-view/vtpl/deepEqual.js.map