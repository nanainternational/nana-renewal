import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Mail, Phone, Calendar, Bell, LogOut, User, Copy, Check, ChevronDown, ChevronUp, Building2, Loader2, Trash2 } from "lucide-react";
import { SiGoogle, SiKakaotalk } from "react-icons/si";

type MyOrderItem = {
  id: string;
  title: string;
  name?: string | null;
  seller?: string | null;
  thumb?: string | null;
  option?: string | null;
  amount?: string | number | null;
  source_url?: string | null;
  order_source_url?: string | null;
  product_url: string | null;
  quantity: number;
  price: string | number | null;
  options?: Record<string, any> | null;
};



type BusinessCertificate = {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
};

type BusinessProfile = {
  companyName: string;
  businessRegistrationNumber: string;
  representativeName: string;
  businessAddress: string;
  businessCategory?: string;
  taxInvoiceEmail: string;
  contactNumber: string;
  updatedAt?: string;
  certificate?: BusinessCertificate | null;
};

type BusinessProfileForm = {
  companyName: string;
  businessRegistrationNumber: string;
  representativeName: string;
  businessAddress: string;
  businessCategory: string;
  taxInvoiceEmail: string;
  contactNumber: string;
};

const EMPTY_BUSINESS_FORM: BusinessProfileForm = {
  companyName: "",
  businessRegistrationNumber: "",
  representativeName: "",
  businessAddress: "",
  businessCategory: "",
  taxInvoiceEmail: "",
  contactNumber: "",
};

type MyOrder = {
  id: string;
  order_no: string;
  status:
    | "PENDING_PAYMENT"
    | "PAYMENT_CONFIRMED"
    | "CN_CENTER_INBOUND"
    | "CN_CENTER_RECEIVED"
    | "KR_CENTER_INBOUND"
    | "KR_CENTER_RECEIVED"
    | string;
  created_at: string;
  total_payable?: string | number | null;
  shipping_fee?: string | number | null;
  items?: MyOrderItem[];
  item_count?: number;
  total_quantity?: number;
};

const ORDER_STEPS = [
  "입금전",
  "입금확인",
  "중국센터 입고중",
  "중국센터 입고완료",
  "한국센터 입고중",
  "한국센터 입고완료",
] as const;

const ORDER_STATUS_TO_STEP_INDEX: Record<string, number> = {
  PENDING_PAYMENT: 0,
  PAYMENT_CONFIRMED: 1,
  CN_CENTER_INBOUND: 2,
  CN_CENTER_RECEIVED: 3,
  KR_CENTER_INBOUND: 4,
  KR_CENTER_RECEIVED: 5,
};



function formatPrice(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return parsed.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

function resolveImgSrc(src?: string | null) {
  const raw = String(src || "").trim();
  if (!raw) return "";
  let u = raw;
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        u = String(parsed[0] || "").trim();
      }
    } catch {
      u = raw;
    }
  }
  if (!u) return "";
  if (u.startsWith("//")) u = `https:${u}`;
  else if (u.startsWith("/")) u = `https://detail.1688.com${u}`;
  else if (u.includes("1688.com") && !/^https?:\/\//i.test(u)) u = `https://${u.replace(/^\/+/, "")}`;

  if (u.includes("alicdn.com")) {
    return `${API_BASE}/api/proxy/image?url=${encodeURIComponent(u)}`;
  }
  return u;
}


function getOptionLabel(item: MyOrderItem) {
  if (item.option) return item.option;
  const opts = item.options;
  if (!opts || typeof opts !== "object") return "기본";
  const values = Object.values(opts).map((v) => String(v || "").trim()).filter(Boolean);
  return values.join(" ") || "기본";
}

