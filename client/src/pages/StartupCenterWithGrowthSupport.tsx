"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Building2,
  Check,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import StartupCenter from "./StartupCenter";

const growthSteps = [
  {
    threshold: "500",
    label: "월평균 500건 이상",
    support: "6개월 추가 지원",
    icon: TrendingUp,
    accent: "from-sky-400 to-blue-500",
    glow: "shadow-sky-500/10",
    badge: "bg-sky-50 text-sky-700 border-sky-100",
  },
  {
    threshold: "1,000",
    label: "월평균 1,000건 이상",
    support: "12개월 추가 지원",
    icon: TrendingUp,
    accent: "from-blue-500 to-cyan-500",
    glow: "shadow-blue-500/10",
    badge: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    threshold: "1,500",
    label: "월평균 1,500건 이상",
    support: "12개월 추가 지원",
    extra: "사무실 1단계 업그레이드",
    icon: Sparkles,
    accent: "from-cyan-500 to-teal-500",
    glow: "shadow-teal-500/15",
    badge: "bg-teal-50 text-teal-700 border-teal-100",
    featured: true,
  },
  {
    threshold: "2,000",
    label: "월평균 2,000건 이상",
    support: "12개월 추가 지원",
    extra: "사무실 2단계 업그레이드",
    icon: Trophy,
    accent: "from-teal-500 to-emerald-500",
    glow: "shadow-emerald-500/15",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-100",
    featured: true,
  },
];

const officeGrades = [
  { name: "1인실 내측", window: false, wide: false, seats: 1 },
  { name: "1인실 창측", window: true, wide: false, seats: 1 },
  { name: "1~2인실 내측", window: false, wide: true, seats: 2 },
  { name: "3~4인실", window: true, wide: true, seats: 4 },
];

function RoomVisual({
  window,
  wide,
  seats,
}: {
  window: boolean;
  wide: boolean;
  seats: number;
}) {
  return (
    <div className="relative h-28 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="absolute inset-x-0 top-0 h-[68%] bg-gradient-to-b from-white to-slate-100" />
      <div className="absolute inset-x-0 bottom-0 h-[32%] bg-slate-200/80" />

      {window && (
        <div className="absolute right-4 top-4 h-12 w-20 rounded-lg border-2 border-sky-200 bg-gradient-to-b from-sky-100 to-white shadow-inner">
          <div className="absolute left-1/2 top-0 h-full w-px bg-sky-200" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-sky-200" />
        </div>
      )}

      <div
        className={`absolute bottom-[28px] left-1/2 -translate-x-1/2 rounded-md bg-white shadow-md border border-slate-200 ${
          wide ? "h-4 w-28" : "h-4 w-20"
        }`}
      />
      <div className="absolute bottom-[12px] left-1/2 h-4 w-1 -translate-x-1/2 bg-slate-400" />

      <div className="absolute bottom-[10px] left-1/2 flex -translate-x-1/2 gap-2">
        {Array.from({ length: Math.min(seats, 4) }).map((_, index) => (
          <div key={index} className="relative h-6 w-5">
            <div className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 rounded-t-md bg-slate-500" />
            <div className="absolute bottom-0 left-1/2 h-3 w-1 -translate-x-1/2 bg-slate-500" />
          </div>
        ))}
      </div>

      <div className="absolute left-4 top-4 h-10 w-6 rounded-t-full bg-emerald-100">
        <div className="absolute -left-1 top-2 h-3 w-3 rotate-[-28deg] rounded-full bg-emerald-400" />
        <div className="absolute left-4 top-1 h-3 w-3 rotate-[26deg] rounded-full bg-emerald-400" />
        <div className="absolute bottom-0 left-1/2 h-5 w-1 -translate-x-1/2 bg-emerald-500" />
      </div>
    </div>
  );
}

