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