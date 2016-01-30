import Vtpl from 'vtpl';

export default function () {
    describe('IfDirectiveParser', () => {
        let node;

        beforeEach(() => {
            node = document.createElement('div');
        });

        it('single branch', done => {
            node.innerHTML = '<!-- if: name === "yibuyisheng" -->yes<!-- /if -->';

            let tpl = new Vtpl({startNode: node, endNode: node});
            tpl.render();

            setTimeout(() => {
                expect(node.innerText).toBe('');

                tpl.setData('name', 'yibuyisheng');
                setTimeout(() => {
                    expect(node.innerText).toBe('yes');
                    tpl.destroy();
                    done();
                }, 70);
            }, 70);
        });

        it('`else` branch', done => {
            node.innerHTML = '<!-- if: name === "yibuyisheng" -->yes<!-- else -->no<!-- /if -->';

            let tpl = new Vtpl({startNode: node, endNode: node});
            tpl.render();

            tpl.setData('name', 'yibuyisheng');
            setTimeout(() => {
                expect(node.innerText).toBe('yes');

                tpl.setData('name', null);
                setTimeout(() => {
                    expect(node.innerText).toBe('no');
                    tpl.destroy();
                    done();
                }, 70);
            }, 70);
        });

        it('`elif` branch', done => {
            node.innerHTML = `
                <!-- if: name === "yibuyisheng" -->
                    yibuyisheng
                <!-- elif: name === "yibuyisheng1" -->
                    yibuyisheng1
                <!-- elif: name === "yibuyisheng2" -->
                    yibuyisheng2
                <!-- else -->
                    unknown
                <!-- /if -->
            `;

            let tpl = new Vtpl({startNode: node, endNode: node});
            tpl.render();

            tpl.setData('name', 'yibuyisheng');
            setTimeout(() => {
                expect(node.innerText.replace(/\s*/g, '')).toBe('yibuyisheng');

                tpl.setData('name', 'yibuyisheng1');
                setTimeout(() => {
                    expect(node.innerText.replace(/\s*/g, '')).toBe('yibuyisheng1');

                    tpl.setData('name', 'yibuyisheng2');
                    setTimeout(() => {
                        expect(node.innerText.replace(/\s*/g, '')).toBe('yibuyisheng2');

                        tpl.setData('name', 'yibuyisheng3');
                        setTimeout(() => {
                            expect(node.innerText.replace(/\s*/g, '')).toBe('unknown');

                            tpl.destroy();
                            done();
                        }, 70);
                    }, 70);
                }, 70);
            }, 70);
        });

        it('nest', done => {
            node.innerHTML = `
                <!-- if: name === "yibuyisheng1" -->
                    yibuyisheng1
                <!-- else -->
                    not yibuyisheng1
                    <!-- if: name === "yibuyisheng2" -->
                        yibuyisheng2
                    <!-- else -->
                        not yibuyisheng2
                    <!-- /if -->
                <!-- /if -->
            `;

            let tpl = new Vtpl({startNode: node, endNode: node});
            tpl.render();

            tpl.setData({name: 'yibuyisheng1'});
            setTimeout(() => {
                expect(node.innerText.replace(/\s*/g, '')).toBe('yibuyisheng1');

                tpl.setData({name: 'yibuyisheng2'});
                setTimeout(() => {
                    expect(node.innerText.replace(/\s*/g, '')).toBe('notyibuyisheng1yibuyisheng2');

                    tpl.setData({name: 'yibuyisheng3'});
                    setTimeout(() => {
                        expect(node.innerText.replace(/\s*/g, '')).toBe('notyibuyisheng1notyibuyisheng2');
                        tpl.destroy();
                        done();
                    }, 70);
                }, 70);
            }, 70);
        });
    });
}
