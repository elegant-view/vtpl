import DarkEntity from 'src/DarkEntity';

describe('DarkEntity', () => {
    it('should switch to dark mode after calling `goDark` method', () => {
        const darkEntity = new DarkEntity();
        darkEntity.goDark();
        expect(darkEntity.hasState('dark')).toBe(true);
        darkEntity.destroy();
    });

    it('should switch to nondark mode after calling `restoreFromDark` method', () => {
        const darkEntity = new DarkEntity();
        darkEntity.goDark();
        expect(darkEntity.hasState('dark')).toBe(true);
        darkEntity.restoreFromDark();
        expect(darkEntity.hasState('dark')).toBe(false);
        darkEntity.destroy();
    });
});
