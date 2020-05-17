const Should = require('should');
const claim = (v, opts = undefined) => { //eslint-disable-line no-undefined
    if ('string' == typeof opts) opts = { prop: opts };
    return Object
        .entries(claim)
        .filter(entry => 'function' == typeof entry[1])
        .reduce(
            (bound, [api, f]) => Object.assign(bound, {
                [api]: (...a) => {
                    if (opts) a.push(opts);
                    return f(v, ...a);
                    //return bound;
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

function getSUT(val, prop) {
    return 'undefined' == typeof prop
        ? val
        : val[prop];
}

function isFunction(val, arity, { prop } = {}) {
    const SUT = getSUT(val, prop);
    const assert = Should(SUT).be.a.Function();
    if ('number' == typeof arity) assert.have.property('length', arity);
}

function hasApi(val, api, { prop } = {}) {
    if (Array.isArray(api)) api = api.reduce((api, name) => Object.assign(api, { [name]: true }), {});
    Object.entries(api).forEach(([api, arity]) => {
        const title = 'number' == typeof arity
            ? `should have api: .${api}(${arity})`
            : `should have api: .${api}()`;
        it(title, () => {
            const SUT = getSUT(val, prop);
            Should(SUT).have.property(api);
            isFunction(SUT, arity, { prop: api });
        });
    });
}

function hasProps(val, api, { prop } = {}) {
    if (Array.isArray(api)) api = api.reduce((api, name) => Object.assign(api, { [name]: 'any' }), {});
    Object.entries(api).forEach(([api, type]) => {
        const title = 'any' === type //eslint-disable-line no-nested-ternary
            ? `should have property: .${api}`
            : 'string' == typeof type
                ? `should have property: .${api}, as "${type}"`
                : `should have property: .${api}, as ${type.name}`;
        it(title, () => {
            const SUT = getSUT(val, prop);
            const assert = Should(SUT).have.property(api);

            if ('any' === type) return;

            'string' == typeof type
                ? assert.type(type)
                : assert.instanceof(type);
        });
    });
}

function behaviors(val, cases, opts) {
    cases.forEach(({ title, ...oCase }) => {
        describe(title, () => {
            behavior(val, oCase, opts);
        });
    });
}

function behavior(
    val,
    {
        options = {},
        ioc = {},
        before: setup,
        after: teardown,
        args = [options, ioc],
        expect: { reject, result, type, api, props } = {},
    },
    { prop } = {},
) {
    const ctx = {};
    before(async () => {
        const SUT = ctx.SUT = getSUT(val, prop);
        isFunction(SUT);
        if ('function' == typeof setup) setup(ctx);
        try {
            ctx.result = await SUT(...args);
        } catch (e) {
            ctx.err = ctx.result = e;
        }
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

        if (api || props) {
            describe('form', () => {
                api && claim(ctx, 'result').hasApi(api);
                props && claim(ctx, 'result').hasProps(props);
            });
        }

        if (result) toResultSuite(result);
    });

    if ('function' == typeof teardown) after(teardown);

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
