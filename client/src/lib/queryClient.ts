import { QueryClient, QueryFunction } from "@tanstack/react-query";

function resolveApiBase() {
  const rawBase = String(import.meta.env.VITE_API_BASE || "").trim();
  if (!rawBase) return "";
  return rawBase.replace(/\/$/, "");
}

// API 서버 주소 (환경변수로 분리된 API 서버 지정 가능)
export const API_BASE = resolveApiBase();

// 응답이 성공적인지 확인하는 함수
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// API 요청 함수 (GET, POST 등)
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = url.startsWith("/") ? `${API_BASE}${url}` : url;

  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // 쿠키 포함
  });

  await throwIfResNotOk(res);
  return res;
}

// Unauthorized 시 처리 방식 설정
type UnauthorizedBehavior = "returnNull" | "throw";

// 기본 쿼리 함수 설정
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const path = queryKey.join("/") as string;
    const fullUrl = path.startsWith("/") ? `${API_BASE}${path}` : path;

    const res = await fetch(fullUrl, {
      credentials: "include", // 쿠키 포함
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// 쿼리 클라이언트 생성
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }), // Unauthorized 시 예외 발생
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity, // 데이터를 최신 상태로 유지
      retry: false, // 실패 시 재시도하지 않음
    },
    mutations: {
      retry: false, // 실패 시 재시도하지 않음
    },
  },
});
