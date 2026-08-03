import { defineBuildConfig } from 'unbuild';

// src/cli entry is added in PR D when src/cli.ts is created.
export default defineBuildConfig({
  entries: ['src/index'],
  declaration: true,
  clean: true,
  rollup: {
    esbuild: {
      target: 'node22',
      minify: false,
    },
    inlineDependencies: false,
  },
  failOnWarn: false,
});
