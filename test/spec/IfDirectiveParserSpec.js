import Vtpl from 'src/main';

describe('IfDirectiveParser', () => {
    let node;

    beforeEach(() => {
        node = document.createElement('div');
    });

    it('single branch', done => {
        node.innerHTML = '<!-- if: name === "yibuyisheng" -->yes<!-- /if -->';

        let tpl = new Vtpl({startNode: node, endNode: node});
        tpl.render(() => {
            expect(node.textContent).toBe('');

            tpl.setData('name', 'yibuyisheng', {
                done() {
                    expect(node.textContent).toBe('yes');
                    tpl.destroy();
                    done();
                }
            });
        });
    });

    it('`else` branch', done => {
        node.innerHTML = '<!-- if: name === "yibuyisheng" -->yes<!-- else -->no<!-- /if -->';

        let tpl = new Vtpl({startNode: node, endNode: node});
        tpl.render();

        tpl.setData('name', 'yibuyisheng', {
            done() {
                expect(node.textContent).toBe('yes');

                tpl.setData('name', null, {
                    done() {
                        expect(node.textContent).toBe('no');
                        tpl.destroy();
                        done();
                    }
                });
            }
        });
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

        tpl.setData('name', 'yibuyisheng', {
            done() {
                expect(node.textContent.replace(/\s*/g, '')).toBe('yibuyisheng');

                tpl.setData('name', 'yibuyisheng1', {
                    done() {
                        expect(node.textContent.replace(/\s*/g, '')).toBe('yibuyisheng1');

                        tpl.setData('name', 'yibuyisheng2', {
                            done() {
                                expect(node.textContent.replace(/\s*/g, '')).toBe('yibuyisheng2');

                                tpl.setData('name', 'yibuyisheng3', {
                                    done() {
                                        expect(node.textContent.replace(/\s*/g, '')).toBe('unknown');

                                        tpl.destroy();
                                        done();
                                    }
                                });

                            }
                        });
                    }
                });
            }
        });
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

        tpl.setData({name: 'yibuyisheng1'}, {
            done() {
                expect(node.textContent.replace(/\s*/g, '')).toBe('yibuyisheng1');

                tpl.setData({name: 'yibuyisheng2'}, {
                    done() {
                        expect(node.textContent.replace(/\s*/g, '')).toBe('notyibuyisheng1yibuyisheng2');

                        tpl.setData({name: 'yibuyisheng3'}, {
                            done() {
                                expect(node.textContent.replace(/\s*/g, '')).toBe('notyibuyisheng1notyibuyisheng2');
                                tpl.destroy();
                                done();
                            }
                        });
                    }
                });
            }
        });
    });

    it('`if` `for` nest', done => {
        node.innerHTML = [
            '<!-- if: type === 1 -->',
                '1',
                '<!-- for: items as item -->',
                    '${item}',
                '<!-- /for -->',
            '<!-- elif: type === 2 -->',
                '2',
                '<!-- for: items as item -->',
                    '${item}',
                '<!-- /for -->',
            '<!-- /if -->'
        ].join('');

        let tpl = new Vtpl({startNode: node, endNode: node});
        tpl.render();

        tpl.setData({
            type: 2,
            items: ['a', 'b']
        }, {
            done() {
                expect(node.textContent).toBe('2ab');

                tpl.setData({
                    items: ['a', 'b', 'c']
                }, {
                    done() {
                        expect(node.textContent).toBe('2abc');

                        tpl.setData({
                            type: 1
                        }, {
                            done() {
                                expect(node.textContent).toBe('1abc');
                                done();
                            }
                        });
                    }
                });
            }
        });
    });

    it('`if` end node', done => {
        node.innerHTML = `
            <!-- if: type === 1 -->
                1
            <!-- else -->
                other
            <!-- /if -->
            <div><span>outside</span></div>
        `;

        let tpl = new Vtpl({startNode: node, endNode: node});
        tpl.render();

        tpl.setData({
            type: 1
        }, {
            done() {
                expect(node.textContent.replace(/\s/g, ''), '').toBe('1outside');
                done();
            }
        });
    });

});
