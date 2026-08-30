import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/applications', destination: '/search', permanent: false },
      { source: '/applications/:path*', destination: '/search', permanent: false },
      { source: '/add', destination: '/search', permanent: false },
      { source: '/import', destination: '/search', permanent: false },
      { source: '/review', destination: '/search', permanent: false },
      { source: '/notifications', destination: '/search', permanent: false },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: 'https://interviewtraker.firebaseapp.com/__/auth/:path*',
      },
      {
        source: '/__/firebase/init.json',
        destination: 'https://interviewtraker.firebaseapp.com/__/firebase/init.json',
      },
    ];
  },
};

export default nextConfig;
