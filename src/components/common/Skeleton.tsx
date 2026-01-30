import React from 'react';
import { DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { colors, radius } from '../../theme';

type Props = {
  width?: DimensionValue | number;
  height?: number;
  style?: ViewStyle;
};

export const Skeleton: React.FC<Props> = ({ width = '100%', height = 16, style }) => {
  return (
    <View style={[{ width: width as DimensionValue, height }, style]}>
      <Animated.View layout={LinearTransition.springify()} style={[styles.base, { width: '100%', height }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
});

