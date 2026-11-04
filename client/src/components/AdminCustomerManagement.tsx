import { Link } from "wouter";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import CustomerManagement from "@/pages/CustomerManagement";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";

export default function AdminCustomerManagement() {
  const { isAdmin, checking, error, refetch } = useAdminAccess();
  if (isAdmin) return <CustomerManagement />;
  return <><Navigation /><main className="mx-auto max-w-xl px-6 pb-24 pt-36 text-center">
    <h1 className="text-2xl font-bold">{checking ? "관리자 권한 확인 중" : error ? "권한 확인을 완료하지 못했습니다" : "관리자 전용 페이지입니다"}</h1>
    <p className="my-5 text-muted-foreground">{checking ? "잠시만 기다려 주세요." : "고객관리는 승인된 관리자 계정으로 이용할 수 있습니다."}</p>
    {error && <Button onClick={() => refetch()} className="mr-3">다시 확인</Button>}
    {!checking && <Button variant="outline" asChild><Link href="/happy-call">해피콜서비스 보기</Link></Button>}
  </main></>;
}
