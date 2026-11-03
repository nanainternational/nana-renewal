import { createHmac } from "node:crypto";

class ImportError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function imageUrl(raw: unknown) {
  if (typeof raw !== "string" || !raw.trim()) return "";
  const value = raw.trim().replace(/&amp;/g, "&");
  try {
    const u = new URL(value, "https://cbu01.alicdn.com/");
    if (!["https:", "http:"].includes(u.protocol) || !/(^|\.)(alicdn\.com|1688\.com|alibaba\.com)$/.test(u.hostname)) return "";
    u.protocol = "https:";
    return u.href;
  } catch { return ""; }
}

export async function officialProduct(input: unknown, member: string) {
  const match = typeof input === "string" && /^https:\/\/detail\.1688\.com\/offer\/(\d{1,15})\.html(?:[?#].*)?$/i.exec(input.trim());
  if (!match) throw new ImportError(400, "1688 상품의 원본 주소(detail.1688.com/offer/숫자.html)를 입력해 주세요.");
  const id = match[1];
  const { ALI1688_APP_KEY: key, ALI1688_APP_SECRET: secret, ALI1688_ACCESS_TOKEN: token } = process.env;
  if (!key || !secret || !token) throw new ImportError(503, "1688 API 인증 설정이 필요합니다. 지금은 확장프로그램으로 가져올 수 있습니다.");
  const path = `param2/1/com.alibaba.fenxiao.crossborder/product.search.queryProductDetail/${key}`;
  const form = new URLSearchParams({
    access_token: token,
    offerDetailParam: JSON.stringify({ offerId: Number(id), country: "en", outMemberId: member }),
  });
  const sign = path + Array.from(form).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => k + v).join("");
  form.set("_aop_signature", createHmac("sha1", secret).update(sign).digest("hex").toUpperCase());
  const response = await fetch("https://gw.open.1688.com/openapi/" + path, {
    method: "POST", body: form, signal: AbortSignal.timeout(18000), redirect: "error",
  });
  const data = await response.json();
  if (!response.ok || data.error_code || data.success === false || data.result?.success === false)
    throw new ImportError(502, "1688이 상품 조회를 거절했습니다. 상품 공개 여부와 API 권한·토큰을 확인해 주세요.");
  const product = data.result?.result ?? data.result;
  if (product?.offerId && String(product.offerId) !== id) throw new ImportError(502, "1688 응답의 상품 번호가 일치하지 않습니다.");
  const html = String(product?.description || "");
  const images = product?.productImage?.images;
  const main = Array.isArray(images) ? images.map(imageUrl).filter(Boolean) : [];
  const detail = Array.from(html.matchAll(/<img\b[^>]*?\s(?:data-lazy-src|data-src|src)\s*=\s*["']([^"']+)["']/gi), m => imageUrl(m[1])).filter(Boolean);
  const description = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
  if (!main.length && !detail.length && !description) throw new ImportError(422, "1688에서 이 상품의 상세 이미지나 본문을 제공하지 않았습니다. 확장프로그램 가져오기를 이용해 주세요.");
  const groups = new Map<string, Map<string, { label: string; img: string }>>();
  for (const sku of product.productSkuInfos || []) {
    for (const attr of sku.skuAttributes || []) {
      const title = attr.attributeNameTrans || attr.attributeName;
      const label = attr.valueTrans || attr.value;
      if (!title || !label) continue;
      if (!groups.has(title)) groups.set(title, new Map());
      groups.get(title)!.set(label, { label, img: imageUrl(attr.skuImageUrl) });
    }
  }
  return { ok: true, url: `https://detail.1688.com/offer/${id}.html`,
    product_name: product.subjectTrans || product.subject || "", description,
    main_media: [...new Set(main)], detail_media: [...new Set(detail)],
    sku_groups: Array.from(groups, ([title, options]) => ({ title, items: [...options.values()] })),
    price: product.productSaleInfo?.priceRangeList?.[0]?.price ?? "",
  };
}
