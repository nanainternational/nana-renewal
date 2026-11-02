import { useState } from "react";
import Navigation from "@/components/Navigation";
import { API_BASE } from "@/lib/queryClient";

type Section = {heading:string; copy:string; image:string};
type Draft = {title:string; sections:Section[]; images:number};

export default function WomensStudio() {
  const [url,setUrl]=useState("");
  const [draft,setDraft]=useState<Draft|null>(null);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState("");
  const [choice,setChoice]=useState("");
  const [replacements,setReplacements]=useState<Record<number,string>>({});
  async function renew(){
    setBusy(true);setStatus("상품 본문과 사진을 읽고 새 상세페이지를 작성하고 있어요.");
    try {
      const res=await fetch(API_BASE+"/api/vvic/women/renew",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({url})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error || "분석에 실패했습니다.");
      setDraft(data);setChoice("");setReplacements({});setStatus("초안이 준비됐어요. 사진은 어떻게 할까요?");
    } catch(e){setStatus(e instanceof Error?e.message:"다시 시도해 주세요.");}
    finally{setBusy(false);}
  }
  function photo(s:Section,i:number){return (choice==="replace" && replacements[i]) || s.image;}
  function download(){
    if(!draft)return;
    const dom=document.implementation.createHTMLDocument(draft.title);
    const add=(tag:string,value:string)=>{const el=dom.createElement(tag);el.textContent=value;dom.body.append(el);};
    add("h1",draft.title);
    for(const [i,s] of draft.sections.entries()){
      add("h2",s.heading);add("p",s.copy);
      if(photo(s,i)){const img=dom.createElement("img");img.src=photo(s,i);img.style.maxWidth="100%";dom.body.append(img);}
    }
    dom.body.style.cssText="max-width:800px;margin:40px auto;padding:16px;font-family:sans-serif;line-height:1.7";
    const href=URL.createObjectURL(new Blob(["<!doctype html><meta charset=utf-8>",dom.documentElement.outerHTML],{type:"text/html"}));
    const a=document.createElement("a");a.href=href;a.download="여성의류-상세페이지.html";a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
  }
  return <><Navigation/><main className="max-w-3xl mx-auto px-5 py-24 space-y-6">
    <h1 className="text-3xl font-bold">여성의류 상세페이지</h1><p>참고할 에이블리 상품 주소를 넣어 주세요. 사진과 설명을 살펴보고 새로운 구성과 문구를 작성해요.</p>
    <form className="flex flex-wrap gap-2" onSubmit={e=>{e.preventDefault();void renew();}}>
      <input required type="url" aria-label="에이블리 상품 주소" placeholder="https://mobile.a-bly.com/goods/…" className="border rounded p-3 flex-1 min-w-0" value={url} onChange={e=>setUrl(e.target.value)}/>
      <button disabled={busy} className="bg-black text-white rounded px-4">{busy?"작성 중…":"분석하고 리뉴얼"}</button>
    </form><p role="status">{status}</p>
    {draft && !busy && <><div className="flex gap-3">{[["keep","추천 사진 유지"],["replace","내 사진으로 교체"]].map(([k,label])=><button key={k} aria-pressed={choice===k} className={choice===k?"border rounded p-2 bg-black text-white":"border rounded p-2"} onClick={()=>setChoice(k)}>{label}</button>)}</div>
    <h2 className="text-2xl font-bold">{draft.title}</h2>{draft.sections.map((s,i)=><section key={i} className="border rounded-xl p-5 space-y-3">
    <h3 className="text-xl font-semibold">{s.heading}</h3><p>{s.copy}</p>{photo(s,i)&&<img alt={s.heading} className="max-h-96 mx-auto" src={photo(s,i)}/>}
    {choice==="replace"&&<label className="block">이 섹션 사진 교체 <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f){const reader=new FileReader();reader.onload=()=>setReplacements(old=>({...old,[i]:String(reader.result)}));reader.readAsDataURL(f);}}}/></label>}</section>)}
    {choice&&<button className="bg-black text-white p-3 rounded" onClick={download}>상세페이지 HTML 저장</button>}</>}
    </main></>;
}
