import React from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { useSignOutConfirmDialog } from '../hooks/shell/useSignOutConfirmDialog';

export const SignOutConfirmDialog: React.FC = () => {
  const { isOpen, onCancel, onConfirm } = useSignOutConfirmDialog();

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title="¿Cerrar sesión?"
      message="Tienes cambios sin sincronizar. Si cierras sesión ahora se perderán en este dispositivo."
      confirmLabel="Cerrar sesión igualmente"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
};
