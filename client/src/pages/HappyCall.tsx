import { ArrowDown, ArrowUpRight, Check, HeartHandshake, Laptop, MessageCircle, PackageCheck, ShieldCheck, Smartphone } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SeoHead from "@/components/SeoHead";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  { icon: PackageCheck, number: "01", title: "잘 도착했는지", text: "구매한 상품과 옵션을 짚어, 고객이 상품을 잘 받았는지 확인합니다." },
  { icon: MessageCircle, number: "02", title: "불편한 점은 없는지", text: "불량이나 누락, 사용 중 불편을 편하게 답장할 수 있도록 안내합니다." },
  { icon: HeartHandshake, number: "03", title: "해결까지 이어지도록", text: "고객의 답장을 확인하고 교환·반품·AS 등 필요한 후속 안내로 이어갑니다." },
];
const faqs = [
  ["어떻게 시작하나요?", "홈페이지에 로그인하고 ‘내 해피콜’에서 주문을 등록합니다. 상점명과 문구를 설정하고, 해피콜 전용 APK를 설치한 업무폰을 연결한 뒤 예약할 주문을 선택합니다. 초기에는 전체 발송이 중지되어 있으며 직접 켜야 발송됩니다."],
  ["고객정보는 어디에 저장하나요?", "구매자와 주문정보는 서버를 통해 Supabase에 보관하며 로그인한 판매자의 데이터만 조회·관리하도록 분리합니다. 주소·결제정보는 가져오지 않습니다. 주문정보는 등록 후 180일 보관하며 먼저 삭제할 수도 있습니다."],
  ["PC와 휴대폰은 계속 켜두어야 하나요?", "PC 프로그램은 필요하지 않습니다. 브라우저를 닫아도 서버가 예약을 관리합니다. 실제 문자 발송에는 안드로이드 업무폰과 회선·인터넷 연결이 필요합니다. 7일 이상 지연된 예약은 자동 취소하며, 결과가 불확실한 문자는 자동 재발송하지 않습니다."],
  ["문자 답장은 누가 응대하나요?", "판매자가 업무폰에서 고객의 답장을 확인하고 직접 응대하는 방식입니다. 자동으로 상담을 완료하는 서비스는 아닙니다."],
  ["신상품이나 할인 링크도 보내나요?", "기본 해피콜은 구매 상품의 수령 확인과 불편 해결에 집중합니다. 신상품·할인 홍보와 재구매 유도 링크를 자동 삽입하지 않습니다. 실제 발송 문구와 고객정보 이용 범위는 별도로 확인해야 합니다."],
];

