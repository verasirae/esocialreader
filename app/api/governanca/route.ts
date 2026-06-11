import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, setSessionCookie, clearSessionCookie } from "@/lib/auth-server";

// Security helper to check and return user if SUPER_ADMIN or ADMIN
async function verifyAdminAuth() {
  const user = await getCurrentUser();
  if (!user) return null;
  
  const perfilUpper = user.perfil.toUpperCase();
  const impersonatorPerfilUpper = user.impersonator?.perfil?.toUpperCase();

  if (
    perfilUpper === "SUPER_ADMIN" || 
    perfilUpper === "ADMIN" ||
    impersonatorPerfilUpper === "SUPER_ADMIN" ||
    impersonatorPerfilUpper === "ADMIN"
  ) {
    return user;
  }
  return null;
}

// Log admin action to the GovernancaLog table
async function logAdminAction(adminUser: any, acao: string, descricao: string, detalhes?: any) {
  try {
    await prisma.governancaLog.create({
      data: {
        usuarioId: adminUser.id,
        usuarioNome: adminUser.nome,
        perfil: adminUser.perfil,
        acao,
        descricao,
        detalhes: detalhes || {}
      }
    });
  } catch (e) {
    console.error("Erro ao registrar log de governança:", e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdminAuth();
    if (!admin) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const tab = searchParams.get("tab") || "overview";

    // Build responsive data payloads based on the request tab
    if (tab === "overview") {
      // Fetch stats for general dashboard view
      const [totalUsuarios, totalEmpresas, totalLotes, totalEventos, logCount] = await Promise.all([
        prisma.usuario.count(),
        prisma.empresa.count(),
        prisma.esocialLote.count(),
        prisma.esocialEvento.count(),
        prisma.governancaLog.count()
      ]);

      // Simple processing metrics
      const pendentes = await prisma.esocialEvento.count({ where: { status: "pendente" } });
      const processados = await prisma.esocialEvento.count({ where: { status: "processado" } });
      const erros = await prisma.esocialEvento.count({ where: { status: "erro" } });

      return NextResponse.json({
        stats: {
          totalUsuarios,
          totalEmpresas,
          totalLotes,
          totalEventos,
          logCount,
          pendentes,
          processados,
          erros
        }
      });
    }

    if (tab === "permissoes") {
      // Select all custom dynamically editable profile permissions
      let perfis = await prisma.perfilPermissao.findMany({
        orderBy: { nomePerfil: "asc" }
      });

      // Default seeding for dynamic roles if none exist
      if (perfis.length === 0) {
        const defaultProfiles = [
          {
            nomePerfil: "GESTOR",
            descricao: "Gestão completa de trabalhadores e relatórios",
            permissoes: {
              visualizarDashboard: true,
              importarXml: true,
              reprocessarEventos: false,
              excluirDados: false,
              configurarIntegracoes: false,
              consultarLogs: true,
              gerenciarEmpresas: false
            }
          },
          {
            nomePerfil: "ANALISTA",
            descricao: "Análise técnica de inconsistências e conferência fiscal",
            permissoes: {
              visualizarDashboard: true,
              importarXml: true,
              reprocessarEventos: false,
              excluirDados: false,
              configurarIntegracoes: false,
              consultarLogs: false,
              gerenciarEmpresas: false
            }
          },
          {
            nomePerfil: "OPERADOR",
            descricao: "Importação e execução operacional básica",
            permissoes: {
              visualizarDashboard: true,
              importarXml: true,
              reprocessarEventos: false,
              excluirDados: false,
              configurarIntegracoes: false,
              consultarLogs: false,
              gerenciarEmpresas: false
            }
          },
          {
            nomePerfil: "CLIENTE",
            descricao: "Acesso externo apenas para visualização e relatórios",
            permissoes: {
              visualizarDashboard: true,
              importarXml: false,
              reprocessarEventos: false,
              excluirDados: false,
              configurarIntegracoes: false,
              consultarLogs: false,
              gerenciarEmpresas: false
            }
          }
        ];

        for (const dp of defaultProfiles) {
          await prisma.perfilPermissao.create({
            data: {
              nomePerfil: dp.nomePerfil,
              descricao: dp.descricao,
              permissoes: dp.permissoes
            }
          });
        }
        perfis = await prisma.perfilPermissao.findMany({ orderBy: { nomePerfil: "asc" } });
      }

      return NextResponse.json(perfis);
    }

    if (tab === "logs") {
      // Logs are restricted depending on user profile
      const isSuper = admin.perfil.toUpperCase() === "SUPER_ADMIN";
      
      const logs = await prisma.governancaLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 150
      });

      return NextResponse.json({
        isSuper,
        logs
      });
    }

    if (tab === "empresas") {
      const empresas = await prisma.empresa.findMany({
        orderBy: { razaoSocial: "asc" },
        include: {
          _count: {
            select: {
              trabalhadores: true,
              lotes: true,
              eventos: true
            }
          }
        }
      });
      return NextResponse.json(empresas);
    }

    if (tab === "config") {
      let configs = await prisma.configGlobal.findMany();
      if (configs.length === 0) {
        // Initial seeding for global configurations
        const defaultConfigs = [
          { chave: "LICENCIAMENTO_TIPO", valor: "Enterprise Platinum", descricao: "Tipo de licença ativa no sistema" },
          { chave: "CONSUMO_MAX", valor: "50000", descricao: "Limite de processamento mensal de XMLs" },
          { chave: "CONSUMO_ATUAL", valor: "14820", descricao: "Quantidade total de XMLs processados na competência atual" },
          { chave: "SISTEMA_BLOQUEADO", valor: "false", descricao: "Se verdadeiro, bloqueia o acesso geral de usuários" },
          { chave: "INTEGRACAO_ESOCIAL_PROD", valor: "true", descricao: "Ativa integração direta em ambiente do Governo Federal" }
        ];

        for (const dc of defaultConfigs) {
          await prisma.configGlobal.create({
            data: dc
          });
        }
        configs = await prisma.configGlobal.findMany();
      }
      return NextResponse.json(configs);
    }

    if (tab === "filas") {
      // Simulate real queues metrics safely
      const totalPendentes = await prisma.esocialEvento.count({ where: { status: "pendente" } });
      const processando = await prisma.esocialEvento.count({ where: { status: "processando" } });
      const reinfPendentes = await prisma.reinfEvento.count({ where: { status: "pendente" } });

      return NextResponse.json({
        filas: [
          { id: "esocial-eventos", nome: "Fila de Processamento eSocial S-5002", pendentes: totalPendentes, ativo: true, taxa: "45 xml/s", processando },
          { id: "reinf-eventos", nome: "Fila de Retenções EFD-REINF", pendentes: reinfPendentes, ativo: true, taxa: "12 xml/s", processando: 0 },
          { id: "dirf-generator", nome: "Motor DIRF Digital / Comprovantes", pendentes: 0, ativo: false, taxa: "0 xml/s", processando: 0 }
        ]
      });
    }

    return NextResponse.json({ error: "Aba não suportada." }, { status: 400 });
  } catch (error: any) {
    console.error("Erro no GET de governança:", error);
    return NextResponse.json({ error: error.message || "Erro no servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdminAuth();
    if (!admin) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    const isSuperAdmin = admin.perfil.toUpperCase() === "SUPER_ADMIN";

    // 1. IMPERSONATE ACTION
    if (action === "impersonate") {
      if (!isSuperAdmin) {
        return NextResponse.json({ error: "Apenas SuperAdmins podem impersonar usuários." }, { status: 403 });
      }

      const { targetUserId } = body;
      if (!targetUserId) {
        return NextResponse.json({ error: "ID do usuário alvo é obrigatório." }, { status: 400 });
      }

      const targetUser = await prisma.usuario.findUnique({
        where: { id: targetUserId }
      });

      if (!targetUser) {
        return NextResponse.json({ error: "Usuário alvo não encontrado." }, { status: 404 });
      }

      const targetPerfilUpper = targetUser.perfil.toUpperCase();
      if (targetPerfilUpper === "SUPER_ADMIN" && admin.id !== targetUser.id) {
        return NextResponse.json({ error: "Não é seguro impersonar outro SUPER_ADMIN." }, { status: 403 });
      }

      // Generate context cookie
      const sessionPayload: any = {
        id: targetUser.id,
        email: targetUser.email,
        nome: targetUser.nome,
        perfil: targetUser.perfil,
        impersonator: {
          id: admin.id,
          nome: admin.nome,
          email: admin.email,
          perfil: admin.perfil
        }
      };

      await setSessionCookie(sessionPayload);
      await logAdminAction(admin, "IMPERSONATION", `Iniciou impersonificação da conta: ${targetUser.nome} (${targetUser.email})`, { targetUserId: targetUser.id });

      return NextResponse.json({ success: true, user: sessionPayload });
    }

    // 2. UNIMPERSONATE ACTION
    if (action === "unimpersonate") {
      if (!admin.impersonator) {
        return NextResponse.json({ error: "Você não está impersonando nenhum usuário." }, { status: 400 });
      }

      const originalUser = admin.impersonator;

      // Restore original session token
      const sessionPayload: any = {
        id: originalUser.id,
        email: originalUser.email,
        nome: originalUser.nome,
        perfil: originalUser.perfil
      };

      await setSessionCookie(sessionPayload);
      await logAdminAction(originalUser, "UNIMPERSONATION", `Retornou da impersonificação do usuário: ${admin.nome}`, { targetUserId: admin.id });

      return NextResponse.json({ success: true, user: sessionPayload });
    }

    // 3. CREATE / UPDATE PROFILE PERMISSIONS
    if (action === "save-profile") {
      if (!isSuperAdmin) {
        return NextResponse.json({ error: "Apenas SuperAdmins podem alterar permissões de perfil." }, { status: 403 });
      }

      const { id, nomePerfil, descricao, permissoes } = body;
      if (!nomePerfil || !permissoes) {
        return NextResponse.json({ error: "Perfil/Permissões obrigatórios." }, { status: 400 });
      }

      const nomePerfilUpper = nomePerfil.toUpperCase();

      // Block modifying direct SUPER_ADMIN profiles dynamically as simple safety
      if (nomePerfilUpper === "SUPER_ADMIN" || nomePerfilUpper === "ADMIN") {
        return NextResponse.json({ error: "Perfis mestres não podem ser modificados dinamicamente." }, { status: 403 });
      }

      let upserted;
      if (id) {
        // If updating an existing profile ID, check if name change collides with another profile
        const existingWithSameName = await prisma.perfilPermissao.findFirst({
          where: {
            nomePerfil: nomePerfilUpper,
            NOT: { id }
          }
        });
        if (existingWithSameName) {
          return NextResponse.json({ error: `Já existe outro perfil cadastrado com o nome: ${nomePerfilUpper}` }, { status: 400 });
        }

        upserted = await prisma.perfilPermissao.update({
          where: { id },
          data: {
            nomePerfil: nomePerfilUpper,
            descricao,
            permissoes
          }
        });
      } else {
        upserted = await prisma.perfilPermissao.upsert({
          where: { nomePerfil: nomePerfilUpper },
          update: {
            descricao,
            permissoes
          },
          create: {
            nomePerfil: nomePerfilUpper,
            descricao,
            permissoes
          }
        });
      }

      await logAdminAction(admin, "PROFILE_UPDATE", `Atualizou as permissões associadas ao perfil: ${nomePerfilUpper}`, { nomePerfilUpper, profileId: upserted.id });
      return NextResponse.json({ success: true, profiling: upserted });
    }

    // 4. DELETE PROFILE PERMISSIONS
    if (action === "delete-profile") {
      if (!isSuperAdmin) {
        return NextResponse.json({ error: "Apenas SuperAdmins podem excluir perfis auxiliares." }, { status: 403 });
      }

      const { profileId } = body;
      const targetProfile = await prisma.perfilPermissao.findUnique({ where: { id: profileId } });
      
      if (!targetProfile) {
        return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
      }

      await prisma.perfilPermissao.delete({ where: { id: profileId } });
      await logAdminAction(admin, "PROFILE_DELETE", `Removeu perfil dinâmico: ${targetProfile.nomePerfil}`, { profileName: targetProfile.nomePerfil });

      return NextResponse.json({ success: true });
    }

    // 5. UPDATE CONFIG GLOBALS
    if (action === "update-config") {
      const { chave, valor } = body;
      if (!chave || valor === undefined) {
        return NextResponse.json({ error: "Parâmetros chave/valor incorretos." }, { status: 400 });
      }

      // Security boundaries check
      if (chave.toUpperCase() === "LICENCIAMENTO_TIPO" && !isSuperAdmin) {
        return NextResponse.json({ error: "Ação Bloqueada: Apenas SuperAdmin pode alterar o tipo de licenciamento." }, { status: 403 });
      }

      const updated = await prisma.configGlobal.update({
        where: { chave },
        data: { valor }
      });

      await logAdminAction(admin, "CONFIG_CHANGE", `Alterou configuração [${chave}] para: [${valor}]`, { chave, valor });
      return NextResponse.json({ success: true, config: updated });
    }

    // 6. DEL ETING CRITICAL ENTITY (EMPRESA)
    if (action === "delete-empresa") {
      if (!isSuperAdmin) {
        return NextResponse.json({ error: "Iniciativa Bloqueada: Administradores comuns não podem faturar ou excluir empresas ou dados críticos." }, { status: 403 });
      }

      const { empresaId } = body;
      if (!empresaId) {
        return NextResponse.json({ error: "ID da empresa obrigatório." }, { status: 400 });
      }

      const targetEmpresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
      if (!targetEmpresa) {
        return NextResponse.json({ error: "Empresa não cadastrada no portal." }, { status: 404 });
      }

      // Check for cascading deletions safety inside a transaction
      await prisma.$transaction([
        prisma.s5002ConsolidadoPeriodo.deleteMany({ where: { empresaId } }),
        prisma.s5002ConsolidadoAnual.deleteMany({ where: { empresaId } }),
        prisma.s5002Evento.deleteMany({ where: { empresaId } }),
        prisma.esocialEvento.deleteMany({ where: { empresaId } }),
        prisma.esocialLote.deleteMany({ where: { empresaId } }),
        prisma.trabalhador.deleteMany({ where: { empresaId } }),
        prisma.certificadoDigital.deleteMany({ where: { empresaId } }),
        prisma.empresa.delete({ where: { id: empresaId } })
      ]);

      await logAdminAction(admin, "CRITICAL_DELETE_EMPRESA", `Removeu permanentemente a empresa: ${targetEmpresa.razaoSocial} (${targetEmpresa.cnpjRaiz})`, { empresaId });
      return NextResponse.json({ success: true });
    }

    // 7. CADASTRO DE CÓDIGOS FISCAIS
    if (action === "save-codigo-receita") {
      const { codigo, denominacao, baseLegal } = body;
      if (!codigo || !denominacao) {
        return NextResponse.json({ error: "Código e Denominação obrigatórios." }, { status: 400 });
      }

      if (!isSuperAdmin) {
        return NextResponse.json({ error: "Apenas SuperAdmins podem gerenciar códigos de receita novos diretamente." }, { status: 403 });
      }

      const rfbCode = await prisma.rfbCodigoReceita.upsert({
        where: { codigo },
        update: {
          denominacao,
          baseLegal: baseLegal || []
        },
        create: {
          codigo,
          denominacao,
          baseLegal: baseLegal || []
        }
      });

      await logAdminAction(admin, "CODE_FISCAL_UPSERT", `Salvou código de receita RFB: ${codigo}`, { codigo });
      return NextResponse.json({ success: true, code: rfbCode });
    }

    // 8. XML REPROCESS ACTION (for both Admin & SuperAdmin can trigger parsing again)
    if (action === "reprocess-xml") {
      const { loteId } = body;
      if (!loteId) {
        return NextResponse.json({ error: "ID do lote obrigatório." }, { status: 400 });
      }

      // Real update state trace of esocial events to show reprocessing trigger
      await prisma.esocialLote.update({
        where: { id: loteId },
        data: { status: "pendente" }
      });

      await prisma.esocialEvento.updateMany({
        where: { loteId },
        data: { status: "pendente" }
      });

      await logAdminAction(admin, "XML_REPROCESS", `Forçou reprocessamento completo do Lote eSocial ID: ${loteId}`);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Ação não encontrada." }, { status: 400 });
  } catch (error: any) {
    console.error("Erro no POST de governança:", error);
    return NextResponse.json({ error: error.message || "Erro interno do servidor." }, { status: 500 });
  }
}
