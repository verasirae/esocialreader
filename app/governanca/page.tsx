"use client";

import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Users, 
  Key, 
  Database,
  Sliders, 
  Cpu, 
  Plus, 
  Trash2, 
  UserCheck, 
  UserX, 
  Search, 
  FileCheck2, 
  RefreshCw, 
  Check, 
  Eye, 
  Edit3, 
  TrendingUp, 
  Server, 
  Activity, 
  X, 
  ShieldAlert,
  Lock,
  Stamp,
  Globe,
  Gauge,
  AlertTriangle,
  Compass,
  History,
  CloudUpload,
  Calendar,
  CheckCircle2
} from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface DynamicProfile {
  id: string;
  nomePerfil: string;
  descricao: string;
  permissoes: Record<string, boolean>;
}

interface LogEntry {
  id: string;
  usuarioNome: string;
  perfil: string;
  acao: string;
  descricao: string;
  createdAt: string;
  detalhes?: any;
}

interface GlobalConfig {
  id: string;
  chave: string;
  valor: string;
  descricao: string;
}

interface SystemQueue {
  id: string;
  nome: string;
  pendentes: number;
  processando: number;
  taxa: string;
  ativo: boolean;
}

// Default keys for checkboxes in dynamic profile permissions
const PERMISSION_KEYS = [
  { key: "visualizarDashboard", label: "Acessar Dashboard Geral" },
  { key: "esocial", label: "Diretório /esocial (eSocial S-5002)" },
  { key: "reinf", label: "Diretório /reinf (EFD-REINF)" },
  { key: "empregadores", label: "Diretório /empregadores (Gestão de Empregadores)" },
  { key: "trabalhadores", label: "Diretório /trabalhadores (Cadastro de Trabalhadores)" },
  { key: "operadoras", label: "Diretório /operadoras (Operadoras de Saúde)" },
  { key: "consolidacao", label: "Diretório /consolidacao (Consolidação Fiscal)" },
  { key: "codigos", label: "Diretório /codigos-receita (Códigos de Receita)" },
  { key: "pendencias", label: "Diretório /pendencias (Pendências)" },
  { key: "periodos", label: "Diretório /periodos (Períodos Fiscais)" },
  { key: "settings", label: "Diretório /settings (Configurações)" },
  { key: "governanca", label: "Diretório /governanca (Governança)" },
  { key: "importarXml", label: "Ação: Importar Arquivos XML" },
  { key: "reprocessarEventos", label: "Ação: Reprocessar Eventos Fiscais" },
  { key: "excluirDados", label: "Ação: Excluir Dados do Sistema" },
  { key: "configurarIntegracoes", label: "Ação: Configurar Integrações" },
  { key: "consultarLogs", label: "Ação: Consultar Históricos e Logs" }
];

const DETAILED_MODULES = [
  { key: "esocial", label: "eSocial (S-5002)" },
  { key: "reinf", label: "EFD-REINF" },
  { key: "empresas", label: "Gestão de Empregadores" },
  { key: "trabalhadores", label: "Cadastro de Trabalhadores" },
  { key: "operadoras", label: "Operadoras de Saúde" },
  { key: "consolidacao", label: "Consolidação Fiscal" },
  { key: "codigos", label: "Códigos de Receita RFB" },
  { key: "usuarios", label: "Controle de Usuários" },
  { key: "logs", label: "Histórico e Logs Técnicos" },
  { key: "configs", label: "Configuração e Licenciamento" },
];

const DETAILED_ACTIONS = [
  { key: "visualizar", label: "Visualizar" },
  { key: "criar", label: "Criar" },
  { key: "editar", label: "Editar" },
  { key: "excluir", label: "Excluir" },
];

const formatPermissionKey = (key: string) => {
  if (key.includes("_")) {
    const parts = key.split("_");
    const mod = parts[0];
    const act = parts[1];
    
    let modLabel = mod;
    switch (mod) {
      case "esocial": modLabel = "eSocial"; break;
      case "reinf": modLabel = "REINF"; break;
      case "empresas": modLabel = "Empregadores"; break;
      case "trabalhadores": modLabel = "Trabalhadores"; break;
      case "operadoras": modLabel = "Operadoras"; break;
      case "consolidacao": modLabel = "Consolidação"; break;
      case "codigos": modLabel = "Cd. Receita"; break;
      case "usuarios": modLabel = "Usuários"; break;
      case "logs": modLabel = "Logs"; break;
      case "configs": modLabel = "Config/Licença"; break;
    }
    
    return `${modLabel}: ${act.charAt(0).toUpperCase() + act.slice(1)}`;
  }
  const existing = PERMISSION_KEYS.find(p => p.key === key);
  return existing ? existing.label : key;
};

