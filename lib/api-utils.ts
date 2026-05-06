import { NextResponse } from "next/server";

export function safeJson(data: any, status: number = 200) {
  try {
    const serialized = JSON.parse(JSON.stringify(data, (key, value) => {
      // Handle Prisma Decimal
      if (typeof value === 'object' && value !== null && value.constructor && value.constructor.name === 'Decimal') {
        return value.toString();
      }
      // Handle BigInt
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    }));
    return NextResponse.json(serialized, { status });
  } catch (error) {
    console.error("Erro na serialização JSON:", error);
    return NextResponse.json({ error: "Erro de serialização" }, { status: 500 });
  }
}
