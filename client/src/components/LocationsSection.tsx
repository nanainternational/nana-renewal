import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

const locations = [
  {
    name: "부천시 심곡남부센터",
    address: "경기도 부천시 경인로137번가길 83 성원빌딩 3층",
    status: "운영중",
  },
  {
    name: "부천시 심곡북부센터",
    address: "경기도 부천시 심곡동 352-6 정우빌딩 2층",
    status: "운영중",
  },
  {
    name: "서울시 구로센터",
    address: "서울특별시 구로구 디지털로 34길 55, 코오롱싸이언스밸리 2차 B101호",
    status: "운영중",
  },
  {
    name: "서울시 남대문센터",
    address: "서울특별시 중구 남대문시장8길 7 삼익상가 지하1층",
    status: "운영중",
  },
  {
    name: "서울시 영등포센터",
    address: "서울특별시 영등포구 버드나루로 15길 3",
    status: "오픈예상일 미정",
  },
  {
    name: "인천시 계양센터",
    address: "인천광역시 계양구 용종동 210-2 레드몰A동 6층",
    status: "운영중",
  },
];

export default function LocationsSection() {
  return (
    <section className="py-20 md:py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            CENTER LOCATION
          </h2>
          <p className="text-lg text-muted-foreground">
            전국 주요 거점에 위치한 나나인터내셔널 센터
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((location, index) => (
            <Card
              key={index}
              className="p-6 hover-elevate active-elevate-2 transition-all"
              data-testid={`card-location-${index}`}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-lg font-semibold">{location.name}</h3>
                    <Badge
                      variant={location.status === "운영중" ? "default" : "secondary"}
                      className="flex-shrink-0"
                      data-testid={`badge-status-${index}`}
                    >
                      {location.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground break-keep">
                    {location.address}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}