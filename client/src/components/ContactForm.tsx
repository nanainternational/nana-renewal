import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageCircle } from "lucide-react";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
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

              <Button type="submit" className="w-full" data-testid="button-submit">
                문의하기
              </Button>
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
