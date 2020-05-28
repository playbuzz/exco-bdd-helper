const Should = require('should');
const evalPath = require('lodash/get');
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
    isExcoFactory,
    hasApi,
    hasMethods: hasApi,
    hasProps,
    behaviors,
    behavior,
    version: require('../package').version,
});

module.exports = claim;

function getSUT(val, prop) {
    return prop
        ? evalPath(val, prop)
        : val;
}

function isFunction(val, arity, { prop } = {}) {
    const SUT = getSUT(val, prop);
    const assert = Should(SUT).be.a.Function();
    if ('number' == typeof arity) assert.have.property('length', arity);
}

function isExcoFactory(val, { arity = 2, hasValidator = false, mapsEnv = false } = {}, { prop } = {}) {
    if (arity < 0 || arity > 2) {
        throw new Error('bdd/isExcoFactory - arity must be between 0 to 2');
    }

    const title = arity //eslint-disable-line no-nested-ternary
        ? arity === 1
            ? 'should be an exco factory function that expects only (ioc)'
            : 'should be an exco factory function that expects (options, ioc)'
        : 'should be an exco factory function that doesnt expect arguments';

    it(title, () => {
        isFunction(val, arity, { prop });
    });

    if (hasValidator) {
        it('should expose a .validate function', () => {
            const SUT = getSUT(val, prop);
            isFunction(SUT, null, { prop: 'validate' });
        });
    }

    if (mapsEnv) {
        if (mapsEnv === true) {
            it('should expose an .env map', () => {
                const SUT = getSUT(val, prop);
                Should(SUT).have.property('env');
            });
        } else {
            describe('.env', () => {
                const SUT = getSUT(val, prop);
                claim(SUT, 'env').hasProps(mapsEnv);
            });
        }
    }
}

/**
  @param {any} val - the SUT or an object that will hold the SUT
  @param {Array|Object} api - a list of methods, or a map of method-name : arity
  @param {String} [options.prop] - name of property to evaluate on SUT on test time
  @returns {undefined}
 */
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

function hasProps(val, api, { prop, path = [] } = {}) {
    if (prop) path.push(prop);
    if (Array.isArray(api)) api = api.reduce((api, name) => Object.assign(api, { [name]: 'any' }), {});
    Object.entries(api).forEach(([api, type]) => {
        const apiPath = [...path, api].join('.');
        const title = 'any' === type //eslint-disable-line no-nested-ternary
            ? `should have property: .${apiPath}`
            : 'string' == typeof type || type instanceof RegExp
                ? `should have property: .${apiPath}, ${'string' == typeof type ? `as "${type}"` : `matching ${type}`}`
                : `should have property: .${apiPath}, as ${type.name}`;

        if ('object' == typeof type && !(type instanceof RegExp)) {
            //TRICKY: the difference between prop and path:
            //  - prop - subpath on SUT evaluated on test time
            //  - path - used for recursive definitions of required props
            hasProps(val, type, { prop, path: path.concat([api]) });
            return;
        }

        it(title, () => {
            const SUT = getSUT(val, path.join('.'));
            const assert = Should(SUT).have.property(api);
            if ('any' === type) return null;

            if ('string' == typeof type) return assert.type(type);

            if (type instanceof RegExp) return assert.match(type);

            if ('function' == typeof type) return assert.instanceof(type);

            return assert.eql(type);
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
        awaiting,
        ready,
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
        if ('function' == typeof awaiting) process.nextTick(() => awaiting(ctx));
        try {
            ctx.result = await SUT(...args);
        } catch (e) {
            ctx.err = ctx.result = e;
        }

        if ('function' == typeof ready) ready(ctx);
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

            if (!test || 'string' == typeof test) {
                it(test ? `${title} >> ${test}` : title);
                return;
            }

            describe(title, () => {
                toResultSuite(test);
            });
        });
    }
}
