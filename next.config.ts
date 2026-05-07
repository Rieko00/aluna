import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["onnxruntime-node", "sharp", "dicom-parser"],
  outputFileTracingIncludes: {
    '/api/**/*': [
      './node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**/*.so',
      './node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**/*.so.*',
      './node_modules/onnxruntime-node/bin/napi-v6/linux/x64/**/*.so',
      './node_modules/onnxruntime-node/bin/napi-v6/linux/x64/**/*.so.*',
      './models/**/*'
    ],
  },
};

export default nextConfig;
