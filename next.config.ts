import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