export default function GovernanceDashboard() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "perfis" | "logs" | "configs" | "fiscais" | "filas" | "consumo">("overview");
  const [loading, setLoading] = useState(true);

  // Stats State
  const [stats, setStats] = useState({
    totalUsuarios: 0,
    totalEmpresas: 0,
    totalLotes: 0,
    totalEventos: 0,
    logCount: 0,
    pendentes: 0,
    processados: 0,
    erros: 0
  });

  // User Administration State
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPerfil, setNewUserPerfil] = useState("OPERADOR");
  const [userSearchText, setUserSearchText] = useState("");
  const [userActionLoadingId, setUserActionLoadingId] = useState<string | null>(null);

  // User Editing State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserPerfil, setEditUserPerfil] = useState("OPERADOR");
  const [editUserResetPassword, setEditUserResetPassword] = useState(false);
  const [editUserBloqueadoGerais, setEditUserBloqueadoGerais] = useState(false);
  const [editUserModulosBloqueados, setEditUserModulosBloqueados] = useState<string[]>([]);

  // User Creating Blocking State
  const [newUserBloqueadoGerais, setNewUserBloqueadoGerais] = useState(false);
  const [newUserModulosBloqueados, setNewUserModulosBloqueados] = useState<string[]>([]);

  // Helper to initialize full permissions map (including granular dimensions)
  const initialPermissions = () => {
    const base: Record<string, boolean> = {};
    PERMISSION_KEYS.forEach((p) => {
      base[p.key] = false;
    });
    DETAILED_MODULES.forEach((m) => {
      DETAILED_ACTIONS.forEach((a) => {
        base[`${m.key}_${a.key}`] = false;
      });
    });
    return base;
  };

  // Dynamic Profile permissions State
  const [perfis, setPerfis] = useState<DynamicProfile[]>([]);
  const [newProfileOpen, setNewProfileOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileDesc, setNewProfileDesc] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, boolean>>(initialPermissions());
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  // Auxiliary fiscal codes State
  const [codigosFiscais, setCodigosFiscais] = useState<any[]>([]);
  const [newFiscalOpen, setNewFiscalOpen] = useState(false);
  const [fiscalCodigo, setFiscalCodigo] = useState("");
  const [fiscalDenominacao, setFiscalDenominacao] = useState("");
  const [fiscalBase, setFiscalBase] = useState("");

  // Audit Logs State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsSearch, setLogsSearch] = useState("");

  // Global Config list
  const [configs, setConfigs] = useState<GlobalConfig[]>([]);

  // System queues
  const [queues, setQueues] = useState<SystemQueue[]>([]);

  // Company list for super_admin deletion & management
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [companySearch, setCompanySearch] = useState("");

  // Processing Timeline history state
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const isSuperAdmin = user?.perfil.toUpperCase() === "SUPER_ADMIN";
  const isAdmin = user?.perfil.toUpperCase() === "ADMIN";

  // Security Check
  const hasAccess = isSuperAdmin || isAdmin;

  // Load all tab data dynamically
  const fetchTabData = async () => {
    setLoading(true);
    try {
      // 1. Overview stats
      const statsRes = await fetch("/api/governanca?tab=overview");
      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.stats);
      }

      // 2. Users
      const usersRes = await fetch("/api/usuarios");
      if (usersRes.ok) {
        const d = await usersRes.json();
        setUsuarios(d);
      }

      // 3. Profiles
      const profilesRes = await fetch("/api/governanca?tab=permissoes");
      if (profilesRes.ok) {
        const d = await profilesRes.json();
        setPerfis(d);
      }

      // 4. Logs
      const logsRes = await fetch("/api/governanca?tab=logs");
      if (logsRes.ok) {
        const d = await logsRes.json();
        setLogs(d.logs);
      }

      // 5. Configs
      const configsRes = await fetch("/api/governanca?tab=config");
      if (configsRes.ok) {
        const d = await configsRes.json();
        setConfigs(d);
      }

      // 6. Queues
      const queuesRes = await fetch("/api/governanca?tab=filas");
      if (queuesRes.ok) {
        const d = await queuesRes.json();
        setQueues(d.filas);
      }

      // 7. Companies
      const empresasRes = await fetch("/api/governanca?tab=empresas");
      if (empresasRes.ok) {
        const d = await empresasRes.json();
        setEmpresas(d);
      }

      // 8. Fiscal codes
      const rfbRes = await fetch("/api/fiscal");
      if (rfbRes.ok) {
        const d = await rfbRes.json();
        setCodigosFiscais(d);
      }

      // 9. Processing Timeline and Audit
      setIsLoadingHistory(true);
      const histRes = await fetch("/api/fiscal/history");
      if (histRes.ok) {
        const d = await histRes.json();
        setHistory(d);
      }
      setIsLoadingHistory(false);
    } catch (e) {
      console.error("Erro ao carregar dados de governança:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      fetchTabData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white rounded-sm border border-outline-variant/60 shadow-sm max-w-2xl mx-auto my-12 text-center">
        <ShieldAlert size={48} className="text-red-600 mb-4 animate-bounce" />
        <h3 className="text-lg font-black text-primary uppercase tracking-wider mb-2">Acesso Restrito do Sistema</h3>
        <p className="text-sm text-secondary leading-normal mb-4">
          Esta área é restrita exclusivamente a usuários com perfil de <strong className="text-primary">SUPER_ADMIN</strong> ou <strong className="text-primary">ADMIN</strong>. 
          Seu perfil atual é <span className="font-extrabold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-sm">{user?.perfil}</span>.
        </p>
        <button 
          onClick={() => window.location.href = "/"}
          className="btn-primary py-2 px-6"
        >
          Voltar para o Dashboard
        </button>
      </div>
    );
  }

  // Action Handlers

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserPerfil) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    if (isAdmin && newUserPerfil.toUpperCase() === "SUPER_ADMIN") {
      alert("Operação Bloqueada: Administradores não podem promover usuários para SuperAdmin.");
      return;
    }

    try {
      const resp = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: newUserName,
          email: newUserEmail,
          perfil: newUserPerfil,
          bloqueadoGeraisState: newUserBloqueadoGerais,
          modulosBloqueadosState: newUserModulosBloqueados.join(",")
        })
      });
      if (resp.ok) {
        alert(`Usuário ${newUserName} criado com sucesso inicializado com senha padrão: senha123`);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserBloqueadoGerais(false);
        setNewUserModulosBloqueados([]);
        setNewUserOpen(false);
        fetchTabData();
      } else {
        const err = await resp.json();
        alert(err.error || "Erro ao registrar usuário.");
      }
    } catch (e) {
      alert("Erro ao conectar com o servidor.");
    }
  };

  // Toggle User Active Status
  const handleToggleUserStatus = async (targetUser: any) => {
    if (targetUser.id === user?.id) {
      alert("Você não pode desativar o seu próprio usuário.");
      return;
    }

    if (isAdmin && (targetUser.perfil.toUpperCase() === "SUPER_ADMIN" || targetUser.perfil.toUpperCase() === "ADMIN")) {
      alert("Operação Bloqueada: Administrador comum não pode alterar status de outros Administradores.");
      return;
    }

    setUserActionLoadingId(targetUser.id + "_status");
    try {
      const resp = await fetch(`/api/usuarios/${targetUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !targetUser.ativo }),
      });
      if (resp.ok) {
        fetchTabData();
      } else {
        const data = await resp.json();
        alert(data.error || "Erro ao atualizar status.");
      }
    } catch (e) {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setUserActionLoadingId(null);
    }
  };

  // Delete User
  const handleDeleteUser = async (targetUser: any) => {
    if (targetUser.id === user?.id) {
      alert("Não é possível faturar sua própria exclusão.");
      return;
    }

    if (isAdmin) {
      alert("Iniciativa Bloqueada: Administradores não podem excluir permanentemente usuários.");
      return;
    }

    if (!confirm(`Deseja mesmo remover permanentemente o usuário ${targetUser.nome}? Ação irreversível.`)) {
      return;
    }

    setUserActionLoadingId(targetUser.id + "_delete");
    try {
      const resp = await fetch(`/api/usuarios/${targetUser.id}`, { method: "DELETE" });
      if (resp.ok) {
        fetchTabData();
      } else {
        const data = await resp.json();
        alert(data.error || "Erro ao deletar usuário.");
      }
    } catch (e) {
      alert("Erro no servidor.");
    } finally {
      setUserActionLoadingId(null);
    }
  };

  // Impersonate User
  const handleImpersonateUser = async (targetUser: any) => {
    if (!isSuperAdmin && !isAdmin) {
      alert("Iniciativa Bloqueada: Apenas Administradores possuem privilégios de impersonificar outras contas.");
      return;
    }

    if (targetUser.id === user?.id) {
      alert("Você já está na sua própria conta.");
      return;
    }

    if (targetUser.perfil.toUpperCase() === "SUPER_ADMIN") {
      alert("Por motivos de segurança, você não pode impersonar outro SuperAdmin.");
      return;
    }

    if (!confirm(`Deseja simular o ambiente fiscal e perfil sob a identidade de ${targetUser.nome} (${targetUser.perfil})?`)) {
      return;
    }

    setUserActionLoadingId(targetUser.id + "_impersonate");
    try {
      const resp = await fetch("/api/governanca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "impersonate", targetUserId: targetUser.id })
      });
      if (resp.ok) {
        await refreshUser();
        window.location.href = "/";
      } else {
        const data = await resp.json();
        alert(data.error || "Erro ao iniciar simulação.");
      }
    } catch (e) {
      alert("Erro de conexão.");
    } finally {
      setUserActionLoadingId(null);
    }
  };

  // Save Config Global
  const handleSaveConfig = async (chave: string, valor: string) => {
    if (chave === "LICENCIAMENTO_TIPO" && !isSuperAdmin) {
      alert("Ação Bloqueada: Apenas SuperAdmin de licenciamento pode alterar a licença global do sistema.");
      return;
    }

    try {
      const resp = await fetch("/api/governanca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-config", chave, valor })
      });
      if (resp.ok) {
        fetchTabData();
        alert(`Configuração ${chave} redefinida com sucesso para: ${valor}`);
      } else {
        const data = await resp.json();
        alert(data.error || "Falha ao gravar configuração.");
      }
    } catch (e) {
      alert("Erro de conexão.");
    }
  };

  // Save Dynamic Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin && !isAdmin) {
      alert("Restrição: Apenas Administradores possuem poderes de alteração em perfis/diretrizes de segurança dinâmicas.");
      return;
    }

    if (!newProfileName) {
      alert("Defina o nome do perfil.");
      return;
    }

    try {
      const resp = await fetch("/api/governanca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "save-profile", 
          id: editingProfileId,
          nomePerfil: newProfileName, 
          descricao: newProfileDesc, 
          permissoes: selectedPermissions 
        })
      });

      if (resp.ok) {
        alert(editingProfileId ? `Perfil ${newProfileName.toUpperCase()} atualizado.` : `Perfil ${newProfileName.toUpperCase()} criado.`);
        setNewProfileName("");
        setNewProfileDesc("");
        setSelectedPermissions(initialPermissions());
        setNewProfileOpen(false);
        setEditingProfileId(null);
        fetchTabData();
      } else {
        const d = await resp.json();
        alert(d.error || "Erro ao processar alteração do perfil.");
      }
    } catch (e) {
      alert("Falha técnica no servidor.");
    }
  };

  // Pre-fill profile form for editing
  const handleEditProfileInit = (prof: DynamicProfile) => {
    setEditingProfileId(prof.id);
    setNewProfileName(prof.nomePerfil);
    setNewProfileDesc(prof.descricao || "");
    
    const updatedPerms = initialPermissions();
    PERMISSION_KEYS.forEach((p) => {
      updatedPerms[p.key] = !!prof.permissoes[p.key];
    });
    DETAILED_MODULES.forEach((m) => {
      DETAILED_ACTIONS.forEach((a) => {
        const fullKey = `${m.key}_${a.key}`;
        updatedPerms[fullKey] = !!prof.permissoes[fullKey];
      });
    });
    setSelectedPermissions(updatedPerms);
    setNewProfileOpen(true);
  };

  // Pre-fill user edit state
  const handleEditUserInit = (targetUser: any) => {
    if (isAdmin && (targetUser.perfil.toUpperCase() === "SUPER_ADMIN" || targetUser.perfil.toUpperCase() === "ADMIN") && targetUser.id !== user?.id) {
      alert("Operação Bloqueada: Administrador comum não possui poder para alterar outro Administrador ou SuperAdmin.");
      return;
    }

    setEditingUserId(targetUser.id);
    setEditUserName(targetUser.nome);
    setEditUserEmail(targetUser.email);
    setEditUserPerfil(targetUser.perfil);
    setEditUserResetPassword(false);
    setEditUserBloqueadoGerais(!!targetUser.bloqueadoGerais);
    const blockedList = targetUser.modulosBloqueados
      ? targetUser.modulosBloqueados.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];
    setEditUserModulosBloqueados(blockedList);
  };

  // Save modified user details
  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;

    setUserActionLoadingId(editingUserId + "_update_form");
    try {
      const resp = await fetch(`/api/usuarios/${editingUserId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: editUserName,
          perfil: editUserPerfil,
          resetPassword: editUserResetPassword,
          bloqueadoGerais: editUserBloqueadoGerais,
          modulosBloqueados: editUserModulosBloqueados.join(",")
        }),
      });

      if (resp.ok) {
        alert("Dados cadastrais do usuário atualizados com sucesso.");
        setEditingUserId(null);
        fetchTabData();
      } else {
        const data = await resp.json();
        alert(data.error || "Erro ao atualizar usuário.");
      }
    } catch (e) {
      alert("Erro ao conectar com o serviço.");
    } finally {
      setUserActionLoadingId(null);
    }
  };

  // Remove Dynamic Profile
  const handleDeleteProfile = async (profileId: string) => {
    if (!isSuperAdmin && !isAdmin) {
      alert("Apenas Administradores podem remover perfis.");
      return;
    }

    if (!confirm("Deseja mesmo remover permanentemente este perfil dinâmico? Usuários associados a ele passarão a adotar privilégios mínimos.")) {
      return;
    }

    try {
      const resp = await fetch("/api/governanca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-profile", profileId })
      });
      if (resp.ok) {
        fetchTabData();
      } else {
        const data = await resp.json();
        alert(data.error || "Erro de API.");
      }
    } catch (e) {
      alert("Erro de conexão.");
    }
  };

  // Create Fiscal Code (SUPER_ADMIN Only)
  const handleSaveFiscal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      alert("Apenas SuperAdmins podem alterar códigos fiscais auxiliares.");
      return;
    }

    if (!fiscalCodigo || !fiscalDenominacao) {
      alert("Código do imposto e Denominação de receita obrigatórios.");
      return;
    }

    try {
      const resp = await fetch("/api/governanca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "save-codigo-receita", 
          codigo: fiscalCodigo, 
          denominacao: fiscalDenominacao, 
          baseLegal: fiscalBase ? fiscalBase.split(",").map(b => b.trim()) : []
        })
      });

      if (resp.ok) {
        alert(`Código fiscal ${fiscalCodigo} adicionado/atualizado com sucesso!`);
        setFiscalCodigo("");
        setFiscalDenominacao("");
        setFiscalBase("");
        setNewFiscalOpen(false);
        fetchTabData();
      } else {
        const d = await resp.json();
        alert(d.error || "Erro técnico.");
      }
    } catch (e) {
      alert("Erro de conexão.");
    }
  };

  // Clear Critical Data - Delete Empresa (Only SuperAdmin can perform cascading wipeout)
  const handleDeleteCompany = async (empId: string, companyName: string) => {
    if (!isSuperAdmin) {
      alert("Iniciativa Bloqueada: Administradores comuns não podem faturar ou excluir dados críticos (como Empregadores inteiros).");
      return;
    }

    if (!confirm(`🚨 PERIGO EXTREMO: Deseja redefinir todo o banco de dados desassociado a ${companyName}? Isto excluirá todos os XMLs de eSocial, lotes, demonstrativos, histórico, auditorias e trabalhadores relacionados. Confirma?`)) {
      return;
    }

    try {
      const resp = await fetch("/api/governanca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-empresa", empresaId: empId })
      });
      if (resp.ok) {
        alert(`Empregador ${companyName} e todos os registros fiscais associados foram fisicamente removidos.`);
        fetchTabData();
      } else {
        const err = await resp.json();
        alert(err.error || "Erro ao faturar limpeza.");
      }
    } catch (e) {
      alert("Conexão interrompida.");
    }
  };

  // Reprocess Selected XML batch
  const handleReprocessLote = async (loteId: string) => {
    if (!confirm("Deseja forçar o motor S-5002 a efetuar a re-comparações fiscais e parsing deste lote de XMLs?")) {
      return;
    }

    try {
      const resp = await fetch("/api/governanca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reprocess-xml", loteId })
      });
      if (resp.ok) {
        alert(`Processamento desencadeado com sucesso! Os eventos retornaram para a fila 'pendente'.`);
        fetchTabData();
      } else {
        const d = await resp.json();
        alert(d.error || "Falha técnica.");
      }
    } catch (e) {
      alert("Erro no servidor.");
    }
  };

  // Filtered queries
  const filteredUsers = usuarios.filter(
    (u) =>
      u.nome.toLowerCase().includes(userSearchText.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchText.toLowerCase()) ||
      u.perfil.toLowerCase().includes(userSearchText.toLowerCase())
  );

  const filteredLogs = logs.filter(
    (l) =>
      l.usuarioNome.toLowerCase().includes(logsSearch.toLowerCase()) ||
      l.acao.toLowerCase().includes(logsSearch.toLowerCase()) ||
      l.descricao.toLowerCase().includes(logsSearch.toLowerCase())
  );

  const filteredCompanies = empresas.filter(
    (c) =>
      c.razaoSocial.toLowerCase().includes(companySearch.toLowerCase()) ||
      c.cnpjRaiz.includes(companySearch)
  );

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      
      {/* Upper Context Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant pb-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2 text-[9px] font-black tracking-widest text-[#1B365D] bg-[#1B365D]/5 border border-[#1B365D]/25 rounded-sm uppercase">
              Governança Corporativa
            </span>
            <span className="text-secondary/50 text-xs">|</span>
            <span className="text-xs font-black text-amber-850 bg-amber-50 rounded-sm border border-amber-250 px-2 py-0.2 uppercase">
              Nível: {user?.perfil}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-primary tracking-tight flex items-center gap-2">
            <Shield size={24} className="text-[#1B365D]" />
            Módulo de Governança & Acessos
          </h2>
          <p className="text-xs text-secondary font-medium leading-normal max-w-3xl">
            Painel administrativo unificado do sistema. Configure limites globais, licenças operacionais, crie perfis e monitore processamentos XML para compliance nacional da DIRF e eSocial S-5002.
          </p>
        </div>

        {/* Global Action Trigger indicator */}
        <button 
          onClick={fetchTabData}
          className="flex items-center gap-2 text-xs font-bold text-[#1B365D] hover:bg-[#1B365D]/5 border border-outline-variant px-4 py-2 rounded-sm transition-all shadow-xs"
        >
          <RefreshCw size={14} className={cn("text-secondary", loading && "animate-spin")} />
          Sincronizar Dados
        </button>
      </div>

      {/* Grid overview stats (Visão Geral) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="border border-outline-variant bg-white p-4 rounded-sm flex items-center gap-4 shadow-xs">
          <div className="p-3 rounded-full bg-indigo-50 text-indigo-700">
            <Users size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-secondary tracking-widest leading-none">Usuários Cadastrados</span>
            <span className="text-lg md:text-xl font-bold text-primary mt-1">{loading ? "..." : stats.totalUsuarios}</span>
          </div>
        </div>

        {/* Total Employers */}
        <div className="border border-outline-variant bg-white p-4 rounded-sm flex items-center gap-4 shadow-xs">
          <div className="p-3 rounded-full bg-emerald-50 text-emerald-700">
            <Server size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-secondary tracking-widest leading-none">Empregadores</span>
            <span className="text-lg md:text-xl font-bold text-primary mt-1">{loading ? "..." : stats.totalEmpresas}</span>
          </div>
        </div>

        {/* Reprocessing Queue Load */}
        <div className="border border-outline-variant bg-white p-4 rounded-sm flex items-center gap-4 shadow-xs">
          <div className="p-3 rounded-full bg-amber-50 text-amber-700">
            <Activity size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-secondary tracking-widest leading-none">Fila Pendente XML</span>
            <span className="text-lg md:text-xl font-bold text-primary mt-1">{loading ? "..." : stats.pendentes}</span>
          </div>
        </div>

        {/* Security Logs written */}
        <div className="border border-outline-variant bg-white p-4 rounded-sm flex items-center gap-4 shadow-xs">
          <div className="p-3 rounded-full bg-purple-50 text-purple-700">
            <Shield size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-secondary tracking-widest leading-none">Auditoria de Cliques</span>
            <span className="text-lg md:text-xl font-bold text-primary mt-1">{loading ? "..." : stats.logCount}</span>
          </div>
        </div>
      </div>

      {/* Primary Tab controls */}
      <div className="flex gap-1 overflow-x-auto pb-1.5 border-b border-outline-variant/60 select-none no-scrollbar">
        {[
          { id: "overview", label: "Visão Geral", icon: Gauge, allowed: true },
          { id: "users", label: "Usuários", icon: Users, allowed: true },
          { id: "perfis", label: "Perfis & Permissões", icon: Lock, allowed: true },
          { id: "logs", label: "Logs Técnicos", icon: Database, allowed: true },
          { id: "configs", label: "Licenciamento & Config", icon: Sliders, allowed: true },
          { id: "fiscais", label: "Códigos Fiscais", icon: Stamp, allowed: true },
          { id: "filas", label: "Monitor de Filas", icon: Cpu, allowed: true },
          { id: "consumo", label: "Consumo do Sistema", icon: TrendingUp, allowed: true }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0",
                isActive 
                  ? "border-primary text-primary" 
                  : "border-transparent text-secondary hover:text-primary hover:border-outline-variant"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab contents */}
      <div className="min-h-[400px]">
        {loading && (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <LoadingSpinner size="lg" className="text-primary" />
              <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Carregando governança...</span>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Visual state map */}
                  <div className="border border-outline-variant bg-white p-6 rounded-sm flex flex-col gap-4">
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-outline-variant/60">
                      <Gauge size={16} strokeWidth={2.5} />
                      Status do Servidor Compliance
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-surface-variant/40 rounded-sm border border-outline-variant/50 flex flex-col gap-1">
                        <span className="text-[10px] text-secondary font-extrabold uppercase">Espaço Provisionado</span>
                        <span className="text-sm font-bold text-primary">PostgreSQL AWS Cloud SQL</span>
                        <span className="text-xs text-emerald-700 font-extrabold mt-1">✓ Integridade Conectada</span>
                      </div>

                      <div className="p-4 bg-surface-variant/40 rounded-sm border border-outline-variant/50 flex flex-col gap-1">
                        <span className="text-[10px] text-secondary font-extrabold uppercase">Banda e Motor Fiscal</span>
                        <span className="text-sm font-bold text-primary">S-5002 Engine v14.2</span>
                        <span className="text-xs text-emerald-700 font-extrabold mt-1">● Ativo & Pronto</span>
                      </div>
                    </div>

                    <div className="p-4 border border-[#e1e2e6] rounded-sm bg-[#faf9f9]/50">
                      <h4 className="text-xs font-black text-primary uppercase tracking-wider mb-2">Resumo das Operações Fiscais</h4>
                      <div className="flex gap-4 items-center justify-between mt-2 pt-2 border-t border-dotted border-outline-variant/80">
                        <span className="text-xs text-secondary font-medium">Eventos S-5002 Processados</span>
                        <span className="text-sm font-black text-emerald-700">✓ {stats.processados} xmls</span>
                      </div>
                      <div className="flex gap-4 items-center justify-between mt-1">
                        <span className="text-xs text-secondary font-medium">Eventos com Erros técnicos</span>
                        <span className="text-sm font-black text-red-600">✗ {stats.erros} xmls</span>
                      </div>
                      <div className="flex gap-4 items-center justify-between mt-1">
                        <span className="text-xs text-secondary font-medium">Aguardando Auditoria</span>
                        <span className="text-sm font-black text-amber-600">● {stats.pendentes} xmls</span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-outline-variant bg-white p-6 rounded-sm flex flex-col gap-4">
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-outline-variant/60">
                      <Compass size={16} />
                      Diretrizes Operacionais do Perfil
                    </h3>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-3 p-3 bg-indigo-50/20 border border-indigo-125 rounded-sm">
                        <Shield className="text-indigo-700 mt-1 shrink-0" size={18} />
                        <div className="flex flex-col">
                          <span className="text-xs font-extrabold text-indigo-900">Seu Perfil Atual: {user?.perfil}</span>
                          <p className="text-[11px] text-indigo-750 mt-1 leading-normal">
                            {isSuperAdmin 
                              ? "Como SUPER_ADMIN, você possui controle irrestrito. Você é autorizado a gerenciar permissões, configurar licenciamentos globals, excluir empresas e simular/impersonar usuários." 
                              : "Administradores (ADMIN) gerenciam empregadores e usuários, porém estão restritos quanto a alteração de licenças, exclusão de dados corporativos ou simulação de SuperAdmins."}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 text-xs leading-normal font-medium text-secondary p-3 bg-surface border border-outline-variant/50 rounded-sm">
                        <span className="font-bold text-primary block mb-1">Avisos Importantes:</span>
                        1. Toda redefinição de perfil dinâmico é propagada em cache.<br/>
                        2. Ações críticas (como exclusão de bancos/empresas) criam logs imutáveis na auditoria de logs técnicos.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline Card */}
                <div className="border border-outline-variant bg-white p-6 rounded-sm flex flex-col gap-4 shadow-sm animate-fadeIn">
                  <div className="flex justify-between items-center pb-3 border-b border-outline-variant/60">
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                      <History size={16} className="text-[#1B365D]" />
                      Timeline de Processamento e Auditoria Fiscal Geral
                    </h3>
                    <Link 
                      href="/esocial" 
                      className="text-[9px] font-black text-[#1B365D] hover:underline uppercase tracking-wider"
                    >
                      Ver Auditoria S-5002
                    </Link>
                  </div>

                  <div className="h-[400px] flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
                      {isLoadingHistory ? (
                        <div className="h-full flex items-center justify-center opacity-50 py-12">
                          <LoadingSpinner size="sm" />
                        </div>
                      ) : history.length === 0 ? (
                        <div className="h-full flex items-center justify-center italic text-xs text-secondary/50 py-12">
                          Fluxo de Auditoria será populado após processamento de XMLs...
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5">
                          {history.map((item, idx) => (
                            <div key={item.id} className="flex gap-4 relative group py-2 hover:bg-neutral-50/50 rounded-sm px-2.5 transition-colors border border-transparent hover:border-outline-variant/20">
                              {idx !== history.length - 1 && (
                                <div className="absolute left-[23px] top-8 bottom-[-12px] w-[1px] bg-slate-200 border-dotted border-l" />
                              )}
                              <div className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center z-10 shrink-0 border shadow-xs",
                                item.acao === 'retificacao' ? "bg-amber-50 border-amber-200 text-amber-700" :
                                item.acao === 'erro' ? "bg-red-50 border-red-200 text-red-600" :
                                "bg-indigo-50 border-indigo-200 text-indigo-700"
                              )}>
                                {item.acao === 'retificacao' ? <History size={12} /> : 
                                 item.acao === 'upload' ? <CloudUpload size={12} /> :
                                 item.acao === 'consolidacao' ? <Calendar size={12} /> :
                                 <CheckCircle2 size={12} />}
                              </div>
                              <div className="flex flex-col flex-1 gap-1">
                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={cn(
                                      "text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-xs font-mono font-bold",
                                      item.acao === 'retificacao' ? "bg-amber-100 text-amber-800 border border-amber-205" :
                                      item.acao === 'upload' ? "bg-blue-100 text-blue-800 border border-blue-205" :
                                      "bg-emerald-100 text-emerald-800 border border-emerald-255"
                                    )}>
                                      {item.acao}
                                    </span>
                                    <p className="text-[11px] font-black text-on-surface truncate max-w-md" title={item.descricao}>
                                      {item.descricao}
                                    </p>
                                  </div>
                                  <span className="text-[9px] text-secondary font-semibold font-mono bg-neutral-100 px-1.5 py-0.5 rounded-sm">
                                    {new Date(item.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                  </span>
                                </div>
                                {item.evento && (
                                  <div className="text-[9px] text-secondary/80 flex flex-wrap gap-2 overflow-hidden items-center mt-1">
                                    <span className="bg-surface px-1.5 py-0.5 rounded-xs border border-outline-variant/30 font-mono">ID: {item.evento.eventoId.substring(0, 10)}...</span>
                                    <span className="font-extrabold uppercase bg-neutral-150 px-1.5 py-0.5 text-[8.5px] rounded-xs">{item.evento.tpEvento}</span>
                                    <span>•</span>
                                    <span className="font-semibold">Período: {item.evento.perApur}</span>
                                    {item.evento.trabalhador?.nome && (
                                      <>
                                        <span>•</span>
                                        <span className="truncate max-w-[200px] text-primary font-bold">{item.evento.trabalhador.nome}</span>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* USERS TAB */}
            {activeTab === "users" && (
              <div className="border border-outline-variant bg-white rounded-sm flex flex-col gap-4 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/60 pb-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest">Usuários de Acesso</h3>
                    <p className="text-[11px] text-secondary">Cadastre, edite e ative os integrantes da organização.</p>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search size={14} className="absolute left-3 top-2.5 text-secondary" />
                      <input 
                        type="text"
                        placeholder="Buscar por e-mail ou nome..."
                        value={userSearchText}
                        onChange={(e) => setUserSearchText(e.target.value)}
                        className="text-xs w-full pl-9 pr-3 py-2 border border-outline-variant focus:outline-none focus:border-primary text-on-surface"
                      />
                    </div>
                    <button 
                      onClick={() => setNewUserOpen(true)}
                      className="btn-primary text-xs font-bold uppercase tracking-wider py-2 px-4 flex items-center gap-1 shrink-0"
                    >
                      <Plus size={14} />
                      Novo Usuário
                    </button>
                  </div>
                </div>

                {/* Create user Modal inline overlay form */}
                {newUserOpen && (
                  <form onSubmit={handleCreateUser} className="p-4 bg-muted border border-outline-variant rounded-sm flex flex-col gap-4 animate-fadeIn">
                    <div className="flex justify-between items-center pb-2 border-b border-outline-variant/50">
                      <span className="text-xs font-black text-primary uppercase tracking-wider">Registrar Novo Usuário</span>
                      <button type="button" onClick={() => setNewUserOpen(false)} className="text-secondary hover:text-primary">
                        <X size={16} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-secondary uppercase">Nome Completo</label>
                        <input 
                          type="text"
                          required
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          placeholder="Ex: João da Silva"
                          className="text-xs p-2 border border-outline-variant focus:outline-none focus:border-primary bg-white text-on-surface"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-secondary uppercase">E-mail Corporativo</label>
                        <input 
                          type="email"
                          required
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          placeholder="Ex: joao@empresa.com.br"
                          className="text-xs p-2 border border-outline-variant focus:outline-none focus:border-primary bg-white text-on-surface"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-secondary uppercase">Perfil de Acesso</label>
                        <select
                          value={newUserPerfil}
                          onChange={(e) => setNewUserPerfil(e.target.value)}
                          className="text-xs p-2 border border-outline-variant focus:outline-none focus:border-primary bg-white text-on-surface font-semibold"
                        >
                          <option value="OPERADOR">OPERADOR</option>
                          <option value="ANALISTA">ANALISTA</option>
                          <option value="GESTOR">GESTOR</option>
                          <option value="CLIENTE">CLIENTE</option>
                          <option value="ADMIN">ADMIN</option>
                          {isSuperAdmin && <option value="SUPER_ADMIN">SUPER_ADMIN (Super Usuário)</option>}
                          {perfis
                            .filter(p => !["OPERADOR", "ANALISTA", "GESTOR", "CLIENTE", "ADMIN", "SUPER_ADMIN", "SUPERADMIN"].includes(p.nomePerfil.toUpperCase()))
                            .map(p => (
                              <option key={p.id} value={p.nomePerfil.toUpperCase()}>{p.nomePerfil.toUpperCase()}</option>
                            ))
                          }
                        </select>
                      </div>
                    </div>

                    {/* Painel de Bloqueio (Create User) */}
                    <div className="border border-outline-variant/60 bg-white p-3 rounded-sm flex flex-col gap-3">
                      <span className="text-[10px] font-black text-secondary tracking-widest uppercase flex items-center gap-1.5 border-b border-outline-variant/40 pb-2">
                        <Lock size={12} className="text-secondary/60 shrink-0" />
                        Políticas de Bloqueio Preventivo
                      </span>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-secondary uppercase tracking-wider">
                            Bloqueio de Módulos Gerais
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold text-secondary hover:text-primary cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={newUserBloqueadoGerais}
                              onChange={(e) => setNewUserBloqueadoGerais(e.target.checked)}
                              className="accent-[#1B365D] w-3.5 h-3.5"
                            />
                            <span>Bloquear todos os Módulos Gerais (Códigos, Pendências, Histórico, etc.)</span>
                          </label>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-[#1B365D] uppercase tracking-wider">
                            Bloquear Módulos Individuais Específicos
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { k: "esocial", l: "eSocial (S-5002)" },
                              { k: "reinf", l: "EFD-REINF" },
                              { k: "empregadores", l: "Empregadores" },
                              { k: "trabalhadores", l: "Trabalhadores" },
                              { k: "operadoras", l: "Operadoras de Saúde" },
                              { k: "consolidacao", l: "Consolidação Fiscal" },
                            ].map((mod) => (
                              <label key={mod.k} className="flex items-center gap-2 text-xs font-medium text-secondary hover:text-primary cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={newUserModulosBloqueados.includes(mod.k)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewUserModulosBloqueados([...newUserModulosBloqueados, mod.k]);
                                    } else {
                                      setNewUserModulosBloqueados(newUserModulosBloqueados.filter((m) => m !== mod.k));
                                    }
                                  }}
                                  className="accent-red-600 w-3.5 h-3.5"
                                />
                                <span className={newUserModulosBloqueados.includes(mod.k) ? "text-red-600 font-bold" : ""}>
                                  {mod.l}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button 
                        type="button" 
                        onClick={() => setNewUserOpen(false)} 
                        className="text-xs uppercase tracking-wider font-bold text-secondary px-4 py-2 hover:bg-neutral-100 rounded-sm"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit"
                        className="btn-primary text-xs font-bold uppercase tracking-wider py-2 px-6"
                      >
                        Confirmar Cadastro
                      </button>
                    </div>
                  </form>
                )}

                {/* Edit user Modal inline overlay form */}
                {editingUserId && (
                  <form onSubmit={handleUpdateUserSubmit} className="p-4 bg-indigo-50/10 border border-indigo-200/50 rounded-sm flex flex-col gap-4 animate-fadeIn my-2">
                    <div className="flex justify-between items-center pb-2 border-b border-indigo-200/40">
                      <span className="text-xs font-black text-[#1B365D] uppercase tracking-wider flex items-center gap-1.5">
                        <Edit3 size={14} className="text-[#1B365D]" />
                        Editar Conta de Usuário: <strong className="text-indigo-800 lowercase font-extrabold">{editUserEmail}</strong>
                      </span>
                      <button type="button" onClick={() => setEditingUserId(null)} className="text-secondary hover:text-primary">
                        <X size={16} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-secondary uppercase">Nome Completo</label>
                        <input 
                          type="text"
                          required
                          value={editUserName}
                          onChange={(e) => setEditUserName(e.target.value)}
                          placeholder="Ex: João da Silva"
                          className="text-xs p-2 border border-outline-variant focus:outline-none focus:border-primary bg-white text-on-surface"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-secondary uppercase">Perfil de Acesso</label>
                        <select
                          value={editUserPerfil}
                          onChange={(e) => setEditUserPerfil(e.target.value)}
                          className="text-xs p-2 border border-outline-variant focus:outline-none focus:border-primary bg-white text-on-surface font-semibold"
                        >
                          <option value="OPERADOR">OPERADOR</option>
                          <option value="ANALISTA">ANALISTA</option>
                          <option value="GESTOR">GESTOR</option>
                          <option value="CLIENTE">CLIENTE</option>
                          <option value="ADMIN">ADMIN</option>
                          {isSuperAdmin && <option value="SUPER_ADMIN">SUPER_ADMIN (Super Usuário)</option>}
                          {perfis
                            .filter(p => !["OPERADOR", "ANALISTA", "GESTOR", "CLIENTE", "ADMIN", "SUPER_ADMIN", "SUPERADMIN"].includes(p.nomePerfil.toUpperCase()))
                            .map(p => (
                              <option key={p.id} value={p.nomePerfil.toUpperCase()}>{p.nomePerfil.toUpperCase()}</option>
                            ))
                          }
                        </select>
                      </div>

                      <div className="flex flex-col justify-center gap-1 pt-1">
                        <label className="text-[10px] font-bold text-secondary uppercase">Redefinição de Credencial</label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-secondary hover:text-primary transition-colors select-none">
                          <input
                            type="checkbox"
                            checked={editUserResetPassword}
                            onChange={(e) => setEditUserResetPassword(e.target.checked)}
                            className="accent-[#1B365D] w-3.5 h-3.5"
                          />
                          <span>Resetar senha padrão (&quot;senha123&quot;)</span>
                        </label>
                      </div>
                    </div>

                    {/* Painel de Bloqueio (Edit User) */}
                    <div className="border border-indigo-200/50 bg-[#FAF9FC] p-3 rounded-sm flex flex-col gap-3">
                      <span className="text-[10px] font-black text-[#1B365D] tracking-widest uppercase flex items-center gap-1.5 border-b border-indigo-200/30 pb-2">
                        <Lock size={12} className="text-[#1B365D]" />
                        Modificar Políticas de Bloqueio Preventivo
                      </span>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-secondary uppercase tracking-wider">
                            Bloqueio de Módulos Gerais
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold text-secondary hover:text-primary cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={editUserBloqueadoGerais}
                              onChange={(e) => setEditUserBloqueadoGerais(e.target.checked)}
                              className="accent-[#1B365D] w-3.5 h-3.5"
                            />
                            <span>Bloquear todos os Módulos Gerais (Códigos, Pendências, Histórico, etc.)</span>
                          </label>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-[#1B365D] uppercase tracking-wider">
                            Bloquear Módulos Individuais Específicos
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { k: "esocial", l: "eSocial (S-5002)" },
                              { k: "reinf", l: "EFD-REINF" },
                              { k: "empregadores", l: "Empregadores" },
                              { k: "trabalhadores", l: "Trabalhadores" },
                              { k: "operadoras", l: "Operadoras de Saúde" },
                              { k: "consolidacao", l: "Consolidação Fiscal" },
                            ].map((mod) => (
                              <label key={mod.k} className="flex items-center gap-2 text-xs font-medium text-secondary hover:text-primary cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={editUserModulosBloqueados.includes(mod.k)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditUserModulosBloqueados([...editUserModulosBloqueados, mod.k]);
                                    } else {
                                      setEditUserModulosBloqueados(editUserModulosBloqueados.filter((m) => m !== mod.k));
                                    }
                                  }}
                                  className="accent-red-600 w-3.5 h-3.5"
                                />
                                <span className={editUserModulosBloqueados.includes(mod.k) ? "text-red-600 font-bold" : ""}>
                                  {mod.l}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2 border-t border-indigo-100/50">
                      <button 
                        type="button" 
                        onClick={() => setEditingUserId(null)} 
                        className="text-xs uppercase tracking-wider font-bold text-secondary px-4 py-2 hover:bg-neutral-100 rounded-sm"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit"
                        className="btn-primary py-2 px-6 text-xs font-bold uppercase tracking-wider text-white"
                      >
                        Salvar Alterações
                      </button>
                    </div>
                  </form>
                )}

                {/* Users List Data-Table */}
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-variant/40">
                        <th className="py-3 px-4 text-[10px] font-extrabold uppercase tracking-widest text-[#1B365D]">Usuário / Nome</th>
                        <th className="py-3 px-4 text-[10px] font-extrabold uppercase tracking-widest text-[#1B365D]">E-mail</th>
                        <th className="py-3 px-4 text-[10px] font-extrabold uppercase tracking-widest text-[#1B365D]">Perfil</th>
                        <th className="py-3 px-4 text-[10px] font-extrabold uppercase tracking-widest text-[#1B365D]">Estado</th>
                        <th className="py-3 px-4 text-[10px] font-extrabold uppercase tracking-widest text-[#1B365D] text-right">Controles rápidos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/40">
                      {filteredUsers.map((item) => {
                        const targetSuper = item.perfil.toUpperCase() === "SUPER_ADMIN" || item.perfil.toUpperCase() === "SUPERADMIN";
                        const canEdit = isSuperAdmin || (isAdmin && !targetSuper);
                        return (
                          <tr key={item.id} className="hover:bg-[#FAF9FC] transition-colors">
                            <td className="py-3 px-4 text-xs font-bold text-primary flex items-center gap-2">
                              <span className="w-7 h-7 bg-primary/5 text-primary rounded-full flex items-center justify-center text-[10px] font-bold">
                                {item.nome.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                              </span>
                              {item.nome}
                              {item.id === user?.id && <span className="text-[9px] bg-indigo-100 text-indigo-750 px-1 py-0.2 rounded-xs">Você</span>}
                            </td>
                            <td className="py-3 px-4 text-xs font-medium text-secondary">{item.email}</td>
                            <td className="py-3 px-4 text-xs">
                              <span className={cn(
                                "px-2 py-0.5 rounded-sm font-extrabold text-[10px] uppercase",
                                targetSuper ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-neutral-50 text-neutral-700 border border-neutral-200"
                              )}>
                                {item.perfil}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs">
                              <div className="flex flex-col gap-1.5 justify-start">
                                <button 
                                  disabled={userActionLoadingId !== null || item.id === user?.id}
                                  onClick={() => handleToggleUserStatus(item)}
                                  className={cn(
                                    "flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-sm transition-all w-max",
                                    item.ativo ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : "text-red-700 bg-red-50 border border-red-200"
                                  )}
                                >
                                  {item.ativo ? <UserCheck size={11} /> : <UserX size={11} />}
                                  {item.ativo ? "Ativo" : "Suspenso"}
                                </button>
                                
                                {item.bloqueadoGerais && (
                                  <span className="flex items-center gap-1 text-[8px] font-black uppercase text-slate-700 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-xs w-max">
                                    <Lock size={9} /> GERAIS BLOQ
                                  </span>
                                )}

                                {item.modulosBloqueados && item.modulosBloqueados.split(",").filter(Boolean).length > 0 && (
                                  <div className="flex flex-wrap gap-1 max-w-[155px]">
                                    {item.modulosBloqueados.split(",").filter(Boolean).map((mb: string) => (
                                      <span key={mb} className="text-[7.5px] leading-none font-black uppercase text-red-650 bg-red-50 border border-red-200/50 px-1.5 py-0.5 rounded-xs">
                                        {mb.toUpperCase()}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-xs text-right">
                              <div className="flex gap-2 justify-end items-center">
                                {/* Edit user trigger */}
                                {canEdit && (
                                  <button
                                    onClick={() => handleEditUserInit(item)}
                                    className="p-1 hover:bg-[#1B365D]/5 text-[#1B365D] hover:text-[#152947] rounded-sm border border-transparent hover:border-indigo-100 transition-all mr-1"
                                    title="Editar perfil do usuário"
                                    disabled={userActionLoadingId !== null}
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                )}

                                {/* Impersonate trigger (Only SuperAdmin) */}
                                {isSuperAdmin && !targetSuper && item.id !== user?.id && (
                                  <button
                                    onClick={() => handleImpersonateUser(item)}
                                    className="p-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-850 text-indigo-700 border border-indigo-200 rounded-sm font-extrabold text-[9px] uppercase tracking-wider transition-all flex items-center gap-1"
                                    title="Acessar o portal interpretando a identidade deste usuário"
                                    disabled={userActionLoadingId !== null}
                                  >
                                    <Eye size={12} />
                                    Impersonar
                                  </button>
                                )}

                                {/* Delete button (restricted to SuperAdmin) */}
                                {isSuperAdmin && item.id !== user?.id && (
                                  <button 
                                    onClick={() => handleDeleteUser(item)}
                                    className="p-1 hover:bg-red-50 text-red-650 hover:text-red-700 rounded-sm border border-transparent hover:border-red-100 transition-all"
                                    title="Excluir usuário permanentemente"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                                
                                {isAdmin && targetSuper && (
                                  <span title="Proteção de perfil SuperAdmin">
                                    <Lock size={12} className="text-secondary/60" />
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-xs font-medium text-secondary">Nenhum Usuário correspondente.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* DYNAMIC PROFILES TAB */}
            {activeTab === "perfis" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Form to Create/Update Profile (SuperAdmin exclusively) */}
                <div className="border border-outline-variant bg-white p-6 rounded-sm flex flex-col gap-4 lg:col-span-1">
                  <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-outline-variant/60">
                    <Sliders size={16} />
                    {editingProfileId ? `Editar Diretriz: ${newProfileName}` : "Gestão de Diretrizes Fiscais"}
                  </h3>

                  {!isSuperAdmin && !isAdmin ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xs flex flex-col gap-2">
                      <div className="flex gap-2 items-center text-amber-800 font-extrabold text-xs">
                        <Lock size={16} />
                        Diretiva Bloqueada
                      </div>
                      <p className="text-[10px] text-amber-700 leading-normal">
                        Apenas usuários com perfil <strong className="text-primary">SUPER_ADMIN ou ADMIN</strong> de sistema podem redefinir ou cadastrar regras de acessos dinâmicas adicionais.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                      <p className="text-[10px] text-secondary leading-normal">
                        {editingProfileId ? "Ajuste os parâmetros fiscais e redefina os privilégios operacionais deste perfil." : "Crie novas categorias de usuários de forma dinâmica ou ajuste os privilégios gerais."}
                      </p>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-secondary uppercase">Nome do Perfil</label>
                        <input 
                          type="text"
                          required
                          value={newProfileName}
                          onChange={(e) => setNewProfileName(e.target.value)}
                          placeholder="Ex: ANALISTA_SENIOR"
                          className="text-xs p-2 border border-outline-variant focus:outline-none focus:border-primary bg-white text-on-surface font-extrabold uppercase tracking-wider"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-secondary uppercase">Descrição Breve</label>
                        <textarea 
                          value={newProfileDesc}
                          onChange={(e) => setNewProfileDesc(e.target.value)}
                          placeholder="Finalidade do perfil no escopo fiscal"
                          rows={2}
                          className="text-xs p-2 border border-outline-variant focus:outline-none focus:border-primary bg-white text-on-surface resize-none"
                        />
                      </div>

                      <div className="flex flex-col gap-2 border-t border-dotted border-outline-variant pt-3">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">Permissões de Diretório</span>
                        {PERMISSION_KEYS.map((perm) => (
                          <label key={perm.key} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-neutral-50 rounded-xs transition-colors select-none">
                            <input 
                              type="checkbox"
                              checked={selectedPermissions[perm.key]}
                              onChange={(e) => setSelectedPermissions({
                                ...selectedPermissions,
                                [perm.key]: e.target.checked
                              })}
                              className="accent-primary w-3.5 h-3.5"
                            />
                            <span className="text-xs text-secondary font-semibold leading-none">{perm.label}</span>
                          </label>
                        ))}
                      </div>

                      <div className="flex flex-col gap-3 border-t border-dotted border-outline-variant pt-3">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">Diretrizes de Ações Detalhadas</span>
                          <p className="text-[9px] text-secondary font-medium mt-0.5 leading-snug">Habilite privilégios específicos (Visualizar, Criar, Editar, Excluir) por diretriz de negócio ou módulo:</p>
                        </div>

                        <div className="overflow-x-auto border border-outline-variant/60 rounded-xs bg-[#FAF9FC]">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="bg-neutral-100/80 border-b border-outline-variant/60">
                                <th className="p-2 font-black text-secondary uppercase text-[8px] tracking-wider">Diretriz/Módulo</th>
                                {DETAILED_ACTIONS.map(act => (
                                  <th key={act.key} className="p-1 font-black text-secondary text-center text-[8.5px] uppercase tracking-wider select-none">{act.label}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/40">
                              {DETAILED_MODULES.map(mod => (
                                <tr key={mod.key} className="hover:bg-neutral-50/40">
                                  <td className="p-2 font-bold text-primary max-w-[110px] truncate" title={mod.label}>{mod.label}</td>
                                  {DETAILED_ACTIONS.map(act => {
                                    const fullKey = `${mod.key}_${act.key}`;
                                    return (
                                      <td key={act.key} className="p-1 text-center">
                                        <input
                                          type="checkbox"
                                          checked={!!selectedPermissions[fullKey]}
                                          onChange={(e) => setSelectedPermissions(prev => ({
                                            ...prev,
                                            [fullKey]: e.target.checked
                                          }))}
                                          className="accent-primary w-3.5 h-3.5 cursor-pointer"
                                        />
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {editingProfileId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProfileId(null);
                              setNewProfileName("");
                              setNewProfileDesc("");
                              setSelectedPermissions(initialPermissions());
                            }}
                            className="bg-neutral-150 hover:bg-neutral-200 border border-outline-variant text-[10px] uppercase font-bold tracking-wider px-3 flex-1 flex items-center justify-center gap-1 py-2.5 rounded-sm active:scale-95 transition-all text-secondary"
                          >
                            Cancelar
                          </button>
                        )}
                        <button 
                          type="submit"
                          className="btn-primary py-2.5 font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-1 mt-0 flex-1"
                        >
                          {editingProfileId ? <Check size={14} /> : <Plus size={14} />}
                          {editingProfileId ? "Atualizar Perfil" : "Gravar Perfil Dinâmico"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Profiles mapping table */}
                <div className="border border-outline-variant bg-white p-6 rounded-sm flex flex-col gap-4 lg:col-span-2">
                  <div className="flex flex-col gap-1 pb-3 border-b border-outline-variant/60">
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest">Perfis e Escopo Operacional Ativos</h3>
                    <p className="text-[11px] text-secondary">Definições autorizadas dinamicamente a nível de banco.</p>
                  </div>

                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-outline-variant text-[#1B365D]">
                          <th className="py-2.5 text-[10px] font-extrabold uppercase tracking-wider">Nome do Perfil</th>
                          <th className="py-2.5 text-[10px] font-extrabold uppercase tracking-wider">Descrição operacional</th>
                          <th className="py-2.5 text-[10px] font-extrabold uppercase tracking-wider">Competências / Permissões</th>
                          <th className="py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/40">
                        {perfis.map((prof) => (
                          <tr key={prof.id} className="hover:bg-neutral-50/50">
                            <td className="py-3 text-xs font-extrabold text-primary uppercase tracking-wider">{prof.nomePerfil}</td>
                            <td className="py-3 text-[11px] font-semibold text-secondary max-w-xs">{prof.descricao || "Sem observações adicionais."}</td>
                            <td className="py-3 text-xs">
                              <div className="flex flex-wrap gap-1 max-w-sm">
                                {Object.entries(prof.permissoes).map(([k, v]) => (
                                  v ? (
                                    <span key={k} className="bg-emerald-50 text-emerald-800 border border-emerald-150 px-2 py-0.5 rounded-xs text-[9px] font-extrabold tracking-tight leading-none uppercase">
                                      {formatPermissionKey(k)}
                                    </span>
                                  ) : null
                                ))}
                              </div>
                            </td>
                            <td className="py-3 text-right">
                              {isSuperAdmin && (
                                <div className="flex gap-1 justify-end items-center">
                                  <button
                                    onClick={() => handleEditProfileInit(prof)}
                                    className="p-1 hover:bg-[#1B365D]/5 text-[#1B365D] hover:text-[#152947] rounded-sm border border-transparent hover:border-indigo-100 transition-all mr-1"
                                    title="Editar perfil e permissões"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProfile(prof.id)}
                                    className="text-red-650 hover:bg-red-50 p-1 rounded-sm border border-transparent hover:border-red-100 transition-all"
                                    title="Remover perfil dinâmico"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* LOGS TAB */}
            {activeTab === "logs" && (
              <div className="border border-outline-variant bg-white rounded-sm flex flex-col gap-4 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/60 pb-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                      <Database size={15} />
                      Log de Eventos Técnicos e Sessões
                    </h3>
                    <p className="text-[11px] text-secondary">Rastro imutável de todas as ações de risco ou modificações cadastrais.</p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search size={14} className="absolute left-3 top-2.5 text-secondary" />
                    <input 
                      type="text"
                      placeholder="Filtrar logs imutáveis..."
                      value={logsSearch}
                      onChange={(e) => setLogsSearch(e.target.value)}
                      className="text-xs w-full pl-9 pr-3 py-2 border border-outline-variant focus:outline-none focus:border-primary text-on-surface"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-outline-variant text-[#1B365D]">
                        <th className="py-2.5 px-3 text-[10px] font-extrabold uppercase tracking-wider">Carimbo de Data/Hora (UTC)</th>
                        <th className="py-2.5 px-3 text-[10px] font-extrabold uppercase tracking-wider">Ação Executada</th>
                        <th className="py-2.5 px-3 text-[10px] font-extrabold uppercase tracking-wider">Executor / Operador</th>
                        <th className="py-2.5 px-3 text-[10px] font-extrabold uppercase tracking-wider">Perfil</th>
                        <th className="py-2.5 px-3 text-[10px] font-extrabold uppercase tracking-wider">Histórico / Descrição detalhada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/40">
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-neutral-50/50 text-xs">
                          <td className="py-3 px-3 text-secondary font-medium tracking-tight whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString("pt-BR", { timeZone: "UTC" })}
                          </td>
                          <td className="py-3 px-3">
                            <span className="p-1 px-2 text-[9px] font-black tracking-wider text-red-750 bg-red-50/60 border border-red-150 rounded-sm uppercase">
                              {log.acao}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-extrabold text-primary">{log.usuarioNome}</td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="p-1 px-1 text-[9px] font-black text-secondary leading-none uppercase select-none">
                              {log.perfil}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-medium text-secondary leading-normal">{log.descricao}</td>
                        </tr>
                      ))}
                      {filteredLogs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center font-medium text-secondary">Nenhum log resgatado sob este filtro.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* CONFIGS TAB */}
            {activeTab === "configs" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* Global parameters */}
                <div className="border border-outline-variant bg-white p-6 rounded-sm flex flex-col gap-4">
                  <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-outline-variant/60">
                    <Sliders size={16} />
                    Parâmetros Operacionais Globais
                  </h3>

                  <div className="flex flex-col gap-4">
                    {configs.map((conf) => {
                      const isLicencaKey = conf.chave === "LICENCIAMENTO_TIPO";
                      return (
                        <div key={conf.id} className="p-4 bg-surface-variant/30 border border-outline-variant/40 rounded-sm flex flex-col gap-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-extrabold text-primary tracking-tight">{conf.chave}</span>
                            <span className="text-[10px] text-secondary font-medium leading-normal">{conf.descricao}</span>
                          </div>

                          <div className="flex gap-2 items-center">
                            {isLicencaKey ? (
                              <div className="flex flex-col sm:flex-row gap-2 w-full">
                                <select 
                                  disabled={!isSuperAdmin}
                                  defaultValue={conf.valor}
                                  onChange={(e) => handleSaveConfig(conf.chave, e.target.value)}
                                  className="text-xs p-2 font-bold bg-white text-on-surface border border-outline-variant focus:outline-none flex-1 max-w-[250px]"
                                >
                                  <option value="Enterprise Platinum">Enterprise Platinum (Sem limites)</option>
                                  <option value="Advanced Saas">Advanced Saas (Máx 50k XML)</option>
                                  <option value="Standard Free">Standard Free (Limites mínimos)</option>
                                </select>
                                {!isSuperAdmin && (
                                  <span className="text-[10px] text-amber-800 font-extrabold self-center flex items-center gap-1">
                                    <Lock size={12} /> ADMIN não possui poder de alterar licenciamento
                                  </span>
                                )}
                              </div>
                            ) : (
                              <input 
                                type="text"
                                defaultValue={conf.valor}
                                onBlur={(e) => handleSaveConfig(conf.chave, e.target.value)}
                                placeholder="Inserir valor..."
                                className="text-xs p-2 bg-white text-on-surface border border-outline-variant focus:outline-none focus:border-primary w-full max-w-[300px]"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Employers Cascade Administration (SuperAdmin Only) */}
                <div className="border border-outline-variant bg-white p-6 rounded-sm flex flex-col gap-4">
                  <h3 className="text-xs font-black text-red-650 uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-red-200">
                    <AlertTriangle size={16} />
                    Exclusão de Bancos / Wipeout Crítico
                  </h3>

                  <p className="text-[11px] text-secondary leading-normal">
                    Seção restrita exclusiva a SuperAdmins para remover corporações que rescindiram contratos. 
                    Esta operação apagará todos os dados cascateados no compliance de forma imediata e permanente.
                  </p>

                  {!isSuperAdmin ? (
                    <div className="p-4 bg-red-50 border border-red-150 text-red-800 rounded-sm">
                      <span className="text-xs font-extrabold flex items-center gap-1.5 uppercase tracking-wider">
                        <Lock size={14} />
                        Escudo de Segurança Ativo
                      </span>
                      <p className="text-[10px] text-red-700 leading-normal mt-1.5">
                        Como usuário ADMIN, você está estritamente proibido de realizar exclusões físicas de Empregadores ou dados críticos.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <input 
                        type="text"
                        placeholder="Pesquisar por razão social/raiz..."
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        className="text-xs p-2 bg-white text-on-surface border border-outline-variant focus:outline-none focus:border-red-300 w-full"
                      />

                      <div className="divide-y divide-outline-variant/40 max-h-[250px] overflow-y-auto border border-outline-variant rounded-sm pr-1">
                        {filteredCompanies.map((emp) => (
                          <div key={emp.id} className="p-3 hover:bg-red-50/20 text-xs flex justify-between items-center bg-white">
                            <div className="flex flex-col">
                              <span className="font-extrabold text-primary">{emp.razaoSocial}</span>
                              <span className="text-[10px] text-secondary">CNPJ Raiz: {emp.cnpjRaiz} | Trabalhadores: {emp._count.trabalhadores}</span>
                            </div>
                            <button
                              onClick={() => handleDeleteCompany(emp.id, emp.razaoSocial)}
                              className="text-red-650 hover:bg-red-50 border border-red-100 p-2 rounded-xs font-black text-[9px] uppercase tracking-widest cursor-pointer whitespace-nowrap active:scale-95 transition-all text-red-600 font-medium"
                            >
                              Excluir Tudo
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AUDIT CODES TAB */}
            {activeTab === "fiscais" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Form codes */}
                <div className="border border-outline-variant bg-white p-6 rounded-sm flex flex-col gap-4 lg:col-span-1">
                  <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-outline-variant/60">
                    <Sliders size={16} />
                    Impostos & Classificação RFB
                  </h3>

                  {!isSuperAdmin ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-sm">
                      <span className="text-xs font-extrabold flex items-center gap-1.5 uppercase">
                        <Lock size={15} /> Apenas SuperAdmin
                      </span>
                      <p className="text-[10px] text-amber-700 leading-normal mt-1.5">
                        O cadastro de novos códigos de impostos de recolhimento da Receita Federal é de uso estrito e fechado a SuperAdmins.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveFiscal} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-secondary uppercase">Código de Receita DIRF/REINF</label>
                        <input 
                          type="text"
                          required
                          value={fiscalCodigo}
                          maxLength={6}
                          onChange={(e) => setFiscalCodigo(e.target.value)}
                          placeholder="Ex: 0561"
                          className="text-xs p-2 border border-outline-variant focus:outline-none focus:border-primary text-on-surface font-extrabold"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-secondary uppercase">Denominação do Tributo</label>
                        <textarea 
                          required
                          value={fiscalDenominacao}
                          onChange={(e) => setFiscalDenominacao(e.target.value)}
                          placeholder="Ex: Rendimento do Trabalho Assalariado"
                          rows={3}
                          className="text-xs p-2 border border-outline-variant focus:outline-none focus:border-primary text-on-surface resize-none font-medium"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-secondary uppercase">Bases Legais (separados por vírgula)</label>
                        <input 
                          type="text"
                          value={fiscalBase}
                          onChange={(e) => setFiscalBase(e.target.value)}
                          placeholder="Ex: IN RFB 2110/2022"
                          className="text-xs p-2 border border-outline-variant focus:outline-none focus:border-primary text-on-surface"
                        />
                      </div>

                      <button 
                        type="submit"
                        className="btn-primary py-2.5 font-bold uppercase tracking-wider text-xs"
                      >
                        Salvar Código Fiscal
                      </button>
                    </form>
                  )}
                </div>

                {/* List codes */}
                <div className="border border-outline-variant bg-white p-6 rounded-sm flex flex-col gap-4 lg:col-span-2">
                  <div className="flex flex-col gap-1 pb-3 border-b border-outline-variant/60">
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest">Códigos de Imposto Homologados</h3>
                    <p className="text-[11px] text-secondary">Tabela de conformidade ativa.</p>
                  </div>

                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-outline-variant text-[#1B365D]">
                          <th className="py-2 px-3 text-[10px] font-extrabold uppercase tracking-wider">Código</th>
                          <th className="py-2 px-3 text-[10px] font-extrabold uppercase tracking-wider">Denominação oficial / Descrição</th>
                          <th className="py-2 px-3 text-[10px] font-extrabold uppercase tracking-wider">Base Legal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/40">
                        {codigosFiscais.map((c) => (
                          <tr key={c.id} className="hover:bg-neutral-50/50">
                            <td className="py-3 px-3 text-xs font-black text-primary">{c.codigo}</td>
                            <td className="py-3 px-3 text-[11px] font-semibold text-secondary leading-normal">{c.denominacao}</td>
                            <td className="py-3 px-3 text-[10px]">
                              {c.baseLegal && c.baseLegal.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {c.baseLegal.map((base: string, index: number) => (
                                    <span key={index} className="bg-slate-100 text-slate-800 px-2 py-0.2 rounded-xs font-mono font-bold tracking-tight">
                                      {base}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-secondary/50 font-medium italic">Nenhuma informada</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* QUEUES TAB */}
            {activeTab === "filas" && (
              <div className="border border-outline-variant bg-white p-6 rounded-sm flex flex-col gap-4">
                <div className="flex flex-col gap-1 pb-3 border-b border-outline-variant/60">
                  <div className="flex items-center gap-1.5 text-primary">
                    <Cpu size={15} />
                    <h3 className="text-xs font-black uppercase tracking-widest">Filas de Processamento XML & Motores de Auditoria</h3>
                  </div>
                  <p className="text-[11px] text-secondary">Acompanhe taxas de transferência do parser em tempo real.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {queues.map((q) => (
                    <div key={q.id} className="p-4 border border-outline-variant/70 rounded-sm bg-[#FAF9FC] flex flex-col justify-between h-44 shadow-xs">
                      <div className="flex flex-col">
                        <div className="flex justify-between items-start gap-4">
                          <span className="text-xs font-black text-primary leading-tight max-w-[180px]">{q.nome}</span>
                          <span className={cn(
                            "px-1.5 py-0.2 rounded-xs text-[8px] font-black uppercase tracking-widest",
                            q.ativo ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-500"
                          )}>
                            {q.ativo ? "Online" : "Terminado"}
                          </span>
                        </div>
                        <p className="text-[10px] text-secondary font-medium leading-normal mt-1.5">No. XMLs Pendentes: <strong className="text-primary">{q.pendentes}</strong></p>
                        {q.processando > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 animate-pulse text-[10px] text-amber-500 font-extrabold uppercase">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                            Trabalhando em: {q.processando}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-dashed border-outline-variant">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-secondary uppercase font-bold leading-none">Taxa ativa</span>
                          <span className="text-xs font-black text-primary mt-1">{q.taxa}</span>
                        </div>

                        {q.id === "esocial-eventos" && (
                          <button
                            onClick={() => handleReprocessLote("simulado-governance")}
                            className="bg-primary hover:bg-[#152947] text-white font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1.5 rounded-sm flex items-center gap-1 active:scale-95 transition-all shadow-xs"
                          >
                            <RefreshCw size={10} />
                            Forçar Reprocessamento
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CONSUMPTION TAB */}
            {activeTab === "consumo" && (
              <div className="border border-outline-variant bg-white p-6 rounded-sm flex flex-col gap-6">
                <div className="flex flex-col gap-1 pb-3 border-b border-outline-variant/60">
                  <h3 className="text-xs font-black text-primary uppercase tracking-widest">Monitor de Limites e Recursos Provisionados</h3>
                  <p className="text-[11px] text-secondary">Acompanhamento e estatísticas de uso para auditoria do plano.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* XML Consumo Progress */}
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-[#1B365D]">Volume de Armazenamento XML (Mensal)</span>
                      <span className="font-bold text-secondary text-[11px]">14.820 / 50.000 (29.6%)</span>
                    </div>
                    {/* Visual bar container */}
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div className="h-full bg-gradient-to-r from-[#1B365D] to-indigo-600 rounded-full" style={{ width: "29.6%" }}></div>
                    </div>
                    <span className="text-[10px] text-secondary font-medium leading-normal leading-tight">
                      Caso o consumo de XML atinja 100%, o Compliance Portal acionará regras automáticas de throttling.
                    </span>
                  </div>

                  {/* CPU Progress */}
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-[#1B365D]">Consumo de Memória de Heap (Prisma Query pool)</span>
                      <span className="font-bold text-secondary text-[11px]">28% Provisionado</span>
                    </div>
                    {/* Visual bar container */}
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: "28%" }}></div>
                    </div>
                    <span className="text-[10px] text-secondary font-medium leading-normal leading-tight">
                      Heap local saudável. Monitoramento constante e autodepuração ativo pelas conexões do AWS Pool.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
