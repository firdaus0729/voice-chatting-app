import React from 'react';
import { StyleSheet, View } from 'react-native';
import LottieView from 'lottie-react-native';
import { colors } from '../../theme';

export const PremiumLoader: React.FC = () => {
  return (
    <View style={styles.container}>
      <LottieView
        style={styles.lottie}
        autoPlay
        loop
        source={{
          uri: 'https://assets10.lottiefiles.com/packages/lf20_puciaact.json',
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: {
    width: 120,
    height: 120,
    tintColor: colors.primary,
  },
});

