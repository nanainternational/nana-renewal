export type HappyOrderInput = { orderNo:string; customerName:string; phone:string; productName:string; productOption:string; deliveredOn:string };
function csvRows(text:string) {
  const rows:string[][]=[]; let row:string[]=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"' && quoted && text[i+1]==='"'){cell+='"';i++;}
    else if(c==='"') quoted=!quoted;
    else if(c===','&&!quoted){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  row.push(cell);if(row.some(Boolean))rows.push(row);
  if(quoted)throw new Error('CSV의 따옴표 형식을 확인해주세요.');
  return rows;
}
async function excelRows(file:File) {
  const {default:JSZip}=await import('jszip');
  const zip=await JSZip.loadAsync(await file.arrayBuffer());
  const parser=new DOMParser();
  const strings=zip.file('xl/sharedStrings.xml');
  const shared=strings?Array.from(parser.parseFromString(await strings.async('text'),'application/xml').getElementsByTagName('si')).map(n=>n.textContent||''):[];
  const sheet=Object.keys(zip.files).filter(p=>/^xl\/worksheets\/sheet\d+\.xml$/.test(p)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))[0];
  if(!sheet)throw new Error('엑셀의 첫 번째 시트를 확인해주세요.');
  return Array.from(parser.parseFromString(await zip.file(sheet)!.async('text'),'application/xml').getElementsByTagName('row')).map(row=>{
    const values:string[]=[];
    for(const cell of Array.from(row.getElementsByTagName('c'))){
      const letters=(cell.getAttribute('r')||'A1').replace(/\d/g,'');
      const index=Array.from(letters).reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1;
      const value=cell.getElementsByTagName('v')[0]?.textContent||'';
      values[index]=cell.getAttribute('t')==='s'?shared[Number(value)]||'':cell.getElementsByTagName('is')[0]?.textContent??value;
    }
    return values;
  });
}
function dateText(raw:string) {
  const text=String(raw||'').trim();
  if(/^\d{5}(\.\d+)?$/.test(text))return new Date(Date.UTC(1899,11,30)+Math.floor(Number(text))*86400000).toISOString().slice(0,10);
  const match=text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\s|T|$)/);
  return match?`${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`:text;
}
export async function importHappyOrders(file:File):Promise<HappyOrderInput[]> {
  if(file.size>5*1024*1024)throw new Error('5MB 이하의 파일을 사용해주세요.');
  const rows=/\.xlsx$/i.test(file.name)?await excelRows(file):/\.csv$/i.test(file.name)?csvRows((await file.text()).replace(/^\uFEFF/,'')):(()=>{throw new Error('XLSX 또는 UTF-8 CSV 파일을 사용해주세요.');})();
  if(!rows.length)throw new Error('파일이 비어 있습니다.');
  const headers=rows[0].map(v=>String(v||'').replace(/\s/g,'').toLowerCase());
  const column=(names:string[],required=true)=>{const index=headers.findIndex(v=>names.includes(v));if(index<0&&required)throw new Error(`'${names[0]}' 열이 필요합니다.`);return index;};
  const indexes={orderNo:column(['주문번호','orderno']),customerName:column(['구매자명','수취인명','customername'],false),phone:column(['전화번호','휴대폰번호','phone']),productName:column(['상품명','productname']),productOption:column(['옵션','사이즈','productoption'],false),deliveredOn:column(['배송완료일','deliveredon'])};
  const data=rows.slice(1).filter(row=>row.some(v=>String(v||'').trim()));
  if(data.length>1000)throw new Error('한 번에 최대 1,000건을 등록할 수 있습니다.');
  return data.map(row=>Object.fromEntries(Object.entries(indexes).map(([name,index])=>[name,name==='deliveredOn'?dateText(row[index]):String(row[index]||'').trim()])) as HappyOrderInput);
}
