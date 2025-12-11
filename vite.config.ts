import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ['src'],
    }),
  ],
  publicDir: false,
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MusicStaff',
      fileName: 'music-staff',
    },
  },
});