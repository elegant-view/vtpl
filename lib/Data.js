define(['exports'], function (exports) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var Data = function () {
        function Data() {
            _classCallCheck(this, Data);
        }

        _createClass(Data, [{
            key: 'clone',
            value: function clone() {
                throw new Error('please implement the `clone` method first!');
            }
        }, {
            key: 'equals',
            value: function equals() {
                throw new Error('please implement the `equal` method first!');
            }
        }, {
            key: 'toString',
            value: function toString() {
                return '';
            }
        }]);

        return Data;
    }();

    exports.default = Data;
});