function GrowthSupportProject() {
  return (
    <section className="relative overflow-hidden border-y border-slate-200 bg-[#07111f] py-20 md:py-28">
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-blue-500/20 blur-[110px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-emerald-400/15 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:38px_38px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-8">
        <div className="mx-auto mb-12 max-w-4xl text-center md:mb-16">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white backdrop-blur">
            <Sparkles className="h-4 w-4 text-[#FEE500]" />
            성장지원 프로젝트
          </span>

          <h2 className="mb-5 text-3xl font-black tracking-[-0.05em] text-white md:text-5xl lg:text-6xl break-keep">
            작은 시작도 괜찮습니다.
            <br />
            <span className="bg-gradient-to-r from-[#FEE500] via-sky-300 to-emerald-300 bg-clip-text text-transparent">
              성장하면 지원도 함께 커집니다.
            </span>
          </h2>

          <p className="mx-auto max-w-3xl text-base leading-relaxed text-slate-300 md:text-xl break-keep">
            선정된 입주사는 먼저 <strong className="text-white">3개월 무료 지원</strong>으로 시작합니다.
            이후 지원기간이 끝날 때마다 <strong className="text-white">최근 3개월 월평균 출고량</strong>으로 같은 기준을 다시 적용합니다.
          </p>
        </div>

        <div className="mb-8 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-950 p-7 text-white shadow-2xl shadow-blue-950/40 md:p-9">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
            <div className="absolute -bottom-20 -left-14 h-56 w-56 rounded-full bg-cyan-400/10" />

            <div className="relative z-10 flex h-full min-h-[310px] flex-col justify-between">
              <div>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-black tracking-[0.16em]">
                  START
                </div>
                <div className="mb-3 text-lg font-bold text-blue-100">선정되는 순간</div>
                <div className="text-5xl font-black tracking-[-0.05em] md:text-6xl">
                  3개월
                  <span className="ml-2 text-[#FEE500]">무료</span>
                </div>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="mb-1 text-xs font-bold text-blue-100">시작 조건</div>
                  <div className="font-black">현재 규모보다 성장 의지</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="mb-1 text-xs font-bold text-blue-100">재평가</div>
                  <div className="font-black">지원 종료 때마다 동일 기준</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-white/[0.07] p-6 shadow-2xl shadow-black/20 backdrop-blur-md md:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <div className="mb-1 text-sm font-black text-sky-300">평가 기준</div>
                <h3 className="text-2xl font-black text-white md:text-3xl">최근 3개월 월평균 출고량</h3>
              </div>
              <div className="hidden h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 sm:flex">
                <TrendingUp className="h-6 w-6 text-[#FEE500]" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <div className="text-sm text-slate-400">예시</div>
                <div className="mt-1 font-black text-white">1,400 → 1,500 → 1,600건</div>
                <div className="mt-1 text-sm font-bold text-emerald-300">월평균 1,500건 인정</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <div className="text-sm text-slate-400">반짝 실적 방지</div>
                <div className="mt-1 font-black text-white">1,500 → 50 → 50건</div>
                <div className="mt-1 text-sm font-bold text-rose-300">월평균 약 533건</div>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#FEE500]/20 bg-[#FEE500]/10 p-4 text-sm leading-relaxed text-yellow-50 break-keep">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#FEE500]" />
              지원기간은 서로 더해서 계산하지 않고, 재평가 시 달성한 최고 기준 1개를 적용합니다.
            </div>
          </div>
        </div>

        <div className="relative mb-8 rounded-[32px] border border-white/10 bg-white p-5 shadow-2xl shadow-black/25 md:p-8">
          <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-black text-primary">GROWTH ROADMAP</div>
              <h3 className="text-2xl font-black tracking-[-0.03em] text-slate-950 md:text-3xl">출고량이 올라갈수록 지원이 길어집니다</h3>
            </div>
            <div className="text-sm font-bold text-slate-400">최근 3개월 월평균 기준</div>
          </div>

          <div className="relative">
            <div className="absolute left-[7%] right-[7%] top-[52px] hidden h-[3px] rounded-full bg-gradient-to-r from-sky-200 via-cyan-300 to-emerald-300 lg:block" />

            <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {growthSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.threshold}
                    className={`group relative overflow-hidden rounded-[24px] border bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                      step.featured
                        ? "border-teal-200 shadow-lg"
                        : "border-slate-200 shadow-sm"
                    } ${step.glow}`}
                  >
                    <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${step.accent}`} />
                    <div className="mb-5 flex items-center justify-between">
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${step.badge}`}>
                        STEP 0{index + 2}
                      </span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700 transition-colors group-hover:bg-slate-900 group-hover:text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mb-1 flex items-end gap-1">
                      <span className="text-4xl font-black tracking-[-0.05em] text-slate-950">{step.threshold}</span>
                      <span className="pb-1 text-sm font-black text-slate-400">건/월</span>
                    </div>
                    <div className="mb-5 text-sm font-bold text-slate-500">{step.label}</div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-lg font-black text-slate-950">{step.support}</div>
                      {step.extra && (
                        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-teal-600 px-3 py-1.5 text-xs font-black text-white shadow-sm">
                          <Sparkles className="h-3.5 w-3.5" />
                          {step.extra}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-white via-slate-50 to-blue-50 p-5 shadow-2xl shadow-black/20 md:p-8">
          <div className="mb-8 grid gap-5 lg:grid-cols-[1fr_330px] lg:items-end">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 text-sm font-black text-primary">
                <Building2 className="h-4 w-4" />
                OFFICE LEVEL UP
              </div>
              <h3 className="text-2xl font-black tracking-[-0.03em] text-slate-950 md:text-4xl">사업이 커지면, 사무실도 같이 커집니다</h3>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 md:text-base break-keep">
                최근 3개월 월평균 1,500건부터 사무실 업그레이드 대상이 됩니다. 기준을 달성했다고 판단되면 센터장에게 확인을 요청해주세요.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-600 shadow-sm break-keep">
              <strong className="text-slate-950">공실 상황에 따라 순차 적용</strong><br />
              실제 출고량 확인 후 현재 지원 공간을 기준으로 업그레이드합니다.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {officeGrades.map((grade, index) => (
              <div key={grade.name} className="relative">
                <div className="h-full rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <RoomVisual window={grade.window} wide={grade.wide} seats={grade.seats} />

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="mb-1 text-xs font-black tracking-[0.15em] text-slate-400">LEVEL 0{index + 1}</div>
                      <div className="text-lg font-black text-slate-950">{grade.name}</div>
                    </div>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full ${index >= 2 ? "bg-teal-600 text-white" : "bg-blue-50 text-primary"}`}>
                      {index + 1}
                    </div>
                  </div>
                </div>

                {index < officeGrades.length - 1 && (
                  <div className="absolute -right-[14px] top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm lg:flex">
                    <ArrowRight className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <div className="mb-1 font-black text-slate-950">1,500건 이상</div>
              12개월 추가 지원 + 사무실 1단계 업그레이드
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <div className="mb-1 font-black text-slate-950">2,000건 이상</div>
              12개월 추가 지원 + 사무실 2단계 업그레이드
            </div>
            <div className="rounded-2xl border border-slate-900 bg-slate-950 p-4 text-sm text-slate-300">
              <div className="mb-1 font-black text-white">재평가도 동일하게</div>
              지원기간 종료 시 최근 3개월 월평균으로 기간과 사무실 등급을 다시 적용합니다.
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 text-sm leading-relaxed text-slate-300 backdrop-blur break-keep">
          <Users className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#FEE500]" />
          <span>
            지원기간 종료 시마다 같은 기준으로 재평가되며, 이전 평가에서 받은 추가 지원기간이나 사무실 등급이 자동으로 계속 유지되는 것은 아닙니다.
          </span>
        </div>
      </div>
    </section>
  );
}

export default function StartupCenterWithGrowthSupport() {
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const costComparison = document.getElementById("cost-comparison");
    const parent = costComparison?.parentElement;

    if (!costComparison || !parent) return;

    const existing = document.getElementById("growth-support-project-anchor");
    if (existing) {
      setPortalNode(existing);
      return;
    }

    const anchor = document.createElement("div");
    anchor.id = "growth-support-project-anchor";
    parent.insertBefore(anchor, costComparison);
    setPortalNode(anchor);

    return () => {
      anchor.remove();
    };
  }, []);

  return (
    <>
      <StartupCenter />
      {portalNode ? createPortal(<GrowthSupportProject />, portalNode) : null}
    </>
  );
}
