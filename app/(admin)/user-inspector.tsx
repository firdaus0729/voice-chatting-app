import { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoyalColors, Spacing } from '@/constants/theme';
import {
  searchUsers,
  updateUserCoins,
  updateUserDiamonds,
  updateUserVIP,
  updateUserRole,
} from '@/features/admin/services/adminService';
import type { AgencyRole } from '@/types/user';

export default function UserInspectorScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<Array<{
    uid: string;
    displayName: string;
    email: string | null;
    coins: number;
    diamonds: number;
    vipLevel: number;
    role: AgencyRole;
  }>>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [coins, setCoins] = useState('');
  const [diamonds, setDiamonds] = useState('');
  const [vipLevel, setVipLevel] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const results = await searchUsers(searchQuery.trim());
      setUsers(results);
      if (results.length > 0) {
        setSelectedUser(results[0].uid);
        setCoins(results[0].coins.toString());
        setDiamonds(results[0].diamonds.toString());
        setVipLevel(results[0].vipLevel.toString());
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      if (coins) await updateUserCoins(selectedUser, parseInt(coins, 10));
      if (diamonds) await updateUserDiamonds(selectedUser, parseInt(diamonds, 10));
      if (vipLevel) await updateUserVIP(selectedUser, parseInt(vipLevel, 10));
      Alert.alert('Success', 'User updated');
      handleSearch(); // Refresh
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Button title="Back" variant="ghost" size="sm" onPress={() => router.back()} />
        <Text style={styles.title}>User Inspector</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.searchSection}>
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by UID, email, or name"
            containerStyle={styles.searchInput}
          />
          <Button
            title="Search"
            variant="primary"
            size="md"
            loading={loading}
            onPress={handleSearch}
          />
        </View>

        {selectedUser && (
          <View style={styles.editSection}>
            <Text style={styles.sectionTitle}>Edit User</Text>
            <Text style={styles.userInfo}>UID: {selectedUser}</Text>
            <Text style={styles.label}>Coins</Text>
            <Input
              value={coins}
              onChangeText={setCoins}
              keyboardType="number-pad"
              containerStyle={styles.input}
            />
            <Text style={styles.label}>Diamonds</Text>
            <Input
              value={diamonds}
              onChangeText={setDiamonds}
              keyboardType="number-pad"
              containerStyle={styles.input}
            />
            <Text style={styles.label}>VIP Level (0-10)</Text>
            <Input
              value={vipLevel}
              onChangeText={setVipLevel}
              keyboardType="number-pad"
              containerStyle={styles.input}
            />
            <Button
              title="Update User"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              onPress={handleUpdate}
              style={styles.updateButton}
            />
          </View>
        )}

        {users.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Search Results</Text>
            {users.map((user) => (
              <Button
                key={user.uid}
                title={`${user.displayName} (${user.email || 'No email'})`}
                variant="outline"
                size="md"
                fullWidth
                onPress={() => {
                  setSelectedUser(user.uid);
                  setCoins(user.coins.toString());
                  setDiamonds(user.diamonds.toString());
                  setVipLevel(user.vipLevel.toString());
                }}
                style={styles.userButton}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RoyalColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: RoyalColors.blackElevated,
  },
  title: {
    color: RoyalColors.gold,
    fontSize: 20,
    fontWeight: '700',
    marginLeft: Spacing.md,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  searchSection: {
    gap: Spacing.md,
  },
  searchInput: {
    marginBottom: 0,
  },
  editSection: {
    padding: Spacing.lg,
    backgroundColor: RoyalColors.blackCard,
    borderRadius: 12,
    gap: Spacing.md,
  },
  sectionTitle: {
    color: RoyalColors.gold,
    fontSize: 18,
    fontWeight: '600',
  },
  userInfo: {
    color: RoyalColors.textMuted,
    fontSize: 12,
  },
  label: {
    color: RoyalColors.textSecondary,
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  input: {
    marginBottom: 0,
  },
  updateButton: {
    marginTop: Spacing.md,
  },
  resultsSection: {
    gap: Spacing.sm,
  },
  userButton: {
    marginBottom: Spacing.xs,
  },
});
