import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { API_BASE } from "@/lib/queryClient";
import { MessageCircle } from "lucide-react";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
    agreePrivacy: false,
    hp: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!formData.name.trim() || !formData.phone.trim() || !formData.email.trim() || !formData.message.trim()) {
      setToast({ type: "error", message: "필수 항목을 모두 입력해주세요." });
      return;
    }
    if (!formData.agreePrivacy) {
      setToast({ type: "error", message: "개인정보 수집 및 이용 동의가 필요합니다." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/formmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: "contact",
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          phoneConfirm: formData.phone.trim(),
          email: formData.email.trim(),
          question: formData.message.trim(),
          agreePrivacy: formData.agreePrivacy,
          hp: formData.hp,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.message || "문의 중 오류가 발생했습니다.");

      setFormData({ name: "", phone: "", email: "", message: "", agreePrivacy: false, hp: "" });
      setToast({ type: "success", message: "문의가 접수되었습니다. 빠르게 답변드릴게요." });
    } catch (e: any) {
      setToast({ type: "error", message: e?.message || "문의 접수 실패" });
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(null), 2600);
    }
  };

  return (
    <section className="py-16 md:py-24 bg-background" id="contact">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            문의하기
          </h2>
          <p className="text-lg text-muted-foreground">
            궁금하신 점이 있으시면 언제든지 문의해주세요
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <Card className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">성명</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="이름을 입력하세요"
                  data-testid="input-name"
                />
              </div>

              <div>
                <Label htmlFor="phone">연락처</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="010-0000-0000"
                  data-testid="input-phone"
                />
              </div>

              <div>
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="example@email.com"
                  data-testid="input-email"
                />
              </div>

              <div>
                <Label htmlFor="message">질문내용</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="문의하실 내용을 입력하세요"
                  rows={6}
                  data-testid="input-message"
                />
              </div>

              <div className="space-y-2">
                <Label>개인정보 수집 동의*</Label>
                <label className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={formData.agreePrivacy}
                    onCheckedChange={(v) => setFormData({ ...formData, agreePrivacy: Boolean(v) })}
                  />
                  <span>문의 접수 및 답변 연락을 위한 개인정보 수집·이용에 동의합니다.</span>
                </label>
                <Input
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                  value={formData.hp}
                  onChange={(e) => setFormData({ ...formData, hp: e.target.value })}
                />
              </div>

              <Button type="submit" className="w-full" data-testid="button-submit" disabled={submitting}>
                {submitting ? "제출 중..." : "문의하기"}
              </Button>

              {toast && (
                <div
                  className={`rounded px-4 py-2 text-sm text-white ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}
                >
                  {toast.message}
                </div>
              )}
            </form>
          </Card>

          <div className="space-y-8">
            <Card className="p-8">
              <h3 className="text-2xl font-bold mb-6">OUR ADDRESS</h3>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold mb-2">본사</p>
                  <p className="text-sm text-muted-foreground">
                    경기도 부천시 경인로137번가길83 성원빌딩 3층
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    부천역과 도보 10분거리에 있어 대중교통이 편리합니다.
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <p className="font-semibold mb-2">이메일</p>
                  <a 
                    href="mailto:nanainternational@naver.com"
                    className="text-sm text-primary hover:underline"
                  >
                    nanainternational@naver.com
                  </a>
                </div>
              </div>
            </Card>

            <Button 
              variant="outline" 
              size="lg" 
              className="w-full bg-[#FEE500] hover:bg-[#F5DC00] text-black border-[#FEE500]"
              data-testid="button-kakao"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              카카오톡 문의
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
