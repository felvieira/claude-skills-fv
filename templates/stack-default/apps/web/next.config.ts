import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",   // necessário para imagem Docker slim
  experimental: {
    // Habilita Server Actions (padrão no Next.js 15, mas explícito pra clareza)
    serverActions: { allowedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"] },
  },
};

export default nextConfig;
