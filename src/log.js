/**
 * @file 日志打印输出，方便debug
 * @author yibuyisheng(yibuyisheng@163.com)
 */

/* eslint-disable no-console */
export default {
    warn: function () {
        if (!console || !console.warn) {
            return;
        }

        console.warn.apply(console, arguments);
    },
    info: function () {
        if (!console || !console.info) {
            return;
        }

        console.info.apply(console, arguments);
    }
};
/* eslint-enable no-console */
