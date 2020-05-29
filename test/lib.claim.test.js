/* eslint max-lines: 'off', class-methods-use-this: 'off' */
const { inspect } = require('util');
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
                isExcoFactory: 1,
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
                                'isExcoFactory',
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

        describe('.isExcoFactory(SUT, [opts])', () => {
            const orig = { ...global };
            const hijack = ctx => {
                ctx.tests = [];
                global.describe = (ttl, f) => f();
                global.it = (ttl, f) => {
                    ctx.tests.push({ id: ctx.tests.length, ttl, f });
                };
            };
            const restore = () => {
                ['describe', 'it'].forEach(api => { global[api] = orig[api]; });
            };
            const runSuite = ctx => {
                ctx.tests.some(test => {
                    try {
                        test.f();
                    } catch (e) {
                        test.err = e;
                        ctx.failed = test;
                        return true;
                    }
                    return false;
                });
            };
            const onReady = ctx => {
                restore();
                runSuite(ctx);
            };

            describe('when called with a non-function value', () => {
                const ctx = SUT(SUT.isExcoFactory).behavior({
                    before: hijack,
                    args: ['not-a-function'],
                    ready: onReady,
                });

                describe('the created suite', () => {
                    it('should fail about the non-function value', () => {
                        Should(ctx.failed)
                            .be.an.Object()
                            .have.property('id', 0);
                        Should(ctx.failed.err)
                            .have.property('message').match(/expected 'not-a-function' to be a function/);
                    });
                });
            });

            describe('when called with a function with wrong arity without overriding arity option', () => {
                const ctx = SUT(SUT.isExcoFactory).behavior({
                    before: hijack,
                    args: [(a, b, c) => ({ a, b, c })],
                    ready: onReady,
                });

                it('should create one test', () => {
                    Should(ctx.tests).property('length', 1);
                });

                describe('the created suite', () => {
                    it('should fail about the mismatching arity', () => {
                        Should(ctx.failed)
                            .be.an.Object()
                            .have.property('id', 0);
                        Should(ctx.failed.err)
                            .have.property('message').match(/have property length of 2 \(got 3\)/);
                    });
                });
            });

            describe('when called with options.arity', () => {
                describe('and arity option is illegal (not between 0 and 2)', () => {
                    const ctx = SUT(SUT.isExcoFactory).behavior({
                        before: hijack,
                        args: [(a, b, c) => ({ a, b, c }), { arity: 3 }],
                        ready: onReady,
                        expect: { reject: /arity must be between 0 to 2/ },
                    });

                    it('should not create any tests', () => {
                        Should(ctx.tests).eql([]);
                    });
                });

                describe('and arity: 1 with function with matching arity', () => {
                    const ctx = SUT(SUT.isExcoFactory).behavior({
                        before: hijack,
                        args: [a => a, { arity: 1 }],
                        ready: onReady,
                    });

                    it('should create one test', () => {
                        Should(ctx.tests).property('length', 1);
                    });

                    describe('the created suite', () => {
                        it('should pass', () => {
                            Should.not.exist(ctx.failed);
                        });
                    });
                });

                describe('and arity: 0 with function with matching arity', () => {
                    const ctx = SUT(SUT.isExcoFactory).behavior({
                        before: hijack,
                        args: [() => 0, { arity: 0 }],
                        ready: onReady,
                    });

                    it('should create one test', () => {
                        Should(ctx.tests).property('length', 1);
                    });

                    describe('the created suite', () => {
                        it('should pass', () => {
                            Should.not.exist(ctx.failed);
                        });
                    });
                });
            });
            describe('when called with options.validator', () => {
                describe('and provided value has no validator', () => {
                    const factoryWithNoValidator = (a, b) => ({ a, b });

                    const ctx = SUT(SUT.isExcoFactory).behavior({
                        before: hijack,
                        args: [factoryWithNoValidator, { hasValidator: true }],
                        ready: onReady,
                    });

                    it('should create two tests', () => {
                        Should(ctx.tests).property('length', 2);
                    });

                    describe('the created suite', () => {
                        it('should fail on the missing validator', () => {
                            Should(ctx.failed)
                                .be.an.Object();
                            Should(ctx.failed.err)
                                .have.property('message').match(/expected .+ to have type function/);
                        });
                    });
                });

                describe('and provided value has .validate which is not a function', () => {
                    const factoryWithNonFuncValidate = (a, b) => ({ a, b });
                    factoryWithNonFuncValidate.validate = 'not-a-function';

                    const ctx = SUT(SUT.isExcoFactory).behavior({
                        before: hijack,
                        args: [factoryWithNonFuncValidate, { hasValidator: true }],
                        ready: onReady,
                    });

                    it('should create two tests', () => {
                        Should(ctx.tests).property('length', 2);
                    });

                    describe('the created suite', () => {
                        it('should fail on the missing validator', () => {
                            Should(ctx.failed)
                                .be.an.Object();
                            Should(ctx.failed.err)
                                .have.property('message').match(/expected .+ to have type function/);
                        });
                    });
                });

                describe('and provided value has a valid validator function', () => {
                    const factoryWithNonFuncValidate = (a, b) => ({ a, b });
                    factoryWithNonFuncValidate.validate = opts => opts;

                    const ctx = SUT(SUT.isExcoFactory).behavior({
                        before: hijack,
                        args: [factoryWithNonFuncValidate, { hasValidator: true }],
                        ready: onReady,
                    });

                    it('should create two tests', () => {
                        Should(ctx.tests).property('length', 2);
                    });

                    describe('the created suite', () => {
                        it('should pass', () => {
                            Should.not.exist(ctx.failed);
                        });
                    });
                });
            });

            describe('when called with options.mapsEnv: true', () => {
                describe('and provided value has no .env map', () => {
                    const factoryWithNoEnvMap = (a, b) => ({ a, b });

                    const ctx = SUT(SUT.isExcoFactory).behavior({
                        before: hijack,
                        args: [factoryWithNoEnvMap, { mapsEnv: true }],
                        ready: onReady,
                    });

                    it('should create create additional test for the .env', () => {
                        Should(ctx.tests).property('length', 2);
                    });

                    describe('the created suite', () => {
                        it('should fail on the missing env map', () => {
                            Should(ctx.failed)
                                .be.an.Object();
                            Should(ctx.failed.err)
                                .have.property('message').match(/expected .+ to have property env/);
                        });
                    });
                });

                describe('and provided value has .env map', () => {
                    const factoryWithEnvMap = (a, b) => ({ a, b });
                    factoryWithEnvMap.env = {};

                    const ctx = SUT(SUT.isExcoFactory).behavior({
                        before: hijack,
                        args: [factoryWithEnvMap, { mapsEnv: true }],
                        ready: onReady,
                    });

                    it('should create additional test for the .env', () => {
                        Should(ctx.tests).property('length', 2);
                    });

                    describe('the created suite', () => {
                        it('should pass', () => {
                            Should.not.exist(ctx.failed);
                        });
                    });
                });
            });

            describe('when called with options.mapsEnv: <map> ', () => {
                describe('and provided value has .env map with only part of the keys', () => {
                    const factoryWithNoEnvMap = (a, b) => ({ a, b });
                    factoryWithNoEnvMap.env = { prop1: 'ENV_PARAM1' };

                    const ctx = SUT(SUT.isExcoFactory).behavior({
                        before: hijack,
                        args: [
                            factoryWithNoEnvMap,
                            {
                                mapsEnv: ['prop1', 'prop2', 'prop3'],
                            },
                        ],
                        ready: onReady,
                    });

                    it('should create create additional test for each key in mapsEnv', () => {
                        Should(ctx.tests).property('length', 4);
                    });

                    describe('the created suite', () => {
                        it('should fail on the first missing key', () => {
                            Should(ctx.failed)
                                .be.an.Object();
                            Should(ctx.failed.err)
                                .have.property('message').match(/expected .+ to have property prop2/);
                        });
                    });
                });

                describe('and provided value has .env map with all keys specified at .mapsEnv', () => {
                    const factoryWithEnvMap = (a, b) => ({ a, b });
                    factoryWithEnvMap.env = {
                        prop1: 'ENV_PARAM1',
                        prop2: 'ENV_PARAM2',
                        prop3: 'ENV_PARAM3',
                    };

                    const ctx = SUT(SUT.isExcoFactory).behavior({
                        before: hijack,
                        args: [
                            factoryWithEnvMap,
                            {
                                mapsEnv: ['prop1', 'prop2', 'prop3'],
                            },
                        ],
                        ready: onReady,
                    });

                    it('should create two tests', () => {
                        Should(ctx.tests).property('length', 4);
                    });

                    describe('the created suite', () => {
                        it('should pass', () => {
                            Should.not.exist(ctx.failed);
                        });
                    });
                });
            });
        });

        describe('.hasProps(SUT, spec)', () => {
            const origIt = global.it;
            class MyErr extends Error {
                [inspect.custom]() { return '[Error] { ... }'; }
                toJSON() { return { name: 'The-Mock-Error ' }; }
            }
            const val = {
                boolProp: false,
                objPropForClassCheck: new MyErr('this is an Error'),
                strPropForTypeCheck: 'this is a string prop',
                strPropForMatchCheck: 'this is a matchable prop',
                nested: {
                    doubleNested: {
                        str: 'str',
                        renested: {
                            str: 'yes!',
                        },
                    },
                },
            };
            const suiteFor = SUT(SUT.hasProps);

            describe('when called with value that matches the specs', () => suiteFor.behavior({
                before: setup,
                ready: restore,
                args: [val, {
                    boolProp: 'boolean',
                    objPropForClassCheck: MyErr,
                    strPropForTypeCheck: 'string',
                    strPropForMatchCheck: /matchable/,
                }],
            }));

            describe('when called with value that fails regex match', () => suiteFor.behavior({
                before: setup,
                ready: restore,
                args: [val, {
                    boolProp: 'boolean',
                    objPropForClassCheck: MyErr,
                    strPropForTypeCheck: 'string',
                    strPropForMatchCheck: /not-matchable/,
                }],
                expect: rejection('to match /not-matchable/'),
            }));

            describe('when called with value that fails type match', () => suiteFor.behavior({
                before: setup,
                ready: restore,
                args: [val, {
                    boolProp: 'boolean',
                    objPropForClassCheck: MyErr,
                    strPropForTypeCheck: 'object',
                    strPropForMatchCheck: /matchable/,
                }],
                expect: rejection('to have type object'),
            }));

            describe('when called with value that fails class check', () => suiteFor.behavior({
                before: setup,
                ready: restore,
                args: [val, {
                    boolProp: 'boolean',
                    objPropForClassCheck: class TheProvidedClass extends Error {},
                    strPropForTypeCheck: 'object',
                    strPropForMatchCheck: /matchable/,
                }],
                expect: rejection('to be an instance of TheProvidedClass'),
            }));

            describe('when called with value that fails eql check', () => suiteFor.behavior({
                before: setup,
                ready: restore,
                args: [val, {
                    boolProp: true,
                    objPropForClassCheck: class TheProvidedClass extends Error {},
                    strPropForTypeCheck: 'object',
                    strPropForMatchCheck: /matchable/,
                }],
                expect: rejection('expected false to equal true'),
            }));

            describe('when called with a nested props descriptor and a value that passes', () => suiteFor.behavior({
                before: setup,
                ready: restore,
                args: [val, {
                    nested: {
                        doubleNested: {
                            str: /str/,
                        },
                    },
                }],
            }));

            describe('when called with a nested props descriptor and a value that fails on nested prop', () => {
                suiteFor.behavior({
                    before: setup,
                    ready: restore,
                    args: [val, {
                        nested: {
                            doubleNested: {
                                str: /oups/,
                            },
                        },
                    }],
                    expect: rejection('expected \'str\' to match /oups/'),
                });
            });

            describe('when called with a prop-specifier and a nested props descriptor', () => {
                describe('and a value that passes', () => {
                    SUT(SUT.hasProps).behavior({
                        before: setup,
                        ready: restore,
                        args: [val, {
                            doubleNested: {
                                renested: {
                                    str: /yes!/,
                                },
                            },
                        }, { prop: 'nested' }],
                    });
                });

                describe('and a value fails on a deeply nested attr', () => {
                    SUT(SUT.hasProps).behavior({
                        before: setup,
                        ready: restore,
                        args: [val, {
                            doubleNested: {
                                renested: {
                                    str: /nope/,
                                },
                            },
                        }, { prop: 'nested' }],
                        expect: rejection('expected \'yes!\' to match /nope/'),
                    });
                });

                describe('and a value is missing entirely', () => {
                    SUT(SUT.hasProps).behavior({
                        before: setup,
                        ready: restore,
                        args: [{ the: 'wrong object' }, {
                            doubleNested: {
                                renested: {
                                    str: /nope/,
                                },
                            },
                        }, { prop: 'noSuchProp' }],
                        expect: rejection(/expected .* to have property .noSuchProp/),
                    });
                });
            });


            function setup(ctx) {
                global.it = (ttl, f) => {
                    ctx.ttl = ttl;
                    f();
                };
            }

            function restore() {
                global.it = origIt;
            }

            function rejection(reject) {
                return {
                    reject: true,
                    result: {
                        'should fail on the failed attribute with matching descriptive message': result => {
                            Should(result).be.an.Error()
                                .have.property('message')[reject instanceof RegExp ? 'match' : 'containEql'](reject);
                        },
                    },
                };
            }
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

            describe('when used case-descriptor does not include .expect section', () => {
                SUT(a => a).behavior({}); //i.e should not fail
            });

            describe('when case-descriptor includes before/awaiting/ready/after hooks', () => {
                const ctx = {};
                const ooo = []; //ooo = order of operations
                before(async () => {
                    const { it, before, after } = global;
                    const handlers = [];

                    global.before = f => { ctx.before = f; };
                    global.it = (ttl, f) => handlers.push(f);
                    global.after = f => handlers.push(f);

                    try {
                        SUT(
                            () => {
                                ooo.push('sut');
                                return Promise.resolve();
                            },
                        ).behavior({
                            options: { options: true },
                            ioc: { ioc: true },
                            before: () => ooo.push('before'),
                            awaiting: () => ooo.push('awaiting'),
                            ready: () => ooo.push('ready'),
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
                        await ctx.before();
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
                        'awaiting',
                        'ready',
                        'result',
                        'after',
                    ]);
                });
            });

            describe('when case-descriptor includes expect.result', () => {
                describe('and expect.result contains a title whose value is a stirng', () => {
                    const handlers = [];
                    before(() => {
                        const { describe, it, before } = global;

                        global.describe = (ttl, f) => f();
                        global.before = f => f;
                        global.it = (ttl, f) => handlers.push({ ttl, f: Boolean(f) });

                        try {
                            SUT(
                                () => {
                                    return Promise.resolve();
                                },
                            ).behavior({
                                options: { options: true },
                                ioc: { ioc: true },
                                expect: {
                                    result: {
                                        'this is a pending test': 'skipped' || (a => a),
                                        'this is also a pending test': null,
                                        'this is an active test': a => a,
                                        'sub section': {
                                            'this is a nested active test': a => a,
                                            'this is a nested pending test': 'TBD',
                                        },
                                    },
                                },
                            });
                        } finally {
                            global.describe = describe;
                            global.before = before;
                            global.it = it;
                        }
                    });

                    it('should load them as pending tests, adding string to title, if any', () => {
                        Should(handlers).eql([
                            { f: true, ttl: 'should not fail' },
                            { f: false, ttl: 'this is a pending test >> skipped' },
                            { f: false, ttl: 'this is also a pending test' },
                            { f: true, ttl: 'this is an active test' },
                            { f: true, ttl: 'this is a nested active test' },
                            { f: false, ttl: 'this is a nested pending test >> TBD' },
                        ]);
                    });
                });
            });
        });
    });
});
