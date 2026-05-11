const { describe, it, expect } = require('@jest/globals');
const { newQuickJSWASMModule } = require('quickjs-emscripten');
const addCryptoUtilsShimToContext = require('./crypto-utils');
const getBundledCode = require('../../../bundle-browser-rollup');
const { getRequireCode } = require('../require');

describe('crypto-utils shims tests', () => {
  let vm, module;

  beforeAll(async () => {
    module = await newQuickJSWASMModule();
  });

  beforeEach(async () => {
    vm = module.newContext();
    await addCryptoUtilsShimToContext(vm);
    // required for `Buffer` library usage
    const bundledCode = getBundledCode?.toString() || '';
    vm.evalCode(
      `
        (${bundledCode})()
        ${getRequireCode()}
      `
    );
  });

  it('should allow requiring crypto and node:crypto modules', async () => {
    const result = vm.evalCode(`
      const crypto = require('crypto');
      const nodeCrypto = require('node:crypto');
      typeof crypto.randomBytes === 'function' && typeof nodeCrypto.randomBytes === 'function';
    `);
    const handle = vm.unwrapResult(result);
    const hasCryptoModule = vm.dump(handle);
    handle.dispose();

    expect(hasCryptoModule).toBe(true);
  });

  it('should provide crypto.randomBytes function', async () => {
    const result = vm.evalCode('typeof crypto.randomBytes');
    const handle = vm.unwrapResult(result);
    const type = vm.dump(handle);
    handle.dispose();

    expect(type).toBe('function');
  });

  it('should provide crypto.getRandomValues function', async () => {
    const result = vm.evalCode('typeof crypto.getRandomValues');
    const handle = vm.unwrapResult(result);
    const type = vm.dump(handle);
    handle.dispose();

    expect(type).toBe('function');
  });

  it('should generate random bytes with correct length', async () => {
    const result = vm.evalCode('crypto.randomBytes(8).length');
    const handle = vm.unwrapResult(result);
    const length = vm.dump(handle);
    handle.dispose();

    expect(length).toBe(8);
  });

  it('should convert random bytes to hex string', async () => {
    const result = vm.evalCode('crypto.randomBytes(4).toString("hex").length');
    const handle = vm.unwrapResult(result);
    const hexLength = vm.dump(handle);
    handle.dispose();

    expect(hexLength).toBe(8); // 4 bytes = 8 hex chars
  });

  it('should create hashes through required crypto module', async () => {
    const result = vm.evalCode(`
      const crypto = require('crypto');
      crypto.createHash('sha256').update('hello').digest('hex');
    `);
    const handle = vm.unwrapResult(result);
    const digest = vm.dump(handle);
    handle.dispose();

    expect(digest).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('should create hmac values through required crypto module', async () => {
    const result = vm.evalCode(`
      const crypto = require('crypto');
      crypto.createHmac('sha256', 'secret').update('hello').digest('hex');
    `);
    const handle = vm.unwrapResult(result);
    const digest = vm.dump(handle);
    handle.dispose();

    expect(digest).toBe('88aab3ede8d3adf94d26ab90d3bafd4a2083070c3bcce9c014ee04a443847c0b');
  });

  it('should generate random uuid through required crypto module', async () => {
    const result = vm.evalCode(`
      const crypto = require('crypto');
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(crypto.randomUUID());
    `);
    const handle = vm.unwrapResult(result);
    const isUuid = vm.dump(handle);
    handle.dispose();

    expect(isUuid).toBe(true);
  });

  it('should fill Uint8Array with getRandomValues', async () => {
    const result = vm.evalCode(`
      const arr = new Uint8Array(5);
      crypto.getRandomValues(arr);
      arr.length;
    `);
    const handle = vm.unwrapResult(result);
    const length = vm.dump(handle);
    handle.dispose();

    expect(length).toBe(5);
  });
});
