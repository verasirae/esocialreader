"use client";

import React, { createContext, useContext, useState } from "react";

interface ModalContextType {
  isRegisterEmpresaModalOpen: boolean;
  editingEmpresa: any | null;
  openRegisterEmpresaModal: (empresa?: any) => void;
  closeRegisterEmpresaModal: () => void;
  isRegisterTrabalhadorModalOpen: boolean;
  editingTrabalhador: any | null;
  openRegisterTrabalhadorModal: (trabalhador?: any) => void;
  closeRegisterTrabalhadorModal: () => void;
  isRegisterOperadoraModalOpen: boolean;
  editingOperadora: any | null;
  openRegisterOperadoraModal: (operadora?: any) => void;
  closeRegisterOperadoraModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isRegisterEmpresaModalOpen, setIsRegisterEmpresaModalOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<any | null>(null);

  const [isRegisterTrabalhadorModalOpen, setIsRegisterTrabalhadorModalOpen] = useState(false);
  const [editingTrabalhador, setEditingTrabalhador] = useState<any | null>(null);

  const [isRegisterOperadoraModalOpen, setIsRegisterOperadoraModalOpen] = useState(false);
  const [editingOperadora, setEditingOperadora] = useState<any | null>(null);

  const openRegisterEmpresaModal = (empresa?: any) => {
    setEditingEmpresa(empresa || null);
    setIsRegisterEmpresaModalOpen(true);
  };
  const closeRegisterEmpresaModal = () => {
    setIsRegisterEmpresaModalOpen(false);
    setEditingEmpresa(null);
  };

  const openRegisterTrabalhadorModal = (trabalhador?: any) => {
    setEditingTrabalhador(trabalhador || null);
    setIsRegisterTrabalhadorModalOpen(true);
  };
  const closeRegisterTrabalhadorModal = () => {
    setIsRegisterTrabalhadorModalOpen(false);
    setEditingTrabalhador(null);
  };

  const openRegisterOperadoraModal = (operadora?: any) => {
    setEditingOperadora(operadora || null);
    setIsRegisterOperadoraModalOpen(true);
  };
  const closeRegisterOperadoraModal = () => {
    setIsRegisterOperadoraModalOpen(false);
    setEditingOperadora(null);
  };

  return (
    <ModalContext.Provider 
      value={{ 
        isRegisterEmpresaModalOpen, 
        editingEmpresa,
        openRegisterEmpresaModal, 
        closeRegisterEmpresaModal,
        isRegisterTrabalhadorModalOpen,
        editingTrabalhador,
        openRegisterTrabalhadorModal,
        closeRegisterTrabalhadorModal,
        isRegisterOperadoraModalOpen,
        editingOperadora,
        openRegisterOperadoraModal,
        closeRegisterOperadoraModal
      }}
    >
      {children}
    </ModalContext.Provider>
  );
}

export function useModals() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error("useModals must be used within a ModalProvider");
  }
  return context;
}
