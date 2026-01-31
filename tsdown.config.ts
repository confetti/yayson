import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/yayson.ts', 'src/legacy.ts', 'src/symbols.ts', 'src/adapter.ts'],
  format: ['esm', 'cjs'],
  outDir: 'build',
  dts: true,
})
