import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    // Allow the PayShield logo PNG to be served at the higher quality
    // setting it specifies (`quality={95}`). Next 16 requires every
    // non-default quality value to be enumerated explicitly here.
    qualities: [75, 95],
  },
};

export default nextConfig;
