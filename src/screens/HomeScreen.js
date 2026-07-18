import { View, Text, TouchableOpacity, StyleSheet, Image, Switch, Alert, ScrollView, Dimensions } from 'react-native';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from '../services/authService';
import { supabase } from '../config/supabase';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { isDark, colors, toggleTheme } = useTheme();

  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    loadProfile();
    setOnline();

    return () => {
      setOffline();
    };
  }, []);

  // ── Profile ───────────────────────────────────────────────────────────────
  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setEmail(user.email || '');

    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single();

    if (data) {
      setUsername(data.username || '');
      if (data.avatar_url) {
        setAvatarUrl(`${data.avatar_url}?t=${Date.now()}`);
      }
    }
  };

  // ── Presence ──────────────────────────────────────────────────────────────
  const setOnline = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({ online: true }).eq('id', user.id);
  };

  const setOffline = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({
      online: false,
      last_seen: new Date().toISOString(),
    }).eq('id', user.id);
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await setOffline();
          await signOut();
          navigation.replace('Login');
        },
      },
    ]);
  };

  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Header Section ── */}
        <View style={s.header}>
          <View style={[s.headerContent, { backgroundColor: isDark ? '#1e293b' : '#075E54' }]}>
            <View style={s.brandSection}>
              <View style={s.logoContainer}>
                <View style={s.logoBackground}>
                  <Text style={s.logoText}>SC</Text>
                </View>
              </View>
              <View style={s.brandText}>
                <Text style={s.appTitle}>SecureChat</Text>
                <Text style={s.appSubtitle}>End-to-end encrypted messaging</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={s.content}>
          {/* ── Profile Card ── */}
          <View style={s.profileSection}>
            <TouchableOpacity
              style={s.profileCard}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.95}
            >
              <View style={s.profileHeader}>
                <View style={s.avatarContainer}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={s.avatar} />
                  ) : (
                    <View style={s.avatarPlaceholder}>
                      <Text style={s.avatarText}>
                        {username ? username[0].toUpperCase() : '?'}
                      </Text>
                    </View>
                  )}
                  <View style={s.statusIndicator} />
                </View>
                <View style={s.profileInfo}>
                  <Text style={s.profileName}>{username || 'Your Name'}</Text>
                  <Text style={s.profileEmail}>{email}</Text>
                  <View style={s.statusPill}>
                    <View style={s.statusDot} />
                    <Text style={s.statusText}>Online</Text>
                  </View>
                </View>
                <View style={s.profileAction}>
                  <Text style={s.chevron}>›</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Quick Actions ── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Quick Actions</Text>
            <View style={s.actionsGrid}>
              <TouchableOpacity
                style={s.actionCard}
                onPress={() => navigation.navigate('Chats')}
                activeOpacity={0.9}
              >
                <View style={s.actionContent}>
                  <View style={[s.actionIcon, { backgroundColor: isDark ? '#3b82f6' : '#2563eb' }]}>
                    <Text style={s.actionIconText}>💬</Text>
                  </View>
                  <Text style={[s.actionTitle, { color: colors.text }]}>Messages</Text>
                  <Text style={[s.actionSubtitle, { color: colors.textSub }]}>Your conversations</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.actionCard}
                onPress={() => navigation.navigate('Profile')}
                activeOpacity={0.9}
              >
                <View style={s.actionContent}>
                  <View style={[s.actionIcon, { backgroundColor: colors.inputBg }]}>
                    <Text style={s.actionIconText}>👤</Text>
                  </View>
                  <Text style={[s.actionTitle, { color: colors.text }]}>Profile</Text>
                  <Text style={[s.actionSubtitle, { color: colors.textSub }]}>Manage account</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Settings ── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Preferences</Text>
            <View style={s.settingsContainer}>
              <View style={s.settingItem}>
                <View style={s.settingLeft}>
                  <View style={[s.settingIconContainer, { backgroundColor: colors.inputBg }]}>
                    <Text style={s.settingIconText}>{isDark ? '🌙' : '☀️'}</Text>
                  </View>
                  <View style={s.settingDetails}>
                    <Text style={s.settingTitle}>Dark Mode</Text>
                    <Text style={s.settingDescription}>
                      {isDark ? 'Dark theme is active' : 'Light theme is active'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ 
                    false: isDark ? '#374151' : '#d1d5db', 
                    true: isDark ? '#3b82f6' : '#10b981' 
                  }}
                  thumbColor={isDark ? (isDark ? '#ffffff' : '#f3f4f6') : '#ffffff'}
                  ios_backgroundColor={isDark ? '#374151' : '#d1d5db'}
                />
              </View>

              <View style={s.divider} />

              <View style={s.settingItem}>
                <View style={s.settingLeft}>
                  <View style={[s.settingIconContainer, { backgroundColor: colors.inputBg }]}>
                    <Text style={s.settingIconText}>ℹ️</Text>
                  </View>
                  <View style={s.settingDetails}>
                    <Text style={s.settingTitle}>About SecureChat</Text>
                    <Text style={s.settingDescription}>Version 1.0.0 • Built with React Native</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* ── Logout Section ── */}
          <View style={s.section}>
            <TouchableOpacity
              style={s.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.9}
            >
              <View style={s.logoutContent}>
                <View style={s.logoutIcon}>
                  <Text style={s.logoutIconText}>🚪</Text>
                </View>
                <Text style={s.logoutText}>Sign Out</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles factory (simplified professional design) ──────────────────────────
