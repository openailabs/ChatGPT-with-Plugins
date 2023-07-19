const { i18n } = require('./next-i18next.config');

/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n,
  reactStrictMode: true,
  // async headers() {
  //   return [
  //     {
  //       source: "/api",
  //       headers: [
  //         {
  //           key: "cache-control",
  //           value: "s-maxage=600",
  //         },
  //         {
  //           key: "access-control-allow-origin",
  //           value: "*",
  //         },
  //       ],
  //     },
  //   ];
  // },
  // async headers() {
  //   return [
  //     {
  //       // matching all API routes
  //       // https://vercel.com/guides/how-to-enable-cors
  //       source: '/api/:path*',
  //       headers: [
  //         { key: 'Access-Control-Allow-Credentials', value: 'true' },
  //         { key: 'Access-Control-Allow-Origin', value: '*' },
  //         {
  //           key: 'Access-Control-Allow-Methods',
  //           value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
  //         },
  //         {
  //           key: 'Access-Control-Allow-Headers',
  //           value:
  //             'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
  //         },
  //       ],
  //     },
  //   ];
  // },
  webpack(config, { isServer, dev }) {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };

    return config;
  },
};

module.exports = nextConfig;
