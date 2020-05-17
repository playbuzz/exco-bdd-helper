const errorsFactory = require('@playbuzz/exco-run/lib/core/errors');
const hrtimeFactory = require('@playbuzz/exco-run/lib/core/hrtime');
const busFactory = require('@playbuzz/exco-run/lib/core/bus');
const loggerFactory = require('./logger');

module.exports = ({
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
        errors:     errorsFactory(),
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
};
