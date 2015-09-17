module.exports = {
    warn: function () {
        if (!console || !console.warn) {
            return;
        }

        console.warn.apply(console, arguments);
    }
};