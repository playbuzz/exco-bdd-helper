const Should = require('should');
const SUT = require('../lib');

describe('exco-bdd-helper', () => {
    it('should export ./lib/claim as .claim', () => {
        Should(SUT).have.property('claim', require('../lib/claim'));
    });

    it('should export ./lib/logger as .logger', () => {
        Should(SUT).have.property('logger', require('../lib/logger'));
    });
});
