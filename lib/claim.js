const Should = require('should');
const claim = (v, opts = null) => {
    if ('string' == typeof opts) opts = { prop: opts };
    return Object
        .entries(claim)
        .filter(entry => 'function' == typeof entry[1])
        .reduce(
            (bound, [api, f]) => Object.assign(bound, {
                [api]: (...a) => {
                    if (opts) a.push(opts);
                    f(v, ...a);
                    return bound;
                },
            }),
            {},
        );
};

Object.assign(claim, {
    isFunction,
    hasApi,
    hasProps,
    behaviors,
    behavior,
    version: require('../package').version,
});

module.exports = claim;

function isFunction(v, arity) {
    const assert = Should(v).be.a.Function();
    if ('number' == typeof arity) assert.have.property('length', arity);
}

function hasApi(ctx, api, { prop = 'SUT' } = {}) {
    if (Array.isArray(api)) api = api.reduce((api, name) => Object.assign(api, { [name]: true }), {});
    Object.entries(api).forEach(([api, arity]) => {
        const title = 'number' == typeof arity
            ? `should have api: .${api}(${arity})`
            : `should have api: .${api}()`;
        it(title, () => {
            const SUT = ctx[prop];
            Should(SUT).have.property(api);
            isFunction(SUT[api], arity);
        });
    });
}

function hasProps(ctx, api, { prop = 'SUT' } = {}) {
    if (Array.isArray(api)) api = api.reduce((api, name) => Object.assign(api, { [name]: 'any' }), {});
    Object.entries(api).forEach(([api, type]) => {
        const title = 'any' === type
            ? `should have property: .${api}`
            : `should have property: .${api}, as (${type})`;
        it(title, () => {
            const SUT = ctx[prop];
            const assert = Should(SUT).have.property(api);

            if ('any' === type) return;

            'string' == typeof type
                ? assert.type(type)
                : assert.instanceof(type);
        });
    });
}

function behaviors(ctx, cases, opts) {
    cases.forEach(({ title, ...oCase }) => {
        describe(title, () => {
            behavior(ctx, oCase, opts);
        });
    });
    return ctx;
}

function behavior(
    ctx,
    { options = {}, ioc = {}, args = [options, ioc], expect: { reject, result, type, api } },
    { prop = 'SUT' } = {},
) {
    if (!ioc.errors) ioc.errors = {};
    if (!ioc.errors.configError) ioc.errors.configError = m => new Error(m);

    before(async () => {
        const SUT = ctx[prop];
        try {
            ctx.result = await SUT(...args);
        } catch (e) {
            ctx.err = e;
        }
    });
    after(() => {
        Reflect.deleteProperty(ctx, 'result');
        Reflect.deleteProperty(ctx, 'err');
    });

    switch (true) { //eslint-disable-line default-case
    case reject instanceof RegExp:
        it(`should result with an error with message like ~${reject}`, () => {
            Should(ctx.err)
                .be.an.Error()
                .have.property('stack')
                .match(reject);
        });
        break;
    case 'string' == typeof reject:
        it(`should result with an error with message that includes: ${reject}`, () => {
            Should(ctx.err)
                .be.an.Error()
                .have.property('stack')
                .containEql(reject);
        });
        break;
    case !reject:
        it('should not fail', () => {
            if (ctx.err) throw ctx.err;
        });
        break;
    }

    describe('the result', () => {
        if (type) it(`should be of type ${type}`, () => Should(typeof ctx.result).eql(type));

        if (api) {
            describe('form', () => {
                hasApi(ctx, api, { prop: 'result' });
            });
        }

        if (result) {
            toResultSuite(result);
        }
    });

    return ctx;

    function toResultSuite(result) {
        Object.entries(result).forEach(([title, test]) => {
            if ('function' == typeof test) {
                it(title, () => test(ctx.result));
                return;
            }

            if ('string' == typeof test && 'skip' === test.toLowerCase()) {
                it(title);
                return;
            }

            describe(title, () => {
                toResultSuite(test);
            });
        });
    }
}
