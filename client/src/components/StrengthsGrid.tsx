import { Globe, DollarSign, FileText, Megaphone, CreditCard, ShoppingBag, Truck, Image } from "lucide-react";
import { Card } from "@/components/ui/card";

const strengths = [
  {
    icon: Globe,
    title: "중국 사입",
    description: "핫이슈 상품 또는 꾸준한 인기 아이템을 선정하여 중국 공장에서 직접 수입",
  },
  {
    icon: DollarSign,
    title: "가격 경쟁력",
    description: "국내 최저가 택배계약 2,040원으로 가격 경쟁력을 높여 유리한 조건에서 판매 시작",
  },
  {
    icon: FileText,
    title: "정부 지원금",
    description: "기술보증기금/신용보증재단을 이용한 초기 자금 지원 무료 컨설팅",
  },
  {
    icon: Megaphone,
    title: "마케팅",
    description: "티몬/위메프 등 수십명의 MD들과 빠르게 협업 가능한 인프라 기반",
  },
  {
    icon: CreditCard,
    title: "선정산 서비스",
    description: "안정적인 선정산을 받을 수 있도록 서포트하여 월 매출 극대화",
  },
  {
    icon: ShoppingBag,
    title: "VVIC 도매사입",
    description: "중국 광저우 여성 의류 도매단지에서 가격 경쟁력 있는 무재고 시스템",
  },
  {
    icon: Truck,
    title: "쿠팡 제트배송",
    description: "쿠팡 제트배송 발주를 받아 무재고로 중국에서 발주하여 납품",
  },
  {
    icon: Image,
    title: "포토샵 교육",
    description: "상세페이지/대표이미지 제작을 위한 포토샵 기능 교육 및 웹디자인 서비스",
  },
];

export default function StrengthsGrid() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            STRENGTH POINT
          </h2>
          <p className="text-lg text-muted-foreground">
            나나인터내셔널만의 8가지 핵심 경쟁력
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {strengths.map((strength, index) => {
            const Icon = strength.icon;
            return (
              <Card 
                key={index}
                className="p-6 hover-elevate active-elevate-2 transition-all"
                data-testid={`card-strength-${index}`}
              >
                <div className="flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{strength.title}</h3>
                  <p className="text-sm text-muted-foreground">{strength.description}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}