export default function HappyCall() {
  const { user } = useAuth();
  return <div className="min-h-screen bg-[#faf9f6] text-slate-900">
    <SeoHead title="해피콜서비스 | 나나인터내셔널" description="판매 후에도 이어지는 세심한 고객 케어. 구매 상품의 수령 확인과 불편 해결을 돕는 웹 기반 해피콜서비스입니다." canonical="https://nanainter.com/happy-call" jsonLd={{ "@context": "https://schema.org", "@type": "WebPage", name: "나나 해피콜서비스", url: "https://nanainter.com/happy-call" }} />
    <Navigation />
    <main>
      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-32 md:grid-cols-2 md:items-center md:gap-16 md:pb-28 md:pt-44">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-800"><span className="h-2 w-2 rounded-full bg-teal-600" /> 해피콜서비스 · 웹 관리 베타</span>
          <p className="mb-4 mt-8 text-xs font-semibold tracking-[0.22em] text-teal-700">NANA AFTERCARE</p>
          <h1 className="text-4xl font-semibold leading-[1.3] tracking-tight md:text-5xl">판매의 끝에서,<br />신뢰가 시작됩니다.</h1>
          <p className="mt-6 max-w-md text-base leading-8 text-slate-600">“상품은 잘 받아보셨나요?”<br />작은 안부 한 번이 구매 후의 불편을 발견하고,<br className="hidden md:block" /> 고객을 끝까지 챙기는 경험으로 이어집니다.</p>
          <Link href="/happy-call/manage" className="mt-8 inline-flex items-center gap-3 rounded-full bg-teal-900 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-teal-800">{user ? '내 해피콜 관리하기' : '로그인하고 시작하기'} <ArrowUpRight className="h-4 w-4" /></Link>
          <a href="#service" className="ml-5 inline-flex items-center gap-2 text-sm text-teal-900">서비스 소개 <ArrowDown className="h-4 w-4" /></a>
          <p className="mt-4 text-xs text-slate-500">PC 설치 없이 웹에서 관리하고, 연결된 업무폰으로 발송합니다.</p>
        </div>
        <div className="relative rounded-[2rem] bg-[#e8eeea] p-6 md:p-10">
          <div className="mb-6 flex items-center justify-between text-xs text-teal-900"><span className="font-semibold tracking-widest">A LITTLE MESSAGE. A LASTING TRUST.</span><HeartHandshake className="h-6 w-6" /></div>
          <div className="mx-auto max-w-sm rounded-[2rem] border-[6px] border-white bg-[#f5f5f3] px-5 pb-8 pt-4 shadow-xl shadow-teal-950/10">
            <div className="mx-auto mb-7 h-1 w-12 rounded-full bg-slate-300" />
            <div className="mb-6 text-center"><span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-teal-900 text-sm font-semibold text-white">나나</span><p className="text-sm font-semibold">나나드레스</p><p className="mt-1 text-[11px] text-slate-500">구매 후 케어 메시지 예시</p></div>
            <div className="rounded-2xl rounded-tl-sm bg-white p-5 text-sm leading-7 shadow-sm">안녕하세요, 나나드레스입니다.<br />구매하신 슬랙스 XL 사이즈는 잘 받아보셨나요?<br /><br />상품에 이상이 있거나 불편한 점이 있으시면 이 번호로 편하게 답장 주세요. 확인 후 안내해 드리겠습니다.</div>
            <div className="ml-10 mt-4 rounded-2xl rounded-tr-sm bg-teal-900 p-4 text-sm leading-6 text-white">네, 잘 받았어요.<br />챙겨주셔서 감사합니다!</div>
          </div>
          <p className="mt-6 text-center text-xs leading-5 text-teal-900/70">이해를 돕기 위한 대화 예시입니다.</p>
        </div>
      </section>
      <section id="service" className="scroll-mt-28 border-y border-slate-200/70 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6"><p className="text-xs font-semibold tracking-widest text-teal-700">THOUGHTFUL FOLLOW-UP</p><h2 className="mt-4 text-3xl font-semibold tracking-tight">고객의 구매 다음을 챙깁니다.</h2><div className="mt-12 grid gap-8 md:grid-cols-3">{features.map(({icon: Icon, number, title, text}) => <article key={number} className="border-t border-slate-200 pt-6"><div className="flex items-center justify-between"><Icon className="h-7 w-7 text-teal-800" /><span className="text-xs text-slate-400">{number}</span></div><h3 className="mb-3 mt-6 text-xl font-semibold">{title}</h3><p className="text-sm leading-7 text-slate-600">{text}</p></article>)}</div></div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-24"><div className="grid gap-10 md:grid-cols-2"><div><ShieldCheck className="mb-5 h-9 w-9 text-teal-800" /><h2 className="text-3xl font-semibold leading-snug">고객정보는 안전하게,<br />관리는 웹에서.</h2><p className="mt-5 max-w-md text-sm leading-7 text-slate-600">구매자와 주문정보는 Supabase에 판매자별로 분리 보관합니다. 홈페이지에서 주문을 등록하고 발송 일정을 관리합니다.</p><p className="mt-3 text-xs leading-6 text-slate-500">주소·결제정보는 가져오지 않습니다. 문자 발송에는 해피콜 전용 APK와 연결된 업무폰이 필요합니다.</p></div><div className="space-y-4 rounded-3xl bg-white p-6 md:p-8">{[{icon:Laptop, title:"웹 관리 화면", body:"주문 등록 · 문구 설정 · 예약 · 발송 내역 확인"},{icon:Smartphone,title:"안드로이드 업무폰",body:"USB 없이 무선 연결 · 문자 발송 · 고객 답장 확인"},{icon:ShieldCheck,title:"판매자별 데이터 보관",body:"Supabase 저장 · 계정별 조회 및 관리"}].map(({icon:Icon,title,body})=><div key={title} className="flex gap-4 border-b border-slate-100 pb-5 last:border-0 last:pb-0"><Icon className="mt-1 h-5 w-5 shrink-0 text-teal-800" /><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{body}</p></div></div>)}</div></div></section>
      <section className="bg-teal-950 py-16 text-white"><div className="mx-auto max-w-6xl px-6"><h2 className="text-2xl font-semibold">한 번의 확인, 이어지는 책임 있는 응대.</h2><div className="mt-8 grid gap-5 text-sm text-teal-50 md:grid-cols-3">{["주문별 상품·옵션을 반영한 안내", "배송 완료를 기준으로 발송 일정 설정", "답장 이후에는 판매자가 직접 문제 해결"].map(text=><p key={text} className="flex items-start gap-3"><Check className="h-5 w-5 shrink-0 text-teal-300" />{text}</p>)}</div><p className="mt-6 text-xs text-teal-200/70">주문 등록 후 예약할 대상을 확인하고, 전체 발송을 켜면 일정에 따라 발송합니다.</p></div></section>
      <section className="mx-auto max-w-3xl px-6 py-20"><h2 className="mb-8 text-3xl font-semibold">미리 확인해 주세요.</h2>{faqs.map(([q,a])=><details key={q} className="group border-b border-slate-200 py-5"><summary className="cursor-pointer text-base font-medium leading-7">{q}</summary><p className="mt-4 text-sm leading-7 text-slate-600">{a}</p></details>)}<div className="mt-12 rounded-2xl border border-teal-100 bg-teal-50 p-6"><p className="font-semibold text-teal-950">이제 웹에서 구매 후 케어를 시작하세요.</p><p className="mt-2 text-sm leading-7 text-teal-900/80">서비스 관련 문의는 나나인터내셔널로 남겨주세요.</p><a href="mailto:nanainternational@naver.com" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-900">이메일로 문의하기 <ArrowUpRight className="h-4 w-4" /></a></div></section>
    </main>
    <Footer />
  </div>;
}
