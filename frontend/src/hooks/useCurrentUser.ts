import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: api.auth.me,
    enabled: isAuthenticated(),
  });
}
