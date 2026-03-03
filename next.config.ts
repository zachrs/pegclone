import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres", "pg-boss", "bcryptjs"],
};

export default nextConfig;
