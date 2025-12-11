import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import basicImage from "@assets/generated_images/Basic_tier_facility_cf68a9cc.png";
import standardImage from "@assets/generated_images/Standard_tier_facility_de876649.png";
import premiumImage from "@assets/generated_images/Premium_tier_facility_fc0c557f.png";

const pricingTiers = [
  {
    name: "Basic",
    subtitle: "스낵 서비스",
    image: basicImage,
    budget: "50,000원~",
    facility: "소형매대 (여건에 맞춰 제공)",
    products: "스낵, 음료류",
    service: "택배 배송 서비스",
    delivery: "무료",
  },
  {
    name: "Standard",
    subtitle: "스낵 서비스",
    image: standardImage,
    budget: "150,000원~",
    facility: "대형매대",
    products: "스낵, 음료, 라면 등",
    service: "정기 배송 관리 서비스",
    delivery: "무료",
    featured: true,
  },
  {
    name: "Premium",
    subtitle: "스낵 서비스",
    image: premiumImage,
    budget: "별도 예산 책정",
    facility: "프리미엄 설비 (인테리어 및 맞춤 설비)",
    products: "예산 맞춤 프리미엄 상품",
    service: "전담 관리 서비스",
    delivery: "무료",
  },
];

export default function PricingSection() {
  return (
    <section className="py-20 md:py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            이용 가격
          </h2>
          <p className="text-lg text-muted-foreground">
            부담 없는 나나인터내셔널 이용 가격
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingTiers.map((tier, index) => (
            <Card
              key={index}
              className={`p-8 hover-elevate active-elevate-2 transition-all ${
                tier.featured ? "border-primary border-2" : ""
              }`}
              data-testid={`card-pricing-${tier.name.toLowerCase()}`}
            >
              {tier.featured && (
                <Badge className="mb-4" data-testid="badge-popular">
                  인기
                </Badge>
              )}

              <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
              <p className="text-sm text-muted-foreground mb-6">{tier.subtitle}</p>

              <div className="rounded-lg overflow-hidden mb-6">
                <img
                  src={tier.image}
                  alt={tier.name}
                  className="w-full h-48 object-cover"
                />
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">예산(월)</p>
                  <p className="text-lg font-semibold">{tier.budget}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">설비</p>
                  <p className="text-sm">{tier.facility}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">간식</p>
                  <p className="text-sm">{tier.products}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">서비스</p>
                  <p className="text-sm">{tier.service}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">배송비/관리비</p>
                  <p className="text-sm">{tier.delivery}</p>
                </div>
              </div>

              <Button
                className="w-full"
                variant={tier.featured ? "default" : "outline"}
                data-testid={`button-quote-${tier.name.toLowerCase()}`}
              >
                빠른 견적 받아보기
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}