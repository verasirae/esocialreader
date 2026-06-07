"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { 
  User, 
  Mail, 
  Lock, 
  Shield, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  KeyRound, 
  Calendar,
  Layers,
  Fingerprint
} from "lucide-react";
import { motion } from "motion/react";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  
  // States para campos do usuário
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  
  // States para campos de senha
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  
  // States de status
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sincronizar dados do usuário quando carregado
  useEffect(() => {
    if (user) {
      setNome(user.nome || "");
      setEmail(user.email || "");
    }
  }, [user]);

  // Função para salvar alterações gerais e/ou de senha
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validações básicas no cliente
    if (!nome.trim()) {
      setErrorMsg("O preenchimento do campo Nome é obrigatório.");
      return;
    }

    if (!email.trim()) {
      setErrorMsg("O preenchimento do campo E-mail é obrigatório.");
      return;
    }

    // Se tentar trocar a senha
    if (novaSenha || confirmarSenha || senhaAtual) {
      if (!senhaAtual) {
        setErrorMsg("Você deve informar sua senha atual para definir uma nova senha.");
        return;
      }
      if (!novaSenha) {
        setErrorMsg("Informe a nova senha desejada.");
        return;
      }
      if (novaSenha !== confirmarSenha) {
        setErrorMsg("A confirmação da nova senha está incorreta. As senhas não coincidem.");
        return;
      }
      if (novaSenha.length < 6) {
        setErrorMsg("A nova senha deve possuir pelo menos 6 caracteres por razões de segurança.");
        return;
      }
    }

    setIsSaving(true);

    try {
      const resp = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          senhaAtual: senhaAtual || undefined,
          novaSenha: novaSenha || undefined,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || "Ocorreu um erro ao atualizar os dados de perfil.");
      }

      setSuccessMsg("Dados cadastrais atualizados com sucesso!");
      
      // Limpa os campos de senha
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");

      // Atualiza o contexto de autenticação no frontend
      await refreshUser();
    } catch (err: any) {
      setErrorMsg(err.message || "Falha na conexão de rede com o servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper para customizar o badge de nível de acesso
  const getPerfilBadge = (perfil: string) => {
    switch (perfil) {
      case "SUPER_ADMIN":
      case "superAdmin":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-rose-50 border border-rose-200 text-rose-700 rounded-full shadow-sm">
            <Shield size={12} className="stroke-[2.5]" />
            Super Administrador
          </span>
        );
      case "ADMIN":
      case "Admin":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-orange-50 border border-orange-200 text-orange-700 rounded-full shadow-sm">
            <Shield size={12} className="stroke-[2.5]" />
            Administrador
          </span>
        );
      case "GESTOR":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-blue-50 border border-blue-200 text-blue-700 rounded-full shadow-sm">
            <Layers size={12} className="stroke-[2.5]" />
            Gestor
          </span>
        );
      case "ANALISTA":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full shadow-sm">
            <Layers size={12} className="stroke-[2.5]" />
            Analista
          </span>
        );
      case "OPERADOR":
      case "user":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-purple-50 border border-purple-200 text-purple-700 rounded-full shadow-sm">
            <User size={12} className="stroke-[2.5]" />
            Operador
          </span>
        );
      case "CLIENTE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-cyan-50 border border-cyan-200 text-cyan-700 rounded-full shadow-sm">
            <User size={12} className="stroke-[2.5]" />
            Cliente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-gray-50 border border-gray-250 text-gray-750 rounded-full shadow-sm">
            <User size={12} className="stroke-[2.5]" />
            {perfil}
          </span>
        );
    }
  };

  return (
    <main className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-secondary uppercase tracking-[0.15em] mb-1">
            <span>Configurações</span>
            <span>/</span>
            <span className="text-primary font-black">Meu Perfil</span>
          </div>
          <h2 className="text-2xl font-black text-on-surface tracking-tight uppercase">Perfil do Usuário</h2>
          <p className="text-secondary text-xs mt-1">Gerencie suas informações cadastrais, e-mail de acesso e credenciais de segurança.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna Esquerda: Cartão com Visão Geral do Perfil */}
        <div className="lg:col-span-4 space-y-6">
          <div id="user-profile-overview-card" className="bg-white border border-outline-variant rounded-sm p-8 shadow-sm flex flex-col items-center text-center">
            {/* Avatar Central */}
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary/10 to-indigo-50 border-4 border-white shadow-md flex items-center justify-center text-indigo-700 font-extrabold text-2xl tracking-tighter">
                {user?.nome ? user.nome.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "US"}
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-outline-variant shadow flex items-center justify-center text-secondary">
                <Fingerprint size={16} />
              </div>
            </div>

            {/* Nome e Perfil */}
            <h3 className="font-extrabold text-on-surface text-lg tracking-tight uppercase leading-tight">
              {user?.nome || "Carregando..."}
            </h3>
            <p className="text-xs text-secondary font-medium tracking-normal mt-1 mb-4 lowercase">
              {user?.email}
            </p>

            {/* Badge de Cargo/Acesso */}
            <div className="mb-6">
              {user?.perfil ? getPerfilBadge(user.perfil) : "-"}
            </div>

            {/* Informações Auxiliares */}
            <div className="w-full border-t border-outline-variant pt-6 mt-2 space-y-4 text-left text-xs">
              <div className="flex items-center justify-between">
                <span className="text-secondary font-bold uppercase text-[9px] tracking-wider">Identificador ID:</span>
                <span className="font-mono text-secondary font-semibold text-[10px] break-all">{user?.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary font-bold uppercase text-[9px] tracking-wider">Status da Conta:</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50/50 px-2 py-0.5 rounded border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Ativo e Homologado
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary font-bold uppercase text-[9px] tracking-wider">Canal Oficial:</span>
                <span className="text-secondary font-semibold">Web/Client Run</span>
              </div>
            </div>
          </div>

          {/* Dica de Segurança */}
          <div className="bg-amber-50/40 border border-amber-200/60 rounded-sm p-6 text-xs text-amber-900 space-y-2.5">
            <h4 className="font-black uppercase tracking-wider text-[10px] text-amber-950 flex items-center gap-1.5">
              <AlertCircle size={14} className="text-amber-700" />
              Compromisso de Segurança
            </h4>
            <p className="leading-relaxed">
              Mantenha suas credenciais e-mail e senhas pessoais sempre atualizadas sob controle estrito. Senhas fortes misturam números, símbolos e letras maiúsculas/minúsculas. Evite compartilhamentos com terceiros para manter a conformidade legal do eSocial/EFD-REINF garantida.
            </p>
          </div>
        </div>

        {/* Coluna Direita: Formulário de Configurações */}
        <div className="lg:col-span-8">
          <form onSubmit={handleSaveProfile} className="bg-white border border-outline-variant rounded-sm shadow-sm flex flex-col overflow-hidden">
            {/* Form Header */}
            <div className="px-8 py-5 border-b border-outline-variant bg-surface-container/15 flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-primary/5 flex items-center justify-center text-primary">
                <User size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-on-surface text-base tracking-tight uppercase">Editar Minhas Informações</h3>
                <p className="text-[10px] text-secondary font-black tracking-widest uppercase">Campos e credenciais de acesso direto</p>
              </div>
            </div>

            {/* Form Body */}
            <div className="p-8 space-y-8">
              
              {/* Feedback messages */}
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-rose-50 text-rose-800 rounded-sm border border-rose-200 text-xs font-bold flex items-start gap-2.5 shadow-sm"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}

              {successMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-emerald-50 text-emerald-800 rounded-sm border border-emerald-200 text-xs font-bold flex items-start gap-2.5 shadow-sm"
                >
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                  <span>{successMsg}</span>
                </motion.div>
              )}

              {/* Seção 1: Dados Gerais */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-primary uppercase tracking-widest border-b border-outline-variant pb-2 flex items-center gap-2">
                  <User size={14} />
                  Dados Gerais de Identificação
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nome Completo */}
                  <div className="flex flex-col gap-1.5">
                    <label id="label-nome" className="text-[10px] font-black text-secondary uppercase tracking-widest">
                      Nome do Usuário <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input 
                        type="text"
                        required
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-sm text-xs focus:ring-1 focus:ring-primary outline-none font-bold text-on-surface"
                        placeholder="Ex: João da Silva"
                      />
                      <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
                    </div>
                  </div>

                  {/* Endereço de E-mail */}
                  <div className="flex flex-col gap-1.5">
                    <label id="label-email" className="text-[10px] font-black text-secondary uppercase tracking-widest">
                      Endereço de E-mail <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input 
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-sm text-xs focus:ring-1 focus:ring-primary outline-none font-bold text-on-surface"
                        placeholder="Ex: joao@email.com.br"
                      />
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 2: Alteração de Senha */}
              <div className="space-y-4 pt-2">
                <h4 className="text-[11px] font-black text-primary uppercase tracking-widest border-b border-outline-variant pb-2 flex items-center gap-2">
                  <KeyRound size={14} />
                  Alterar Senha de Acesso
                </h4>
                <p className="text-[11px] text-secondary leading-normal">
                  Preencha os campos abaixo apenas se desejar redefinir sua senha de acesso. Caso contrário, mantenha-os vazios para conservar sua senha atual.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  {/* Senha Atual */}
                  <div className="flex flex-col gap-1.5">
                    <label id="label-senha-atual" className="text-[10px] font-black text-secondary uppercase tracking-widest">
                      Senha Atual
                    </label>
                    <div className="relative">
                      <input 
                        type="password"
                        value={senhaAtual}
                        onChange={(e) => setSenhaAtual(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-sm text-xs focus:ring-1 focus:ring-primary outline-none font-mono text-on-surface"
                        placeholder="••••••••"
                      />
                      <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
                    </div>
                  </div>

                  {/* Nova Senha */}
                  <div className="flex flex-col gap-1.5">
                    <label id="label-nova-senha" className="text-[10px] font-black text-secondary uppercase tracking-widest">
                      Nova Senha
                    </label>
                    <div className="relative">
                      <input 
                        type="password"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-sm text-xs focus:ring-1 focus:ring-primary outline-none font-mono text-on-surface"
                        placeholder="Mín. 6 caracteres"
                      />
                      <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
                    </div>
                  </div>

                  {/* Confirmar Nova Senha */}
                  <div className="flex flex-col gap-1.5">
                    <label id="label-confirmar" className="text-[10px] font-black text-secondary uppercase tracking-widest">
                      Confirmar Nova Senha
                    </label>
                    <div className="relative">
                      <input 
                        type="password"
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-sm text-xs focus:ring-1 focus:ring-primary outline-none font-mono text-on-surface"
                        placeholder="Mesma senha acima"
                      />
                      <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Footer */}
            <div className="px-8 py-5 border-t border-outline-variant bg-surface-container/10 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary min-w-[180px] py-2.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
                id="save-profile-btn"
              >
                {isSaving ? (
                  <>
                    <LoadingSpinner size="xs" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Salvar Informações
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
