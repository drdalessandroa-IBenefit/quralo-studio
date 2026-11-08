import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";
import { apptsLiteQuery,patientsQuery,profileQuery,referralQuery,fullName } from "@/lib/queries";
import { isDormant,normalizePhone } from "@/lib/quralo";
import { Empty,ErrorBox,Loading,Section } from "../common";
import { FollowupPatient } from "./FollowupPatient";
export function GrowthTab(){const {t}=useTranslation();const [threshold,setThreshold]=useState(90);const p=useQuery(patientsQuery),a=useQuery(apptsLiteQuery),profile=useQuery(profileQuery),r=useQuery(referralQuery);const queries=[p,a,profile,r];const failed=queries.find(q=>q.isError);if(failed)return <ErrorBox error={failed.error} onRetry={()=>{queries.forEach(q=>void q.refetch());}}/>;if(queries.some(q=>q.isLoading))return <Loading/>;
 const now=Date.now(),appts=a.data??[],dormant=(p.data??[]).filter(patient=>isDormant(appts,patient.id,now,threshold));const reachable=dormant.filter(p=>p.consent_marketing&&/^\d{11,15}$/.test(normalizePhone(p.phone)??"")).length;const blocked=dormant.filter(p=>!p.consent_marketing).length;
 return <div className="space-y-5"><Section title={t("growth.title")} action={<Select value={String(threshold)} onValueChange={v=>setThreshold(Number(v))}><SelectTrigger aria-label={t("growth.threshold")} className="w-44"><SelectValue/></SelectTrigger><SelectContent>{[30,60,90,120].map(d=><SelectItem key={d} value={String(d)}>{t("growth.days",{count:d})}</SelectItem>)}</SelectContent></Select>}><p className="mb-4 text-sm font-medium">{t("growth.summary",{total:dormant.length,reachable,blocked})}</p>{!dormant.length?<Empty>{t("growth.empty")}</Empty>:<div className="space-y-3">{dormant.map(patient=>{const last=Math.max(...appts.filter(a=>a.patient_id===patient.id&&a.status!=="cancelled").map(a=>new Date(a.start_time).getTime()));return <FollowupPatient key={patient.id} patient={patient} days={Math.floor((now-last)/86400000)} studio={profile.data?.studio_name||profile.data?.full_name||t("growth.practice")}/>;})}</div>}</Section><Section title={t("growth.referral")}>{!r.data?.length?<Empty>{t("growth.noCodes")}</Empty>:<ul className="divide-y">{r.data.map(code=><li key={code.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm text-muted-foreground">{p.data?.find(p=>p.id===code.patient_id)?fullName(p.data.find(p=>p.id===code.patient_id) as NonNullable<typeof p.data>[number]):""}</p><span className="font-mono font-semibold">{code.code}</span></div><Button variant="outline" onClick={async()=>{try{await navigator.clipboard.writeText(code.code);toast.success(t("common.copied"));}catch{toast.error(t("common.error"));}}}><Copy/>{t("common.copy")}</Button></li>)}</ul>}</Section></div>;
}
