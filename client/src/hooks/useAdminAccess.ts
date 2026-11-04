import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE, queryClient } from "@/lib/queryClient";

export function useAdminAccess() {
  const { user, loading } = useAuth();
  const access = useQuery({
    queryKey: ["admin-access", user?.uid, user?.email],
    enabled: Boolean(user) && !loading,
    queryFn: async ({ signal }) => {
      const response = await fetch(`${API_BASE}/api/sms/access`, { credentials: "include", signal });
      if (response.status === 401 || response.status === 403) return false;
      if (!response.ok) throw new Error("관리자 권한을 확인하지 못했습니다.");
      const data = await response.json();
      return data.ok === true && ["OWNER", "ADMIN", "VIEWER"].includes(data.role);
    },
    staleTime: 0,
    retry: false,
  }, queryClient);
  return { isAdmin: Boolean(user) && !loading && access.data === true && !access.isError,
    checking: loading || (Boolean(user) && access.isPending), error: access.isError, refetch: access.refetch };
}
