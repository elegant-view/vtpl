define(["exports"], function (exports) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.default = {
        error: function error() {
            var _console;

            if (!console || !console.error) {
                return;
            }

            (_console = console).error.apply(_console, arguments);
        },
        warn: function warn() {
            var _console2;

            if (!console || !console.warn) {
                return;
            }

            (_console2 = console).warn.apply(_console2, arguments);
        },
        info: function info() {
            var _console3;

            if (!console || !console.info) {
                return;
            }

            (_console3 = console).info.apply(_console3, arguments);
        }
    };
});
//# sourceMappingURL=/Users/baidu/elegant-view/vtpl/log.js.map