function getOrderTotalAmount(items: MyOrderItem[], totalPayable?: string | number | null) {
  const payableRaw = String(totalPayable ?? "").trim();
  if (payableRaw) {
    const payable = Number(payableRaw.replace(/[^0-9.\-]/g, ""));
    if (Number.isFinite(payable)) {
      return payable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }

  let sum = 0;
  const rows = Array.isArray(items) ? items : [];
  for (const item of rows) {
    const cleaned = String(item?.amount ?? item?.price ?? "").replace(/[^0-9.\-]/g, "");
    const v = parseFloat(cleaned);
    if (Number.isFinite(v)) sum += v;
  }
  return sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


function resolveProductUrl(item: MyOrderItem) {
  const candidates = [item.source_url, item.order_source_url, item.product_url]
    .map((v) => String(v || "").trim())
    .filter(Boolean);

  const normalizedList: string[] = [];
  for (const candidate of candidates) {
    let normalized = candidate;
    if (candidate.startsWith("//")) normalized = `https:${candidate}`;
    else if (candidate.startsWith("/")) normalized = `https://detail.1688.com${candidate}`;
    else if (candidate.includes("1688.com") && !/^https?:\/\//i.test(candidate)) normalized = `https://${candidate.replace(/^\/+/, "")}`;

    try {
      const u = new URL(normalized);
      const p = u.searchParams;
      const embedded = p.get("detailUrl") || p.get("detail_url") || p.get("detailLink") || p.get("offerLink") || p.get("offer_link") || p.get("productUrl") || p.get("product_url") || p.get("url") || p.get("href");
      const offerId = p.get("offerId") || p.get("offer_id") || p.get("itemId");
      if (embedded) normalizedList.push(String(embedded));
      if (offerId && /^\d+$/.test(offerId)) normalizedList.push(`https://detail.1688.com/offer/${offerId}.html`);
    } catch {
      // ignore
    }

    normalizedList.push(normalized);
  }

  for (const normalized of normalizedList) {
    const lower = normalized.toLowerCase();
    const isDetail = lower.includes("detail.1688.com") || lower.includes("/offer/") || lower.includes("offer/");
    if (isDetail) return normalized;
  }

  for (const normalized of normalizedList) {
    const lower = normalized.toLowerCase();
    const isMyPage = lower.includes("buyertrade") || lower.includes("member.1688.com") || lower.includes("/order/") || lower.includes("/my");
    if (!isMyPage && /^https?:\/\//i.test(normalized)) return normalized;
  }
  return "";
}


function getShippingFeeAmount(shippingFee?: string | number | null) {
  const raw = String(shippingFee ?? "").trim();
  if (!raw) return "0.00";
  const parsed = Number(raw.replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(parsed)) return "0.00";
  return parsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatOrderNo(orderNo: string) {
  const normalized = String(orderNo || "").trim();
  const matched = normalized.match(/^CP(\d{8})(\d{4})$/);
  if (!matched) return normalized || "-";
  return `CP-${matched[1]}-${matched[2]}`;
}

export default function MyPage() {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();

  const [accountId, setAccountId] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(true);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [businessForm, setBusinessForm] = useState<BusinessProfileForm>(EMPTY_BUSINESS_FORM);
  const [businessError, setBusinessError] = useState<string>("");
  const [businessSuccess, setBusinessSuccess] = useState<string>("");
  const [businessLoading, setBusinessLoading] = useState<boolean>(true);
  const [businessSaving, setBusinessSaving] = useState<boolean>(false);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [removeCertificate, setRemoveCertificate] = useState<boolean>(false);

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [user, loading, setLocation]);

  useEffect(() => {
    if (loading || !user) return;

    (async () => {
      try {
        const r = await fetch("/api/wallet", { credentials: "include" });
        const j = await r.json();
        if (j?.ok && typeof j?.user_id === "string") {
          setAccountId(j.user_id);
        }
      } catch {
        // ignore
      }
    })();
  }, [user, loading]);

  useEffect(() => {
    if (loading || !user) return;

    (async () => {
      try {
        setOrdersLoading(true);
        const r = await fetch("/api/orders/my", { credentials: "include" });
        const j = await r.json();
        if (j?.ok && Array.isArray(j?.rows)) {
          setOrders(j.rows);
        }
      } catch {
        setOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    })();
  }, [user, loading]);


  useEffect(() => {
    if (loading || !user) return;

    (async () => {
      try {
        setBusinessLoading(true);
        const response = await fetch(`${API_BASE}/api/business-profile`, { credentials: "include" });
        const data = await response.json();
        if (response.ok && data?.ok) {
          setBusinessProfile(data.business || null);
          syncBusinessForm(data.business || null);
        }
      } catch {
        setBusinessProfile(null);
      } finally {
        setBusinessLoading(false);
      }
    })();
  }, [loading, user]);
  useEffect(() => {
    if (loading || !user) return;
    if (window.location.hash !== "#progress") return;

    const el = document.getElementById("progress");
    if (!el) return;
    window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, [user, loading]);

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const handleCopy = async () => {
    if (!accountId) return;
    try {
      await navigator.clipboard.writeText(accountId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };



  const toggleOrderItems = (orderId: string) => {
    setExpandedOrderIds((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const syncBusinessForm = (business: BusinessProfile | null) => {
    if (!business) {
      setBusinessForm(EMPTY_BUSINESS_FORM);
      return;
    }
    setBusinessForm({
      companyName: business.companyName || "",
      businessRegistrationNumber: business.businessRegistrationNumber || "",
      representativeName: business.representativeName || "",
      businessAddress: business.businessAddress || "",
      businessCategory: business.businessCategory || "",
      taxInvoiceEmail: business.taxInvoiceEmail || "",
      contactNumber: business.contactNumber || "",
    });
  };

  const handleBusinessInput = (field: keyof BusinessProfileForm, value: string) => {
    setBusinessForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateBusinessForm = () => {
    const required = [
      ["상호명", businessForm.companyName],
      ["사업자등록번호", businessForm.businessRegistrationNumber],
      ["대표자명", businessForm.representativeName],
      ["사업장 주소", businessForm.businessAddress],
      ["세금계산서 이메일", businessForm.taxInvoiceEmail],
      ["연락처", businessForm.contactNumber],
    ] as const;

    const missing = required.find(([, v]) => !String(v || "").trim());
    if (missing) return `${missing[0]}은(는) 필수입니다.`;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(businessForm.taxInvoiceEmail.trim())) return "세금계산서 이메일 형식이 올바르지 않습니다.";

    return "";
  };

  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("file_read_failed"));
      reader.readAsDataURL(file);
    });

  const handleBusinessSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusinessError("");
    setBusinessSuccess("");

    const validationError = validateBusinessForm();
    if (validationError) {
      setBusinessError(validationError);
      return;
    }

    try {
      setBusinessSaving(true);
      const payload: any = { ...businessForm, removeCertificate };
      if (certificateFile) {
        payload.certificateFile = {
          name: certificateFile.name,
          type: certificateFile.type,
          dataUrl: await readAsDataUrl(certificateFile),
        };
      }

      const response = await fetch(`${API_BASE}/api/business-profile`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) throw new Error(data?.error || "save_failed");
      setBusinessProfile(data.business || null);
      syncBusinessForm(data.business || null);
      setCertificateFile(null);
      setRemoveCertificate(false);
      setBusinessSuccess(businessProfile ? "사업자 정보가 수정되었습니다." : "사업자 정보가 등록되었습니다.");
    } catch (error: any) {
      setBusinessError(error?.message || "사업자 정보 저장 중 오류가 발생했습니다.");
    } finally {
      setBusinessSaving(false);
    }
  };

  const handleCertificateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCertificateFile(file);
    if (file) setRemoveCertificate(false);
  };

  const handleCertificateRemove = () => {
    setCertificateFile(null);
    setRemoveCertificate(true);
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-pulse text-muted-foreground">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-10">
        <div className="max-w-[1440px] mx-auto space-y-8">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl font-bold" data-testid="text-mypage-title">
                    마이페이지
                  </CardTitle>
                  <CardDescription data-testid="text-mypage-description">
                    회원 정보를 확인하고 관리하세요
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex items-center gap-6 mb-8">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={user.profileImage} alt={user.name} />
                  <AvatarFallback className="text-2xl">{user.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold" data-testid="text-user-name">
                    {user.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    {user.provider === "google" ? (
                      <Badge variant="secondary" className="gap-1" data-testid="badge-provider">
                        <SiGoogle className="w-3 h-3" />
                        Google
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="gap-1 bg-[#FEE500] text-[#3C1E1E]"
                        data-testid="badge-provider"
                      >
                        <SiKakaotalk className="w-3 h-3" />
                        Kakao
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">이메일</p>
                    <p className="font-medium" data-testid="text-user-email">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">계정 ID</p>
                      <p className="font-medium break-all" data-testid="text-user-id">
                        {accountId || "-"}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleCopy}
                    disabled={!accountId}
                    data-testid="button-copy-user-id"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "복사됨" : "복사"}
                  </Button>
                </div>

                {user.phone && (
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">전화번호</p>
                      <p className="font-medium" data-testid="text-user-phone">
                        {user.phone}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">가입일</p>
                    <p className="font-medium" data-testid="text-user-created">
                      {formatDate(user.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">마케팅 수신 동의</p>
                    <p className="font-medium" data-testid="text-user-marketing">
                      {user.agreeMarketing ? "동의함" : "동의하지 않음"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card id="progress" className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-bold">중국사입 진행상황</CardTitle>
              <CardDescription>
                단계별 진행상황을 확인하세요. 관리자 승인된 현재 단계는 깜빡이며 표시됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div id="order-history" className="space-y-3">
                {ordersLoading ? (
                  <p className="text-sm text-muted-foreground">진행상황을 불러오는 중입니다...</p>
                ) : orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    아직 접수된 중국사입 요청이 없습니다. 견적 요청 후 이곳에서 상태를 확인할 수 있습니다.
                  </p>
                ) : (
                  orders.map((order) => {
                    const activeStep = ORDER_STATUS_TO_STEP_INDEX[order.status] ?? 0;
                    return (
                      <div key={order.id} className="rounded-xl border border-gray-200 p-5 lg:p-6 bg-muted/20 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold">{formatOrderNo(order.order_no)}</p>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-xs"
                              onClick={() => toggleOrderItems(order.id)}
                            >
                              발주내역
                              {expandedOrderIds[order.id] ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                            </Button>
                            <Badge className="animate-pulse">{ORDER_STEPS[activeStep]}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">요청일: {formatDate(order.created_at)}</p>
                        {expandedOrderIds[order.id] && !!order.items?.length && (
                          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                            <div className="grid grid-cols-12 gap-3 bg-[#FAFAFA] py-3.5 px-5 text-xs text-gray-500 font-medium border-b border-gray-200 text-center">
                              <div className="col-span-6 text-left pl-2">상품정보</div>
                              <div className="col-span-2">옵션</div>
                              <div className="col-span-2">수량</div>
                              <div className="col-span-2">금액(위안)</div>
                            </div>
                            <div className="divide-y divide-gray-100">
                              {order.items.map((item) => {
                                const productUrl = resolveProductUrl(item);
                                const thumbUrl = resolveImgSrc(item.thumb);
                                return (
                                <div key={item.id} className="grid grid-cols-12 gap-3 p-5 items-center hover:bg-[#FFFDFB] transition-colors group">
                                  <div className="col-span-6 flex gap-4 text-left">
                                    <div className="relative shrink-0 border border-gray-200 rounded-sm overflow-hidden w-20 h-20 bg-gray-50">
                                      {thumbUrl ? (
                                        <img src={thumbUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                      ) : (
                                        <div className="flex items-center justify-center w-full h-full text-xs text-gray-300">No Img</div>
                                      )}
                                    </div>
                                    <div className="flex flex-col justify-center gap-1 pr-4 min-w-0">
                                      <div className="text-xs text-[#FF5000] font-medium">{item.seller || "1688 Seller"}</div>
                                      <div className="flex items-center gap-2 min-w-0">
                                        {productUrl ? (
                                          <a href={productUrl} target="_blank" rel="noreferrer" className="text-sm text-gray-800 line-clamp-2 leading-snug hover:text-[#FF5000] hover:underline underline-offset-2 transition-colors">
                                            {item.name || item.title || "상품명 정보 없음"}
                                          </a>
                                        ) : (
                                          <p className="text-sm text-gray-800 line-clamp-2 leading-snug">{item.name || item.title || "상품명 정보 없음"}</p>
                                        )}
                                        {productUrl ? (
                                          <a
                                            href={productUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="shrink-0 text-[11px] font-bold text-[#FF5000] border border-[#FFD9C7] bg-[#FFF4EE] rounded px-2 py-0.5 hover:bg-[#FFE7DB]"
                                          >
                                            링크
                                          </a>
                                        ) : (
                                          <span className="shrink-0 text-[11px] font-bold text-gray-400 border border-gray-200 bg-gray-50 rounded px-2 py-0.5">
                                            링크 없음
                                          </span>
                                        )}
                                      </div>
                                      {productUrl && <div className="text-[11px] text-gray-400 break-all">{productUrl}</div>}
                                    </div>
                                  </div>
                                  <div className="col-span-2 flex justify-center">
                                    <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1.5 rounded text-center break-keep leading-tight">
                                      {getOptionLabel(item)}
                                    </div>
                                  </div>
                                  <div className="col-span-2 text-center text-sm font-medium text-gray-700">{item.quantity ?? 1}</div>
                                  <div className="col-span-2 text-center">
                                    <span className="text-sm font-bold text-[#FF5000]">¥ {formatPrice(item.amount ?? item.price)}</span>
                                  </div>
                                </div>
                                );
                              })}
                            </div>
                            <div className="bg-[#FAFAFA] border-t border-gray-200 px-5 py-4.5 flex items-center justify-end gap-10">
                              <div className="text-sm text-gray-500">선택 상품 <span className="text-[#FF5000] font-bold mx-1">{order.total_quantity ?? order.item_count ?? order.items.length}</span>종</div>
                              <div className="flex flex-col items-end gap-1">
                                <div className="text-base text-gray-600">할인 & 배송비: <span className="font-semibold text-gray-800">¥ {getShippingFeeAmount(order.shipping_fee)}</span></div>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-base font-medium text-gray-600">총 결제예정 금액:</span>
                                  <span className="text-4xl font-bold text-[#FF5000] font-mono tracking-tight whitespace-nowrap tabular-nums">
                                    <span className="text-lg mr-1">¥</span>{getOrderTotalAmount(order.items || [], order.total_payable)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {ORDER_STEPS.map((stepLabel, idx) => {
                            const isDone = idx < activeStep;
                            const isCurrent = idx === activeStep;
                            return (
                              <div
                                key={`${order.id}-${stepLabel}`}
                                className={[
                                  "rounded-md border px-2 py-2 text-xs text-center",
                                  isCurrent ? "border-blue-500 text-blue-700 bg-blue-50 animate-pulse" : "",
                                  !isCurrent && isDone ? "border-green-300 text-green-700 bg-green-50" : "",
                                  !isCurrent && !isDone ? "border-gray-200 text-gray-500 bg-white" : "",
                                ].join(" ")}
                              >
                                {stepLabel}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">사업자/세금계산서 정보</CardTitle>
                  <CardDescription>회원정보에 1회 저장 후 수정 가능합니다.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {businessLoading ? (
                <div className="text-sm text-muted-foreground">불러오는 중...</div>
              ) : (
                <div className="space-y-4">
                  {!businessProfile && (
                    <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">사업자 정보를 등록해주세요</div>
                  )}

                  <form onSubmit={handleBusinessSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input className="border rounded-md px-3 py-2 text-sm" placeholder="상호명 *" value={businessForm.companyName} onChange={(e) => handleBusinessInput("companyName", e.target.value)} />
                    <input className="border rounded-md px-3 py-2 text-sm" placeholder="사업자등록번호 * (숫자/하이픈)" value={businessForm.businessRegistrationNumber} onChange={(e) => handleBusinessInput("businessRegistrationNumber", e.target.value)} />
                    <input className="border rounded-md px-3 py-2 text-sm" placeholder="대표자명 *" value={businessForm.representativeName} onChange={(e) => handleBusinessInput("representativeName", e.target.value)} />
                    <input className="border rounded-md px-3 py-2 text-sm" placeholder="사업장 주소 *" value={businessForm.businessAddress} onChange={(e) => handleBusinessInput("businessAddress", e.target.value)} />
                    <input className="border rounded-md px-3 py-2 text-sm" placeholder="업태/종목 (선택)" value={businessForm.businessCategory} onChange={(e) => handleBusinessInput("businessCategory", e.target.value)} />
                    <input className="border rounded-md px-3 py-2 text-sm" placeholder="세금계산서 이메일 *" value={businessForm.taxInvoiceEmail} onChange={(e) => handleBusinessInput("taxInvoiceEmail", e.target.value)} />
                    <input className="border rounded-md px-3 py-2 text-sm md:col-span-2" placeholder="연락처 * (숫자/하이픈)" value={businessForm.contactNumber} onChange={(e) => handleBusinessInput("contactNumber", e.target.value)} />

                    <div className="md:col-span-2 space-y-2 rounded-md border p-3">
                      <div className="text-sm font-medium">사업자등록증 첨부</div>
                      {businessProfile?.certificate && !removeCertificate && !certificateFile && (
                        <div className="flex items-center gap-2 text-sm">
                          <span>{businessProfile.certificate.originalName}</span>
                          <Button type="button" variant="outline" size="sm" onClick={handleCertificateRemove} className="gap-1"><Trash2 className="w-3 h-3" />삭제</Button>
                        </div>
                      )}
                      <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleCertificateChange} />
                      {certificateFile && <div className="text-xs text-muted-foreground">선택 파일: {certificateFile.name}</div>}
                    </div>

                    {businessError && <div className="md:col-span-2 text-sm text-red-600">{businessError}</div>}
                    {businessSuccess && <div className="md:col-span-2 text-sm text-green-600">{businessSuccess}</div>}

                    <div className="md:col-span-2">
                      <Button type="submit" disabled={businessSaving} className="gap-2">
                        {businessSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {businessProfile ? "저장" : "등록"}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            variant="outline"
            size="lg"
            className="w-full md:w-auto md:min-w-[220px] justify-center gap-2"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
