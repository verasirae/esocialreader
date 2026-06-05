// app/api/consultas-especiais/executar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validarSql } from "@/lib/consulta/sql-guard";
import { getCurrentUser } from "@/lib/auth-server";

const MAX_ROWS = 2000;
const TIMEOUT_MS = 20000; // 20 segundos

export async function POST(req: NextRequest) {
  try {
    // 1. Autenticação e autorização
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Sessão expirada ou não autenticada." },
        { status: 401 }
      );
    }

    if (sessionUser.perfil !== "superAdmin") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas usuários com perfil superAdmin podem realizar consultas especiais." },
        { status: 401 } // Usamos 401 para evitar interceptações de 403 pelo proxy nginx
      );
    }

    const { sql, consultaId } = await req.json();

    if (!sql || typeof sql !== "string") {
      return NextResponse.json({ error: "Instrução SQL inválida." }, { status: 400 });
    }

    const cleanSql = sql.trim();

    // 2. Validação de segurança (SQL Guard)
    const guard = validarSql(cleanSql);
    if (!guard.permitido) {
      // Registrar tentativa bloqueada para fins de auditoria e segurança
      await prisma.consultaExecucao.create({
        data: {
          consultaId: consultaId || null,
          sqlExecutado: cleanSql,
          status: "bloqueado",
          mensagemErro: guard.motivo || "Bloqueado pelo SQL Guard",
          totalLinhas: 0,
          duracaoMs: 0,
          executadoPor: sessionUser.id
        }
      });
      return NextResponse.json({ error: guard.motivo }, { status: 422 });
    }

    // 3. Execução em read-only transaction com timeout
    const inicio = Date.now();
    let resultado: any[] = [];
    let status = "sucesso";
    let mensagemErro: string | undefined;

    try {
      resultado = await prisma.$transaction(
        async (tx) => {
          // Garante read-only e timeout no nível do PostgreSQL
          try {
            await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
          } catch (e) {
            console.warn("Aviso: Não foi possível definir a transação como READ ONLY:", e);
          }
          
          try {
            await tx.$executeRawUnsafe(`SET statement_timeout = ${TIMEOUT_MS}`);
          } catch (e) {
            console.warn("Aviso: Não foi possível definir o statement_timeout:", e);
          }

          const rows = (await tx.$queryRawUnsafe(cleanSql)) as any[];

          // Limita retorno sem abortar no banco para fins de UX
          return rows.slice(0, MAX_ROWS);
        },
        { timeout: TIMEOUT_MS + 2000 }
      );
    } catch (err: any) {
      console.error("Erro na execução da consulta:", err);
      const msg = err.message || String(err);
      status = msg.toLowerCase().includes("timeout") ? "timeout" : "erro";
      mensagemErro = msg;
      resultado = [];
    }

    const duracaoMs = Date.now() - inicio;

    // 4. Log de auditoria obrigatório
    try {
      await prisma.consultaExecucao.create({
        data: {
          consultaId: consultaId || null,
          sqlExecutado: cleanSql,
          status,
          mensagemErro: mensagemErro ? mensagemErro.slice(0, 500) : null,
          totalLinhas: resultado.length,
          duracaoMs,
          executadoPor: sessionUser.id
        }
      });
    } catch (logErr) {
      console.error("Erro ao registrar log de execução da consulta:", logErr);
    }

    if (status !== "sucesso") {
      return NextResponse.json(
        { error: mensagemErro || "Erro desconhecido na execução da consulta." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      dados: resultado,
      totalLinhas: resultado.length,
      truncado: resultado.length === MAX_ROWS,
      duracaoMs
    });
  } catch (error: any) {
    console.error("Erro interno no endpoint de execução:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao processar consulta." },
      { status: 500 }
    );
  }
}
