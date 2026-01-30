import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../../theme';
import type { AgencyRole } from '../../services/agencyModels';

type Props = {
  role: AgencyRole;
  children: ReactNode;
};

const FRAME_COLORS: Record<AgencyRole, string> = {
  'Chief Official': colors.primary,
  'Country Manager': colors.secondary,
  'Super Admin': '#4A90D9',
  'Admin': '#50C878',
  'BD': colors.border,
};

/** Golden/official frame around avatar or card for agency identity */
export const OfficialFrame: React.FC<Props> = ({ role, children }) => {
  const borderColor = FRAME_COLORS[role] ?? colors.border;
  return (
    <View style={[styles.frame, { borderColor }]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    borderWidth: 2,
    borderRadius: radius.lg,
    padding: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
});
