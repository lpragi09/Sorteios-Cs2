"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Download, Loader2, MessageCircle, Search, Trophy, Undo2, UserCheck, UserPlus, Users } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { usePopup } from "@/components/Popup";
import Paginacao, { usePaginacao } from "@/components/Paginacao";
import { formatarNumero } from "@/lib/sorteios";
import { baixarCsv } from "@/lib/csv";
import { formatarWhatsapp } from "@/lib/perfil";

type Usuario = {
  email: string;
  nome: string | null;
  nome_cadastro?: string | null; // o que a pessoa digitou no popup depois do login
  whatsapp?: string | null;
  avatar_url: string | null;
  criado_em: string;
  ultimo_acesso: string;
  acessos: number;
  bloqueado: boolean;
  tickets: number;
  aprovados: number;
  coins: number;
  vitorias: number;
};

const SEMANA = 7 * 24 * 60 * 60 * 1000;
const data = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default function SecaoUsuarios() {
  const popup = usePopup();
  const [lista, setLista] = useState<Usuario[] | null>(null);
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    try {
      setLista((await adminApi<{ usuarios: Usuario[] }>("listarUsuarios")).usuarios);
    } catch (err) {
      popup.erro(err);
    }
  }, [popup]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- busca de dados: o state só muda depois da resposta
  useEffect(() => { carregar(); }, [carregar]);

  const [agora] = useState(() => Date.now());
  const stats = useMemo(() => {
    const l = lista ?? [];
    return {
      total: l.length,
      novos: l.filter((u) => agora - new Date(u.criado_em).getTime() < SEMANA).length,
      ativos: l.filter((u) => agora - new Date(u.ultimo_acesso).getTime() < SEMANA).length,
      ganharam: l.filter((u) => u.vitorias > 0).length,
    };
  }, [lista, agora]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const digitos = q.replace(/\D/g, "");
    return (lista ?? []).filter(
      (u) =>
        !q ||
        u.email.includes(q) ||
        (u.nome ?? "").toLowerCase().includes(q) ||
        (u.nome_cadastro ?? "").toLowerCase().includes(q) ||
        (digitos.length >= 4 && (u.whatsapp ?? "").includes(digitos))
    );
  }, [lista, busca]);
  const pag = usePaginacao(filtrados);

  const alternarBloqueio = async (u: Usuario) => {
    if (!u.bloqueado && !(await popup.confirmar(`${u.nome ?? u.email} não vai mais conseguir mandar tickets. Os tickets que já mandou continuam como estão.`, { titulo: "Bloquear usuário?", textoOk: "Bloquear" }))) return;
    setLista((l) => l?.map((x) => (x.email === u.email ? { ...x, bloqueado: !u.bloqueado } : x)) ?? null);
    try {
      await adminApi("bloquearUsuario", { email: u.email, bloqueado: !u.bloqueado });
    } catch (err) {
      popup.erro(err);
      carregar();
    }
  };

  const exportar = () =>
    baixarCsv(
      "usuarios.csv",
      ["Nome", "Nome no Google", "WhatsApp", "E-mail", "Cadastro", "Último acesso", "Acessos", "Tickets", "Aprovados", "Coins aprovadas", "Vitórias", "Bloqueado"],
      filtrados.map((u) => [u.nome_cadastro ?? "", u.nome ?? "", formatarWhatsapp(u.whatsapp), u.email, data(u.criado_em), data(u.ultimo_acesso), u.acessos, u.tickets, u.aprovados, u.coins, u.vitorias, u.bloqueado ? "sim" : "não"])
    );

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0.5 mb-6">
        {[
          { rotulo: "Cadastrados", valor: stats.total, Icone: Users },
          { rotulo: "Novos (7 dias)", valor: stats.novos, Icone: UserPlus },
          { rotulo: "Entraram (7 dias)", valor: stats.ativos, Icone: UserCheck },
          { rotulo: "Já ganharam", valor: stats.ganharam, Icone: Trophy },
        ].map(({ rotulo, valor, Icone }) => (
          <div key={rotulo} className="bg-carvao p-5 flex items-center gap-4">
            <Icone className="w-7 h-7 text-vermelho shrink-0" />
            <div>
              <strong className="block font-display font-black text-[36px] leading-none">{formatarNumero(valor)}</strong>
              <span className="text-cinza">{rotulo}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cinza" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, e-mail ou WhatsApp" className="campo !py-2 !pl-9" aria-label="Buscar usuário" />
        </label>
        <button onClick={exportar} disabled={!filtrados.length} className="ml-auto h-10 px-3 bg-grafite hover:bg-grafite-2 font-bold flex items-center gap-1.5 disabled:opacity-40" title={busca ? "Baixa só os usuários da busca" : "Baixa todos os usuários"}>
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>

      {!lista ? (
        <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-vermelho" /></div>
      ) : filtrados.length === 0 ? (
        <p className="text-cinza bg-carvao p-6">{busca ? "Ninguém com esse nome ou e-mail." : "Ninguém entrou no site ainda. A lista enche conforme as pessoas fazem login com o Google."}</p>
      ) : (
        <>
          <div className="bg-carvao overflow-x-auto">
            <table className="w-full text-left text-[15px]">
              <thead className="text-cinza border-b border-grafite">
                <tr>
                  <th className="px-4 py-3 font-semibold">Usuário</th>
                  <th className="px-4 py-3 font-semibold">WhatsApp</th>
                  <th className="px-4 py-3 font-semibold">Cadastro</th>
                  <th className="px-4 py-3 font-semibold">Último acesso</th>
                  <th className="px-4 py-3 font-semibold text-right">Acessos</th>
                  <th className="px-4 py-3 font-semibold text-right">Tickets</th>
                  <th className="px-4 py-3 font-semibold text-right">Coins aprovadas</th>
                  <th className="px-4 py-3 font-semibold text-right">Vitórias</th>
                  <th className="px-4 py-3"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-grafite">
                {pag.itensPagina.map((u) => (
                  <tr key={u.email} className={u.bloqueado ? "opacity-50" : ""}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-[220px]">
                        {u.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="w-9 h-9 rounded-full bg-sangue grid place-items-center font-bold">{(u.nome ?? u.email)[0].toUpperCase()}</span>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold truncate">{u.nome_cadastro ?? u.nome ?? "Sem nome"}{u.bloqueado && <span className="ml-2 text-vermelho text-sm">bloqueado</span>}</p>
                          <p className="text-cinza text-sm truncate">{u.nome_cadastro && u.nome && u.nome_cadastro !== u.nome ? `${u.nome}, ` : ""}{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {u.whatsapp ? (
                        <a href={`https://wa.me/55${u.whatsapp}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold hover:text-vermelho-claro tabular-nums" title="Abrir conversa no WhatsApp">
                          <MessageCircle className="w-4 h-4 text-[#25d366]" /> {formatarWhatsapp(u.whatsapp)}
                        </a>
                      ) : (
                        <span className="text-cinza">Não preencheu</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-cinza whitespace-nowrap">{data(u.criado_em)}</td>
                    <td className="px-4 py-3 text-cinza whitespace-nowrap">{data(u.ultimo_acesso)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatarNumero(u.acessos)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatarNumero(u.tickets)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatarNumero(u.coins)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{u.vitorias ? <b className="text-vermelho">{u.vitorias}</b> : 0}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => alternarBloqueio(u)} className="w-10 h-10 inline-grid place-items-center bg-grafite hover:bg-grafite-2" title={u.bloqueado ? "Desbloquear" : "Bloquear"} aria-label={u.bloqueado ? "Desbloquear" : "Bloquear"}>
                        {u.bloqueado ? <Undo2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacao {...pag} />
        </>
      )}
    </div>
  );
}
