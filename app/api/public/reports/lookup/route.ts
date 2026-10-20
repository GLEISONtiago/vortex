import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { consumePublicRateLimit } from "../../../../../lib/security/public-rate-limit";
export const runtime = "nodejs";
export async function POST(request:Request){
  const allowed=await consumePublicRateLimit(request,"report-lookup",30,60);
  if(allowed===false) return NextResponse.json({error:"Muitas tentativas. Aguarde e tente novamente."},{status:429});
  if(allowed===null) return NextResponse.json({error:"Serviço temporariamente indisponível."},{status:503});
  let b:{protocol?:unknown;pin?:unknown}; try{b=await request.json();}catch{return NextResponse.json({error:"Solicitação inválida."},{status:400});}
  if(typeof b.protocol!=="string"||b.protocol.trim().length<8||b.protocol.trim().length>40||typeof b.pin!=="string"||!/^[0-9]{6}$/.test(b.pin))
    return NextResponse.json({error:"Dados de acompanhamento inválidos."},{status:400});
  try{
    const {data,error}=await createAdminClient().rpc("vortex_get_public_report_by_protocol_pin",{p_protocol:b.protocol.trim(),p_tracking_pin:b.pin});
    if(error||!data?.[0]) return NextResponse.json({error:"Denúncia não localizada."},{status:404});
    return NextResponse.json(data[0]);
  }catch{return NextResponse.json({error:"Serviço indisponível."},{status:503});}
}
