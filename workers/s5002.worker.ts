// import { Worker } from "bullmq";
// import IORedis from "ioredis";
// import { s5002Parser } from "@/services/parser/s5002-parser.service";
// import { esocialEventoRepository } from "@/repositories/esocial-evento.repository";
// import { s5002Repository } from "@/repositories/s5002.repository";
// import { consolidacaoFiscalService } from "@/services/fiscal/consolidacao.service";

// const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
// const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

// A lógica foi movida para s5002-processor.service.ts para permitir execução sem Redis.
export const s5002Worker = null;
