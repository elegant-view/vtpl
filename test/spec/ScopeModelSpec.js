/**
 * @file ScopeModelSpec
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import ScopeModel from 'vtpl/src/ScopeModel';

describe('ScopeModel', () => {
    it('change event broadcast', () => {
        const l1 = new ScopeModel();
        l1.___ = 'l1';
        const l2 = l1.createChild();
        l2.___ = 'l2';
        const l3 = l2.createChild();
        l3.___ = 'l3';
        const l4 = l3.createChild();
        l4.___ = 'l4';

        let triggerCounter = 0;
        l1.on('change', event => {
            expect(event.type).toBe('change');
            expect(event.changes[0].name).toBe('name');
            expect(event.changes[0].newValue).toBe('yibuyisheng');
            expect(event.model).toBe(l1);
            triggerCounter++;
        });
        l1.on('parentchange', event => {
            throw new Error('不应该触发l1的parentchange事件');
        });
        l4.on('change', event => {
            throw new Error('不应该触发l4的change事件');
        });
        l4.on('parentchange', event => {
            expect(event.type).toBe('parentchange');
            expect(event.changes[0].name).toBe('name');
            expect(event.changes[0].newValue).toBe('yibuyisheng');
            expect(event.model).toBe(l1);
            triggerCounter++;
        });

        l2.on('change', event => {
            throw new Error('不应该触发l2的change事件');
        });
        l3.on('change', event => {
            throw new Error('不应该触发l3的change事件');
        });
        l2.on('parentchange', event => {
            expect(event.type).toBe('parentchange');
            expect(event.changes[0].name).toBe('name');
            expect(event.changes[0].newValue).toBe('yibuyisheng');
            expect(event.model).toBe(l1);
            triggerCounter++;
        });
        l3.on('parentchange', event => {
            expect(event.type).toBe('parentchange');
            expect(event.changes[0].name).toBe('name');
            expect(event.changes[0].newValue).toBe('yibuyisheng');
            expect(event.model).toBe(l1);
            triggerCounter++;
        });

        l1.set('name', 'yibuyisheng');
        expect(triggerCounter).toBe(4);
    });
});
