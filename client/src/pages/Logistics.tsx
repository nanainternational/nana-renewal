
import Navigation from "@/components/Navigation";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { Card } from "@/components/ui/card";
import { Package, Truck, Warehouse, DollarSign, CheckCircle2 } from "lucide-react";

const services = [
  {
    icon: Warehouse,
    title: "재고 관리",
    description: "체계적인 재고 보관 및 관리 시스템"
  },
  {
    icon: Package,
    title: "주문 처리",
    description: "신속하고 정확한 피킹 및 패킹"
  },
  {
    icon: Truck,
    title: "배송 대행",
    description: "건당 2,040원 메이저 택배사 계약"
  },
  {
    icon: DollarSign,
    title: "국내 최저가",
    description: "합리적인 가격의 물류 서비스"
  }
];

const benefits = [
  "재고 입고부터 출고까지 원스톱 처리",
  "실시간 재고 현황 확인 가능",
  "포장 자재 무료 제공",
  "당일 출고 서비스 지원",
  "전문 CS 팀 운영",
  "유연한 계약 조건"
];

export default function Logistics() {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      <section className="pt-32 pb-16 md:pb-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              3PL 물류 서비스
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              재고 관리부터 배송까지, 쇼핑몰 운영에 필요한 모든 물류를 책임집니다
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <Card key={index} className="p-6 hover-elevate">
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">{service.title}</h3>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-8 text-center">서비스 특징</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{benefit}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <ContactForm />
      <Footer />
      <ScrollToTop />
    </div>
  );
}
