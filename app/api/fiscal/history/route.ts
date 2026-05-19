import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [eventHistory, tableHistory, loteHistory] = await Promise.all([
      prisma.esocialEventoHistorico.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: {
          evento: {
            select: {
              eventoId: true,
              tpEvento: true,
              perApur: true,
              trabalhador: {
                select: { nome: true }
              }
            }
          }
        }
      }),
      prisma.esocialImportLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.esocialLote.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { empresa: { select: { razaoSocial: true } } }
      })
    ]);

    const formattedTable = tableHistory.map(h => ({
      id: `table-${h.id}`,
      acao: 'upload',
      descricao: `Importação de Tabela (${h.tableId}): ${h.processed} docs, ${h.errors} erros.`,
      createdAt: h.createdAt,
      evento: null
    }));

    const formattedLotes = loteHistory.map(l => ({
      id: `lote-${l.id}`,
      acao: 'upload',
      descricao: `Lote XML Importado: ${l.nomeArquivo} (${l.status})`,
      createdAt: l.createdAt,
      evento: null
    }));

    const combined = [...eventHistory, ...formattedTable, ...formattedLotes].sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, 50);

    return NextResponse.json(combined);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
