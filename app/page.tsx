"use client";

import React, { useState, useEffect } from "react";
import { 
  Upload, 
  History, 
  Lightbulb, 
  Info, 
  Mail, 
  AlertTriangle,
  CheckCircle2,
  FileCode2,
  ChevronRight,
  Loader2,
  Download,
  Search,
  CloudUpload
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  // Form State
  const [benefitForm, setBenefitForm] = useState({
    idPlano: "",
    idEvento: "",
    cnpjOperadora: "",
    regAns: "",
    valor: ""
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleBenefitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/benefits", {
        method: "POST",
        body: JSON.stringify(benefitForm),
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (res.ok) {
        alert("Benefício cadastrado com sucesso!");
        setBenefitForm({
          idPlano: "",
          idEvento: "",
          cnpjOperadora: "",
          regAns: "",
          valor: ""
        });
        fetchEvents();
      } else {
        alert(data.error || "Erro ao cadastrar benefício");
      }
    } catch (err) {
      alert("Falha de conexão.");
    } finally {
      setIsSaving(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error("Falha ao buscar eventos");
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
      setIsLoadingEvents(false);
    } catch (err) {
      console.error(err);
      setIsLoadingEvents(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    setIsUploading(true);
    const formData = new FormData();
    for (let i = 0; i < e.target.files.length; i++) {
      formData.append("files", e.target.files[i]);
    }

    try {
      const res = await fetch("/api/esocial/s5002/import", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Erro no upload");
      const data = await res.json();
      alert(`Auditoria Concluída! Processados: ${data.processed}, Erros: ${data.errors}`);
      fetchEvents();
    } catch (err) {
      alert("Erro ao processar XMLs.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-lg">
      {/* Coluna Esquerda: Form e Auditoria */}
      <div className="col-span-8 flex flex-col gap-lg">
        {/* Cadastro de Benefício */}
        <section className="card overflow-hidden">
          <div className="px-lg py-md border-b border-outline-variant flex justify-between items-center bg-white">
            <h2 className="text-lg font-bold text-primary-container tracking-tight">Cadastro de Benefício</h2>
            <span className="px-2 py-1 bg-surface-container-high text-on-surface-variant font-mono text-[10px] rounded uppercase tracking-wider font-medium">
              VERSÃO eSOCIAL 1.2
            </span>
          </div>
          
          <form className="p-lg grid grid-cols-2 gap-x-lg gap-y-md" onSubmit={handleBenefitSubmit}>
            <div className="flex flex-col gap-xs">
              <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-tight">ID do Plano</label>
              <input 
                className="input-field" 
                placeholder="PL-XXXX-000" 
                type="text" 
                value={benefitForm.idPlano}
                onChange={(e) => setBenefitForm({ ...benefitForm, idPlano: e.target.value })}
              />
              <p className="text-[10px] text-secondary">Identificador único interno para conciliação.</p>
            </div>
            <div className="flex flex-col gap-xs">
              <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-tight">ID do Evento S-5002</label>
              <input 
                className="input-field" 
                placeholder="ID100000000000000..." 
                type="text" 
                required
                value={benefitForm.idEvento}
                onChange={(e) => setBenefitForm({ ...benefitForm, idEvento: e.target.value })}
              />
              <p className="text-[10px] text-secondary">Número do recibo ou ID do evento transmitido.</p>
            </div>
            
            <div className="flex flex-col gap-xs col-span-2">
              <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-tight">CNPJ da Operadora</label>
              <div className="relative">
                <input 
                  className="input-field w-full pr-10" 
                  placeholder="00.000.000/0000-00" 
                  type="text" 
                  required
                  value={benefitForm.cnpjOperadora}
                  onChange={(e) => setBenefitForm({ ...benefitForm, cnpjOperadora: e.target.value })}
                />
                <Search size={16} className="absolute right-3 top-2.5 text-secondary" />
              </div>
            </div>

            <div className="flex flex-col gap-xs">
              <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-tight">Registro ANS</label>
              <input 
                className="input-field" 
                placeholder="00000-0" 
                type="text" 
                value={benefitForm.regAns}
                onChange={(e) => setBenefitForm({ ...benefitForm, regAns: e.target.value })}
              />
              <p className="text-[10px] text-secondary">Consultar base da Agência Nacional de Saúde.</p>
            </div>
            <div className="flex flex-col gap-xs">
              <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-tight">Valor (R$)</label>
              <input 
                className="input-field" 
                placeholder="0,00" 
                type="number" 
                step="0.01" 
                required
                value={benefitForm.valor}
                onChange={(e) => setBenefitForm({ ...benefitForm, valor: e.target.value })}
              />
              <p className="text-[10px] text-secondary">Valor total mensal do plano (titular + dep).</p>
            </div>

            <div className="col-span-2 pt-6 border-t border-outline-variant mt-4 flex justify-end gap-md">
              <button 
                type="button" 
                className="btn-outline"
                onClick={() => setBenefitForm({ idPlano: "", idEvento: "", cnpjOperadora: "", regAns: "", valor: "" })}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn-primary bg-primary-container disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? "Salvando..." : "Salvar Registro"}
              </button>
            </div>
          </form>
        </section>

        {/* Upload e Resultados */}
        <section className="card p-lg">
          <h3 className="text-xs font-bold text-secondary uppercase tracking-[0.1em] mb-4 flex items-center gap-2">
            <Upload size={14} />
            Auditoria de XML (S-5002)
          </h3>
          
          <div 
            className={cn(
              "border-2 border-dashed border-outline-variant rounded-sm p-8 transition-all flex flex-col items-center justify-center gap-3 text-center cursor-pointer hover:bg-surface-container/50",
              isUploading && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => !isUploading && document.getElementById("xml-upload")?.click()}
          >
            {isUploading ? (
              <Loader2 size={32} className="animate-spin text-primary" />
            ) : (
              <CloudUpload size={40} className="text-primary opacity-20" />
            )}
            <div>
              <p className="font-bold text-sm text-on-surface">Processar Novos Arquivos</p>
              <p className="text-[10px] text-secondary mt-1 tracking-tight">Suporta upload de múltiplos arquivos XML do eSocial.</p>
            </div>
            <input id="xml-upload" type="file" multiple accept=".xml" className="hidden" onChange={handleUpload} />
          </div>

          <div className="mt-8 border border-outline-variant rounded-sm overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high text-[10px] font-bold text-secondary uppercase tracking-wider">
                  <th className="px-4 py-3">Trabalhador (CPF)</th>
                  <th className="px-4 py-3">Competência</th>
                  <th className="px-4 py-3">Base Real</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {isLoadingEvents ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-[11px] text-secondary italic">
                      Sincronizando base de dados...
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-[11px] text-secondary italic">
                      Nenhum registro encontrado. Inicie o processamento via XML.
                    </td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <tr key={event.id} className="border-t border-outline-variant hover:bg-surface-container/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-primary">{event.trabalhador.cpf}</span>
                          <span className="text-[10px] text-secondary">{event.trabalhador.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-secondary">{event.competencia}</td>
                      <td className="px-4 py-3 text-xs font-bold">R$ {parseFloat(event.baseIR.baseCalculada).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3">
                        {event.baseIR.divergencia ? (
                          <div className="flex items-center gap-1.5 text-error font-bold text-[10px] uppercase bg-error/10 px-2 py-0.5 rounded-full w-fit">
                            <AlertTriangle size={12} />
                            Divergente
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                            <CheckCircle2 size={12} />
                            Validado
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          className="p-2 text-primary hover:bg-primary/5 rounded-full transition-colors"
                          onClick={() => window.open(`/api/report/${event.id}`, "_blank")}
                        >
                          <Download size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Coluna Direita: Contexto e Suporte */}
      <div className="col-span-4 flex flex-col gap-lg">
        {/* Dicas de Preenchimento */}
        <section className="card p-lg">
          <div className="flex items-center gap-sm text-tertiary mb-6">
            <Lightbulb size={20} />
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em]">Dicas de Preenchimento</h3>
          </div>
          <div className="space-y-4">
            <div className="p-3 bg-surface rounded-sm border-l-4 border-primary">
              <p className="text-[11px] font-bold text-primary mb-1">Registro ANS</p>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                O registro deve conter 6 dígitos. Caso a operadora tenha mudado de CNPJ recentemente, verifique o registro atualizado.
              </p>
            </div>
            <div className="p-3 bg-surface rounded-sm border-l-4 border-outline">
              <p className="text-[11px] font-bold text-on-surface mb-1">Validação do CNPJ</p>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                O CNPJ deve ser da operadora contratada diretamente pela empresa. Evite usar CNPJ de corretoras.
              </p>
            </div>
          </div>
        </section>

        {/* Compliance Alert Banners */}
        <section className="bg-primary-container text-white p-6 rounded-sm shadow-md border-l-4 border-on-tertiary-container">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-on-tertiary-container" />
            Compliance Alert
          </h3>
          <p className="text-[11px] leading-relaxed opacity-90 mb-4">
            Mudanças na legislação exigem que os valores de planos de saúde sejam discriminados por CPF de dependente no S-5002.
          </p>
          <button className="w-full py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] uppercase rounded-sm border border-white/20 transition-all">
            Ver Documentação
          </button>
        </section>

        {/* Ajuda/Contato */}
        <div className="bg-surface-container-high p-6 rounded-sm flex flex-col items-center text-center border border-outline-variant">
           <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-outline-variant">
              <Mail size={24} className="text-primary" />
           </div>
           <h4 className="text-[11px] font-bold text-on-surface mb-1">Precisa de Ajuda?</h4>
           <p className="text-[11px] text-secondary mb-4 leading-relaxed">Nossos consultores estão disponíveis para validar seus dados do eSocial.</p>
           <a href="mailto:suporte@compliance.com" className="text-primary text-[11px] font-bold flex items-center gap-1.5 hover:underline decoration-2 underline-offset-2">
              <ChevronRight size={14} />
              Contatar Especialista
           </a>
        </div>
      </div>
    </div>
  );
}
