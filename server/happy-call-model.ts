export const DEFAULT_SUPPORT_TEXT = '상품에 이상이 있거나 불편한 점이 있으시면 이 번호로 편하게 답장 주세요. 확인 후 안내해 드리겠습니다.';
export const normalizeHappyPhone = (value: unknown) => String(value || '').replace(/\D/g, '');
export function plainText(value: unknown, max: number, required = true) {
  const text = String(value ?? '').trim();
  if ((required && !text) || text.length > max || /https?:|www\.|[\u0000-\u0008]/i.test(text)) throw new Error('입력 내용을 확인해주세요. 링크는 사용할 수 없습니다.');
  return text;
}
export function validateHappyOrder(input: any, now = new Date()) {
  const phone = normalizeHappyPhone(input.phone);
  const deliveredOn = String(input.deliveredOn || '').trim();
  const date = new Date(`${deliveredOn}T00:00:00+09:00`);
  const today = new Date(now.getTime() + 9 * 3600000).toISOString().slice(0,10);
  if (!/^01\d{8,9}$/.test(phone)) throw new Error('휴대전화번호를 확인해주세요. 안심번호는 사용할 수 없습니다.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deliveredOn) || !Number.isFinite(date.getTime()) || new Date(date.getTime() + 9 * 3600000).toISOString().slice(0,10) !== deliveredOn || deliveredOn > today || now.getTime() - date.getTime() > 180 * 86400000) throw new Error('배송완료일은 오늘까지 최근 180일 이내로 입력해주세요.');
  return { orderNo: plainText(input.orderNo,100), customerName: plainText(input.customerName,80,false), phone,
    productName: plainText(input.productName,200), productOption: plainText(input.productOption,100,false), deliveredOn };
}
export function happyMessage(settings: any, order: any) {
  return `안녕하세요, ${settings.store_name}입니다.\n구매하신 ${order.product_name}${order.product_option ? ` ${order.product_option}` : ''} 상품은 잘 받아보셨나요?\n\n${settings.support_text}`;
}
export function happySchedule(deliveredOn: string, days: number, hour: number, now = new Date()) {
  const time = new Date(`${deliveredOn}T${String(hour).padStart(2,'0')}:00:00+09:00`);
  time.setUTCDate(time.getUTCDate() + days);
  // Overdue imports go to the next configured daily slot; never send immediately.
  if (time.getTime() <= now.getTime()) {
    const localDay = new Date(now.getTime() + 9 * 3600000).toISOString().slice(0,10);
    time.setTime(new Date(`${localDay}T${String(hour).padStart(2,'0')}:00:00+09:00`).getTime());
    if (time.getTime() <= now.getTime()) time.setUTCDate(time.getUTCDate()+1);
  }
  return time;
}
