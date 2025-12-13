import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { FileText, Shield, Bell, AlertCircle } from "lucide-react";
import { API_BASE } from "@/lib/queryClient";

export default function Terms() {
  const { user, loading, isConfigured, refreshUser } = useAuth();
  const [, setLocation] = useLocation();

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    } else if (!loading && user && !user.needsConsent) {
      setLocation("/mypage");
    }
  }, [user, loading, setLocation]);

  const handleSubmit = async () => {
    if (!agreeTerms || !agreePrivacy) {
      setError("필수 약관에 동의해주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/update-consent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          agreeTerms,
          agreePrivacy,
          agreeMarketing,
        }),
      });

      if (response.ok) {
        await refreshUser();
        setLocation("/mypage");
      } else {
        const data = await response.json();
        setError(data.message || "동의 처리에 실패했습니다.");
      }
    } catch (err) {
      setError("서버 연결에 실패했습니다.");
    } finally {
      setSubmitting(false);
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

  const canSubmit = agreeTerms && agreePrivacy;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-32 pb-20 px-4">
        <div className="max-w-lg mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold" data-testid="text-terms-title">
                서비스 이용 동의
              </CardTitle>
              <CardDescription data-testid="text-terms-description">
                서비스 이용을 위해 아래 약관에 동의해주세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isConfigured && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800" data-testid="alert-not-configured">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    백엔드 서버가 연결되지 않았습니다. 배포 후 연동됩니다.
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20" data-testid="alert-error">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <Checkbox
                    id="agreeTerms"
                    checked={agreeTerms}
                    onCheckedChange={(checked) => setAgreeTerms(!!checked)}
                    data-testid="checkbox-terms"
                  />
                  <div className="flex-1">
                    <Label htmlFor="agreeTerms" className="flex items-center gap-2 font-medium cursor-pointer">
                      <FileText className="w-4 h-4 text-primary" />
                      서비스 이용약관 동의
                      <span className="text-destructive">(필수)</span>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      서비스 이용에 필요한 기본 약관입니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <Checkbox
                    id="agreePrivacy"
                    checked={agreePrivacy}
                    onCheckedChange={(checked) => setAgreePrivacy(!!checked)}
                    data-testid="checkbox-privacy"
                  />
                  <div className="flex-1">
                    <Label htmlFor="agreePrivacy" className="flex items-center gap-2 font-medium cursor-pointer">
                      <Shield className="w-4 h-4 text-primary" />
                      개인정보 수집·이용 동의
                      <span className="text-destructive">(필수)</span>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      서비스 제공을 위한 개인정보 처리에 동의합니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <Checkbox
                    id="agreeMarketing"
                    checked={agreeMarketing}
                    onCheckedChange={(checked) => setAgreeMarketing(!!checked)}
                    data-testid="checkbox-marketing"
                  />
                  <div className="flex-1">
                    <Label htmlFor="agreeMarketing" className="flex items-center gap-2 font-medium cursor-pointer">
                      <Bell className="w-4 h-4 text-muted-foreground" />
                      마케팅 정보 수신 동의
                      <span className="text-muted-foreground">(선택)</span>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      이벤트, 프로모션 등 마케팅 정보를 받아보실 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting || !isConfigured}
                data-testid="button-submit-consent"
              >
                {submitting ? "처리 중..." : "동의하고 시작하기"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
