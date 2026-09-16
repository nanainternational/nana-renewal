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
    support: "6개월 추가 지원",
    extra: "",
    icon: TrendingUp,
    featured: false,
  },
  {
    threshold: "1,000",
    support: "12개월 추가 지원",
    extra: "",
    icon: TrendingUp,
    featured: false,
  },
  {
    threshold: "1,500",
    support: "12개월 추가 지원",
    extra: "사무실 1단계 업그레이드",
    icon: Sparkles,
    featured: true,
  },
  {
    threshold: "2,000",
    support: "12개월 추가 지원",
    extra: "사무실 2단계 업그레이드",
    icon: Trophy,
    featured: true,
  },
  {
    threshold: "3,000",
    support: "12개월 추가 지원",
    extra: "사무실 3단계 업그레이드",
    icon: Trophy,
    featured: true,
  },
];

const officeGrades = [
  {
    name: "1인실 내측",
    level: "기본 지원 공간",
    condition: "선정 시 기본 배정",
    window: false,
    wide: false,
    seats: 1,
  },
  {
    name: "1인실 창측",
    level: "1단계 업그레이드",
    condition: "월평균 1,500건 이상",
    window: true,
    wide: false,
    seats: 1,
  },
  {
    name: "1~2인실 내측",
    level: "2단계 업그레이드",
    condition: "월평균 2,000건 이상",
    window: false,
    wide: true,
    seats: 2,
  },
  {
    name: "3~4인실",
    level: "3단계 업그레이드",
    condition: "월평균 3,000건 이상",
    window: true,
    wide: true,
    seats: 4,
  },
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
    <div className="relative h-36 overflow-hidden bg-gradient-to-b from-[#f8fafc] to-[#eef2f7]">
      <div className="absolute inset-x-0 bottom-0 h-9 bg-[#e2e8f0]" />

      {window && (
        <div className="absolute right-5 top-5 h-16 w-24 rounded-md border-2 border-sky-100 bg-gradient-to-b from-sky-100 to-white shadow-inner">
          <div className="absolute left-1/2 top-0 h-full w-px bg-sky-200" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-sky-200" />
        </div>
      )}

      <div className="absolute left-5 top-6 h-12 w-8 rounded-t-full bg-emerald-50">
        <div className="absolute left-0 top-2 h-4 w-4 -rotate-12 rounded-full bg-emerald-300" />
        <div className="absolute right-0 top-1 h-4 w-4 rotate-12 rounded-full bg-emerald-400" />
        <div className="absolute bottom-0 left-1/2 h-7 w-1 -translate-x-1/2 bg-emerald-500" />
      </div>

      <div
        className={`absolute bottom-10 left-1/2 -translate-x-1/2 rounded-md border border-slate-200 bg-white shadow-md ${
          wide ? "h-5 w-36" : "h-5 w-24"
        }`}
      />
      <div className="absolute bottom-5 left-1/2 h-6 w-1 -translate-x-1/2 bg-slate-400" />

      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
        {Array.from({ length: Math.min(seats, 4) }).map((_, index) => (
          <div key={index} className="relative h-8 w-6">
            <div className="absolute left-1/2 top-0 h-5 w-5 -translate-x-1/2 rounded-t-lg bg-slate-500" />
            <div className="absolute bottom-0 left-1/2 h-4 w-1 -translate-x-1/2 bg-slate-500" />
          </div>
        ))}
      </div>
    </div>
  );
}

