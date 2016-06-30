import clone from 'src/clone';

describe('clone', () => {
    it('should copy the properties of a object', () => {
        const obj = {
            name: 'yibuyisheng',
            age: 20
        };
        const newObj = clone(obj);
        expect(newObj).not.toBe(obj);
        expect(newObj.name).toBe(obj.name);
        expect(newObj.age).toBe(obj.age);
    });

    it('should handle cycled object', () => {
        const obj = {
            name: 'yibuyisheng',
            age: 20
        };
        obj.person = obj;
        const newObj = clone(obj);
        expect(newObj).not.toBe(obj);
        expect(newObj.name).toBe(obj.name);
        expect(newObj.age).toBe(obj.age);
        expect(newObj.person).toBe(newObj);
    });

    it('should handle cycled array', () => {
        const arr = ['yibuyisheng', 20];
        arr[2] = arr;
        const newArr = clone(arr);
        expect(newArr).not.toBe(arr);
        expect(newArr[0]).toBe(arr[0]);
        expect(newArr[1]).toBe(arr[1]);
        expect(newArr[2]).toBe(newArr);
    });
});
