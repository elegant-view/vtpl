define(["exports"], function (exports) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var Base = function Base() {
        _classCallCheck(this, Base);
    };

    Base.trait = function trait(props) {
        var proto = this.prototype;
        /* eslint-disable guard-for-in */
        for (var key in props) {
            proto[key] = props[key];
        }
        /* eslint-enable guard-for-in */

        return this;
    };

    exports.default = Base;
});