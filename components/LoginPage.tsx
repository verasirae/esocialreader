"use client";

import React, { useState } from "react";
import { Shield, Lock, Mail, ArrowRight, Eye, EyeOff, Check, Construction } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || "Credenciais de acesso incorretas.");
      }
    } catch (err) {
      setError("Erro ao tentar conectar ao servidor de autenticação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f0f2f5] p-2 sm:p-4 md:p-8">
      {/* Container Frame */}
      <div 
        id="login-container-card"
        className="w-full max-w-5xl h-[620px] bg-white rounded-lg overflow-hidden shadow-2xl flex border border-outline-variant"
      >
        {/* LEFT PANEL: Branding & Visual Banner (Hidden on Mobile/Tablet) */}
        <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#102447] via-[#1B365D] to-[#254B82] p-10 flex-col justify-between relative overflow-hidden select-none">
          {/* Ambient lighting backgrounds */}
          <div className="absolute top-[-50%] right-[-50%] w-[100%] h-[100%] bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-[-30%] left-[-20%] w-[80%] h-[80%] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          {/* Mockup Portal Preview container */}
          <div className="relative border border-white/10 rounded-md bg-[#FAF9FC]/5 p-4 flex-1 flex flex-col overflow-hidden max-h-[380px] shadow-lg shadow-black/20">
            {/* Mock Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
              </div>
              <div className="h-4 w-44 bg-white/10 rounded-full" />
            </div>

            {/* Mock Body */}
            <div className="flex-1 flex flex-col gap-3 overflow-hidden">
              <div className="flex justify-between items-center shrink-0">
                <div className="h-5 w-24 bg-white/15 rounded-full" />
                <div className="h-6 w-16 bg-[#1B365D] border border-white/20 rounded-full" />
              </div>
              
              {/* Cards row */}
              <div className="grid grid-cols-2 gap-2 shrink-0">
                <div className="p-3 bg-white/5 border border-white/5 rounded-sm flex flex-col gap-1">
                  <div className="h-2 w-12 bg-white/30 rounded-full" />
                  <div className="h-4 w-6 bg-white/60 rounded-full" />
                </div>
                <div className="p-3 bg-white/5 border border-white/5 rounded-sm flex flex-col gap-1">
                  <div className="h-2 w-16 bg-white/30 rounded-full" />
                  <div className="h-4 w-10 bg-white/60 rounded-full" />
                </div>
              </div>

              {/* Table/rows mocks */}
              <div className="space-y-2 mt-2 flex-1 overflow-hidden">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between items-center p-2.5 bg-white/5 rounded-sm border-l border-indigo-400">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-400/20" />
                      <div className="space-y-1">
                        <div className="h-2.5 w-24 bg-white/40 rounded-full" />
                        <div className="h-1.5 w-16 bg-white/20 rounded-full" />
                      </div>
                    </div>
                    <div className="h-3 w-8 bg-green-400/30 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Slogan details */}
          <div className="relative z-10 pt-6">
            <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
              Precision In Compliance
            </h2>
            <p className="text-white/70 text-xs mt-2 font-medium leading-relaxed font-sans max-w-sm">
              Empowering financial analysts and compliance officers with architectural-grade data integrity and unshakeable system reliability.
            </p>
          </div>
        </div>

        {/* RIGHT PANEL: Authentic Login Form */}
        <div className="w-full lg:w-1/2 bg-[#FCFCFD] p-6 sm:p-10 md:p-12 flex flex-col justify-between overflow-y-auto">
          
          {/* Card Top Title Block & Brand */}
          <div>
            <div className="flex items-center gap-3 mb-6 select-none">
              <div className="w-10 h-10 bg-[#1B365D] rounded-lg flex items-center justify-center text-white shadow-md shadow-[#1b365d]/20 relative">
                <Shield size={22} className="stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-lg font-black text-[#1B365D] tracking-tight leading-none">
                  Compliance Portal
                </h1>
                <p className="text-[9px] font-bold text-secondary uppercase tracking-widest mt-0.5">
                  e-Social & Reinf Auditor
                </p>
              </div>
            </div>

            <p className="text-sm font-semibold text-secondary mb-6">
              Sign in to manage S-5002 audit batches
            </p>

            {/* Error Alert Box */}
            {error && (
              <div className="p-4 mb-5 rounded-sm bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-600" />
                <p className="flex-1">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Field: Email / Username */}
              <div>
                <label className="block text-[10px] font-bold text-[#1B365D] uppercase tracking-wider mb-1.5 select-none font-mono">
                  Email or Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-secondary">
                    <Mail size={16} />
                  </span>
                  <input
                    id="login-email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. j.doe@organization.com"
                    autoComplete="email"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-[#f3f4f6]/80 text-[#1B1C1E] text-xs font-medium rounded-sm border border-outline-variant/60 focus:border-[#1B365D] focus:bg-white outline-none transition-all placeholder:text-secondary/60 shadow-inner"
                  />
                </div>
              </div>

              {/* Field: Password */}
              <div>
                <div className="flex justify-between items-center mb-1.5 select-none font-mono">
                  <label className="block text-[10px] font-bold text-[#1B365D] uppercase tracking-wider">
                    Password
                  </label>
                  <button 
                    type="button"
                    onClick={() => {
                      alert("Para recuperar ou redefinir sua senha, entre em contato com o administrador do sistema (SuperAdmin).");
                    }}
                    className="text-[10px] font-bold text-[#1B365D] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-secondary">
                    <Lock size={16} />
                  </span>
                  <input
                    id="login-password-input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full pl-10 pr-10 py-3 bg-[#f3f4f6]/80 text-[#1B1C1E] text-xs font-medium rounded-sm border border-outline-variant/60 focus:border-[#1B365D] focus:bg-white outline-none transition-all placeholder:text-secondary/60 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-secondary hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember me Checkbox */}
              <div className="flex items-center select-none pt-1">
                <label className="flex items-center cursor-pointer text-xs font-semibold text-secondary">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 border border-outline-variant rounded-sm mr-2 flex items-center justify-center transition-all ${rememberMe ? "bg-[#1B365D] border-[#1B365D]" : "bg-white"}`}>
                    {rememberMe && <Check size={11} className="text-white stroke-[3.5]" />}
                  </div>
                  Remember me for 30 days
                </label>
              </div>

              {/* Signup trigger note info */}
              <div className="bg-surface-container/40 border border-outline-variant/50 p-3 rounded-sm flex items-start gap-2.5 text-[10px] leading-tight text-secondary font-medium">
                <div className="shrink-0 w-2.5 h-2.5 rounded-full bg-[#1B365D] flex items-center justify-center text-white p-1 font-mono text-[8px] font-black mt-0.5">i</div>
                <p>
                  Acesso restrito. Sem usuários cadastrados? Utilize a credencial inicial <strong className="text-[#1B365D]">admin@compliance.com</strong> com a senha padrão <strong className="text-[#1B365D]">senha123</strong>.
                </p>
              </div>

              {/* Button: Sign In */}
              <button
                id="login-submit-button"
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 bg-[#1B365D] hover:bg-[#152a4a] text-white font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    AUTENTICANDO...
                  </span>
                ) : (
                  <>
                    SIGN IN TO SYSTEM
                    <ArrowRight size={14} className="stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>

            {/* Divider block */}
            <div className="my-5 flex items-center select-none">
              <div className="flex-1 h-[1px] bg-outline-variant/50" />
              <span className="px-3 text-[10px] font-bold text-secondary/70 uppercase tracking-widest font-mono">or sso</span>
              <div className="flex-1 h-[1px] bg-outline-variant/50" />
            </div>

            {/* SSO login simulation button */}
            <button
              onClick={() => {
                alert("O Login Unificado via SSO Gov.br está desabilitado para este ambiente de desenvolvimento.");
              }}
              className="w-full border border-outline-variant hover:bg-[#f8f9fa] text-on-surface font-semibold text-xs py-2.5 px-4 rounded-sm flex items-center justify-center gap-2 transition-all"
            >
              <div className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center text-[10px] italic font-serif">g</div>
              ORGANIZATION LOGIN
            </button>
          </div>

          {/* Secure Badges & Version footer */}
          <div className="border-t border-outline-variant/60 pt-4 flex items-center justify-between text-[10px] text-secondary font-semibold font-mono tracking-tight shrink-0 select-none">
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <Lock size={10} className="text-secondary" />
                SSL SECURE
              </span>
              <span className="flex items-center gap-1">
                <Shield size={10} className="text-secondary" />
                DATA ENCRYPTED
              </span>
            </div>
            <span>v.2.4.0-STABLE</span>
          </div>

        </div>
      </div>
    </div>
  );
}
