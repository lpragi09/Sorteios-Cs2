"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ExternalLink, Hash, Loader2, Lock, ShieldCheck, Trophy, XCircle, Zap } from "lucide-react";
import {
  DRAND_CHAIN, DRAND_RELAYS, drandRandomnessMatches, drandRoundTime, drandRoundUrl, entriesText, FAIR_KIND_LABEL,
  pickWinner, sha256Hex, type FairDraw,
} from "@/lib/fair";

type ItemLista = Pick<FairDraw, "id" | "kind" | "target_id" | "title" | "total_weight" | "drand_round" | "winner_label" | "status" | "created_at" | "drawn_at">;

const STATUS: Record<FairDraw["status"], { label: string; cls: string }> = {
  waiting: { label: "Esperando o número", cls: "bg-grafite text-cinza" },
  drawn: { label: "Sorteado", cls: "bg-sangue text-osso" },
  confirmed: { label: "Ganhador confirmado", cls: "bg-vermelho text-white" },
  skipped: { label: "Descartado", cls: "bg-grafite text-cinza" },
};

const quando = (iso: string | number) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

const chances = (n: number) => `${n.toLocaleString("pt-BR")} ${n === 1 ? "chance" : "chances"}`;

function Selo({ status }: { status: FairDraw["status"] }) {
  const s = STATUS[status];
  return <span className={`shrink-0 px-2.5 py-1 text-sm font-bold ${s.cls}`}>{s.label}</span>;
}

export default function ProvablyFair({ id, sorteio }: { id: string | null; sorteio: string | null }) {
  return (
    <div className="mx-auto w-[min(1000px,100%-40px)] py-16">
      <div className="mb-12">
        <p className="flex items-center gap-2 text-vermelho font-bold mb-3"><ShieldCheck className="w-5 h-5" /> Provably fair</p>
        <h1 className="font-display font-black uppercase leading-[.9] text-[clamp(48px,7vw,88px)]">Sorteio comprovado</h1>
        <p className="text-cinza mt-4 max-w-[62ch]">
          Ninguém escolhe o ganhador, nem o Soares. A conta usa a lista de participantes e um número aleatório público que ainda não existia quando a lista foi fechada. Dá pra refazer a conta aqui mesmo.
        </p>
      </div>
      {id ? <Detalhe id={id} /> : (
        <>
          <ComoFunciona />
          <Lista sorteio={sorteio} />
        </>
      )}
    </div>
  );
}

function ComoFunciona() {
  const passos = [
    { icone: <Lock className="w-5 h-5" />, titulo: "A lista é fechada", texto: "Na hora de sortear, a lista de participantes (com as chances de cada um) é gravada e ganha uma impressão digital (hash SHA-256). Mudar qualquer nome muda o hash." },
    { icone: <Zap className="w-5 h-5" />, titulo: "Número público do futuro", texto: "O sorteio usa uma rodada do drand que só sai segundos depois: um sorteador público mantido por Cloudflare, Protocol Labs, universidades e outros. Ninguém sabe o número antes." },
    { icone: <Hash className="w-5 h-5" />, titulo: "A conta decide", texto: "SHA-256(hash da lista : número público) vira um bilhete. Quem tem aquele bilhete na lista ganha. Qualquer pessoa chega no mesmo resultado." },
  ];
  return (
    <ol className="grid md:grid-cols-3 gap-0.5 mb-14">
      {passos.map((p, i) => (
        <li key={p.titulo} className="bg-carvao p-6">
          <span className="flex items-center gap-2 text-vermelho mb-3">{p.icone}<b className="font-display font-black text-3xl leading-none">{i + 1}</b></span>
          <p className="font-bold text-lg">{p.titulo}</p>
          <p className="text-cinza text-base mt-1">{p.texto}</p>
        </li>
      ))}
    </ol>
  );
}

