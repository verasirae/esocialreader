import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api-utils";
import { s5002ProcessorService } from "@/services/esocial/s5002-processor.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cpfRaw = String(body.cpf || "").replace(/\D/g, "");
    const cpf = cpfRaw.padStart(11, "0");
    const { 
      nome, 
      cnpjEmpregador,
      nis,
      matricula,
      categoriaEsocial,
      dtAdmissao,
      dtDesligamento,
      ativo 
    } = body;

    if (!cpf || cpf.length !== 11) {
      return safeJson({ error: "CPF inválido (deve conter 11 dígitos)" }, 400);
    }

    if (!nome) {
      return safeJson({ error: "Nome é obrigatório" }, 400);
    }

    if (!cnpjEmpregador) {
      return safeJson({ error: "CNPJ Empregador é obrigatório" }, 400);
    }

    const cleanCnpj = String(cnpjEmpregador).replace(/\D/g, "");
    if (cleanCnpj.length < 8) {
      return safeJson({ error: "CNPJ Empregador inválido" }, 400);
    }

    const cnpjRaiz = cleanCnpj.substring(0, 8);
    let empresa = await prisma.empresa.findFirst({
      where: {
        OR: [
          { cnpjRaiz: cnpjRaiz },
          { cnpjCompleto: cleanCnpj }
        ]
      }
    });

    if (!empresa) {
      empresa = await prisma.empresa.create({
        data: {
          cnpjRaiz,
          cnpjCompleto: cleanCnpj.length >= 14 ? cleanCnpj : null,
          razaoSocial: "Empresa " + cleanCnpj,
          ambienteEsocial: "producao"
        }
      });
    }

    const empresaId = empresa.id;

    const parsedDtAdmissao = dtAdmissao ? new Date(dtAdmissao) : null;
    const parsedDtDesligamento = dtDesligamento ? new Date(dtDesligamento) : null;
    const isAtivo = ativo !== undefined ? String(ativo) === "true" : true;

    const trabalhador = await prisma.trabalhador.upsert({
      where: { 
        empresaId_cpf: {
          empresaId,
          cpf
        }
      },
      update: { 
        nome,
        nis: nis || null,
        matricula: matricula || null,
        categoriaEsocial: categoriaEsocial || null,
        dtAdmissao: parsedDtAdmissao,
        dtDesligamento: parsedDtDesligamento,
        ativo: isAtivo,
      },
      create: { 
        cpf,
        nome,
        empresaId,
        nis: nis || null,
        matricula: matricula || null,
        categoriaEsocial: categoriaEsocial || null,
        dtAdmissao: parsedDtAdmissao,
        dtDesligamento: parsedDtDesligamento,
        ativo: isAtivo,
      }
    });

    // Re-processar eventos que estavam pendentes por falta deste cadastro
    await s5002ProcessorService.reprocessPending({ cpfBenef: cpf });

    return safeJson({ success: true, data: trabalhador });
  } catch (error) {
    console.error("Erro ao cadastrar trabalhador:", error);
    return safeJson({ error: "Erro ao cadastrar trabalhador" }, 500);
  }
}
