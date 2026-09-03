import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Auth state + the signed-in user document.
 * `user` is null while signed out or still loading.
 */
export function useAuth() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(
    api.users.currentUser,
    isAuthenticated ? undefined : "skip",
  );
  return { user, isAuthenticated, isLoading };
}