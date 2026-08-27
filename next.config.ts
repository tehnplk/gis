import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // งาน EMS ย้ายจาก /accident ไปอยู่ใต้ /ems ทั้งหมด
  // ลิงก์เก่าที่คนบุ๊กมาร์กไว้จึงต้องพาไปปลายทางใหม่แทนที่จะเจอ 404
  async redirects() {
    return [
      { source: "/accident", destination: "/ems", permanent: false },
      { source: "/accident/:path*", destination: "/ems/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
