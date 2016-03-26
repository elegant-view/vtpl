/**
 * @file 日志打印输出，方便debug
 * @author yibuyisheng(yibuyisheng@163.com)
 */

/* eslint-disable no-console */
export default {
    error(...args) {
        if (!console || !console.error) {
            return;
        }

        console.error(...args);
    },
    warn(...args) {
        if (!console || !console.warn) {
            return;
        }

        console.warn(...args);
    },
    info(...args) {
        if (!console || !console.info) {
            return;
        }

        console.info(...args);
    }
};
/* eslint-enable no-console */
