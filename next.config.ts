import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["onnxruntime-node", "sharp", "dicom-parser"],
  outputFileTracingIncludes: {
    '/api/**/*': [
      './node_modules/**/*.so',
      './node_modules/**/*.so.*',
      './node_modules/**/*.dylib',
      './node_modules/**/*.dll',
      './models/**/*'
    ],
  },
};

export default nextConfig;
