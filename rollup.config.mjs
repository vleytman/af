// rollup.config.mjs
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import terser from '@rollup/plugin-terser'

// Helper function to create Rollup configurations
const createConfig = ({ input, outputFile, format, name, globals, external }) => ({
  input,
  output: {
    file: outputFile,
    format,
    name,
    globals,
    sourcemap: true,
  },
  external,
  plugins: [
    resolve(),
    commonjs(),
    terser(),
  ],
})

const configs = [
  // Core ESM Build
  createConfig({
    input: 'src/af-core.js',
    outputFile: 'dist/af-core.esm.js',
    format: 'esm',
    name: 'AF',
    globals: {},
    external: [],
  }),
  // Core UMD Build
  createConfig({
    input: 'src/af-core.js',
    outputFile: 'dist/af-core.umd.js',
    format: 'umd',
    name: 'AF',
    globals: {},
    external: [],
  }),
  // GSAP Engine ESM Build
  createConfig({
    input: 'src/af-gsap.js',
    outputFile: 'dist/af-gsap.esm.js',
    format: 'esm',
    name: 'AFEngineGSAP',
    globals: { gsap: 'gsap' },
    external: ['gsap'],
  }),
  // GSAP Engine UMD Build
  createConfig({
    input: 'src/af-gsap.js',
    outputFile: 'dist/af-gsap.umd.js',
    format: 'umd',
    name: 'AFEngineGSAP',
    globals: { gsap: 'gsap', './af-core.js': 'AF' },
    external: ['gsap', './af-core.js'],
  }),
]

export default configs