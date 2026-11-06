import { useMemo, useState } from "react";
import {
  Calculator,
  CircleDollarSign,
  PackageCheck,
  Users,
  Plus,
  Minus,
} from "lucide-react";

const CHARGE_PER_SHIPMENT = 3_500;
const LABOR_COST_PER_SHIPMENT = 1_200;
const NET_AMOUNT_PER_SHIPMENT = 2_300;

const QUICK_AMOUNTS = [
  100_000,
  300_000,
  500_000,
  1_000_000,
];

const STEP_AMOUNT = 50_000;

const formatNumber = (value: number) => {
  return value.toLocaleString("ko-KR");
};

export default function ThreePLCalculator() {
  const [depositAmount, setDepositAmount] = useState(0);

  const calculation = useMemo(() => {
    const shipmentCount = Math.floor(
      depositAmount / CHARGE_PER_SHIPMENT
    );

    const usedAmount =
      shipmentCount * CHARGE_PER_SHIPMENT;

    const laborCost =
      shipmentCount * LABOR_COST_PER_SHIPMENT;

    const netAmount =
      shipmentCount * NET_AMOUNT_PER_SHIPMENT;

    const remainingAmount =
      depositAmount - usedAmount;

    return {
      shipmentCount,
      usedAmount,
      laborCost,
      netAmount,
      remainingAmount,
    };
  }, [depositAmount]);

  const handleAmountChange = (
    value: string
  ) => {
    const digits = value.replace(/\D/g, "");

    setDepositAmount(
      digits ? Number(digits) : 0
    );
  };

  const handleIncrement = () => {
    setDepositAmount(
      (prev) => prev + STEP_AMOUNT
    );
  };

  const handleDecrement = () => {
    setDepositAmount(
      (prev) =>
        Math.max(0, prev - STEP_AMOUNT)
    );
  };

  const resultItems = [
    {
      label: "발송 사용금액",
      value: calculation.usedAmount,
      accent: false,
    },
    {
      label: "인건비",
      value: calculation.laborCost,
      accent: false,
    },
    {
      label: "인건비 제외 금액",
      value: calculation.netAmount,
      accent: true,
    },
    {
      label: "화주 미사용 잔액",
      value: calculation.remainingAmount,
      accent: false,
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-4 py-8 font-sans text-slate-100 sm:px-6 sm:py-12 lg:py-16">
      <div className="mx-auto max-w-5xl">

        {/* 제목 */}
        <header className="mb-10 text-center sm:mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-xs font-bold tracking-wide text-indigo-400 shadow-inner backdrop-blur-md">
            <Calculator
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />

            NANA INTERNATIONAL 3PL SYSTEM
          </div>

          <h1 className="bg-gradient-to-r from-white via-slate-200 to-indigo-200 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
            3PL 입금 정산 계산기
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
            화주 입금액을 입력하거나 빠른
            버튼으로 조정하여 발송 가능 건수와
            정산 금액을 실시간으로 확인하세요.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">

          {/* 왼쪽 입력 영역 */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-800/60 p-6 shadow-2xl backdrop-blur-xl sm:p-8">

            <div className="pointer-events-none absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" />

            <div className="mb-6 flex items-center gap-3">

              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/30">
                <CircleDollarSign
                  className="h-6 w-6"
                  aria-hidden="true"
                />
              </span>

              <div>
                <h2 className="text-lg font-bold text-white">
                  화주 입금액 입력
                </h2>

                <p className="text-xs text-slate-400">
                  금액을 직접 입력하거나 증감
                  버튼을 활용하세요.
                </p>
              </div>
            </div>

            <label
              htmlFor="deposit-amount"
              className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400"
            >
              입금액 설정
            </label>

            {/* 입금액 */}
            <div className="relative flex items-center">

              <input
                id="deposit-amount"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={
                  depositAmount
                    ? formatNumber(depositAmount)
                    : ""
                }
                onChange={(event) =>
                  handleAmountChange(
                    event.target.value
                  )
                }
                placeholder="0"
                aria-describedby="deposit-help"
                className="h-16 w-full rounded-2xl border border-slate-700 bg-slate-900/80 px-4 pr-12 text-right text-2xl font-extrabold tabular-nums text-white shadow-inner outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
              />

              <span className="pointer-events-none absolute right-4 text-lg font-bold text-indigo-400">
                원
              </span>
            </div>

            {/* 5만원 증감 */}
            <div className="mt-3 grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={handleDecrement}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/40 py-3 text-sm font-bold text-slate-300 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 active:scale-[0.98]"
              >
                <Minus className="h-4 w-4" />
                - 5만원
              </button>

              <button
                type="button"
                onClick={handleIncrement}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/40 py-3 text-sm font-bold text-slate-300 transition hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-indigo-400 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                + 5만원
              </button>

            </div>

            <p
              id="deposit-help"
              className="mt-2 text-xs text-slate-500"
            >
              숫자만 입력할 수 있으며,
              5만원 단위로 조정할 수 있습니다.
            </p>

            {/* 빠른 금액 */}
            <div className="mt-6">

              <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                빠른 금액 선택
              </p>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">

                {QUICK_AMOUNTS.map(
                  (amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() =>
                        setDepositAmount(
                          amount
                        )
                      }
                      className="rounded-xl border border-slate-700/80 bg-slate-900/40 px-3 py-2.5 text-xs font-bold text-slate-300 transition hover:border-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                      {formatNumber(
                        amount / 10_000
                      )}
                      만원
                    </button>
                  )
                )}

              </div>
            </div>

            {/* 기준 단가 */}
            <div className="mt-8 border-t border-slate-700/60 pt-5">

              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-indigo-400">
                건당 계산 기준
              </p>

              <dl className="space-y-2 text-sm">

                <div className="flex justify-between">
                  <dt className="text-slate-400">
                    화주 청구
                  </dt>

                  <dd className="font-semibold text-slate-200">
                    3,500원
                  </dd>
                </div>

                <div className="flex justify-between">
                  <dt className="text-slate-400">
                    인건비
                  </dt>

                  <dd className="font-semibold text-slate-200">
                    1,200원
                  </dd>
                </div>

                <div className="flex justify-between">
                  <dt className="text-slate-400">
                    인건비 제외
                  </dt>

                  <dd className="font-semibold text-indigo-300">
                    2,300원
                  </dd>
                </div>

              </dl>
            </div>

          </section>

          {/* 오른쪽 결과 영역 */}
          <section
            className="flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-800/60 shadow-2xl backdrop-blur-xl"
            aria-live="polite"
          >

            {/* 발송 가능 수량 */}
            <div className="relative border-b border-slate-700/50 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 p-6 sm:p-8">

              <div className="pointer-events-none absolute inset-0 bg-indigo-500/5" />

              <div className="relative z-10 flex items-center justify-between gap-4">

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    발송 가능 총 수량
                  </p>

                  <p className="mt-2 text-5xl font-black tabular-nums tracking-tight text-white sm:text-6xl">

                    {formatNumber(
                      calculation.shipmentCount
                    )}

                    <span className="ml-2 text-2xl font-bold text-indigo-400">
                      건
                    </span>
                  </p>
                </div>

                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/20 text-indigo-400 shadow-lg sm:h-20 sm:w-20">

                  <PackageCheck
                    className="h-8 w-8 sm:h-10 sm:w-10"
                    aria-hidden="true"
                  />

                </span>
              </div>
            </div>

            {/* 상세 정산 */}
            <div className="flex flex-1 flex-col justify-center p-6 sm:p-8">

              <div className="mb-5 flex items-center gap-2 text-sm font-bold text-slate-200">

                <Users
                  className="h-4 w-4 text-indigo-400"
                  aria-hidden="true"
                />

                상세 정산 내역
              </div>

              <dl className="divide-y divide-slate-700/60">

                {resultItems.map(
                  (item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                    >

                      <dt className="text-sm text-slate-400 sm:text-base">
                        {item.label}
                      </dt>

                      <dd
                        className={`text-lg font-extrabold tabular-nums sm:text-xl ${
                          item.accent
                            ? "text-indigo-400"
                            : "text-white"
                        }`}
                      >
                        {formatNumber(
                          item.value
                        )}
                        원
                      </dd>

                    </div>
                  )
                )}

              </dl>
            </div>

            {/* 하단 안내 */}
            <div className="border-t border-slate-700/40 bg-slate-900/50 px-6 py-4 text-center">

              <p className="text-xs text-slate-400">
                본 계산기는 내부 정산 참고용이며,
                입력한 정보는 저장되지 않습니다.
              </p>

            </div>

          </section>

        </div>
      </div>
    </main>
  );
}