const makeStyles = (colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },

    // ── Header Section ────────────────────────────────────────────────────────
    header: {
      paddingBottom: 24,
    },
    headerContent: {
      paddingTop: 20,
      paddingBottom: 40,
      paddingHorizontal: 24,
    },
    brandSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    logoContainer: {
      marginRight: 16,
    },
    logoBackground: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoText: {
      fontSize: 18,
      fontWeight: '700',
      color: '#ffffff',
    },
    brandText: {
      flex: 1,
    },
    appTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: '#ffffff',
      marginBottom: 2,
    },
    appSubtitle: {
      fontSize: 13,
      color: 'rgba(255, 255, 255, 0.8)',
      fontWeight: '500',
    },

    // ── Content ────────────────────────────────────────────────────────────────
    content: {
      paddingHorizontal: 20,
      paddingBottom: 32,
    },

    // ── Profile Section ────────────────────────────────────────────────────────
    profileSection: {
      marginTop: -16,
      marginBottom: 24,
    },
    profileCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    avatarContainer: {
      position: 'relative',
      marginRight: 12,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
    },
    avatarPlaceholder: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.inputBg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
    },
    statusIndicator: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#10b981',
      borderWidth: 2,
      borderColor: colors.card,
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    profileEmail: {
      fontSize: 13,
      color: colors.textSub,
      marginBottom: 6,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#10b981',
      marginRight: 4,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textSub,
    },
    profileAction: {
      marginLeft: 8,
    },
    chevron: {
      fontSize: 20,
      color: colors.textMuted,
    },

    // ── Sections ───────────────────────────────────────────────────────────────
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },

    // ── Action Cards ───────────────────────────────────────────────────────────
    actionsGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    actionCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    actionContent: {
      padding: 16,
      alignItems: 'flex-start',
    },
    actionIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    actionIconText: {
      fontSize: 18,
    },
    actionTitle: {
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 2,
    },
    actionSubtitle: {
      fontSize: 12,
      fontWeight: '500',
    },

    // ── Settings Container ─────────────────────────────────────────────────────
    settingsContainer: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    settingIconText: {
      fontSize: 16,
    },
    settingDetails: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 1,
    },
    settingDescription: {
      fontSize: 12,
      color: colors.textSub,
    },
    divider: {
      height: 1,
      backgroundColor: colors.divider,
      marginHorizontal: 16,
    },

    // ── Logout Button ──────────────────────────────────────────────────────────
    logoutButton: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    logoutContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    logoutIcon: {
      width: 20,
      height: 20,
      borderRadius: 4,
      backgroundColor: colors.inputBg,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    logoutIconText: {
      fontSize: 12,
    },
    logoutText: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.danger,
    },
  });