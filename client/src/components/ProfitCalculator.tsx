import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TrendingUp, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProfitCalculator() {
  const [productName, setProductName] = useState("");
  const [costYuan, setCostYuan] = useState("");
  const [exchangeRate, setExchangeRate] = useState("227.29");
  const [cbmCost, setCbmCost] = useState("");
  const [tariffRate, setTariffRate] = useState("");
  const [salesFee, setSalesFee] = useState("");
  const [expectedPrice, setExpectedPrice] = useState("");
  const [results, setResults] = useState<{
    productName: string;
    costKRW: number;
    logistics: number;
    tariff: number;
    salesFee: number;
    totalCost: number;
    profit: number;
    profitRate: number;
  } | null>(null);

  const { toast } = useToast();

  const calculate = () => {
    const cost = parseFloat(costYuan);
    const rate = parseFloat(exchangeRate);
    const cbm = parseFloat(cbmCost);
    const tariff = parseFloat(tariffRate);
    const fee = parseFloat(salesFee);
    const price = parseFloat(expectedPrice);

    if (isNaN(cost) || isNaN(rate) || isNaN(cbm) || isNaN(tariff) || isNaN(fee) || isNaN(price) || 
        cost <= 0 || rate <= 0 || cbm < 0 || tariff < 0 || fee < 0 || price <= 0) {
      toast({
        title: "입력값 오류",
        description: "모든 필드에 유효한 값을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    const costKRW = cost * rate;
    const logistics = cbm;
    const tariffAmount = (costKRW + logistics) * (tariff / 100);
    const salesFeeAmount = price * (fee / 100);
    const totalCost = costKRW + logistics + tariffAmount + salesFeeAmount;
    const profit = price - totalCost;
    const profitRate = (profit / price) * 100;

    setResults({
      productName: productName || "-",
      costKRW: Math.round(costKRW),
      logistics: Math.round(logistics),
      tariff: Math.round(tariffAmount),
      salesFee: Math.round(salesFeeAmount),
      totalCost: Math.round(totalCost),
      profit: Math.round(profit),
      profitRate: parseFloat(profitRate.toFixed(2))
    });
  };

  return (
    <section className="py-16 md:py-24" id="profit-calculator">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl md:text-3xl">순익대조표</CardTitle>
                <CardDescription className="text-base mt-1">
                  사입할 물건의 한 개 판매가를 계산해 보세요
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="product-name">제품명</Label>
                <Input
                  id="product-name"
                  type="text"
                  placeholder="제품명을 입력하세요"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  data-testid="input-product-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost-yuan">원가 (위안)</Label>
                <Input
                  id="cost-yuan"
                  type="number"
                  placeholder="0"
                  value={costYuan}
                  onChange={(e) => setCostYuan(e.target.value)}
                  data-testid="input-cost-yuan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exchange-rate">환율</Label>
                <Input
                  id="exchange-rate"
                  type="number"
                  placeholder="227.29"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  data-testid="input-exchange-rate"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cbm-cost">개당 CBM (₩)</Label>
                <Input
                  id="cbm-cost"
                  type="number"
                  placeholder="0"
                  value={cbmCost}
                  onChange={(e) => setCbmCost(e.target.value)}
                  data-testid="input-cbm-cost"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tariff-rate">관세율 (%)</Label>
                <Input
                  id="tariff-rate"
                  type="number"
                  placeholder="0"
                  value={tariffRate}
                  onChange={(e) => setTariffRate(e.target.value)}
                  data-testid="input-tariff-rate"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sales-fee">판매수수료 (%)</Label>
                <Input
                  id="sales-fee"
                  type="number"
                  placeholder="0"
                  value={salesFee}
                  onChange={(e) => setSalesFee(e.target.value)}
                  data-testid="input-sales-fee"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected-price">예상판매가 (₩)</Label>
                <Input
                  id="expected-price"
                  type="number"
                  placeholder="0"
                  value={expectedPrice}
                  onChange={(e) => setExpectedPrice(e.target.value)}
                  data-testid="input-expected-price"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={calculate}
                size="lg"
                data-testid="button-calculate-profit"
              >
                계산하기
              </Button>
              {results && (
                <Button 
                  variant="outline"
                  size="lg"
                  data-testid="button-download-excel"
                >
                  <Download className="w-4 h-4 mr-2" />
                  엑셀 다운로드
                </Button>
              )}
            </div>

            {results && (
              <div className="mt-6 p-6 bg-primary/5 rounded-md space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">제품명</p>
                    <p className="text-lg font-semibold" data-testid="text-result-product-name">
                      {results.productName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">제품원가 (원화)</p>
                    <p className="text-lg font-semibold" data-testid="text-result-cost-krw">
                      {results.costKRW.toLocaleString()} 원
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">물류비</p>
                    <p className="text-lg font-semibold" data-testid="text-result-logistics">
                      {results.logistics.toLocaleString()} 원
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">관부가세</p>
                    <p className="text-lg font-semibold" data-testid="text-result-tariff">
                      {results.tariff.toLocaleString()} 원
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">판매수수료</p>
                    <p className="text-lg font-semibold" data-testid="text-result-sales-fee">
                      {results.salesFee.toLocaleString()} 원
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">총비용 합계</p>
                    <p className="text-lg font-semibold" data-testid="text-result-total-cost">
                      {results.totalCost.toLocaleString()} 원
                    </p>
                  </div>
                  <div className="md:col-span-2 border-t pt-4 mt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">예상 이익</p>
                        <p className="text-2xl font-bold text-primary" data-testid="text-result-profit">
                          {results.profit.toLocaleString()} 원
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">이익률</p>
                        <p className="text-2xl font-bold text-primary" data-testid="text-result-profit-rate">
                          {results.profitRate}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