function GrowthSupportProject() {
  return (
    <section className="border-y border-gray-100 bg-gray-50 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mx-auto mb-12 max-w-4xl text-center md:mb-16">
          <span className="mb-5 inline-flex items-center rounded-full border border-primary/15 bg-white px-4 py-1.5 text-sm font-bold text-primary shadow-sm">
            <Sparkles className="mr-2 h-4 w-4" />
            성장지원 프로젝트
          </span>

          <h2 className="mb-5 text-3xl font-bold tracking-[-0.04em] text-gray-900 md:text-5xl break-keep">
            3개월 무료로 시작하고,
            <br className="md:hidden" />
            <span className="text-primary"> 성장한 만큼 더 지원합니다.</span>
          </h2>

          <p className="mx-auto max-w-3xl text-base leading-relaxed text-gray-500 md:text-xl break-keep">
            현재 매출이나 출고량보다 실제 성장 과정을 봅니다.
            선정된 입주사는 먼저 3개월간 무료로 이용하고,
            지원기간 종료 시마다 최근 3개월 월평균 출고량으로 동일하게 재평가합니다.
          </p>
        </div>

        <div className="mb-7 grid grid-cols-1 gap-5 lg:grid-cols-[0.72fr_2.28fr]">
          <div className="relative overflow-hidden rounded-3xl border-2 border-primary bg-white p-7 shadow-xl shadow-primary/10 md:p-8">
            <span className="absolute right-0 top-0 rounded-bl-xl bg-primary px-4 py-1.5 text-xs font-bold text-white">
              START
            </span>

            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="h-7 w-7" />
            </div>

            <p className="mb-2 text-sm font-bold text-gray-400">선정 시 기본 지원</p>
            <div className="mb-2 text-5xl font-black tracking-[-0.05em] text-gray-900">
              3개월
            </div>
            <div className="text-2xl font-black text-primary">사무실 무료 지원</div>

            <div className="mt-8 border-t border-gray-100 pt-5 text-sm leading-relaxed text-gray-500 break-keep">
              처음 시작하는 사업자도 동일하게 3개월의 성장 기회를 제공합니다.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {growthSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.threshold}
                  className={`relative flex min-h-[275px] flex-col rounded-3xl bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    step.featured
                      ? "border-2 border-primary/70 shadow-lg shadow-primary/5"
                      : "border border-gray-200 shadow-sm"
                  }`}
                >
                  {step.featured && (
                    <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-black text-white">
                      UPGRADE
                    </span>
                  )}

                  <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-50 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>

                  <p className="mb-1 text-xs font-bold text-gray-400">최근 3개월 월평균</p>
                  <div className="mb-1 flex items-end gap-1">
                    <strong className="text-3xl font-black tracking-[-0.05em] text-gray-900">
                      {step.threshold}
                    </strong>
                    <span className="pb-1 text-xs font-bold text-gray-400">건 이상</span>
                  </div>

                  <div className="mt-auto border-t border-gray-100 pt-5">
                    <p className="text-base font-black text-gray-900">{step.support}</p>
                    {step.extra && (
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-black text-primary">
                        <Check className="h-3.5 w-3.5" />
                        {step.extra}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-14 rounded-2xl border border-gray-200 bg-white px-5 py-4 md:px-6">
          <div className="grid gap-4 md:grid-cols-2 md:divide-x md:divide-gray-100">
            <div className="md:pr-5">
              <p className="mb-1 text-sm font-black text-gray-900">평가 예시</p>
              <p className="text-sm leading-relaxed text-gray-500">
                1,400 → 1,500 → 1,600건이면 최근 3개월 월평균은
                <strong className="ml-1 text-primary">1,500건</strong>으로 인정됩니다.
              </p>
            </div>
            <div className="md:pl-5">
              <p className="mb-1 text-sm font-black text-gray-900">한 달 반짝 실적은 제외</p>
              <p className="text-sm leading-relaxed text-gray-500">
                1,500 → 50 → 50건이면 월평균은 약 533건으로 계산되어
                1,500건 기준에는 해당하지 않습니다.
              </p>
            </div>
          </div>
          <p className="mt-4 border-t border-gray-100 pt-4 text-xs leading-relaxed text-gray-400">
            ※ 추가 지원기간은 중복 합산하지 않으며, 재평가 시 달성한 최고 기준 1개를 적용합니다.
          </p>
        </div>

        <div className="mb-12 text-center">
          <span className="mb-4 inline-flex items-center rounded-full bg-white px-4 py-1.5 text-sm font-bold text-primary shadow-sm ring-1 ring-gray-100">
            OFFICE UPGRADE
          </span>
          <h3 className="mb-3 text-3xl font-bold text-gray-900 md:text-4xl">
            사업이 커지면, <span className="text-primary">사무실도 함께 커집니다.</span>
          </h3>
          <p className="text-base text-gray-500 md:text-lg break-keep">
            업그레이드 단계와 실제 이용 사무실을 아래처럼 동일하게 적용합니다.
          </p>
        </div>

        <div className="relative mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {officeGrades.map((grade, index) => (
            <div key={grade.name} className="relative">
              <div className={`overflow-hidden rounded-3xl bg-white shadow-sm transition-all hover:shadow-lg ${
                index === 3 ? "border-2 border-primary" : "border border-gray-200"
              }`}>
                {index === 3 && (
                  <div className="bg-primary px-4 py-2 text-center text-xs font-black text-white">
                    3단계 업그레이드 = 3~4인실
                  </div>
                )}
                <RoomVisual window={grade.window} wide={grade.wide} seats={grade.seats} />
                <div className="p-5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-black text-white">
                      {index + 1}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-black text-primary">
                      {grade.level}
                    </span>
                  </div>
                  <h4 className="mb-2 text-xl font-black text-gray-900">{grade.name}</h4>
                  <p className="text-sm font-bold text-gray-500">{grade.condition}</p>
                </div>
              </div>

              {index < officeGrades.length - 1 && (
                <div className="absolute -right-[15px] top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white p-1.5 text-primary shadow-sm lg:flex">
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mb-6 rounded-2xl border border-primary/20 bg-white px-5 py-5 md:px-7 md:py-6">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
              <div className="text-xs font-bold text-gray-400">1단계</div>
              <div className="mt-1 font-black text-gray-900">1,500건 → 1인실 창측</div>
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
              <div className="text-xs font-bold text-gray-400">2단계</div>
              <div className="mt-1 font-black text-gray-900">2,000건 → 1~2인실 내측</div>
            </div>
            <div className="rounded-xl bg-primary/10 px-4 py-3 text-center ring-1 ring-primary/20">
              <div className="text-xs font-bold text-primary">3단계</div>
              <div className="mt-1 font-black text-primary">3,000건 → 3~4인실</div>
            </div>
          </div>
          <p className="mt-4 text-center text-xs leading-relaxed text-gray-400 break-keep">
            ※ 업그레이드는 센터장 확인 후 실제 출고량을 확인하여 적용하며, 해당 사무실 공실 상황에 따라 순차적으로 진행됩니다.
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-5 py-5 md:px-7 md:py-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="mb-1 font-black text-gray-900">지원기간 종료 시마다 같은 기준으로 다시 평가합니다.</p>
              <p className="text-sm leading-relaxed text-gray-600 md:text-base break-keep">
                최초 3개월뿐 아니라 추가 6개월·12개월 지원이 끝나는 시점에도 최근 3개월 월평균 출고량을 다시 확인합니다.
                재평가 결과에 따라 다음 지원기간과 사무실 등급이 다시 결정되며, 이전 평가 결과가 자동으로 유지되지는 않습니다.
              </p>
            </div>
          </div>
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
