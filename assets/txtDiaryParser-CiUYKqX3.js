function g(r,a){const o=[],l=r.split(/\n---\n|\n\n\n+/);for(const d of l){const t=d.trim().split(`
`);if(t.length===0)continue;const n=t[0].match(/^(\d{4})[-.](\d{2})[-.](\d{2})/);if(!n)continue;const h=n[1],u=n[2],f=n[3],e=`${h}-${u}-${f}`;let c="",i="",s=1;t.length>1&&t[1].length<50&&!t[1].includes(".")&&(c=t[1].trim(),s=2),i=t.slice(s).join(`
`).trim(),o.push({userId:a,date:e,title:c,content:i,tags:[],createdAt:new Date(e).toISOString(),updatedAt:new Date(e).toISOString()})}return o}export{g as parseTxtDiary};
