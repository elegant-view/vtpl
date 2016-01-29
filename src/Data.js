/**
 * @file 数据基类，这个用于scope里面的数据，主要实现了clone和equals方法
 * @author yibuyisheng(yibuyisheng@163.com)
 */

export default class Data {
    clone() {
        throw new Error('please implement the `clone` method first!');
    }

    equals() {
        throw new Error('please implement the `equal` method first!');
    }

    toString() {
        return '';
    }
}
