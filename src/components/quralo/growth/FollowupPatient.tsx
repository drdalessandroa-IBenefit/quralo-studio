import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";
import { type Patient,fullName } from "@/lib/queries";
import { DORMANT_TEMPLATE,fillTemplate,normalizePhone,whatsappUrl } from "@/lib/quralo";
import { canContact,type FollowupType } from "@/lib/followup";
import { recordFollowup } from "@/lib/followup.functions";
export function FollowupPatient({patient,days,studio}:{patient:Patient;days:number;studio:string}) {
 const {t,i18n}=useTranslation();const qc=useQueryClient();const record=useServerFn(recordFollowup);
 const [type,setType]=useState<FollowupType>("dormant"),[ongoing,setOngoing]=useState(false),[edited,setEdited]=useState<string|null>(null),[saving,setSaving]=useState(false),[pending,setPending]=useState<{type:FollowupType;openedAt:string}|null>(null);
 const template=type==="care_reminder"?t("growth.careTemplate"):(i18n.language==="it"?DORMANT_TEMPLATE:t("growth.template"));
 const message=type==="care_reminder"?fillTemplate(template,{nome:patient.first_name,studio}):edited??fillTemplate(template,{nome:patient.first_name,studio});
 const phone=normalizePhone(patient.phone);const allowed=canContact(patient.consent_marketing,type,ongoing)&&!!phone&&/^\d{11,15}$/.test(phone);
 async function log(data:{type:FollowupType;openedAt:string}) {setSaving(true);try{await record({data:{patientId:patient.id,...data}});setPending(null);toast.success(t("growth.recorded"));await qc.invalidateQueries({queryKey:["marketing_events"]});}catch{setPending(data);toast.error(t("growth.recordFailed"));}finally{setSaving(false);}}
 function open(){if(!allowed||!phone||!z.string().trim().min(1).max(1000).safeParse(message).success)return toast.error(t("common.error"));const popup=window.open(whatsappUrl(phone,message),"_blank");if(!popup)return toast.error(t("growth.popup"));popup.opener=null;void log({type,openedAt:new Date().toISOString()});}
 return <article className="rounded-lg border bg-card p-4"><div className="mb-3 flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">{fullName(patient)}</h3><p className="text-sm text-muted-foreground">{t("growth.lastVisit",{count:days})}</p></div><Select value={type} onValueChange={v=>{if(v==="dormant"||v==="care_reminder")setType(v);}}><SelectTrigger className="w-full sm:w-56" aria-label={t("growth.message")}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="dormant">{t("growth.retention")}</SelectItem><SelectItem value="care_reminder">{t("growth.care")}</SelectItem></SelectContent></Select></div><Label htmlFor={`msg-${patient.id}`}>{t("growth.message")}</Label><Textarea id={`msg-${patient.id}`} className="mt-2 min-h-28" value={message} readOnly={type==="care_reminder"} maxLength={1000} onChange={e=>setEdited(e.target.value)}/>{type==="care_reminder"&&<div className="mt-3 space-y-2"><p className="text-xs text-muted-foreground">{t("growth.neutral")}</p><label className="flex items-center gap-2 text-sm"><Checkbox checked={ongoing} onCheckedChange={v=>setOngoing(v===true)}/>{t("growth.ongoing")}</label></div>}{!patient.consent_marketing&&type==="dormant"&&<p className="mt-3 text-sm text-warning">{t("growth.consent")}</p>}{!phone&&<p className="mt-2 text-sm text-destructive">{t("growth.phone")}</p>}<div className="mt-3 flex flex-wrap items-center gap-3"><Button disabled={!allowed||saving||!!pending} onClick={open}><MessageCircle/>{t("growth.open")}</Button><Button asChild variant="link" className="h-auto whitespace-normal p-0"><Link to="/pazienti/$patientId" params={{patientId:patient.id}}>{t("growth.profile")}</Link></Button>{pending&&<Button variant="outline" disabled={saving} onClick={()=>log(pending)}>{t("growth.retryLog")}</Button>}</div></article>;
}
