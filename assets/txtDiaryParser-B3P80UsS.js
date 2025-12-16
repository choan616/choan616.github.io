function m(i,c){const a=i.split(`
`),s=new Map;let e=null;const r=/^(\d{4})[-.\s](\d{1,2})[-.\s](\d{1,2})[.\s]*([일월화수목금토]요일?)?/;for(const t of a){const n=t.trim().match(r);if(n){const l=n[1],d=n[2].padStart(2,"0"),p=n[3].padStart(2,"0"),o=`${l}-${d}-${p}`;e={userId:c,date:o,title:"",content:"",tags:[],createdAt:new Date(o).toISOString(),updatedAt:new Date(o).toISOString()},s.set(o,e)}else e&&(e.content+=(e.content?`
`:"")+t)}return Array.from(s.values()).map(t=>{t.content=t.content.trim();const n=t.content.trim().split(`
`);return!t.title&&n.length>1&&n[0].length<50&&!n[0].endsWith(".")?(t.title=n[0],t.content=n.slice(1).join(`
`).trim()):t.content=t.content.trim(),t})}export{m as parseTxtDiary};
