import DomUpdater from 'vtpl/src/DomUpdater';

describe('DomUpdater', () => {
    let domUpdater;
    beforeEach(() => {
        domUpdater = new DomUpdater();
        domUpdater.start();
    });
    afterEach(() => {
        domUpdater.destroy();
        domUpdater = null;
    });

    it('base', done => {
        let counter = 0;
        domUpdater.addTaskFn(
            domUpdater.generateTaskId(),
            () => {
                ++counter;
            },
            () => {
                expect(counter).toBe(1);
                done();
            }
        );
    });

    it('overide', done => {
        let counter = 0;
        domUpdater.addTaskFn(
            domUpdater.generateTaskId(),
            inc
        );

        domUpdater.addTaskFn(
            domUpdater.generateTaskId(),
            inc
        );

        setTimeout(() => {
            expect(counter).toBe(2);
            done();
        }, 25);

        function inc() {
            ++counter;
        }
    });
});
