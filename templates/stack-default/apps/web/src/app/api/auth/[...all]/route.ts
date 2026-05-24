/**
 * Better Auth catch-all route handler.
 * Não edite — é gerado automaticamente pelo better-auth.
 */
import { auth } from "@/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
