"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  ShieldAlert, 
  ToggleLeft, 
  ToggleRight, 
  Key, 
  Trash2, 
  UserCheck, 
  UserX, 
  Search, 
  Sliders, 
  Database, 
  Bell, 
  Lock,
  Plus,
  Loader2,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { usePathname } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import { cn } from "@/lib/utils";

interface UsuarioData {
  id: string;
  nome: string;
  email: string;
  perfil: "superAdmin" | "Admin" | "user";
  ativo: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"general" | "users">("general");

  // User list state
  const [usuarios, setUsuarios] = useState<UsuarioData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState<"superAdmin" | "Admin" | "user">("user");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // General settings simulated configurations
  const [dbStatus, setDbStatus] = useState("Conectado");
  const [notifyCertExpiration, setNotifyCertExpiration] = useState(true);
  const [autoDivergenceAudit, setAutoDivergenceAudit] = useState(true);
  const [envDescription, setEnvDescription] = useState("Produção Homologada");

  const isAdminOrSuper = user?.perfil === "superAdmin" || user?.perfil === "Admin";

  const fetchUsuarios = async () => {
    if (!isAdminOrSuper) return;
    setLoadingUsers(true);
    try {
      const resp = await fetch("/api/usuarios");
      if (resp.ok) {
        const data = await resp.json();
        setUsuarios(data);
      }
    } catch (e) {
      console.error("Erro ao carregar usuários:", e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsuarios();
    }
  }, [activeTab]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email || !perfil) {
      setFormError("Por favor, preencha todos os campos.");
      return;
    }
    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);

    try {
      const resp = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, perfil }),
      });

      let errorMessage = "";
      const contentType = resp.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        const data = await resp.json();
        if (resp.ok) {
          setFormSuccess(`Usuário ${nome} criado com sucesso! Senha padrão atribuída: senha123`);
          setNome("");
          setEmail("");
          setPerfil("user");
          fetchUsuarios();
          setTimeout(() => setShowAddForm(false), 3000);
          return;
        } else {
          errorMessage = data.error || "Erro ao cadastrar usuário.";
        }
      } else {
        const text = await resp.text();
        errorMessage = `Erro no servidor (Status ${resp.status}): ${text.slice(0, 150) || resp.statusText}`;
      }

      setFormError(errorMessage);
    } catch (err: any) {
      console.error("Erro ao cadastrar usuário:", err);
      setFormError(`Erro de conexão com o servidor: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (targetUser: UsuarioData) => {
    setActionLoadingId(targetUser.id + "_status");
    try {
      const resp = await fetch(`/api/usuarios/${targetUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !targetUser.ativo }),
      });
      if (resp.ok) {
        fetchUsuarios();
      } else {
        const data = await resp.json();
        alert(data.error || "Erro ao alterar status do usuário.");
      }
    } catch (e) {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResetPassword = async (targetUser: UsuarioData) => {
    if (!confirm(`Deseja mesmo redefinir a senha do usuário ${targetUser.nome} para a senha padrão 'senha123'?`)) {
      return;
    }
    setActionLoadingId(targetUser.id + "_reset");
    try {
      const resp = await fetch(`/api/usuarios/${targetUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetPassword: true }),
      });
      if (resp.ok) {
        alert("Senha redefinida com sucesso para 'senha123'!");
        fetchUsuarios();
      } else {
        const data = await resp.json();
        alert(data.error || "Erro ao redefinir senha.");
      }
    } catch (e) {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (targetUser: UsuarioData) => {
    if (!confirm(`ATENÇÃO: Deseja mesmo excluir permanentemente o usuário ${targetUser.nome}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setActionLoadingId(targetUser.id + "_delete");
    try {
      const resp = await fetch(`/api/usuarios/${targetUser.id}`, {
        method: "DELETE"
      });
      if (resp.ok) {
        fetchUsuarios();
      } else {
        const data = await resp.json();
        alert(data.error || "Erro ao excluir usuário.");
      }
    } catch (e) {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUpdateRole = async (targetUser: UsuarioData, newRole: "superAdmin" | "Admin" | "user") => {
    setActionLoadingId(targetUser.id + "_role");
    try {
      const resp = await fetch(`/api/usuarios/${targetUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfil: newRole }),
      });
      if (resp.ok) {
        fetchUsuarios();
      } else {
        const data = await resp.json();
        alert(data.error || "Erro ao alterar função do usuário.");
      }
    } catch (e) {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredUsers = usuarios.filter(
    (u) =>
      u.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      {/* Title Header */}
      <div className="flex flex-col gap-1.5 border-b border-outline-variant pb-6">
        <h2 className="text-xl md:text-2xl font-black text-primary tracking-tight">Configurações & Painel Administrativo</h2>
        <p className="text-xs text-secondary font-medium leading-normal">
          Gerencie permissões, conexões de banco de dados, notificações e os acessos de usuários do Compliance Portal.
        </p>
      </div>

      {/* Tabs list navigation */}
      <div className="flex gap-1 bg-surface-container/50 p-1 rounded-sm w-full sm:w-fit shrink-0 select-none border border-outline-variant/60">
        <button
          onClick={() => setActiveTab("general")}
          className={cn(
            "flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-all flex-1 sm:flex-none",
            activeTab === "general" ? "bg-white text-primary shadow-sm" : "text-secondary hover:text-primary hover:bg-white/40"
          )}
        >
          <Sliders size={15} />
          Configurações Gerais
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={cn(
            "flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-all flex-1 sm:flex-none",
            activeTab === "users" ? "bg-white text-primary shadow-sm" : "text-secondary hover:text-primary hover:bg-white/40"
          )}
        >
          <Users size={15} />
          Controle de Acessos
        </button>
      </div>

      {/* General Settings Panel CONTENT */}
      {activeTab === "general" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* Card: System Configurations */}
          <div className="card p-6 bg-white flex flex-col gap-5">
            <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-outline-variant/50">
              <Sliders size={16} />
              Configurações Operacionais
            </h3>

            {/* Config Item: Auto Audit */}
            <div className="flex items-center justify-between p-3 bg-[#FAF9FC] border border-outline-variant/40 rounded-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-on-surface">Auditoria de Divergências Automática</span>
                <span className="text-[10px] text-secondary leading-normal">Reprocessa auditoria fiscal assim que novos XMLs formem importados.</span>
              </div>
              <button 
                onClick={() => setAutoDivergenceAudit(!autoDivergenceAudit)}
                className="text-primary hover:opacity-85 transition-opacity"
              >
                {autoDivergenceAudit ? <ToggleRight size={38} className="text-[#1B365D] stroke-[1.5]" /> : <ToggleLeft size={38} className="text-secondary opacity-60 stroke-[1.5]" />}
              </button>
            </div>

            {/* Config Item: Certificate Alerts */}
            <div className="flex items-center justify-between p-3 bg-[#FAF9FC] border border-outline-variant/40 rounded-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-on-surface">Vencimento de Certificados Digitais</span>
                <span className="text-[10px] text-secondary leading-normal">Alertas no dashboard e email com antecedência de 30 dias.</span>
              </div>
              <button 
                onClick={() => setNotifyCertExpiration(!notifyCertExpiration)}
                className="text-primary hover:opacity-85 transition-opacity"
              >
                {notifyCertExpiration ? <ToggleRight size={38} className="text-[#1B365D] stroke-[1.5]" /> : <ToggleLeft size={38} className="text-secondary opacity-60 stroke-[1.5]" />}
              </button>
            </div>

            {/* Environment Display */}
            <div>
              <label className="block text-[10px] font-bold text-secondary uppercase tracking-wider mb-2">Ambiente de Operação</label>
              <input 
                type="text" 
                value={envDescription}
                onChange={(e) => setEnvDescription(e.target.value)}
                className="w-full text-xs font-semibold text-primary bg-[#FAF9FC] border border-outline-variant/60 rounded-sm px-3.5 py-2 outline-none focus:border-[#1B365D] focus:bg-white transition-all shadow-sm"
              />
            </div>
            
            <button 
              onClick={() => alert("As configurações operacionais foram salvas para este ambiente.")}
              className="bg-primary hover:opacity-90 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-sm text-center w-full shadow-sm mt-2"
            >
              SALVAR CONFIGURAÇÕES
            </button>
          </div>

          {/* Card: System Infrastructure Health */}
          <div className="card p-6 bg-white flex flex-col gap-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-outline-variant/50">
              <Database size={16} />
              Infraestrutura & Diagnóstico
            </h3>

            <div className="space-y-4">
              {/* DB Status */}
              <div className="flex justify-between items-center py-2.5 border-b border-outline-variant/40">
                <span className="text-xs font-medium text-secondary">Banco de Dados Relacional</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                  Prisma DB {dbStatus}
                </span>
              </div>

              {/* Connected User details */}
              <div className="flex justify-between items-center py-2.5 border-b border-outline-variant/40">
                <span className="text-xs font-medium text-secondary">Acesso Ativo</span>
                <span className="text-xs font-bold text-primary">{user?.email}</span>
              </div>

              {/* Current Role details */}
              <div className="flex justify-between items-center py-2.5 border-b border-outline-variant/40">
                <span className="text-xs font-medium text-secondary">Regra de Acesso (Perfil)</span>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
                  user?.perfil === "superAdmin" ? "bg-red-50 text-red-700 border border-red-200" :
                  user?.perfil === "Admin" ? "bg-orange-50 text-orange-700 border border-orange-200" :
                  "bg-blue-50 text-blue-700 border border-blue-200"
                )}>
                  {user?.perfil}
                </span>
              </div>

              {/* Version Code */}
              <div className="flex justify-between items-center py-2.5">
                <span className="text-xs font-medium text-secondary">Versão do Sistema</span>
                <span className="text-xs font-mono font-bold text-on-surface">v2.4.0 (Stable release)</span>
              </div>
            </div>

            <div className="bg-primary/5 p-4 rounded-sm border border-primary/10 mt-2">
              <p className="text-[10px] text-secondary font-medium leading-relaxed leading-normal">
                Sua sessão de acesso está segurada por encriptação simétrica AES-CBC 256 bits gerada dinamicamente pelo servidor local. Para sua segurança, alterações em dados operacionais sensíveis são integradas aos registros de auditoria geral e timeline pública.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* Control de Acessos (User Management) Panel CONTENT */}
      {activeTab === "users" && (
        <div className="flex flex-col gap-6">
          
          {/* Lock message if not Admin or SuperAdmin */}
          {!isAdminOrSuper ? (
            <div className="card p-10 bg-white flex flex-col items-center justify-center text-center gap-4 border border-outline-variant shadow-md max-w-2xl mx-auto">
              <div className="p-3 bg-red-50 text-red-600 rounded-full">
                <Lock size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-[#1B365D] uppercase tracking-wide">Acesso de Administrador Necessário</h4>
                <p className="text-xs text-secondary max-w-md mx-auto leading-normal">
                  Seu perfil de acesso atual (<strong className="uppercase text-primary font-bold">{user?.perfil}</strong>) possui direitos de visualização e auditoria fiscal, mas não possui permissão para cadastrar ou gerenciar contas de usuários.
                </p>
              </div>
            </div>
          ) : (
            // ACTUAL USER MANAGEMENT PANEL (AVAILABLE FOR SUPERADMIN & ADMIN)
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              
              {/* Column 1: User List & Filters */}
              <div className="w-full lg:flex-1 card p-6 bg-white flex flex-col gap-5">
                
                {/* Header operations bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                    <Users size={16} />
                    Gestão Geral de Contas ({usuarios.length})
                  </h3>

                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="bg-primary hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-sm flex items-center gap-2 transition-all shadow-md shrink-0"
                  >
                    <UserPlus size={16} />
                    ADICIONAR USUÁRIO
                  </button>
                </div>

                {/* Filter and Search Bar */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-secondary">
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrar por nome ou e-mail de usuário..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-[#f3f4f6]/60 border border-outline-variant/60 rounded-sm outline-none focus:border-primary focus:bg-white transition-all shadow-sm"
                  />
                </div>

                {/* Users List Data Table / Grid */}
                {loadingUsers ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <LoadingSpinner size="lg" />
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Carregando usuários do sistema...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-16 text-center border border-dashed border-outline-variant/70 rounded-sm p-6">
                    <p className="text-xs font-bold text-secondary">Nenhum usuário encontrado</p>
                    <p className="text-[10px] text-secondary/70 mt-1">Insira um novo usuário ou mude termos da sua pesquisa.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[650px]">
                      <thead>
                        <tr className="border-b border-outline-variant text-[10px] font-bold text-secondary uppercase tracking-wider select-none bg-surface-container/23">
                          <th className="py-3 px-4">Nome & Email</th>
                          <th className="py-3 px-4">Perfil / Regra</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Criado Em</th>
                          <th className="py-3 px-4 text-right">Ações Operacionais</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => {
                          const isSelf = u.id === user?.id;
                          const isRoleActionLoading = actionLoadingId === u.id + "_role";
                          const isStatusActionLoading = actionLoadingId === u.id + "_status";
                          const isResetActionLoading = actionLoadingId === u.id + "_reset";
                          const isDeleteActionLoading = actionLoadingId === u.id + "_delete";

                          return (
                            <tr key={u.id} className="border-b border-outline-variant/50 text-xs hover:bg-[#FAF9FC]/30 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="flex flex-col">
                                  <span className="font-bold text-on-surface flex items-center gap-2">
                                    {u.nome}
                                    {isSelf && (
                                      <span className="text-[8px] tracking-wider font-extrabold uppercase bg-[#1B365D] text-white px-1.5 py-[1px] rounded-sm">Meu Perfil</span>
                                    )}
                                  </span>
                                  <span className="text-[10px] text-secondary font-medium font-mono mt-0.5">{u.email}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                {isSelf || (user?.perfil === "Admin" && u.perfil === "superAdmin") ? (
                                  <span className={cn(
                                    "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
                                    u.perfil === "superAdmin" ? "bg-red-50 text-red-700 border border-red-200" :
                                    u.perfil === "Admin" ? "bg-orange-50 text-orange-700 border border-orange-200" :
                                    "bg-blue-50 text-blue-700 border border-blue-200"
                                  )}>
                                    {u.perfil}
                                  </span>
                                ) : (
                                  <select
                                    value={u.perfil}
                                    onChange={(e) => handleUpdateRole(u, e.target.value as any)}
                                    disabled={isRoleActionLoading}
                                    className="text-xs bg-[#FAF9FC] border border-outline-variant/60 rounded px-1.5 py-1 font-semibold text-primary outline-none focus:border-[#1B365D] cursor-pointer"
                                  >
                                    {user?.perfil === "superAdmin" && <option value="superAdmin">superAdmin</option>}
                                    <option value="Admin">Admin</option>
                                    <option value="user">user</option>
                                  </select>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <button
                                  onClick={() => handleToggleStatus(u)}
                                  disabled={isSelf || isStatusActionLoading || (user?.perfil === "Admin" && u.perfil === "superAdmin")}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 text-[10px] font-bold tracking-tight px-2.5 py-0.5 rounded-full border transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-85",
                                    u.ativo 
                                      ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100/50" 
                                      : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100/50"
                                  )}
                                  title={isSelf ? "Não é possível desativar si mesmo" : "Mudar Status"}
                                >
                                  {isStatusActionLoading ? (
                                    <LoadingSpinner size="xs" />
                                  ) : u.ativo ? (
                                    <UserCheck size={11} />
                                  ) : (
                                    <UserX size={11} />
                                  )}
                                  {u.ativo ? "ATIVO" : "INATIVO"}
                                </button>
                              </td>
                              <td className="py-3.5 px-4 text-secondary font-medium font-mono text-[10px]">
                                {new Date(u.createdAt).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="inline-flex gap-2">
                                  {/* Reset Password */}
                                  <button
                                    onClick={() => handleResetPassword(u)}
                                    disabled={isResetActionLoading || (user?.perfil === "Admin" && u.perfil === "superAdmin")}
                                    className="p-1.5 text-secondary hover:text-indigo-600 hover:bg-[#FAF9FC] border border-transparent hover:border-outline-variant rounded transition-colors active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                                    title="Resetar senha para padrão (senha123)"
                                  >
                                    {isResetActionLoading ? <LoadingSpinner size="xs" /> : <Key size={14} />}
                                  </button>
                                  
                                  {/* Delete Account */}
                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    disabled={isSelf || isDeleteActionLoading || (user?.perfil === "Admin" && u.perfil === "superAdmin")}
                                    className="p-1.5 text-secondary hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded transition-colors active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                                    title="Excluir Usuário"
                                  >
                                    {isDeleteActionLoading ? <LoadingSpinner size="xs" /> : <Trash2 size={14} />}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Column 2: Side Panel (Slide form or Security Hierarchy Help) */}
              <div className="w-full lg:w-[350px] space-y-6 shrink-0">
                {/* Form to Add User */}
                {showAddForm && (
                  <div className="card p-6 bg-white border-2 border-indigo-100 flex flex-col gap-4 animate-fadeIn">
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-indigo-100">
                      <UserPlus size={16} className="text-indigo-600" />
                      Novo Cadastro de Usuário
                    </h3>

                    {formError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-[10px] leading-snug font-semibold rounded-sm">
                        {formError}
                      </div>
                    )}

                    {formSuccess && (
                      <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-[10px] leading-snug font-semibold rounded-sm">
                        {formSuccess}
                      </div>
                    )}

                    <form onSubmit={handleCreateUser} className="space-y-4">
                      {/* Name */}
                      <div>
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Nome Completo</label>
                        <input
                          type="text"
                          required
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          placeholder="Ex: João da Silva"
                          className="w-full text-xs font-semibold text-primary bg-[#FAF9FC] border border-outline-variant/60 rounded-sm px-3 py-2 outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-inner"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Endereço de E-mail</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Ex: joao@empresa.com"
                          className="w-full text-xs font-semibold text-primary bg-[#FAF9FC] border border-outline-variant/60 rounded-sm px-3 py-2 outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-inner"
                        />
                      </div>

                      {/* Rule profile definition */}
                      <div>
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Perfil de Acesso</label>
                        <select
                          value={perfil}
                          onChange={(e) => setPerfil(e.target.value as any)}
                          className="w-full text-xs font-semibold text-primary bg-[#FAF9FC] border border-outline-variant/60 rounded-sm px-3 py-2 outline-none focus:border-indigo-600 cursor-pointer"
                        >
                          {user?.perfil === "superAdmin" && <option value="superAdmin">superAdmin (Acesso Total)</option>}
                          <option value="Admin">Admin (Administrador)</option>
                          <option value="user font-normal">user (Usuário comum)</option>
                        </select>
                      </div>

                      {/* Prompt standard password */}
                      <div className="p-2.5 bg-yellow-55/15 border border-amber-200 text-amber-800 text-[9px] leading-relaxed rounded font-medium">
                        A senha inicial atribuída automaticamente a todo novo cadastro será <strong className="font-bold text-primary">senha123</strong>. O usuário poderá alterá-la futuramente.
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddForm(false)}
                          className="flex-1 border border-outline-variant text-secondary font-bold text-[10px] uppercase tracking-wider py-2 rounded-sm active:scale-95 transition-all text-center"
                        >
                          CANCELAR
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex-1 bg-[#1B365D] hover:bg-[#152a4a] text-white font-bold text-[10px] uppercase tracking-wider py-2 rounded-sm active:scale-95 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          {isSubmitting ? <LoadingSpinner size="xs" /> : null}
                          CADASTRAR
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Security Policies block Card */}
                <div className="card p-6 bg-white flex flex-col gap-3.5">
                  <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                    <ShieldAlert size={16} />
                    Matriz de Privilégios
                  </h4>

                  <ul className="space-y-3 text-[11px] leading-relaxed text-secondary font-semibold font-sans">
                    <li className="p-2 border-l-2 border-red-500 bg-red-50/20">
                      <strong className="text-red-700 block text-[10px] uppercase tracking-wider font-mono">superAdmin</strong>
                      Acesso completo às ferramentas operacionais fiscais, configurações gerais da infraestrutura e exclusão/promoção irrestrita de usuários.
                    </li>
                    <li className="p-2 border-l-2 border-orange-500 bg-orange-50/20">
                      <strong className="text-orange-700 block text-[10px] uppercase tracking-wider font-mono">Admin</strong>
                      Pode gerenciar de forma autônoma certificados digitais, cadastrar emissores e gerenciar contas com regras <span className="font-bold">user</span> e <span className="font-bold">Admin</span>. Não altera contas <span className="font-bold">superAdmin</span>.
                    </li>
                    <li className="p-2 border-l-2 border-blue-500 bg-blue-50/20">
                      <strong className="text-blue-700 block text-[10px] uppercase tracking-wider font-mono">user</strong>
                      Visualiza auditoria, importa arquivos de XML e relatórios gerais de conformidade. Não possui acesso operacional de edição administrativa.
                    </li>
                  </ul>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
