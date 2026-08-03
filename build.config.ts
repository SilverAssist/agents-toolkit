import { defineBuildConfig } from 'unbuild';

// src/cli added in PR D when src/cli.ts was created.
export default defineBuildConfig({
  entries: ['src/cli', 'src/index'],
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
