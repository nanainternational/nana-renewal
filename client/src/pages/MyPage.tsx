import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Mail, Phone, Calendar, Bell, LogOut, User, Copy, Check } from "lucide-react";
import { SiGoogle, SiKakaotalk } from "react-icons/si";

export default function MyPage() {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();

  const [accountId, setAccountId] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [user, loading, setLocation]);

  useEffect(() => {
    if (loading || !user) return;

    (async () => {
      try {
        const r = await fetch("/api/wallet", { credentials: "include" });
        const j = await r.json();
        if (j?.ok && typeof j?.user_id === "string") {
          setAccountId(j.user_id);
        }
      } catch {
        // ignore
      }
    })();
  }, [user, loading]);

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const handleCopy = async () => {
    if (!accountId) return;
    try {
      await navigator.clipboard.writeText(accountId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-pulse text-muted-foreground">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-32 pb-20 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl font-bold" data-testid="text-mypage-title">
                    마이페이지
                  </CardTitle>
                  <CardDescription data-testid="text-mypage-description">
                    회원 정보를 확인하고 관리하세요
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex items-center gap-6 mb-8">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={user.profileImage} alt={user.name} />
                  <AvatarFallback className="text-2xl">{user.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold" data-testid="text-user-name">
                    {user.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    {user.provider === "google" ? (
                      <Badge variant="secondary" className="gap-1" data-testid="badge-provider">
                        <SiGoogle className="w-3 h-3" />
                        Google
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="gap-1 bg-[#FEE500] text-[#3C1E1E]"
                        data-testid="badge-provider"
                      >
                        <SiKakaotalk className="w-3 h-3" />
                        Kakao
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">이메일</p>
                    <p className="font-medium" data-testid="text-user-email">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* ✅ 계정 ID(user_id) 표시 */}
                <div className="flex items-center justify-between gap-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">계정 ID</p>
                      <p className="font-medium break-all" data-testid="text-user-id">
                        {accountId || "-"}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleCopy}
                    disabled={!accountId}
                    data-testid="button-copy-user-id"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "복사됨" : "복사"}
                  </Button>
                </div>

                {user.phone && (
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">전화번호</p>
                      <p className="font-medium" data-testid="text-user-phone">
                        {user.phone}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">가입일</p>
                    <p className="font-medium" data-testid="text-user-created">
                      {formatDate(user.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">마케팅 수신 동의</p>
                    <p className="font-medium" data-testid="text-user-marketing">
                      {user.agreeMarketing ? "동의함" : "동의하지 않음"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            variant="outline"
            size="lg"
            className="w-full justify-center gap-2"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
