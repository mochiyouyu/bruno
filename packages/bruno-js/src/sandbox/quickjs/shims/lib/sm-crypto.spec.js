const { describe, it, expect, beforeAll, beforeEach } = require('@jest/globals');
const { newQuickJSWASMModule } = require('quickjs-emscripten');
const getBundledCode = require('../../../bundle-browser-rollup');
const { addRequireShimToContext } = require('../require');
const { createEvalHelper } = require('../../utils/test-helpers');

describe('sm-crypto bundled module tests', () => {
  let vm, module, evalAndDump;

  beforeAll(async () => {
    module = await newQuickJSWASMModule();
  });

  beforeEach(() => {
    vm = module.newContext();
    evalAndDump = createEvalHelper(vm);

    const bundledCode = getBundledCode?.toString() || '';
    vm.evalCode(`
      (${bundledCode})()
    `);
    addRequireShimToContext(vm);
  });

  it('should expose sm2 through require("sm-crypto")', () => {
    const result = evalAndDump(`
      const { sm2 } = require('sm-crypto');
      typeof sm2.generateKeyPairHex === 'function' &&
        typeof sm2.doSignature === 'function' &&
        typeof sm2.doVerifySignature === 'function';
    `);

    expect(result).toBe(true);
  });

  it('should sign and verify data with SM2', () => {
    const result = evalAndDump(`
      const { sm2 } = require('sm-crypto');
      const keyPair = sm2.generateKeyPairHex();
      const message = 'bruno-sm2-demo';
      const signature = sm2.doSignature(message, keyPair.privateKey, {
        hash: true,
        der: true
      });

      sm2.doVerifySignature(message, signature, keyPair.publicKey, {
        hash: true,
        der: true
      });
    `);

    expect(result).toBe(true);
  });

  it('should reject tampered SM2 messages', () => {
    const result = evalAndDump(`
      const { sm2 } = require('sm-crypto');
      const keyPair = sm2.generateKeyPairHex();
      const signature = sm2.doSignature('original-message', keyPair.privateKey, {
        hash: true,
        der: true
      });

      sm2.doVerifySignature('tampered-message', signature, keyPair.publicKey, {
        hash: true,
        der: true
      });
    `);

    expect(result).toBe(false);
  });
});
