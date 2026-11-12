import { t } from '../utils/i18n';
import React from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { useSignOutConfirmDialog } from '../hooks/shell/useSignOutConfirmDialog';

export const SignOutConfirmDialog: React.FC = () => {
  const { isOpen, onCancel, onConfirm } = useSignOutConfirmDialog();

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title={t("¿Cerrar sesión?")}
      message={t("Tienes cambios sin sincronizar. Si cierras sesión ahora se perderán en este dispositivo.")}
      confirmLabel={t("Cerrar sesión igualmente")}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
};
