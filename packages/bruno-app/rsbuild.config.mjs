import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginStyledComponents } from '@rsbuild/plugin-styled-components';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginNodePolyfill } from '@rsbuild/plugin-node-polyfill';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    pluginNodePolyfill(),
    pluginReact(),
    pluginStyledComponents(),
    pluginSass(),
    pluginBabel({
      include: /\.(?:js|jsx|ts|tsx)$/,
      babelLoaderOptions(opts) {
        opts.plugins?.unshift('babel-plugin-react-compiler');
      }
    })
  ],
  source: {
    alias: {
      '@usebruno/common': path.resolve(__dirname, 'src/module-proxies/usebruno-common.js'),
      '@usebruno/common/utils': path.resolve(__dirname, 'src/module-proxies/usebruno-common-utils.js'),
      '@usebruno/converters': path.resolve(__dirname, 'src/module-proxies/usebruno-converters.js'),
      '@usebruno/graphql-docs': path.resolve(__dirname, 'src/module-proxies/usebruno-graphql-docs.js'),
      '@usebruno/graphql-docs/dist/esm/index.css': path.resolve(__dirname, '../bruno-graphql-docs/src/index.css')
    },
    tsconfigPath: './jsconfig.json', // Specifies the path to the JavaScript/TypeScript configuration file,
    exclude: [
      '**/test-utils/**',
      '**/*.test.*',
      '**/*.spec.*'
    ]
  },
  html: {
    title: 'Bruno'
  },
  tools: {
    rspack: {
      watchOptions: {
        ignored: /(^|[\\/])(node_modules|\.git|\$RECYCLE\.BIN|System Volume Information)([\\/]|$)|(^|[\\/])(pagefile|swapfile|hiberfil)\.sys$/i
      },
      module: {
        parser: {
          javascript: {
            // This loads the JavaScript contents from a library along with the main JavaScript bundle.
            dynamicImportMode: "eager",
          },
        },
      },
      ignoreWarnings: [
        (warning) =>  warning.message.includes('Critical dependency: the request of a dependency is an expression') && warning?.moduleDescriptor?.name?.includes('flow-parser')
      ],
      // Add externals configuration to exclude Node.js libraries
      externals: {
        // List specific Node.js modules you want to exclude
        // Format: 'module-name': 'commonjs module-name'
        'worker_threads': 'commonjs worker_threads',
        // 'path': 'commonjs path'
      }
    },
  }
});
