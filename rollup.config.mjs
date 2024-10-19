// rollup.config.mjs
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import terser from '@rollup/plugin-terser'

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
  // GSAP Engine ESM Build (includes core)
  createConfig({
    input: 'src/af-gsap.js',
    outputFile: 'dist/af-gsap.esm.js',
    format: 'esm',
    name: 'AF',
    globals: {},
    external: [], // No external dependencies
  }),
  // GSAP Engine UMD Build (includes core)
  createConfig({
    input: 'src/af-gsap.js',
    outputFile: 'dist/af-gsap.umd.js',
    format: 'umd',
    name: 'AF',
    globals: {}, // No globals needed since we're using window.gsap
    external: [], // No external dependencies
  }),
]

export default configs