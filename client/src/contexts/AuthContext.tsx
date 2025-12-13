import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { API_BASE } from "@/lib/queryClient";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  phone: string;
  profileImage?: string;
  provider: "google" | "kakao";
  agreeTerms: boolean;
  agreePrivacy: boolean;
  agreeMarketing: boolean;
  marketingAgreedAt?: string;
  createdAt: string;
  lastLoginAt: string;
  needsConsent?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isConfigured: false,
  logout: async () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isConfigured = true;

  const fetchUser = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/me`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  useEffect(() => {
    fetchUser();
  }, [isConfigured]);

  return (
    <AuthContext.Provider value={{ user, loading, isConfigured, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}


