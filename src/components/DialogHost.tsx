/**
 * DialogHost — single mount-point at the app root that owns the themed
 * ConfirmDialog and subscribes to the global dialog service. Any code that
 * calls `confirm()` / `alert()` from services/dialog.ts triggers this.
 */
import React, { useEffect, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import {
  getDialogState, subscribeDialog, _resolveDialog,
} from '../services/dialog';

const DialogHost: React.FC = () => {
  const [s, setS] = useState(getDialogState());

  useEffect(() => {
    return subscribeDialog(() => setS(getDialogState()));
  }, []);

  return (
    <ConfirmDialog
      visible={s.visible}
      title={s.title}
      message={s.message}
      confirmText={s.confirmText}
      cancelText={s.cancelText}
      destructive={s.destructive}
      hideCancel={s.hideCancel}
      onConfirm={() => _resolveDialog(true)}
      onCancel={() => _resolveDialog(false)}
    />
  );
};

export default DialogHost;
