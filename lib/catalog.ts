export type Logo={id:string;name:string;category:string;area:number|null;rt:number|null;url:string;builtin?:boolean;sourceRect?:[number,number,number,number]};
export const originals:Logo[]=[{id:"rti",name:"Round Table India",category:"Official",area:null,rt:null,url:"/logos/rti.png",builtin:true,sourceRect:[216,336,792,864]},{id:"area18",name:"Area 18",category:"Area",area:18,rt:null,url:"/logos/area18.png",builtin:true,sourceRect:[175,335,873,866]}];
export function matchesLogo(logo:Logo,area:string,rt:string,category:string){return (area==='All'||logo.area===null||logo.area===Number(area))&&(rt==='All'||logo.rt===null||logo.rt===Number(rt))&&(category==='All'||logo.category===category);}
export function logoScope(logo:Pick<Logo,'category'|'area'|'rt'>){
  const parts=[logo.category];
  if(logo.area)parts.push('Area '+logo.area);
  if(logo.rt)parts.push('RT '+logo.rt);
  return parts.join(' · ');
}
export function groupedLogos(logos:Logo[]){
  return (['Official','Area','Table','Chairman'] as const)
    .map(category=>({category,items:logos.filter(l=>l.category===category).slice().sort((a,b)=>(a.area??0)-(b.area??0)||(a.rt??0)-(b.rt??0)||a.name.localeCompare(b.name))}))
    .filter(group=>group.items.length);
}