function Lista({ sorteio }: { sorteio: string | null }) {
  const [giros, setGiros] = useState<ItemLista[] | null>(null);
  useEffect(() => {
    fetch(`/api/provably-fair${sorteio ? `?sorteio=${encodeURIComponent(sorteio)}` : ""}`)
      .then((r) => r.json())
      .then((j) => setGiros(j.draws ?? []))
      .catch(() => setGiros([]));
  }, [sorteio]);

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <h2 className="font-display font-black uppercase text-[40px] leading-none">{sorteio ? "Giros deste sorteio" : "Últimos giros"}</h2>
        {sorteio && <Link href="/provably-fair" className="font-bold border-b-2 border-vermelho">Ver todos</Link>}
      </div>
      {!giros ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-vermelho" /></div>
      ) : giros.length === 0 ? (
        <div className="bg-carvao p-8 text-cinza">Nenhum giro registrado ainda.</div>
      ) : (
        <div className="border-t border-grafite">
          {giros.map((d) => (
            <Link key={d.id} href={`/provably-fair?id=${d.id}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-4 border-b border-grafite hover:bg-carvao px-2 -mx-2 transition-colors">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-lg truncate">{d.title}</p>
                <p className="text-cinza text-[15px]">{FAIR_KIND_LABEL[d.kind]}, {quando(d.created_at)}, {chances(d.total_weight)}</p>
              </div>
              {d.winner_label && <p className="font-bold truncate">{d.winner_label}</p>}
              <Selo status={d.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

type Checagem = { ok: boolean; label: string; detalhe?: string };

function Detalhe({ id }: { id: string }) {
  const [giro, setGiro] = useState<FairDraw | null | undefined>(undefined);
  const [checagens, setChecagens] = useState<Checagem[] | null>(null);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    fetch(`/api/provably-fair?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((j) => setGiro(j.draw ?? null))
      .catch(() => setGiro(null));
  }, [id]);

  // Faixa de bilhetes de cada participante (na ordem da lista)
  const faixas = useMemo(() => {
    const out: { label: string; weight: number; de: number; ate: number }[] = [];
    for (const e of giro?.entries ?? []) {
      const de = out.length ? out[out.length - 1].ate + 1 : 0;
      out.push({ ...e, de, ate: de + e.weight - 1 });
    }
    return out;
  }, [giro]);

  // Refaz tudo no navegador, buscando o número público direto no drand (sem passar pelo site)
  const verificar = async () => {
    if (!giro) return;
    setVerificando(true);
    const out: Checagem[] = [];
    try {
      const hash = await sha256Hex(entriesText(giro.entries));
      out.push({ ok: hash === giro.entries_hash, label: "A lista publicada é a mesma que foi fechada", detalhe: `hash calculado: ${hash}` });

      const saiu = drandRoundTime(giro.drand_round);
      out.push({
        ok: new Date(giro.created_at).getTime() < saiu,
        label: "A lista foi fechada antes de o número público existir",
        detalhe: `lista: ${quando(giro.created_at)}, número saiu: ${quando(saiu)}`,
      });

      const relay = DRAND_RELAYS[DRAND_RELAYS.length - 1];
      const beacon = await (await fetch(drandRoundUrl(giro.drand_round, relay), { cache: "no-store" })).json();
      const assinaturaOk = await drandRandomnessMatches(beacon.signature, beacon.randomness);
      out.push({
        ok: assinaturaOk && beacon.randomness === giro.drand_randomness,
        label: `O número público confere com o drand (${new URL(relay).host})`,
        detalhe: `rodada ${giro.drand_round}: ${beacon.randomness}`,
      });

      const { ticket, index } = await pickWinner(giro.entries, giro.entries_hash, beacon.randomness);
      const label = giro.entries[index].label;
      out.push({
        ok: ticket.toString() === giro.ticket && label === giro.winner_label,
        label: "A conta leva ao mesmo ganhador",
        detalhe: `bilhete ${ticket.toString()} de 0 a ${giro.total_weight - 1}: ${label}`,
      });
    } catch (err) {
      out.push({ ok: false, label: "Não foi possível terminar a verificação", detalhe: err instanceof Error ? err.message : String(err) });
    }
    setChecagens(out);
    setVerificando(false);
  };

  if (giro === undefined) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-vermelho" /></div>;
  if (giro === null) {
    return (
      <div className="bg-carvao p-8 text-cinza">
        Giro não encontrado. <Link href="/provably-fair" className="text-osso font-bold border-b-2 border-vermelho">Ver todos</Link>
      </div>
    );
  }

  const tudoOk = checagens?.every((c) => c.ok);
  const indiceGanhador = giro.entries.findIndex((e) => e.label === giro.winner_label);

  return (
    <div className="space-y-6">
      <Link href={`/provably-fair?sorteio=${giro.target_id}`} className="inline-flex items-center gap-2 text-cinza hover:text-osso font-bold">
        <ArrowLeft className="w-4 h-4" /> Todos os giros deste sorteio
      </Link>

      <div className="bg-carvao corte p-6 border-l-4 border-vermelho">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-vermelho font-bold">{FAIR_KIND_LABEL[giro.kind]}</p>
            <h2 className="font-display font-black uppercase text-[44px] leading-none">{giro.title}</h2>
            <p className="text-cinza mt-1">Lista fechada em {quando(giro.created_at)}</p>
          </div>
          <Selo status={giro.status} />
        </div>
        {giro.winner_label && (
          <div className="mt-5 flex items-center gap-3 bg-preto px-4 py-3">
            <Trophy className="w-6 h-6 text-vermelho shrink-0" />
            <p className="font-bold text-xl break-all">{giro.winner_label}</p>
          </div>
        )}
        {giro.status === "skipped" && <p className="mt-3 text-cinza">Este giro foi descartado (o sorteado não respondeu) e outro giro foi feito em seguida.</p>}
      </div>

      <div className="bg-carvao p-6 space-y-3">
        <Campo label="Hash da lista (SHA-256)" valor={giro.entries_hash} />
        <Campo label="Rodada do drand" valor={
          <a href={drandRoundUrl(giro.drand_round)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 border-b border-vermelho">
            {giro.drand_round} <ExternalLink className="w-3.5 h-3.5" />
          </a>
        } />
        <Campo label="Número público (randomness)" valor={giro.drand_randomness ?? "ainda não saiu"} />
        <Campo label="Bilhete sorteado" valor={giro.ticket !== null ? `${giro.ticket} (de 0 a ${giro.total_weight - 1})` : "-"} />
        <p className="text-cinza text-sm pt-2">
          Conta: bilhete = SHA-256(&quot;hash da lista:número público&quot;) em número, resto da divisão por {giro.total_weight}. Rede do drand: quicknet ({DRAND_CHAIN.slice(0, 12)}...).
        </p>
      </div>

      {giro.drand_randomness && (
        <div className="bg-carvao p-6">
          <button onClick={verificar} disabled={verificando} className="btn btn-vermelho">
            {verificando ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />} Verificar agora
          </button>
          {checagens && (
            <div className="mt-5 space-y-3">
              {checagens.map((c) => (
                <div key={c.label} className="flex gap-3">
                  {c.ok ? <CheckCircle2 className="w-5 h-5 text-osso shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-vermelho shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <p className={`font-bold ${c.ok ? "" : "text-vermelho"}`}>{c.label}</p>
                    {c.detalhe && <p className="text-sm text-cinza break-all">{c.detalhe}</p>}
                  </div>
                </div>
              ))}
              <p className={`pt-2 font-display font-black uppercase text-2xl ${tudoOk ? "text-osso" : "text-vermelho"}`}>
                {tudoOk ? "Tudo confere: sorteio justo" : "Algo não conferiu"}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-carvao p-6">
        <h3 className="font-display font-black uppercase text-3xl leading-none mb-1">Lista fechada ({giro.entries.length})</h3>
        <p className="text-cinza text-sm mb-4">Cada linha tem uma faixa de bilhetes do tamanho das chances. O texto que vira o hash é cada linha como &quot;nome:chances&quot;, uma embaixo da outra.</p>
        <div className="max-h-[480px] overflow-y-auto border border-grafite divide-y divide-grafite">
          {faixas.map((e, i) => (
            <div key={i} className={`flex items-center justify-between gap-3 px-3 py-2 ${i === indiceGanhador ? "bg-sangue/40" : ""}`}>
              <span className={`truncate ${i === indiceGanhador ? "font-bold" : ""}`}>{e.label}</span>
              <span className="shrink-0 text-sm text-cinza tabular-nums">
                {chances(e.weight)}, bilhete{e.weight > 1 ? `s ${e.de}–${e.ate}` : ` ${e.de}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4">
      <span className="sm:w-60 shrink-0 text-cinza">{label}</span>
      <span className="font-mono text-sm break-all">{valor}</span>
    </div>
  );
}
