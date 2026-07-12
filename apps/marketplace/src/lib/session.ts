import { headers } from "next/headers";
import { auth } from "./auth";

/** Read the current Better Auth session in a server component or route handler. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}
