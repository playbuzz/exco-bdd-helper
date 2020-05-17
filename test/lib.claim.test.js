const Should = require('should');
const SUT = require('../lib/claim');
const ioc = require('../lib/ioc');

describe('lib/claim', () => {
    describe('exported factory', () => {
        it('should be a factory that expect a target context', () => {
            SUT(SUT).isFunction(1);
        });
        describe('form', () => {
            SUT(SUT).hasApi({
                isFunction: 2,
                hasApi: 2,
                hasProps: 2,
                behaviors: 3,
                behavior: 2,
            });

            //TRICKY: I use here 3 forms of .hasProps, both as as self-test
            //  and as example
            SUT.hasProps(SUT, ['version']);
            SUT.hasProps(SUT, { version: 'string' });
            SUT.hasProps(SUT, { version: String });
        });
        describe('when called with a context', () => {
            describe('retrned instance', () => {
                describe('form', () => {
                    SUT(SUT).behavior({
                        args: [{}],
                        expect: {
                            api: [
                                'isFunction',
                                'hasApi',
                                'hasProps',
                                'behaviors',
                                'behavior',
                            ],
                            result: {
                                'returned helper': {
                                    'should be an object': result => {
                                        Should(result).be.an.Object();
                                    },
                                    'should skip': 'skip' || (result => result),
                                },
                            },
                        },
                    });
                });
            });
        });
    });

    describe('static api', () => {
        describe('.isFunction(ctx, arity, { prop } = {})', () => {
            describe('when called with a value that is not a function', () => SUT(SUT.isFunction).behavior({
                args: ['not-a-function'],
                expect: { reject: /expected 'not-a-function' to be a function/i },
            }));
            describe('when called with a value that is a function', () => SUT(SUT, 'isFunction').behaviors([
                {
                    title: 'and no arity parameter or options',
                    args: [a => a],
                    expect: {},
                },
                {
                    title: 'and arity parameter that mismatches the tested arity',
                    args: [a => a, 2],
                    expect: { reject: 'have property length of 2 (got 1)' },
                },
                {
                    title: 'and arity parameter that matches the tested arity',
                    args: [a => a, 1],
                    expect: {},
                },
            ]));
        });

        describe('.behavior({SUT}, spec)', () => {
            describe('when used on an exco-factory function', () => {
                describe('and factory returns value synchronously', () => {
                    SUT({
                        SUT: (options, ioc) => ({ ...options, ...ioc }),
                    }, 'SUT')
                        .behavior({
                            options: { options: true },
                            ioc: ioc({ mocks: { ioc: true } }),
                            expect: {
                                type: 'object',
                                result: {
                                    'should be the returned value': result => {
                                        Should(result).have.properties({ options: true, ioc: true });
                                    },
                                },
                            },
                        });
                });

                describe('and factory resolves value asynchronously', () => {
                    SUT(
                        (options, ioc) => Promise.resolve({ ...options, ...ioc }),
                    )
                        .behavior({
                            options: { options: true },
                            ioc: { ioc: true },
                            expect: {
                                type: 'object',
                                result: {
                                    'should be the returned object': result => {
                                        Should(result).have.properties({ options: true, ioc: true });
                                    },
                                },
                            },
                        });
                });

                describe('and factory throws an expected error', () => {
                    SUT({
                        attr: () => { throw new Error('oupsy dazy'); },
                    }, 'attr')
                        .behavior({
                            options: { options: true },
                            ioc: { ioc: true },
                            expect: {
                                reject: /oupsy dazy/,
                            },
                        });
                });

                describe('and factory reject an expected error', () => {
                    SUT({
                        SUT: () => { throw new Error('oupsy camillia'); },
                    }, 'SUT')
                        .behavior({
                            options: { options: true },
                            ioc: { ioc: true },
                            expect: {
                                reject: /oupsy camillia/,
                            },
                        });
                });

                describe('and factory throws an unexpected error', () => {
                    const ctx = {};
                    const mockErr = new Error('oya broch');
                    before(() => {
                        const { it, before } = global;

                        global.before = f => f();
                        global.it = (ttl, f) => {
                            ctx.handler = f;
                        };
                        try {
                            SUT(
                                () => { throw mockErr; },
                            ).behavior({
                                options: { options: true },
                                ioc: { ioc: true },
                                expect: {},
                            });
                        } finally {
                            global.it = it;
                            global.before = before;
                        }

                        try {
                            ctx.handler();
                        } catch (err) {
                            ctx.err = err;
                        }
                    });

                    it('should throw the error back during the `sould not fail` assertion', () => {
                        Should(ctx.err).equal(mockErr);
                    });
                });
            });

            describe('when used case descriptor does not include .expect section', () => {
                SUT(a => a).behavior({}); //i.e should not fail
            });

            describe('when case descriptor includes before/after hooks', () => {
                const ctx = {};
                const ooo = []; //ooo = order of operations
                before(() => {
                    const { it, before, after } = global;
                    const handlers = [];

                    global.before = f => f();
                    global.it = (ttl, f) => handlers.push(f);
                    global.after = f => handlers.push(f);

                    try {
                        SUT(
                            () => { ooo.push('sut'); },
                        ).behavior({
                            options: { options: true },
                            ioc: { ioc: true },
                            before: () => ooo.push('before'),
                            expect: {
                                result: {
                                    foo: () => ooo.push('result'),
                                },
                            },
                            after: () => ooo.push('after'),
                        });
                    } finally {
                        global.before = before;
                        global.it = it;
                        global.after = after;
                    }

                    try {
                        //before called by the SUT.behavior
                        handlers.forEach(f => f());
                    } catch (err) {
                        ctx.err = err;
                    }
                });

                it('should not fail', () => {
                    if (ctx.err) throw ctx.err;
                });

                it('should fire before and after hooks', () => {
                    Should(ooo).eql([
                        'before',
                        'sut',
                        'result',
                        'after',
                    ]);
                });
            });
        });
    });
});
