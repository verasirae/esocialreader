import { cookies } from "next/headers";
import crypto from "crypto";

export interface SessionUser {
  id: string;
  email: string;
  nome: string;
  perfil: "superAdmin" | "Admin" | "user";
}

const SESSION_COOKIE_NAME = "compliance_session";
const SESSION_SECRET = process.env.JWT_SECRET || "compliance_portal_secret_key_1234567890";

// Helper to hash password using native crypto sha256
export function hashPassword(password: string): string {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(password)
    .digest("hex");
}

// Encode/Encrypt session data in a simple, safe JSON token
export function encryptSession(user: SessionUser): string {
  const payload = JSON.stringify({
    ...user,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
  });
  
  const iv = crypto.randomBytes(16);
  // Ensure the key is exactly 32 bytes by hashing SESSION_SECRET
  const key = crypto.createHash("sha256").update(SESSION_SECRET).digest();
  
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(payload, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  return iv.toString("hex") + ":" + encrypted;
}

// Decode/Decrypt session data
export function decryptSession(sessionStr: string): SessionUser | null {
  try {
    const [ivHex, encryptedHex] = sessionStr.split(":");
    if (!ivHex || !encryptedHex) return null;
    
    const iv = Buffer.from(ivHex, "hex");
    const key = crypto.createHash("sha256").update(SESSION_SECRET).digest();
    
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    const data = JSON.parse(decrypted);
    
    // Check expiration
    if (data.exp && Date.now() > data.exp) {
      return null;
    }
    
    return {
      id: data.id,
      email: data.email,
      nome: data.nome,
      perfil: data.perfil,
    };
  } catch (error) {
    console.error("Failed to decrypt session:", error);
    return null;
  }
}

// Get the current user from session in Server Side contexts
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }
    return decryptSession(sessionCookie.value);
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    return null;
  }
}

// Set session cookie
export async function setSessionCookie(user: SessionUser) {
  const cookieStore = await cookies();
  const encrypted = encryptSession(user);
  cookieStore.set(SESSION_COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

// Clear session cookie
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 0,
  });
}
