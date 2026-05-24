/**
 * auth/index.ts — Better Auth server instance
 *
 * Docs: https://www.better-auth.com
 *
 * Providers ativos por padrão: email+password.
 * OAuth: descomente os blocos abaixo e preencha .env.
 *
 * Route handler em: src/app/api/auth/[...all]/route.ts
 * Client em:        src/auth/client.ts
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user:         schema.user,
      session:      schema.session,
      account:      schema.account,
      verification: schema.verification,
    },
  }),

  emailAndPassword: {
    enabled: true,
  },

  // ── OAuth providers (descomente conforme necessário) ──────────
  // socialProviders: {
  //   github: {
  //     clientId:     process.env.GITHUB_CLIENT_ID!,
  //     clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  //   },
  //   google: {
  //     clientId:     process.env.GOOGLE_CLIENT_ID!,
  //     clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  //   },
  // },

  // ── Session config ────────────────────────────────────────────
  session: {
    expiresIn:         60 * 60 * 24 * 7,  // 7 dias
    updateAge:         60 * 60 * 24,       // renova se >1 dia restante
    cookieCache: {
      enabled:   true,
      maxAge:    5 * 60,                   // cache por 5 min no client
    },
  },

  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User    = typeof auth.$Infer.Session.user;
