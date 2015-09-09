function Config() {
    this.exprRegExp = /\$\{([^{}]+)\}/g;
}

Config.prototype.setExpressionRegExp = function (regexp) {
    this.exprRegExp = regexp;
};

module.exports = Config;
