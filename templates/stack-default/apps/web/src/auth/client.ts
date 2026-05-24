/**
 * auth/client.ts — Better Auth browser client
 *
 * Use em Client Components:
 *   import { authClient } from "@/auth/client"
 *   const { data: session } = await authClient.getSession()
 *   await authClient.signIn.email({ email, password })
 *   await authClient.signOut()
 */

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  getSession,
} = authClient;
