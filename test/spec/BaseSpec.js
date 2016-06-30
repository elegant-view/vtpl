import Base from 'src/Base';

describe('Base', () => {
    it('should have a `destroy` method', () => {
        const base = new Base();
        expect(Object.prototype.toString.call(base.destroy)).toBe('[object Function]');
        base.destroy();
    });

    it('should has `destroied` state after `destroy` method be called', () => {
        const base = new Base();
        expect(base.hasState('destroied')).toBe(false);
        base.destroy();
        expect(base.hasState('destroied')).toBe(true);
    });
});
