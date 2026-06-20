//@ts-check

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { composePlugins, withNx } = require('@nx/next');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  nx: {
    svgr: false,
  },
  reactStrictMode: true,

  // Proxy all /api/* requests to the NestJS backend on port 5000
  // This way the frontend and API are both accessible from port 3000
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${apiUrl}/uploads/:path*`,
      },
    ];
  },
};

const plugins = [
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
