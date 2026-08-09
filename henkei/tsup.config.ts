import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/henkei/index.tsx'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', 'framer-motion'],
  tsconfig: 'tsconfig.lib.json',
});
