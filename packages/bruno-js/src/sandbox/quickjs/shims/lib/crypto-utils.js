const crypto = require('node:crypto');
const { marshallToVm } = require('../../utils');
const { serializeTypedArray, deserializeTypedArray } = require('./utils');

/**
 * Node.js crypto module shim for QuickJS sandbox
 * Implements crypto.randomBytes and crypto.getRandomValues functions
 */
const addCryptoUtilsShimToContext = async (vm) => {
  let randomBytesHandle = vm.newFunction('randomBytes', function (sizeHandle) {
    try {
      let size = vm.dump(sizeHandle);

      if (typeof size !== 'number') {
        throw new TypeError('The "size" argument must be of type number');
      }

      size = Math.trunc(size);

      if (size < 0) {
        throw new RangeError('The "size" argument must be >= 0');
      }

      if (size > 65536) { // 2^31 - 1 (max safe integer for practical use)
        throw new RangeError('The "size" argument is too large');
      }

      if (size === 0) {
        return marshallToVm([], vm);
      }

      const buffer = crypto.randomBytes(size);

      const byteArray = Array.from(buffer);

      return marshallToVm(byteArray, vm);
    } catch (error) {
      const vmError = vm.newError(error.message);
      vm.setProp(vmError, 'name', vm.newString(error.name));

      throw vmError;
    }
  });

  let getRandomValuesHandle = vm.newFunction('getRandomValues', function (arrayHandle) {
    try {
      // Receive the serialized array data directly
      const serializedArray = vm.dump(arrayHandle);
      const typedArray = deserializeTypedArray(serializedArray);

      if (typedArray.length === 0) {
        return marshallToVm([], vm);
      }

      if (typedArray.length > 65536) {
        throw new Error('getRandomValues: ArrayBufferView byte length exceeds 65536');
      }

      crypto.getRandomValues(typedArray);

      const byteArray = Array.from(typedArray);

      return marshallToVm(byteArray, vm);
    } catch (error) {
      const vmError = vm.newError(error.message);
      vm.setProp(vmError, 'name', vm.newString(error.name));

      throw vmError;
    }
  });

  let createHashDigestHandle = vm.newFunction('createHashDigest', function (algorithmHandle, chunksHandle, encodingHandle) {
    try {
      const algorithm = vm.dump(algorithmHandle);
      const chunks = vm.dump(chunksHandle);
      const encoding = vm.dump(encodingHandle);
      const hash = crypto.createHash(algorithm);

      chunks.forEach((chunk) => {
        hash.update(Buffer.from(chunk));
      });

      const digest = hash.digest(encoding || undefined);
      return marshallToVm(typeof digest === 'string' ? digest : Array.from(digest), vm);
    } catch (error) {
      const vmError = vm.newError(error.message);
      vm.setProp(vmError, 'name', vm.newString(error.name));

      throw vmError;
    }
  });

  let createHmacDigestHandle = vm.newFunction('createHmacDigest', function (algorithmHandle, keyHandle, chunksHandle, encodingHandle) {
    try {
      const algorithm = vm.dump(algorithmHandle);
      const key = vm.dump(keyHandle);
      const chunks = vm.dump(chunksHandle);
      const encoding = vm.dump(encodingHandle);
      const hmac = crypto.createHmac(algorithm, Buffer.from(key));

      chunks.forEach((chunk) => {
        hmac.update(Buffer.from(chunk));
      });

      const digest = hmac.digest(encoding || undefined);
      return marshallToVm(typeof digest === 'string' ? digest : Array.from(digest), vm);
    } catch (error) {
      const vmError = vm.newError(error.message);
      vm.setProp(vmError, 'name', vm.newString(error.name));

      throw vmError;
    }
  });

  let randomUUIDHandle = vm.newFunction('randomUUID', function () {
    try {
      return vm.newString(crypto.randomUUID());
    } catch (error) {
      const vmError = vm.newError(error.message);
      vm.setProp(vmError, 'name', vm.newString(error.name));

      throw vmError;
    }
  });

  // Set the functions in global context
  vm.setProp(vm.global, '__bruno__crypto__randomBytes', randomBytesHandle);
  vm.setProp(vm.global, '__bruno__crypto__getRandomValues', getRandomValuesHandle);
  vm.setProp(vm.global, '__bruno__crypto__createHashDigest', createHashDigestHandle);
  vm.setProp(vm.global, '__bruno__crypto__createHmacDigest', createHmacDigestHandle);
  vm.setProp(vm.global, '__bruno__crypto__randomUUID', randomUUIDHandle);
  randomBytesHandle.dispose();
  getRandomValuesHandle.dispose();
  createHashDigestHandle.dispose();
  createHmacDigestHandle.dispose();
  randomUUIDHandle.dispose();

  vm.evalCode(`
    // Helper function for typed array serialization
    ${serializeTypedArray.toString()}

    const normalizeCryptoInput = (data, inputEncoding) => {
      if (typeof data === 'string') {
        return Array.from(Buffer.from(data, inputEncoding));
      }

      if (data && typeof data.length === 'number') {
        return Array.from(Buffer.from(data));
      }

      throw new TypeError('The "data" argument must be of type string or an instance of Buffer, TypedArray, or DataView');
    };

    function createDigestBuilder(digestFn, algorithm, key) {
      const chunks = [];
      const hasKey = arguments.length > 2;

      return {
        update: function(data, inputEncoding) {
          chunks.push(normalizeCryptoInput(data, inputEncoding));
          return this;
        },
        digest: function(encoding) {
          const digest = hasKey
            ? digestFn(algorithm, normalizeCryptoInput(key), chunks, encoding)
            : digestFn(algorithm, chunks, encoding);

          return typeof digest === 'string' ? digest : Buffer.from(Array.from(digest));
        }
      };
    }
    
    // Create crypto module object following Node.js specifications
    const cryptoModule = {
      // node.js crypto.randomBytes API
      randomBytes: function(size) {
        const byteArray = globalThis.__bruno__crypto__randomBytes(size);
        return Buffer.from(Array.from(byteArray));
      },
      // node.js crypto.getRandomValues API
      getRandomValues: function(typedArray) {
        const serializedTypedArray = serializeTypedArray(typedArray);
        typedArray.set(globalThis.__bruno__crypto__getRandomValues(serializedTypedArray));
        return typedArray;
      },
      createHash: function(algorithm) {
        return createDigestBuilder(globalThis.__bruno__crypto__createHashDigest, algorithm);
      },
      createHmac: function(algorithm, key) {
        return createDigestBuilder(globalThis.__bruno__crypto__createHmacDigest, algorithm, key);
      },
      randomUUID: function() {
        return globalThis.__bruno__crypto__randomUUID();
      },
    };
    
    // Make crypto available globally
    globalThis.crypto = cryptoModule;
    globalThis.requireObject = {
      ...(globalThis.requireObject || {}),
      crypto: cryptoModule,
      'node:crypto': cryptoModule,
    };
  `);
};

module.exports = addCryptoUtilsShimToContext;
