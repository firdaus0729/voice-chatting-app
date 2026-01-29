import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { RoyalColors, Radius, Spacing } from '@/constants/theme';

interface InputProps extends TextInputProps {
  containerStyle?: ViewStyle;
  error?: boolean;
}

export function Input({
  containerStyle,
  error,
  style,
  placeholderTextColor = RoyalColors.textMuted,
  ...rest
}: InputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={placeholderTextColor}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    backgroundColor: RoyalColors.blackCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: RoyalColors.blackElevated,
    color: RoyalColors.text,
    fontSize: 16,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  inputError: {
    borderColor: RoyalColors.error,
  },
});
