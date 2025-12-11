import { Card } from "@/components/ui/card";

const clients = [
  {
    name: "더본코리아",
    logo: "https://gi.esmplus.com/secsiboy2/3pl/%EB%8D%94%EB%B3%B8%EB%A1%9C%EA%B3%A0.png"
  },
  {
    name: "크라운",
    logo: "https://gi.esmplus.com/secsiboy2/3pl/%ED%81%AC%EB%9D%BC%EC%9A%B4%EB%A1%9C%EA%B3%A0.png"
  },
  {
    name: "SBS아카데미",
    logo: "https://gi.esmplus.com/secsiboy2/3pl/SBS%EB%A1%9C%EA%B3%A0.png"
  },
  {
    name: "KBS아카데미",
    logo: "https://gi.esmplus.com/secsiboy2/3pl/KBS%EB%A1%9C%EA%B3%A0.png"
  }
];

export default function ClientsSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/30" id="clients">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">주요 고객사</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            다양한 기업들이 나나인터내셔널의 서비스를 신뢰하고 있습니다
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {clients.map((client, index) => (
            <Card
              key={index}
              className="p-8 flex items-center justify-center hover-elevate transition-all"
              data-testid={`card-client-${index}`}
            >
              <img
                src={client.logo}
                alt={client.name}
                className="max-w-full h-auto max-h-20 object-contain"
                data-testid={`img-client-logo-${index}`}
              />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}