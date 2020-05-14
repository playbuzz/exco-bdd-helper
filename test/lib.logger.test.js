const Should = require('should');
const claim = require('../lib/claim');
const SUT = require('../lib/logger');

describe('lib/logger', () => {
    it('should be a factory function', () => {
        claim.isFunction(SUT);
    });

    describe('when called', () => {
        const ctx = {};
        before(() => {
            ctx.SUT = SUT();
        });

        describe('returned instance', () => {
            describe('form', () => {
                describe('logger api', () => {
                    claim.hasApi(ctx, ['trace', 'debug', 'info', 'warn', 'error', 'fatal']);
                });

                describe('test helper api', () => {
                    claim.hasApi(ctx, ['reset']);
                    claim.hasProps(ctx, { entries: Array });
                });
            });

            describe('.reset()', () => {
                describe('.entries', () => {
                    let logger;
                    before(() => {
                        logger = SUT();
                        logger.info({ foo: 'bar' }, 'before');
                        logger.info('before');
                        logger.info('was born');
                        logger.of('child1').info('before');
                        logger.info('before %s formatted', 'str');
                        logger.of('child2').debug('before');
                        logger.of('child2').of('child3')
                            .warn('before');
                        logger.warn({ bar: 'baz' }, 'before');

                        logger.reset();
                        logger.info('after');
                    });

                    it('should discard any entry before that', () => {
                        Should(logger.entries.msg(/^before/).length).eql(0);
                        Should(logger.entries.length).eql(1);
                    });
                });
            });
            describe('.entries', () => {
                let entries;
                let logger;
                before(() => {
                    logger = SUT();
                    logger.info({ foo: 'bar' }, 'msg');
                    logger.info('str only');
                    logger.info('was born');
                    logger.of('child1').info('was born');
                    logger.info('was %s formatted', 'str');
                    logger.of('child2').debug('im here');
                    logger.of('child2').of('child3')
                        .warn('was born');
                    logger.warn({ bar: 'baz' }, 'meta formatted: 1 %s 3', 2);

                    ctx.entries = entries = logger.entries; //eslint-disable-line prefer-destructuring
                });
                after(() => logger.reset());

                it('should be an array', () => {
                    Should(entries).be.an.Array();
                });

                it('should not be assignable', () => {
                    Should(() => {
                        'use strict';

                        logger.entries = 'throws';
                    }).throw(/has only a getter/);
                });

                describe('added entries API', () => {
                    describe('form', () => {
                        claim(ctx, 'entries').hasApi({
                            of: 1,
                            level: 1,
                            msg: 1,
                            msgInclude: 1,
                        });
                    });

                    describe('.of(caller)', () => {
                        describe('when called with a string', () => {
                            it('returns all entries of the exact caller name', () => {
                                Should(entries.of('root').length).eql(5);
                            });
                        });
                        describe('when called with regexp', () => {
                            it('returns all entries of the caller names that match it', () => {
                                Should(entries.of(/chi/).length).eql(3);
                            });
                        });
                    });
                    describe('.level(level)', () => {
                        it('returns all entries of the caller name', () => {
                            Should(entries.level('warn').length).eql(2);
                        });
                    });
                    describe('.msg(str)', () => {
                        describe('when called with a string', () => {
                            it('returns all entries with msg identical to provided value', () => {
                                Should(entries.msg('was born').length).eql(3);
                            });
                        });
                        describe('when called with regexp', () => {
                            it('returns all entries with msg identical to provided value', () => {
                                Should(entries.msg(/^was/).length).eql(4);
                            });
                        });
                    });
                    describe('.msgInclude(str)', () => {
                        it('returns all entries with msg identical to provided value', () => {
                            Should(entries.msgInclude('o').length).eql(6);
                        });
                    });

                    describe('and', () => {
                        it('filter apis can be chained', () => {
                            const { length: found } = entries
                                .level('warn')
                                .of('child3');
                            Should(found).eql(1);
                        });
                    });
                });
            });
        });
    });
});
