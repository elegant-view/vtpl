/**
 * @file StageTrait
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {isArray} from '../utils';

const ENUM = Symbol('stage enum');
const STAGE = Symbol('stage');

export default {

    /**
     * 限定stage enum范围
     *
     * @protected
     * @param  {Array.<string|Symbol>} arr enum数组
     */
    restrictStageEnum(arr) {
        if (!isArray(arr)) {
            throw new TypeError('should be array');
        }
        this[ENUM] = arr;
    },

    /**
     * 设置stage
     *
     * @public
     * @param {string|Symbol} stage stage
     */
    setStage(stage) {
        if (this.checkStageRestrict(stage)) {
            this[STAGE] = stage;
        }
        else {
            throw new Error('wrong stage');
        }
    },

    /**
     * 检查是否处于某个stage
     *
     * @public
     * @param {string|Symbol} stage stage
     * @return {boolean}
     */
    isInStage(stage) {
        return this[STAGE] === stage;
    },

    /**
     * 检查一下限制
     *
     * @private
     * @param {string|Symbol} stage stage
     * @return {boolean} [description]
     */
    checkStageRestrict(stage) {
        if (!this[ENUM] || !this[ENUM].length) {
            throw new Error('no stage enum');
        }

        for (let i = 0, il = this[ENUM].length; i < il; ++i) {
            if (this[ENUM][i] === stage) {
                return true;
            }
        }

        return false;
    },

    /**
     * 必须要在指定stage，不然就抛出异常
     *
     * @public
     * @param {Array.<string|Symbol>} stages stages
     */
    mustInStages(stages) {
        if (!isArray(stages)) {
            throw new TypeError('wrong parameter');
        }

        for (let i = 0, il = stages.length; i < il; ++i) {
            if (this.isInStage(stages[i])) {
                return;
            }
        }

        throw new Error('in wrong stage');
    }
};
