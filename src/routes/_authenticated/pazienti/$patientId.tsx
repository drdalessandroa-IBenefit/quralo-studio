import { createFileRoute,Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { patientsQuery,fullName } from "@/lib/queries";
import { Empty,ErrorBox,Loading,Section } from "@/components/quralo/common";
import { LanguageSelector } from "@/components/quralo/LanguageSelector";
export const Route=createFileRoute("/_authenticated/pazienti/$patientId")({head:()=>({meta:[{title:"Scheda paziente — Quralo"},{name:"description",content:"Anagrafica e consensi del paziente in Quralo."},{property:"og:title",content:"Scheda paziente — Quralo"},{property:"og:description",content:"Anagrafica e consensi del paziente."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}),component:PatientPage});
function PatientPage(){const {t}=useTranslation();const {patientId}=Route.useParams();const q=useQuery(patientsQuery);const patient=q.data?.find(p=>p.id===patientId);return <main className="mx-auto max-w-3xl space-y-4 px-4 py-6"><div className="flex items-center justify-between"><Button asChild variant="outline"><Link to="/app">{t("common.back")}</Link></Button><LanguageSelector/></div><Section title={t("patient.title")}>{q.isLoading?<Loading/>:q.isError?<ErrorBox error={q.error} onRetry={()=>q.refetch()}/>:!patient?<Empty>{t("patient.absent")}</Empty>:<div className="space-y-3"><h1 className="text-xl font-semibold">{fullName(patient)}</h1><p>{patient.phone}</p><p className="break-all">{patient.email}</p><p>{t("patient.privacy")}: {t(patient.consent_privacy?"patient.yes":"patient.no")}</p><p>{t("patient.marketing")}: {t(patient.consent_marketing?"patient.yes":"patient.no")}</p></div>}</Section></main>;}
