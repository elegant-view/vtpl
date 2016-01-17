/**
 * @file 配置
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {regExpEncode} from './utils';

export default class Config {
    constructor() {
        this.exprPrefix = '${';
        this.exprSuffix = '}';

        this.ifName = 'if';
        this.elifName = 'elif';
        this.elseName = 'else';
        this.ifEndName = '/if';

        this.ifPrefixRegExp = /^\s*if:\s*/;
        this.elifPrefixRegExp = /^\s*elif:\s*/;
        this.elsePrefixRegExp = /^\s*else\s*/;
        this.ifEndPrefixRegExp = /^\s*\/if\s*/;

        this.forName = 'for';
        this.forEndName = '/for';

        this.forPrefixRegExp = /^\s*for:\s*/;
        this.forEndPrefixRegExp = /^\s*\/for\s*/;

        this.eventPrefix = 'event';

        this.varName = 'var';

        this.scopeName = 'scope';
        this.scopeEndName = '/scope';
    }

    setExprPrefix(prefix) {
        this.exprPrefix = prefix;
    }

    setExprSuffix(suffix) {
        this.exprSuffix = suffix;
    }

    getExprRegExp() {
        if (!this.exprRegExp) {
            this.exprRegExp = new RegExp(
                `${regExpEncode(this.exprPrefix)}(.+?)${regExpEncode(this.exprSuffix)}`,
                'g'
            );
        }
        this.exprRegExp.lastIndex = 0;
        return this.exprRegExp;
    }

    getAllIfRegExp() {
        if (!this.allIfRegExp) {
            this.allIfRegExp = new RegExp('\\s*('
                + this.ifName + '|'
                + this.elifName + '|'
                + this.elseName + '|'
                + this.ifEndName + '):\\s*', 'g');
        }
        this.allIfRegExp.lastIndex = 0;
        return this.allIfRegExp;
    }

    setIfName(ifName) {
        this.ifName = ifName;
        this.ifPrefixRegExp = new RegExp('^\\s*' + ifName + ':\\s*');
    }

    setElifName(elifName) {
        this.elifName = elifName;
        this.elifPrefixRegExp = new RegExp('^\\s*' + elifName + ':\\s*');
    }

    setElseName(elseName) {
        this.elseName = elseName;
        this.elsePrefixRegExp = new RegExp('^\\s*' + elseName + '\\s*');
    }

    setIfEndName(ifEndName) {
        this.ifEndName = ifEndName;
        this.ifEndPrefixRegExp = new RegExp('^\\s*' + ifEndName + '\\s*');
    }

    setForName(forName) {
        this.forName = forName;
        this.forPrefixRegExp = new RegExp('^\\s*' + forName + ':\\s*');
    }

    setForEndName(forEndName) {
        this.forEndName = forEndName;
        this.forEndPrefixRegExp = new RegExp('^\\s*' + forEndName + '\\s*');
    }

    getForExprsRegExp() {
        if (!this.forExprsRegExp) {
            this.forExprsRegExp = new RegExp('\\s*'
                + this.forName
                + ':\\s*'
                + regExpEncode(this.exprPrefix)
                + '([^' + regExpEncode(this.exprSuffix)
                + ']+)' + regExpEncode(this.exprSuffix));
        }
        this.forExprsRegExp.lastIndex = 0;
        return this.forExprsRegExp;
    }

    getForItemValueNameRegExp() {
        if (!this.forItemValueNameRegExp) {
            this.forItemValueNameRegExp = new RegExp(
                'as\\s*' + regExpEncode(this.exprPrefix)
                + '([^' + regExpEncode(this.exprSuffix) + ']+)'
                + regExpEncode(this.exprSuffix)
            );
        }
        this.forItemValueNameRegExp.lastIndex = 0;
        return this.forItemValueNameRegExp;
    }

    setEventPrefix(prefix) {
        this.eventPrefix = prefix;
    }

    setVarName(name) {
        this.varName = name;
    }
}
