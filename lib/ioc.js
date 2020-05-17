const errorsFactory = require('@playbuzz/exco-run/lib/core/errors');
const hrtimeFactory = require('@playbuzz/exco-run/lib/core/hrtime');
const busFactory = require('@playbuzz/exco-run/lib/core/bus');
const loggerFactory = require('./logger');

module.exports = ({
    errors = [],
    config: {
        isTty = false,
        cwd = '.',
        name = 'mock-pkg',
        version = '1.2.3',
        pkg = { name, version },
        ...config
    } = {},
    mock = {},
    mocks = mock,
    ...rest
} = {}) => {
    return {
        // - core components -
        errors:     errorsRegistry(errors),
        bus:        busFactory(),
        hrtime:     hrtimeFactory({ process: { hrtime: process.hrtime } }),
        context:    { watch: f => f() },
        logger:     loggerFactory(),
        config:     {
            isTty,
            cwd,
            pkg,
            ...config,
        },
        // - project components -
        ...mocks,
        ...rest,
    };

    function errorsRegistry(errors) {
        if ('function' == typeof errors) errors = errors();
        if (!Array.isArray(errors)) {
            throw new Error('bdd-helper/ioc - errors must be an array of errors, or a function that returns one');
        }

        const registry = errorsFactory();
        errors = errors.map(err => {
            if ('function' == typeof err) return err;

            if ('string' != typeof err) {
                throw new Error(
                    'bdd-helper/ioc - entries in errors array can be either classes or string of classe names to mock',
                );
            }

            const tmp = {
                [err]: class extends registry.ExcoError {
                    constructor(...a) {
                        super();
                        this.ctorArgs = a;
                    }
                },
            };
            return tmp[err];
        });

        registry.register(errors);
        return registry;
    }
};
