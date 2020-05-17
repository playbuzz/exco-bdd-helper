const { ExcoError } = require('@playbuzz/exco-run/errors');
const { EventEmitter } = require('events');
const Should = require('should');
const claim = require('../lib/claim');
const SUT = require('../lib/ioc');

describe('lib/ioc', () => {
    it('should be a factory function that expects an optional settings object', () => {
        claim(SUT).isFunction(0);
    });

    describe('when called without settings', () => {
        claim(SUT).behavior({
            args: [],
            expect: {
                type: 'object',
                props: {
                    errors:     Object,
                    bus:        EventEmitter,
                    context:    Object,
                    config:     Object,
                    hrtime:     Function,
                    logger:     Object,
                },
                result: {
                    '.config object': {
                        'should contain mock cwd and mock package info with defaults': result => {
                            Should(result.config).containEql({
                                pkg: { name: 'mock-pkg', version: '1.2.3' },
                                cwd: '.',
                            });
                        },
                    },
                    '.context object': {
                        'should have method .watch, that runs synchronously whatever handler it gets': result => {
                            Should(result.context)
                                .have.property('watch')
                                .be.a.Function();

                            let called = false;
                            result.context.watch(() => { called = true; });

                            Should(called).be.True();
                        },
                    },
                },
            },
        });
    });

    describe('when called with settings that include mocks side by side with config', () => {
        const foo = {};
        const bar = {};
        const str = 'str';
        const num = Math.random();

        claim(SUT).behavior({
            args: [{
                mock: {
                    foo,
                    bar,
                    str,
                    num,
                },
                config: {
                    fooCfg: { foo: 1 },
                },
            }],
            expect: {
                type: 'object',
                result: {
                    'should include all core attributes': result => {
                        Should(result).have.properties([
                            'errors',
                            'bus',
                            'context',
                            'config',
                            'hrtime',
                            'logger',
                        ]);
                    },
                    'should include all provided mocks': result => {
                        Should(result).have.properties({
                            foo,
                            bar,
                            str,
                            num,
                        });
                    },
                    '.config object': {
                        'should contain mock cwd and mock package info with defaults': result => {
                            Should(result.config).containEql({
                                pkg: { name: 'mock-pkg', version: '1.2.3' },
                                cwd: '.',
                            });
                        },
                        'should contain provided config into merged into it': result => {
                            Should(result).have.property('config')
                                .containEql({ fooCfg: { foo: 1 } });
                        },
                    },
                },
            },
        });
    });

    describe('when called with settings that include mock errors', () => {
        describe('and errors is not an array nor a function', () => {
            claim(SUT).behavior({
                args: [{
                    errors: 'not an array nor a function',
                }],
                expect: {
                    reject: /ioc - errors must be an array of errors, or a function that returns one/,
                },
            });
        });

        describe('and errors is not an array nor a function', () => {
            const notAStringNorClass = false;
            claim(SUT).behavior({
                args: [{
                    errors: [notAStringNorClass],
                }],
                expect: {
                    reject: /ioc - entries in errors array can be either classes or string of classe names to mock/,
                },
            });
        });

        describe('and errors is a function that returns an array of strings of class names to mock', () => {
            claim(SUT).behavior({
                args: [{
                    errors: () => ['MyError', 'MyOtherError'],
                }],
                expect: {
                    result: {
                        'should register the errors and their helper functions': result => {
                            Should(result)
                                .have.property('errors')
                                .have.properties([
                                    'MyError',
                                    'myError',
                                    'myReject',
                                    'MyOtherError',
                                    'myOtherError',
                                    'myOtherReject',
                                ]);
                        },
                        'registered classes should be operable as error constructors': result => {
                            Should(result.errors.myError()).be.an.Error();
                        },
                    },
                },
            });
        });

        describe('and errors is a function that returns an array of classes', () => {
            claim(SUT).behavior({
                args: [{
                    errors: () => [class MyError extends ExcoError {}, class MyOtherError extends ExcoError {}],
                }],
                expect: {
                    result: {
                        'should register the errors and their helper functions': result => {
                            Should(result)
                                .have.property('errors')
                                .have.properties([
                                    'MyError',
                                    'myError',
                                    'myReject',
                                    'MyOtherError',
                                    'myOtherError',
                                    'myOtherReject',
                                ]);
                        },
                    },
                },
            });
        });
    });
});
