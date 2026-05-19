import { s5002ProcessorService } from "./s5002-processor.service";

export class QueueService {
  async addJob(name: string, data: any) {
    try {
      console.log(`[QueueService] Executando job "${name}" diretamente (sem Redis)`);
      // Em vez de adicionar na fila, processamos imediatamente ou via Promise
      // para simular o comportamento assíncrono se necessário, mas aqui processamos direto.
      return await s5002ProcessorService.process(data);
    } catch (error: any) {
      console.error("Erro ao processar job:", error);
      if (error.name === "PrismaClientValidationError") {
        console.error("DETALHE VALIDACAO PRISMA no JOB:", error.message);
      }
      throw error;
    }
  }
}

export const queueService = new QueueService();
