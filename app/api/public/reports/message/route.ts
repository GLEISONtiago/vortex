import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { consumePublicRateLimit } from "../../../../../lib/security/public-rate-limit";
export const runtime = "nodejs";
export async function POST(request:Request){
  const allowed=await consumePublicRateLimit(request,"report-message",20,60);
  if(allowed===false) return NextResponse.json({error:"Muitas tentativas. Aguarde e tente novamente."},{status:429});
  if(allowed===null) return NextResponse.json({error:"Serviço temporariamente indisponível."},{status:503});
  let b:{protocol?:unknown;pin?:unknown;message?:unknown}; try{b=await request.json();}catch{return NextResponse.json({error:"Solicitação inválida."},{status:400});}
  if(typeof b.protocol!=="string"||b.protocol.trim().length<8||b.protocol.trim().length>40||typeof b.pin!=="string"||!/^[0-9]{6}$/.test(b.pin)||typeof b.message!=="string"||b.message.trim().length<2||b.message.trim().length>2000)
    return NextResponse.json({error:"Mensagem inválida."},{status:400});
  try{
    const {data,error}=await createAdminClient().rpc("vortex_send_public_report_message",{p_protocol:b.protocol.trim(),p_tracking_pin:b.pin,p_message:b.message.trim()});
    if(error||!data) return NextResponse.json({error:"Não foi possível enviar a mensagem."},{status:400});
    return NextResponse.json({sent:true});
  }catch{return NextResponse.json({error:"Serviço indisponível."},{status:503});}
}
