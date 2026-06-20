const { composePlugins, withNx } = require('@nx/webpack');

// NX composable webpack config for NestJS backend
module.exports = composePlugins(
  withNx({
    target: 'node',
  }),
  (config) => {
    // Any custom webpack configuration can go here
    return config;
  }
);
