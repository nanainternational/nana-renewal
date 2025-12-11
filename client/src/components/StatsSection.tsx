import { Card } from "@/components/ui/card";
import { Ship, DollarSign, Users } from "lucide-react";

const stats = [
  {
    icon: Ship,
    label: "출항 스케줄",
    value: "2",
    unit: "회",
    color: "text-primary"
  },
  {
    icon: DollarSign,
    label: "누적 거래액",
    value: "310",
    unit: "억원",
    color: "text-primary"
  },
  {
    icon: Users,
    label: "업체 회원수",
    value: "711",
    unit: "업체",
    color: "text-primary"
  }
];

export default function StatsSection() {
  return (
    <section className="py-20 md:py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={index}
                className="p-8 text-center hover-elevate transition-all"
                data-testid={`card-stat-${index}`}
              >
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                </div>
                <div className="mb-2">
                  <span className="text-4xl md:text-5xl font-bold" data-testid={`text-stat-value-${index}`}>
                    {stat.value}
                  </span>
                  <span className="text-2xl md:text-3xl font-bold text-muted-foreground ml-2">
                    {stat.unit}
                  </span>
                </div>
                <p className="text-lg text-muted-foreground" data-testid={`text-stat-label-${index}`}>
                  {stat.label}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}