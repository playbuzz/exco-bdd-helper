const errorsFactory = require('@playbuzz/exco-run/lib/core/errors');
const hrtimeFactory = require('@playbuzz/exco-run/lib/core/hrtime');
const busFactory = require('@playbuzz/exco-run/lib/core/bus');
const loggerFactory = require('./logger');

module.exports = ({
    cwd = '.',
    version = '1.2.3',
    config = {},
    mocks = {},
    mock = mocks,
} = {}) => {
    const { config: cfg = config } = mock;
    return {
        // - core components -
        errors:     errorsFactory(),
        bus:        busFactory(),
        hrtime:     hrtimeFactory({ process: { hrtime: process.hrtime } }),
        context:    { watch: f => f() },
        logger:     loggerFactory(),
        // - project components -
        ...mock,
        // - config last - to support both { config } and { mocks: { config } }
        config:     {
            cwd,
            pkg:    { name: 'mock-pkg', version },
            isTty:  false,
            ...cfg,
            ...config,
        },
    };
};
