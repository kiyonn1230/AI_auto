/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // トップや /lp を開いた人を LP に案内する（public/ はディレクトリの index.html を自動で返さないため）
  async redirects() {
    return [
      { source: '/', destination: '/lp/index.html', permanent: false },
      { source: '/lp', destination: '/lp/index.html', permanent: false },
    ];
  },
};

export default nextConfig;
