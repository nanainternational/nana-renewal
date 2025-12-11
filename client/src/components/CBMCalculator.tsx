import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, Package, Hand, Truck, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CBMCalculator() {
  const [width, setWidth] = useState("");
  const [length, setLength] = useState("");
  const [height, setHeight] = useState("");
  const [quantity, setQuantity] = useState("");
  const [pricePerCBM, setPricePerCBM] = useState("");
  const [results, setResults] = useState<{
    volume: number;
    cbm: number;
    totalCost: number;
    costPerUnit: number;
  } | null>(null);

  const { toast } = useToast();

  const calculate = () => {
    const w = parseFloat(width);
    const l = parseFloat(length);
    const h = parseFloat(height);
    const q = parseFloat(quantity);
    const price = parseFloat(pricePerCBM);

    if (isNaN(w) || isNaN(l) || isNaN(h) || isNaN(q) || isNaN(price) || w <= 0 || l <= 0 || h <= 0 || q <= 0 || price <= 0) {
      toast({
        title: "입력값 오류",
        description: "모든 필드에 유효한 값을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    const volume = w * l * h;
    const cbm = (volume / 1000000) * q;
    const totalCost = cbm * price;
    const costPerUnit = totalCost / q;

    setResults({
      volume,
      cbm: parseFloat(cbm.toFixed(4)),
      totalCost: Math.round(totalCost),
      costPerUnit: Math.round(costPerUnit)
    });
  };

  return (
    <section className="py-16 md:py-24 bg-muted/30" id="cbm-calculator">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl md:text-3xl">CBM 계산기</CardTitle>
                <CardDescription className="text-base mt-1">
                  CuBic Meter (㎥) - 사입할 물건의 한 개 해운비를 계산해 보세요
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width">가로 (cm)</Label>
                <Input
                  id="width"
                  type="number"
                  placeholder="0"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  data-testid="input-width"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="length">세로 (cm)</Label>
                <Input
                  id="length"
                  type="number"
                  placeholder="0"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  data-testid="input-length"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">높이 (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="0"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  data-testid="input-height"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">수량 (개)</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  data-testid="input-quantity"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="price-per-cbm">1CBM (원)</Label>
                <Input
                  id="price-per-cbm"
                  type="number"
                  placeholder="0"
                  value={pricePerCBM}
                  onChange={(e) => setPricePerCBM(e.target.value)}
                  data-testid="input-price-per-cbm"
                />
              </div>
            </div>

            <Button 
              onClick={calculate} 
              className="w-full md:w-auto"
              size="lg"
              data-testid="button-calculate-cbm"
            >
              계산하기
            </Button>

            {results && (
              <div className="mt-6 p-6 bg-primary/5 rounded-md space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Hand className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">부피</p>
                      <p className="text-2xl font-bold" data-testid="text-volume-result">
                        {results.volume.toLocaleString()} cm³
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Package className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">CBM</p>
                      <p className="text-2xl font-bold" data-testid="text-cbm-result">
                        {results.cbm}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Truck className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">총 운송비</p>
                      <p className="text-2xl font-bold text-primary" data-testid="text-total-cost-result">
                        {results.totalCost.toLocaleString()} 원
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">개당 운송비</p>
                      <p className="text-2xl font-bold text-primary" data-testid="text-cost-per-unit-result">
                        {results.costPerUnit.toLocaleString()} 원
                      </p>
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
