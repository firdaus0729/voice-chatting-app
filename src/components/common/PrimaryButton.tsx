import React from 'react';
import { ActivityIndicator, GestureResponderEvent, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, spacing, typography, radius } from '../../theme';

type Props = {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export const PrimaryButton: React.FC<Props> = ({ label, onPress, disabled, loading, style }) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.button, isDisabled && styles.buttonDisabled, style]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={colors.textPrimary} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: colors.primaryDisabled,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.background,
  },
});

