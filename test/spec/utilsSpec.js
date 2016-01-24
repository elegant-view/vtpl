import {
    each
}
from 'vtpl/src/utils';

export default function () {
    describe('A suite', function () {
        it('contains spec with an expectation', function () {
            expect(true).toBe(true);
        });
    });
}
