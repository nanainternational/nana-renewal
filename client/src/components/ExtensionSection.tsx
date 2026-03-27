import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Download, HelpCircle } from "lucide-react";

const quickFeatures = [
  {
    title: "Astro + Tailwind CSS Integration",
    desc: "Sample copy for feature description. Replace this with your real product explanation.",
  },
  {
    title: "Best Practices",
    desc: "Sample copy for process and reliability. Keep the structure, swap only text later.",
  },
  {
    title: "Excellent Page Speed",
    desc: "Sample copy for speed and quality claims. This section is intentionally placeholder.",
  },
  {
    title: "SEO Ready",
    desc: "Sample copy for search optimization details. You can edit all text afterward.",
  },
];

const componentCards = [
  "Headers",
  "Hero",
  "Features",
  "Content",
  "Call-To-Action",
  "Pricing",
  "Testimonial",
  "Contact",
  "Footers",
];

const faqItems = [
  {
    q: "Why AstroWind?",
    a: "Sample answer text for FAQ item. Replace with your product's exact explanation later.",
  },
  {
    q: "What do I need to start?",
    a: "Sample answer text for setup requirements and onboarding flow.",
  },
  {
    q: "How to install this template?",
    a: "Sample answer text for installation guide. Keep this two-column FAQ layout.",
  },
  {
    q: "What if I don't understand something?",
    a: "Sample answer text for support response and troubleshooting guidance.",
  },
];

export default function ExtensionSection() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navigation />

      <section id="extension" className="relative overflow-hidden pb-20 pt-24 md:pb-28 md:pt-28">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-white" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-5xl pb-14 pt-6 text-center md:pb-20 md:pt-10">
            <Badge className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-600">
              Landing Template Style
            </Badge>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-slate-950 md:text-6xl">
              Sample headline for creating
              <br className="hidden sm:block" /> websites with Astro-style layout
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-slate-600 md:text-lg">
              샘플 본문 텍스트입니다. 나중에 실제 서비스 소개 문구로 교체하세요. 구조와 여백은 Astrowind 랜딩페이지
              톤에 맞춰 정리했습니다.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-11 rounded-full bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <a
                  href="https://github.com/nanainternational/nana-renewal/releases/latest/download/nana-1688-extractor.zip"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Getting Started
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 rounded-full border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <a href="/chinapurchase">
                  Learn more
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          <Card className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
            <div className="aspect-[16/9] w-full bg-gradient-to-br from-blue-100 via-cyan-100 to-violet-100" />
          </Card>

          <div className="mx-auto mt-6 max-w-5xl rounded-xl bg-slate-100 px-4 py-3 text-center text-xs text-slate-500 md:text-sm">
            (Sample notice bar) Philosophy · Simplicity · Best Practices · High Performance
          </div>

          <div className="mx-auto mt-16 max-w-5xl text-center md:mt-24">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">What you get with AstroWind</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">Sample section title</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">
              샘플 설명 텍스트입니다. 실제 서비스의 핵심 메시지로 교체해서 사용하세요.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            {quickFeatures.map((item) => (
              <Card key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-blue-600 p-1.5 text-white">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 md:text-base">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="mx-auto mt-20 max-w-5xl space-y-14 md:mt-28 md:space-y-20">
            <div className="grid items-center gap-8 md:grid-cols-2 md:gap-10">
              <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 shadow-lg" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Made to simplify</p>
                <h3 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">
                  AstroWind's Blueprint: Sample content block
                </h3>
                <ul className="mt-5 space-y-3">
                  {["Built on modern stack", "Styled with utility classes", "Cross-browser support"].map((text) => (
                    <li key={text} className="flex items-start gap-2 text-sm text-slate-600 md:text-base">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid items-center gap-8 md:grid-cols-2 md:gap-10">
              <div className="order-2 md:order-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Easy workflow</p>
                <h3 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">Get your page up and running quickly</h3>
                <ol className="mt-5 space-y-3 text-sm text-slate-600 md:text-base">
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-600">1.</span> Step 1 sample text — replace with actual instruction.
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-600">2.</span> Step 2 sample text — replace with actual instruction.
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-600">3.</span> Step 3 sample text — replace with actual instruction.
                  </li>
                </ol>
              </div>
              <div className="order-1 aspect-[4/3] rounded-2xl bg-gradient-to-br from-amber-100 to-rose-100 shadow-lg md:order-2" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-100 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Components</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">Most used widgets</h2>
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {componentCards.map((name) => (
              <Card key={name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm font-bold text-slate-900">{name}</div>
                <p className="mt-2 text-sm text-slate-600">Sample text for this widget card. Replace freely.</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">FAQs</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">Frequently Asked Questions</h2>
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-2 md:gap-5">
            {faqItems.map((item) => (
              <Card key={item.q} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-2">
                  <HelpCircle className="mt-0.5 h-4 w-4 text-blue-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 md:text-base">{item.q}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-4 text-center md:grid-cols-4">
            {[
              ["132K", "Downloads"],
              ["24.8K", "Stars"],
              ["10.3K", "Forks"],
              ["48.4K", "Users"],
            ].map(([num, label]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-3xl font-black text-blue-600">{num}</div>
                <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">{label}</div>
              </div>
            ))}
          </div>

          <Card className="mx-auto mt-12 max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg md:p-10">
            <h3 className="text-2xl font-extrabold tracking-tight md:text-3xl">Astro + Tailwind CSS</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600 md:text-base">
              Sample closing CTA text. 이 문구도 나중에 실제 문구로 교체해서 사용하세요.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                asChild
                className="h-11 rounded-full bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <a
                  href="https://github.com/nanainternational/nana-renewal/releases/latest/download/nana-1688-extractor.zip"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get started now
                </a>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-full border-slate-300 px-6 text-sm font-semibold">
                <a href="/chinapurchase">Customize text later</a>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
