import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, Upload, FileText, Package, Ship, MapPin, Anchor } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const features = [
  "의류, 잡화, 생활용품, 전자부품 등 다양한 공산품도 대응",
  "사이즈/규격 정보는 한국 기준에 맞춰 확인",
  "색상 옵션은 실제 컬러 기준으로 상담",
  "포장 상태 사진 공유로 검수 및 확인",
  "그 외 다양한 절차 대응 가능",
  "주문 시 요청사항을 완벽히 상담 해 드립니다"
];

const processSteps = [
  { icon: FileText, title: "사입 요청" },
  { icon: Package, title: "입고 확인" },
  { icon: Ship, title: "출항 (화/토)" },
  { icon: MapPin, title: "국내 도착 / 통관" }
];

export default function ChinaPurchaseSection() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    phone1: "",
    phone2: "",
    phone3: "",
    email: "",
    inquiry: "",
    file: null as File | null
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    toast({
      title: "신청이 접수되었습니다",
      description: "담당자가 확인 후 연락드리겠습니다."
    });

    setFormData({
      name: "",
      phone1: "",
      phone2: "",
      phone3: "",
      email: "",
      inquiry: "",
      file: null
    });
  };

  return (
    <section className="py-16 md:py-24 bg-muted/30" id="china-purchase">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12 md:mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Anchor className="w-10 h-10 text-primary" />
            <h2 className="text-3xl md:text-5xl font-bold">중국사입 신청안내</h2>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            <strong>구매대행이 아닌 현지 공장을 컨택해 직접 사입</strong>이며, 
            원하시는 조건에 맞춰 <strong>대량 · 소량 사입</strong>은 물론, 
            <strong>샘플 확인</strong>도 빠르게 도와드립니다.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>사입이 처음이신 분들도 걱정하지 마세요!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{feature}</p>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  견적은 접수 후 <strong>1일~2일 이내</strong> 안내됩니다.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>진행 프로세스</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {processSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={index} className="text-center">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-xs font-medium">{step.title}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Download className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>주문서 양식 다운로드</CardTitle>
                <CardDescription className="mt-1">
                  샘플 혹은 주문 요청을 원하실 경우, 아래 양식을 다운로드 후 작성해 주세요.
                  제품명, 수량, 색상 등 입력 항목이 포함되어 있습니다.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild data-testid="button-download-template">
              <a 
                href="https://docs.google.com/spreadsheets/d/1PQt3pO6NYplDdUBVEm4RVekH1ymsGxcI/export?format=xlsx"
                download
              >
                <Download className="w-4 h-4 mr-2" />
                주문서 양식 다운로드 (.xlsx)
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>사입 신청서</CardTitle>
                <CardDescription className="mt-1">
                  아래 신청서를 작성해주시면 확인 후 담당자가 연락드리겠습니다.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    성명 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    data-testid="input-applicant-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone1">
                    연락처 <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="phone1"
                      required
                      placeholder="010"
                      maxLength={3}
                      value={formData.phone1}
                      onChange={(e) => setFormData({ ...formData, phone1: e.target.value })}
                      data-testid="input-phone-1"
                      className="w-20"
                    />
                    <Input
                      placeholder="0000"
                      maxLength={4}
                      value={formData.phone2}
                      onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                      data-testid="input-phone-2"
                      className="w-24"
                    />
                    <Input
                      placeholder="0000"
                      maxLength={4}
                      value={formData.phone3}
                      onChange={(e) => setFormData({ ...formData, phone3: e.target.value })}
                      data-testid="input-phone-3"
                      className="w-24"
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">
                    이메일 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    data-testid="input-email"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="inquiry">
                    문의내용 <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="inquiry"
                    required
                    rows={6}
                    value={formData.inquiry}
                    onChange={(e) => setFormData({ ...formData, inquiry: e.target.value })}
                    data-testid="input-inquiry"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="file">첨부파일</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="file"
                      type="file"
                      onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                      data-testid="input-file"
                    />
                    <Upload className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <Button type="submit" size="lg" data-testid="button-submit-application">
                신청하기
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
