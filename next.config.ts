import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["dicom-parser"],
};

export default nextConfig;
