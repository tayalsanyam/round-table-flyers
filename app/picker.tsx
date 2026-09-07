'use client';
import { Select,SelectTrigger,SelectValue,SelectContent,SelectItem } from '@/components/ui/select';
export default function Pick({value,onChange,items,label}:{value:string;onChange:(v:string)=>void;items:string[][];label:string}){
  return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="picker"><SelectValue/></SelectTrigger><SelectContent>{items.map(([v,t])=><SelectItem key={v} value={v}>{t}</SelectItem>)}</SelectContent></Select>;
}
