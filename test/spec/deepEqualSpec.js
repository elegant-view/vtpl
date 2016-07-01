import deepEqual from 'src/deepEqual';

describe('deepEqual', () => {
    it('should handle two object\'s comparison', () => {
        let obj1 = {name: 'yibuyisheng', age: 20};
        let obj2 = {name: 'yibuyisheng', age: 20};
        expect(deepEqual(obj1, obj2)).toBe(true);

        obj2 = {name: 'yibuyisheng1', age: 20};
        expect(deepEqual(obj1, obj2)).toBe(false);

        obj2 = {name: 'yibuyisheng', age: 20, sex: 'mail'};
        expect(deepEqual(obj1, obj2)).toBe(false);
    });

    it('should handle two array\'s comparison', () => {
        let arr1 = ['yibuyisheng', 20];
        let arr2 = ['yibuyisheng', 20];
        expect(deepEqual(arr1, arr2)).toBe(true);

        arr2 = ['yibuyisheng1', 20];
        expect(deepEqual(arr1, arr2)).toBe(false);

        arr2 = ['yibuyisheng', 20, 'mail'];
        expect(deepEqual(arr1, arr2)).toBe(false);
    });

    it('should handle cycled objects', () => {
        let obj1 = {
            name: 'yibuyisheng',
            age: 20
        };
        obj1.person = obj1;
        let obj2 = {
            name: 'yibuyisheng',
            age: 20
        };
        obj2.person = obj2;
        expect(deepEqual(obj1, obj2)).toBe(true);
    });
});
