import { auth } from "@clerk/nextjs/server";
import { logServerError } from "@/lib/server/log";

// Resolve the user id for an authenticated request.
//
// Normally this is the Clerk user id. In development only, if there is no Clerk
// session but NEXT_PUBLIC_DEV_CLOUD_USER_ID is set, that id is used instead so
// cloud sync can be exercised locally without signing in. This fallback is hard
// gated to non-production builds and can never bypass auth in production.
export async function resolveUserId(): Promise<string | null> {
  try {
    const authState = await auth();
    if (authState.userId) return authState.userId;
  } catch (error: unknown) {
    logServerError("resolveUserId", error);
    // Clerk not configured yet.
  }

  if (process.env.NODE_ENV !== "production") {
    const devUserId = process.env.NEXT_PUBLIC_DEV_CLOUD_USER_ID;
    if (devUserId) return devUserId;
  }

  return null;
}
