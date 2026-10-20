import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { consumePublicRateLimit } from "../../../../../lib/security/public-rate-limit";
export const runtime = "nodejs";

type Body = {
  category?: unknown; description?: unknown; urgency?: unknown; address?: unknown; neighborhood?: unknown;
  referencePoint?: unknown; latitude?: unknown; longitude?: unknown; eventAt?: unknown; trackingPin?: unknown;
  reporterName?: unknown; reporterPhone?: unknown; reporterEmail?: unknown; website?: unknown;
};

const textOrNull=(v:unknown,max:number)=>typeof v==="string"&&v.trim()?v.trim().slice(0,max):null;

export async function POST(request:Request){
  const allowed=await consumePublicRateLimit(request,"report-submit",20,3600);
  if(allowed===false) return NextResponse.json({error:"Muitas tentativas. Aguarde e tente novamente."},{status:429});
  if(allowed===null) return NextResponse.json({error:"Serviço temporariamente indisponível."},{status:503});
  let b:Body; try{b=await request.json();}catch{return NextResponse.json({error:"Solicitação inválida."},{status:400});}
  if(typeof b.website==="string"&&b.website.trim()) return NextResponse.json({error:"Solicitação inválida."},{status:400});
  if(typeof b.category!=="string"||!b.category.trim()||typeof b.description!=="string"||b.description.trim().length<10||b.description.trim().length>5000)
    return NextResponse.json({error:"Dados da denúncia inválidos."},{status:400});
  if(!["LOW","MEDIUM","HIGH"].includes(String(b.urgency))) return NextResponse.json({error:"Urgência inválida."},{status:400});
  if(typeof b.trackingPin!=="string"||!/^[0-9]{6}$/.test(b.trackingPin)) return NextResponse.json({error:"PIN inválido."},{status:400});
  if(typeof b.eventAt!=="string"||Number.isNaN(Date.parse(b.eventAt))) return NextResponse.json({error:"Data inválida."},{status:400});
  if(typeof b.address!=="string"||!b.address.trim()||typeof b.neighborhood!=="string"||!b.neighborhood.trim())
    return NextResponse.json({error:"Localização inválida."},{status:400});
  const latitude=typeof b.latitude==="number"&&Number.isFinite(b.latitude)?b.latitude:null;
  const longitude=typeof b.longitude==="number"&&Number.isFinite(b.longitude)?b.longitude:null;
  try{
    const supabase=createAdminClient();
    const {data,error}=await supabase.rpc("vortex_submit_public_report_with_upload",{
      p_category_slug:b.category.trim(),p_description:b.description.trim(),p_urgency:String(b.urgency),
      p_address:b.address.trim().slice(0,500),p_neighborhood:b.neighborhood.trim().slice(0,160),
      p_reference_point:textOrNull(b.referencePoint,500),p_latitude:latitude,p_longitude:longitude,p_event_at:b.eventAt,
      p_tracking_pin:b.trackingPin,p_reporter_name:textOrNull(b.reporterName,160),p_reporter_phone:textOrNull(b.reporterPhone,30),
      p_reporter_email:textOrNull(b.reporterEmail,254)
    });
    if(error||!data?.[0]?.protocol||!data[0]?.upload_token) return NextResponse.json({error:"Não foi possível registrar a denúncia."},{status:500});
    return NextResponse.json(data[0],{status:201});
  }catch{return NextResponse.json({error:"Serviço indisponível."},{status:503});}
}
