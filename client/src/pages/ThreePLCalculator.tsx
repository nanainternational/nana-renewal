import { useMemo, useState } from "react";
import { Calculator, CircleDollarSign, PackageCheck, Users } from "lucide-react";

const CHARGE_PER_SHIPMENT = 3_500;
const LABOR_COST_PER_SHIPMENT = 1_200;
const NET_AMOUNT_PER_SHIPMENT = 2_300;
const QUICK_AMOUNTS = [500_000, 1_000_000, 2_000_000, 3_000_000];

const formatNumber = (value: number) => value.toLocaleString("ko-KR");

export default function ThreePLCalculator() {
  const [depositAmount, setDepositAmount] = useState(0);

  const calculation = useMemo(() => {
    const shipmentCount = Math.floor(depositAmount / CHARGE_PER_SHIPMENT);
    const usedAmount = shipmentCount * CHARGE_PER_SHIPMENT;

    return {
      shipmentCount,
      usedAmount,
      laborCost: shipmentCount * LABOR_COST_PER_SHIPMENT,
      netAmount: shipmentCount * NET_AMOUNT_PER_SHIPMENT,
      remainingAmount: depositAmount - usedAmount,
    };
  }, [depositAmount]);

  const handleAmountChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    setDepositAmount(digits ? Number(digits) : 0);
  };

  const resultItems = [
    { label: "발송 사용금액", value: calculation.usedAmount, accent: false },
    { label: "인건비", value: calculation.laborCost, accent: false },
    { label: "인건비 제외 금액", value: calculation.netAmount, accent: true },
    { label: "화주 미사용 잔액", value: calculation.remainingAmount, accent: false },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 font-sans text-slate-900 sm:px-6 sm:py-12 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 sm:mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold tracking-wide text-blue-700">
            <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
            INTERNAL 3PL TOOL
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">3PL 입금 계산기</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
            화주 입금액을 입력하면 발송 가능 건수와 정산 금액을 즉시 계산합니다.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                <CircleDollarSign className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-bold">화주 입금액</h2>
                <p className="mt-0.5 text-xs text-slate-500">입금 확인 금액을 입력해 주세요.</p>
              </div>
            </div>

            <label htmlFor="deposit-amount" className="mb-2 block text-sm font-semibold text-slate-700">
              입금액
            </label>
            <div className="relative">
              <input
                id="deposit-amount"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={depositAmount ? formatNumber(depositAmount) : ""}
                onChange={(event) => handleAmountChange(event.target.value)}
                placeholder="0"
                aria-describedby="deposit-help"
                className="h-16 w-full rounded-xl border border-slate-300 bg-white px-4 pr-12 text-right text-2xl font-bold tabular-nums outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-slate-500">원</span>
            </div>
            <p id="deposit-help" className="mt-2 text-xs text-slate-400">숫자만 입력할 수 있습니다.</p>

            <div className="mt-6">
              <p className="mb-2.5 text-sm font-semibold text-slate-700">빠른 입력</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                {QUICK_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setDepositAmount(amount)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                  >
                    {formatNumber(amount / 10_000)}만원
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-7 border-t border-slate-100 pt-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">건당 계산 기준</p>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">화주 청구</dt><dd className="font-semibold">3,500원</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">인건비</dt><dd className="font-semibold">1,200원</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">인건비 제외</dt><dd className="font-semibold">2,300원</dd></div>
              </dl>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-live="polite">
            <div className="bg-slate-900 p-6 text-white sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-400">발송 가능 건수</p>
                  <p className="mt-2 text-4xl font-bold tabular-nums sm:text-5xl">
                    {formatNumber(calculation.shipmentCount)}<span className="ml-1.5 text-xl font-semibold text-blue-300">건</span>
                  </p>
                </div>
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-blue-300 sm:h-16 sm:w-16">
                  <PackageCheck className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-8">
              <div className="mb-5 flex items-center gap-2 text-sm font-bold text-slate-800">
                <Users className="h-4 w-4 text-blue-600" aria-hidden="true" />
                정산 상세
              </div>
              <dl className="divide-y divide-slate-100">
                {resultItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <dt className="text-sm text-slate-500 sm:text-base">{item.label}</dt>
                    <dd className={`text-base font-bold tabular-nums sm:text-lg ${item.accent ? "text-blue-600" : "text-slate-900"}`}>
                      {formatNumber(item.value)}원
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-slate-400">
          본 계산기는 내부 정산 참고용이며, 입력한 정보는 저장되지 않습니다.
        </p>
      </div>
    </main>
  );
}
