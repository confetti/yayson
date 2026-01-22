import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/yayson.ts', 'src/legacy.ts'],
  format: ['esm', 'cjs'],
  outDir: 'build',
  dts: true,
})
