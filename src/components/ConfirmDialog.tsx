/**
 * ConfirmDialog — themed cross-platform confirm modal.
 *
 * Replaces the platform's default confirmation primitives:
 *   - native: Alert.alert (works, but visually inconsistent across Android/iOS)
 *   - web:    window.confirm (looks like a system dialog, breaks brand feel)
 *
 * Usage:
 *   const [open, setOpen] = useState(false);
 *   <ConfirmDialog
 *     visible={open}
 *     title="Logout"
 *     message="Are you sure you want to logout?"
 *     confirmText="Logout"
 *     destructive
 *     onConfirm={() => { setOpen(false); doLogout(); }}
 *     onCancel={() => setOpen(false)}
 *   />
 */
import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Pressable, Platform,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  hideCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<Props> = ({
  visible, title, message,
  confirmText = 'Confirm', cancelText = 'Cancel',
  destructive = false,
  hideCancel = false,
  onConfirm, onCancel,
}) => {
  const C = useTheme();
  const styles = React.useMemo(() => makeStyles(C), [C]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            {!hideCancel && (
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel]}
                onPress={onCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.btnCancelText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.btn,
                destructive ? styles.btnDestructive : styles.btnPrimary,
              ]}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <Text style={destructive ? styles.btnDestructiveText : styles.btnPrimaryText}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(4px)' } as any) : {}),
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 24 },
      android: { elevation: 12 },
      web: ({ boxShadow: '0 20px 50px rgba(0,0,0,0.35)' } as any),
    }),
  },
  title: {
    fontSize: 18, fontWeight: '700', color: C.foreground,
    marginBottom: 6,
  },
  message: {
    fontSize: 14, color: C.muted, lineHeight: 20,
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  btn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: C.border,
  },
  btnCancelText: { color: C.foreground, fontWeight: '600', fontSize: 14 },
  btnPrimary: { backgroundColor: C.primary },
  btnPrimaryText: { color: C.primaryFg, fontWeight: '700', fontSize: 14 },
  btnDestructive: { backgroundColor: C.danger },
  btnDestructiveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default ConfirmDialog;
