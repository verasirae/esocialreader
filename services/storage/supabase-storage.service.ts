import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

export class StorageService {
  private bucketName = "esocial-xmls";

  async uploadXml(path: string, content: string | Buffer) {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(path, content, {
          contentType: "text/xml",
          upsert: true,
        });

      if (error) {
        if (error.message.includes("Bucket not found")) {
          console.warn(`[StorageService] Bucket "${this.bucketName}" não encontrado. Pulando upload físico mas mantendo referência lógica.`);
          return path;
        }
        throw error;
      }
      return data.path;
    } catch (err: any) {
      if (err.message?.includes("Bucket not found")) {
        console.warn(`[StorageService] Bucket "${this.bucketName}" não encontrado. Ignorando erro para desenvolvimento.`);
        return path;
      }
      throw err;
    }
  }

  async downloadXml(path: string) {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .download(path);

      if (error) throw error;
      return await data.text();
    } catch (err: any) {
      console.error(`[StorageService] Erro ao baixar XML de ${path}:`, err);
      throw err;
    }
  }

  async getPublicUrl(path: string) {
    const { data } = supabase.storage.from(this.bucketName).getPublicUrl(path);
    return data.publicUrl;
  }
}

export const storageService = new StorageService();
