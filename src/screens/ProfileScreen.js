import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../config/supabase';
import { uploadImageToSupabase } from '../utils/uploadImage';
import { useTheme } from '../context/ThemeContext';
import { signOut } from '../services/authService';

export default function ProfileScreen({ navigation }) {
  const { isDark, colors, toggleTheme } = useTheme();

  const [avatarUrl, setAvatarUrl] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [uploading, setUploading] = useState(false);

  // Username edit state
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  // ── Load profile ───────────────────────────────────────────────────────────
  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setEmail(user.email || '');

    const { data } = await supabase
      .from('profiles')
      .select('avatar_url, username')
      .eq('id', user.id)
      .single();

    if (data) {
      setUsername(data.username || '');
      setNewUsername(data.username || '');
      if (data.avatar_url) {
        setAvatarUrl(`${data.avatar_url}?t=${Date.now()}`);
      }
    }
  };

  // ── Avatar upload ──────────────────────────────────────────────────────────
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow photo access.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;
      const image = result.assets[0];
      if (!image?.uri) return;
      await uploadAvatar(image.uri);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const uploadAvatar = async (imageUri) => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = imageUri.split('.').pop() || 'jpg';
      const fileName = `${user.id}.${fileExt}`;

      const publicUrl = await uploadImageToSupabase(imageUri, 'avatars', fileName);

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (error) { Alert.alert('Error', error.message); return; }

      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
      Alert.alert('Success', 'Profile picture updated!');
    } catch (err) {
      Alert.alert('Upload Error', err.message);
    } finally {
      setUploading(false);
    }
  };

  // ── Save username ──────────────────────────────────────────────────────────
  const saveUsername = async () => {
    if (!newUsername.trim()) {
      Alert.alert('Error', 'Username cannot be empty.');
      return;
    }
    try {
      setSavingUsername(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ username: newUsername.trim() })
        .eq('id', user.id);

      if (error) { Alert.alert('Error', error.message); return; }

      setUsername(newUsername.trim());
      setEditingUsername(false);
      Alert.alert('Success', 'Username updated!');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingUsername(false);
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('profiles').update({
            online: false,
            last_seen: new Date().toISOString(),
          }).eq('id', (await supabase.auth.getUser()).data.user?.id);
          await signOut();
          navigation.replace('Login');
        },
      },
    ]);
  };

  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={[s.header, { backgroundColor: isDark ? '#1e293b' : '#075E54' }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={s.backIconText}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>My Profile</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={s.content}>
          {/* ── Avatar Section ── */}
          <View style={s.avatarSection}>
            <TouchableOpacity
              onPress={pickImage}
              disabled={uploading}
              style={s.avatarWrapper}
              activeOpacity={0.85}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={s.avatar} />
              ) : (
                <View style={s.avatarPlaceholder}>
                  <Text style={s.avatarInitial}>
                    {username ? username[0].toUpperCase() : '?'}
                  </Text>
                </View>
              )}

              {/* Camera overlay */}
              <View style={s.cameraOverlay}>
                {uploading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.cameraIconText}>📷</Text>
                }
              </View>
            </TouchableOpacity>

            <Text style={s.avatarHint}>
              {uploading ? 'Uploading…' : 'Tap photo to change'}
            </Text>
          </View>

          {/* ── Info Card ── */}
          <Text style={s.sectionLabel}>ACCOUNT</Text>
          <View style={s.card}>

            {/* Username row */}
            <View style={s.infoRow}>
              <View style={[s.infoIcon, { backgroundColor: colors.inputBg }]}>
                <Text style={s.infoIconText}>👤</Text>
              </View>
              <View style={s.infoBody}>
                <Text style={s.infoLabel}>Username</Text>
                {editingUsername ? (
                  <View style={s.editRow}>
                    <TextInput
                      value={newUsername}
                      onChangeText={setNewUsername}
                      style={s.usernameInput}
                      autoFocus
                      placeholder="Enter username"
                      placeholderTextColor={colors.textMuted}
                    />
                    <TouchableOpacity
                      onPress={saveUsername}
                      disabled={savingUsername}
                      style={s.saveBtn}
                    >
                      {savingUsername
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={s.saveBtnText}>Save</Text>
                      }
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { setEditingUsername(false); setNewUsername(username); }}
                      style={s.cancelBtn}
                    >
                      <Text style={s.cancelBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={s.editRow}>
                    <Text style={s.infoValue}>{username || '—'}</Text>
                    <TouchableOpacity
                      onPress={() => setEditingUsername(true)}
                      style={s.editIconBtn}
                    >
                      <Text style={s.editIconText}>✏️</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            <View style={s.divider} />

            {/* Email row */}
            <View style={s.infoRow}>
              <View style={[s.infoIcon, { backgroundColor: colors.inputBg }]}>
                <Text style={s.infoIconText}>✉️</Text>
              </View>
              <View style={s.infoBody}>
                <Text style={s.infoLabel}>Email</Text>
                <Text style={s.infoValue}>{email || '—'}</Text>
              </View>
            </View>

          </View>

          {/* ── Preferences Card ── */}
          <Text style={s.sectionLabel}>PREFERENCES</Text>
          <View style={s.card}>
            <View style={s.infoRow}>
              <View style={[s.infoIcon, { backgroundColor: colors.inputBg }]}>
                <Text style={s.infoIconText}>{isDark ? '🌙' : '☀️'}</Text>
              </View>
              <View style={s.infoBody}>
                <Text style={s.infoLabel}>Dark Mode</Text>
                <Text style={s.infoSub}>{isDark ? 'Dark theme is on' : 'Light theme is on'}</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.switchTrack, true: '#10b981' }}
                thumbColor={isDark ? '#ffffff' : '#f5f5f5'}
              />
            </View>
          </View>

          {/* ── Change Avatar button (alternate) ── */}
          <TouchableOpacity
            style={[s.changePhotoBtn, uploading && s.btnDisabled]}
            onPress={pickImage}
            disabled={uploading}
            activeOpacity={0.85}
          >
            <Text style={s.changePhotoIconText}>📷</Text>
            <Text style={s.changePhotoText}>
              {uploading ? 'Uploading…' : 'Change Profile Picture'}
            </Text>
          </TouchableOpacity>

          {/* ── Logout ── */}
          <TouchableOpacity
            style={s.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.85}
          >
            <Text style={s.logoutIconText}>🚪</Text>
            <Text style={s.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Style factory ──────────────────────────────────────────────────────────────
const makeStyles = (colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scroll: {
      paddingBottom: 48,
    },

    // ── Header ─────────────────────────────────────────────────────────────────
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 24,
    },
    backBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    backIconText: {
      fontSize: 16,
      color: 'rgba(255, 255, 255, 0.8)',
      fontWeight: '600',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#ffffff',
    },

    // ── Content ────────────────────────────────────────────────────────────────
    content: {
      paddingHorizontal: 20,
      paddingTop: 16,
    },

    // ── Avatar Section ─────────────────────────────────────────────────────────
    avatarSection: {
      alignItems: 'center',
      paddingVertical: 24,
      marginBottom: 16,
    },
    avatarWrapper: {
      position: 'relative',
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      borderWidth: 3,
      borderColor: colors.cardBorder,
    },
    avatarPlaceholder: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.inputBg,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: colors.cardBorder,
    },
    avatarInitial: {
      fontSize: 36,
      fontWeight: '600',
      color: colors.text,
    },
    cameraOverlay: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: colors.accent,
      borderRadius: 16,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.bg,
    },
    cameraIconText: {
      fontSize: 14,
    },
    avatarHint: {
      marginTop: 12,
      fontSize: 13,
      color: colors.textSub,
      fontWeight: '500',
    },

    // ── Section label ──────────────────────────────────────────────────────────
    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1,
      color: colors.textMuted,
      marginTop: 20,
      marginBottom: 8,
      textTransform: 'uppercase',
    },

    // ── Info Card ──────────────────────────────────────────────────────────────
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    infoIcon: {
      width: 20,
      height: 20,
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    infoIconText: {
      fontSize: 14,
    },
    infoBody: {
      flex: 1,
    },
    infoLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      letterSpacing: 0.5,
      marginBottom: 2,
      textTransform: 'uppercase',
    },
    infoValue: {
      fontSize: 15,
      color: colors.text,
      fontWeight: '500',
      flex: 1,
    },
    infoSub: {
      fontSize: 13,
      color: colors.textSub,
    },
    divider: {
      height: 1,
      backgroundColor: colors.divider,
      marginHorizontal: 16,
    },

    // ── Username edit ──────────────────────────────────────────────────────────
    editRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    usernameInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.inputBg,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginRight: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    saveBtn: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginRight: 6,
      minWidth: 48,
      alignItems: 'center',
    },
    saveBtnText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 13,
    },
    cancelBtn: {
      width: 28,
      height: 28,
      borderRadius: 6,
      backgroundColor: colors.inputBg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cancelBtnText: {
      color: colors.textSub,
      fontWeight: '600',
      fontSize: 12,
    },
    editIconBtn: {
      paddingHorizontal: 4,
      paddingVertical: 4,
    },
    editIconText: {
      fontSize: 14,
    },

    // ── Buttons ────────────────────────────────────────────────────────────────
    changePhotoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      marginTop: 16,
      paddingVertical: 12,
      borderRadius: 12,
    },
    btnDisabled: {
      backgroundColor: colors.textMuted,
    },
    changePhotoIconText: {
      fontSize: 14,
      marginRight: 8,
    },
    changePhotoText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '600',
    },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      marginTop: 12,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    logoutIconText: {
      fontSize: 14,
      marginRight: 8,
    },
    logoutText: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.danger,
    },
  });