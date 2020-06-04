const { format, inspect } = require('util');
module.exports = loggerFactory;

function loggerFactory() {
    let entries = new Entries();

    return Object.assign(instance('root'), {
        reset() {
            entries = new Entries();
        },
    });

    function instance(caller) {
        return ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].reduce(
            (mockLogger, level) => Object.assign(mockLogger, {
                [level](meta, msg, ...splat) {
                    if ('string' == typeof meta) [meta, msg, splat] = [{}, meta, msg ? [msg].concat(splat) : splat];
                    entries.push({ ix: entries.length, caller, level, msg: format(msg, ...splat), meta });
                },
            }),
            Object.defineProperty({ //eslint-disable-line prefer-reflect
                of: caller => instance(caller),
            }, 'entries', {
                get: () => entries,
                enumerable: true,
                configurable: false,
            }),
        );
    }
}

class Entries extends Array {
    of(name) {
        return name instanceof RegExp
            ? this.filter(e => e.caller.match(name))
            : this.filter(e => name === e.caller);
    }
    level(level) {
        return this.filter(e => level === e.level);
    }
    msg(msg) {
        return msg instanceof RegExp
            ? this.filter(e => e.msg && e.msg.match(msg))
            : this.filter(e => msg === e.msg);
    }
    msgInclude(msg) {
        return this.filter(e => e.msg && e.msg.includes(msg));
    }
    log({ log } = console) { //eslint-disable-line no-console
        log(inspect(this, { depth: 99, colors: true }));
    }
}
