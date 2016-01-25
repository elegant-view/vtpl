import ExprWatcher from 'vtpl/src/ExprWatcher';
import ScopeModel from 'vtpl/src/ScopeModel';
import ExprCalculater from 'vtpl/src/ExprCalculater';

export default function () {
    describe('ExprWather', () => {
        let watcher;
        let scopeModel;
        let exprCalculater;

        beforeEach(() => {
            scopeModel = new ScopeModel();
            exprCalculater = new ExprCalculater();
            watcher = new ExprWatcher(scopeModel, exprCalculater);
            watcher.start();
        });

        afterAll(() => {
            exprCalculater.destroy();
            watcher.destroy();
        });

        it('base', () => {
            watcher.addExpr('${name}');
            watcher.on('change', event => {
                expect(event.expr).toBe('${name}');
                expect(event.newValue).toBe('yibuyisheng');
                expect(event.oldValue).toBe(undefined);
            });
            scopeModel.set('name', 'yibuyisheng');
        });

        it('date change', () => {
            watcher.addExpr('${dt}');
            let dt = new Date();
            scopeModel.set('dt', dt);

            watcher.on('change', event => {
                let dt = new Date();
                dt.setMonth(-1);
                expect(event.newValue.getMonth() + 1).toBe(dt.getMonth() + 1);
            });
            dt.setMonth(-1);
            scopeModel.set('dt', dt);
        });

        it('array change', () => {
            watcher.addExpr('${array}');
            let array = [];
            scopeModel.set('array', array);

            watcher.on('change', event => {
                expect(event.newValue.length).toBe(1);
            });
            array.push(1);
            scopeModel.set('array', array);
        });
    });
}
