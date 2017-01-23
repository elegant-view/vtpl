import DomUpdater from 'src/DomUpdater';

describe('DomUpdater', () => {

    it('should execute task after calling `start` method', done => {
        const domUpdater = new DomUpdater();
        const taskId = domUpdater.generateTaskId();
        let counter = 0;
        domUpdater.start();
        domUpdater.addTaskFn(taskId, () => ++counter, () => {
            expect(counter).toBe(1);
            domUpdater.destroy();
            done();
        });
    });

    it('should execute asynchronously', done => {
        const domUpdater = new DomUpdater();
        const taskId = domUpdater.generateTaskId();
        let counter = 0;
        domUpdater.start();
        domUpdater.addTaskFn(taskId, () => ++counter, () => {
            expect(counter).toBe(1);
            domUpdater.destroy();
            done();
        });
        expect(counter).toBe(0);
    });

    it('should not execute after calling `destroy` method', done => {
        const domUpdater = new DomUpdater();
        const taskId = domUpdater.generateTaskId();
        let counter = 0;
        domUpdater.start();
        domUpdater.addTaskFn(taskId, () => ++counter, () => {
            done(new Error('wrong'));
        });
        domUpdater.destroy();
        setTimeout(done, 1000);
    });

    it('should override task function, not notify function', done => {
        const domUpdater = new DomUpdater();
        domUpdater.start();

        const taskId = domUpdater.generateTaskId();
        let taskCounter = 0;
        let notifyCounter = 0;
        domUpdater.addTaskFn(taskId, () => ++taskCounter, () => {
            ++notifyCounter;
        });
        domUpdater.addTaskFn(taskId, () => ++taskCounter, () => {
            ++notifyCounter;

            expect(taskCounter).toBe(1);
            expect(notifyCounter).toBe(2);
            domUpdater.destroy();
            done();
        });
    });

    describe('generateTaskId()', () => {
        it('should generate unique task id', () => {
            let domUpdater = new DomUpdater();
            expect(domUpdater.generateTaskId()).not.toBe(domUpdater.generateTaskId());
        });
    });

    describe('generateNodeAttrUpdateId()', () => {
        it('should generate id by node and it\'s attribute', () => {
            let node = {getNodeId() { return '1'; }};
            let domUpdater = new DomUpdater();
            expect(
                domUpdater.generateNodeAttrUpdateId(node, 'attr')
            ).toBe(
                domUpdater.generateNodeAttrUpdateId(node, 'attr')
            );
            expect(
                domUpdater.generateNodeAttrUpdateId(node, 'attr')
            ).not.toBe(
                domUpdater.generateNodeAttrUpdateId(node, 'attr1')
            );
        });
    });

});
