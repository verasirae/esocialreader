import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StatusProcessamento } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const counts = await prisma.esocialLote.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    });

    let pendingCount = 0;
    let processingCount = 0;
    let processedCount = 0;
    let errorCount = 0;

    for (const group of counts) {
      if (group.status === StatusProcessamento.pendente) {
        pendingCount = group._count._all;
      } else if (group.status === StatusProcessamento.processando) {
        processingCount = group._count._all;
      } else if (group.status === StatusProcessamento.processado) {
        processedCount = group._count._all;
      } else if (group.status === StatusProcessamento.erro) {
        errorCount = group._count._all;
      }
    }

    const isSyncing = pendingCount > 0 || processingCount > 0;

    return NextResponse.json({
      success: true,
      isSyncing,
      pendingCount,
      processingCount,
      processedCount,
      errorCount,
    });
  } catch (err: any) {
    console.error("[S5002-Import-Status] Failed to get sync status:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
