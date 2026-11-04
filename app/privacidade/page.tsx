import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "../components/brand-mark";

export const metadata = {
  title: "Privacidade e proteção de dados | VÓRTEX",
  description: "Informações sobre o uso de dados no canal de denúncias VÓRTEX da GCMJP.",
};

const officialPolicy = "https://www.joaopessoa.pb.gov.br/politica-de-privacidade/";

export default function PrivacidadePage() {
  return <main className="min-h-screen bg-[#f4f7f8] text-[#102b42]">
    <header className="bg-[#092940] text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <BrandMark />
        <Link href="/" className="text-sm font-semibold text-white/85 hover:text-white">Voltar ao início</Link>
      </div>
    </header>
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <p className="text-xs font-black tracking-[.16em] text-[#0c766d]">PROTEÇÃO DE DADOS</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Privacidade no VÓRTEX</h1>
      <p className="mt-4 text-base leading-7 text-slate-600">
        Saiba quais informações são usadas para registrar, analisar e acompanhar as denúncias encaminhadas à Guarda Civil Municipal de João Pessoa (GCMJP).
      </p>
      <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        <strong>Informações operacionais em fase de homologação institucional.</strong>
        <p className="mt-1">
          Esta página descreve o funcionamento atual do VÓRTEX. As definições específicas de prazos de guarda,
          responsabilidades administrativas e regras de compartilhamento deverão ser validadas pela gestão
          municipal e pela área encarregada de proteção de dados antes da adoção institucional definitiva.
        </p>
      </div>
      <div className="mt-8 space-y-5">
        <InfoSection title="1. Finalidade do tratamento">
          <p>As informações recebidas são utilizadas para registrar o relato, permitir sua triagem, encaminhar a demanda
          ao setor responsável, documentar providências e disponibilizar informações de acompanhamento ao cidadão.</p>
          <p>O tratamento no âmbito do poder público deve atender à finalidade pública e às atribuições legais aplicáveis,
          conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p>
        </InfoSection>
        <InfoSection title="2. Informações que podem ser registradas">
          <ul className="list-disc space-y-2 pl-5">
            <li>Descrição dos fatos, categoria, urgência, local, data, horário e ponto de referência.</li>
            <li>Fotografias e outros elementos encaminhados pelo cidadão no formulário, quando disponíveis.</li>
            <li>Nome, telefone e e-mail somente se a pessoa optar por fornecê-los.</li>
            <li>Protocolo, informações de acompanhamento e mensagens trocadas com a equipe.</li>
            <li>Registros técnicos necessários à segurança e à limitação de tentativas de acesso.</li>
          </ul>
          <p>Mesmo sem identificação do denunciante, o conteúdo do relato ou das imagens pode conter dados pessoais de terceiros. Evite incluir informações não relacionadas à ocorrência.</p>
        </InfoSection>
        <InfoSection title="3. Denúncias sem identificação e acompanhamento">
          <p>É possível registrar uma denúncia sem preencher nome, telefone ou e-mail. Para acompanhar o registro,
          o cidadão cria um PIN de seis dígitos e recebe um protocolo. O PIN não é exibido à equipe e é verificado
          por meio de um resumo criptográfico armazenado pelo sistema.</p>
          <p>Guarde o protocolo e o PIN em local seguro. Não compartilhe essas credenciais: quem as possuir poderá
          consultar o acompanhamento e as comunicações do registro.</p>
        </InfoSection>
        <InfoSection title="4. Acesso e proteção">
          <p>O acesso administrativo utiliza contas autenticadas e perfis operacionais. As informações de uma denúncia
          não são publicadas integralmente no site público. A consulta individual exige protocolo e PIN; indicadores
          públicos, quando apresentados, são agregados.</p>
          <p>O sistema utiliza controles de autorização, registros de atividades e medidas técnicas de proteção.
          Isso não significa risco zero: qualquer suspeita de acesso indevido deve ser comunicada pelos canais oficiais.</p>
        </InfoSection>
        <InfoSection title="5. Compartilhamento e conservação">
          <p>O encaminhamento a grupamentos e, quando cabível, a órgãos competentes deve observar a necessidade operacional,
          as atribuições legais e as regras institucionais aplicáveis. A infraestrutura técnica pode envolver prestadores
          de serviços de hospedagem e armazenamento.</p>
          <p>Os períodos de retenção, as regras de descarte e as responsabilidades pelo compartilhamento serão definidos
          e documentados pela gestão institucional, conforme as exigências legais e arquivísticas aplicáveis. Esta página
          não fixa um prazo ainda não homologado.</p>
        </InfoSection>
        <InfoSection title="6. Seus direitos e canal oficial de privacidade">
          <p>O titular pode solicitar informações sobre o tratamento de seus dados e exercer os direitos previstos na
          LGPD, respeitados os limites legais, a proteção de terceiros e os deveres de conservação de registros públicos.</p>
          <p>A Prefeitura de João Pessoa informa, em sua política oficial, o canal do encarregado de dados:
          {" "}<a href="mailto:encarregado.dpo@joaopessoa.pb.gov.br" className="font-semibold text-[#0c766d] underline underline-offset-2">encarregado.dpo@joaopessoa.pb.gov.br</a>.</p>
          <p>Consulte também a{" "}<a href={officialPolicy} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0c766d] underline underline-offset-2">Política de Privacidade da Prefeitura de João Pessoa</a>.
          Esse documento é uma referência institucional do Município; os procedimentos específicos do VÓRTEX permanecem sujeitos à validação.</p>
        </InfoSection>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/denuncia" className="rounded-lg bg-[#0c766d] px-5 py-3 text-sm font-bold text-white hover:bg-[#095f58]">Registrar denúncia</Link>
        <Link href="/acompanhar" className="rounded-lg border border-[#0c766d] px-5 py-3 text-sm font-bold text-[#0c766d]">Acompanhar denúncia</Link>
      </div>
    </div>
  </main>;
}

function InfoSection({title,children}:{title:string;children:ReactNode}) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
    <h2 className="text-lg font-bold text-[#102b42]">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">{children}</div>
  </section>;
}
