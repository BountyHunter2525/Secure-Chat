import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signUp } from '../services/authService';
import { supabase } from '../config/supabase';
import { useTheme } from '../context/ThemeContext';

export default function SignupScreen({ navigation }) {
  const { isDark, colors } = useTheme();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSignup = async () => {
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }

    if (username.trim().length < 3) {
      Alert.alert('Invalid Username', 'Username must be at least 3 characters.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await signUp(email.trim(), password);
      if (error) {
        Alert.alert('Signup Failed', error.message);
        return;
      }

      const user = data.user;
      if (!user) {
        Alert.alert('Error', 'User creation failed.');
        return;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ id: user.id, username: username.trim(), online: false }]);

      if (profileError) {
        Alert.alert('Profile Error', profileError.message);
        return;
      }

      navigation.replace('Home');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const s = makeStyles(colors, isDark);

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Brand ── */}
          <View style={s.brandSection}>
            <View style={s.logoCircle}>
              <Text style={s.logoEmoji}>🔒</Text>
            </View>
            <Text style={s.appName}>SecureChat</Text>
            <Text style={s.tagline}>Join millions messaging securely</Text>
          </View>

          {/* ── Form Card ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Create account</Text>
            <Text style={s.cardSub}>It's free and only takes a minute</Text>

            {/* Username */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>USERNAME</Text>
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>👤</Text>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Choose a username"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  style={s.input}
                  returnKeyType="next"
                />
              </View>
              <Text style={s.fieldHint}>Min 3 characters, no spaces</Text>
            </View>

            {/* Email */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>EMAIL</Text>
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>✉️</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={s.input}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>PASSWORD</Text>
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>🔑</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min 6 characters"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  style={[s.input, { flex: 1 }]}
                  returnKeyType="next"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Text style={s.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>CONFIRM PASSWORD</Text>
              <View style={[
                s.inputRow,
                confirmPassword.length > 0 && {
                  borderColor: confirmPassword === password ? '#25D366' : '#E53935',
                },
              ]}>
                <Text style={s.inputIcon}>🔐</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat your password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showConfirm}
                  style={[s.input, { flex: 1 }]}
                  returnKeyType="done"
                  onSubmitEditing={handleSignup}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                  <Text style={s.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && (
                <Text style={[
                  s.matchHint,
                  { color: confirmPassword === password ? '#25D366' : '#E53935' },
                ]}>
                  {confirmPassword === password ? '✓ Passwords match' : '✗ Passwords do not match'}
                </Text>
              )}
            </View>

            {/* Sign Up button */}
            <TouchableOpacity
              style={[s.primaryBtn, loading && s.btnDisabled]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.primaryBtnText}>Create Account</Text>
              }
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>ALREADY HAVE AN ACCOUNT?</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Login link */}
            <TouchableOpacity
              style={s.secondaryBtn}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
            >
              <Text style={s.secondaryBtnText}>Sign In Instead</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.footerNote}>
            🔒 Your data is encrypted and never shared
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors, isDark) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 40,
    },

    // ── Brand ───────────────────────────────────────────────────────────────────
    brandSection: {
      alignItems: 'center',
      marginBottom: 32,
    },
    logoCircle: {
      width: 80,
      height: 80,
      borderRadius: 26,
      backgroundColor: '#075E54',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 14,
      elevation: 8,
      shadowColor: '#075E54',
      shadowOpacity: 0.4,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    logoEmoji: { fontSize: 40 },
    appName: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: 0.5,
    },
    tagline: {
      fontSize: 13,
      color: colors.textSub,
      marginTop: 4,
    },

    // ── Card ────────────────────────────────────────────────────────────────────
    card: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      elevation: 4,
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    cardTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    cardSub: {
      fontSize: 14,
      color: colors.textSub,
      marginBottom: 22,
    },

    // ── Fields ──────────────────────────────────────────────────────────────────
    fieldGroup: { marginBottom: 14 },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.1,
      color: colors.textMuted,
      marginBottom: 8,
    },
    fieldHint: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 5,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 14,
      paddingVertical: 3,
    },
    inputIcon: { fontSize: 17, marginRight: 10 },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      paddingVertical: 13,
    },
    eyeIcon: { fontSize: 18, paddingLeft: 8 },
    matchHint: {
      fontSize: 12,
      marginTop: 5,
      fontWeight: '500',
    },

    // ── Buttons ─────────────────────────────────────────────────────────────────
    primaryBtn: {
      backgroundColor: '#075E54',
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
      elevation: 3,
      shadowColor: '#075E54',
      shadowOpacity: 0.35,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    btnDisabled: { backgroundColor: '#aaa', shadowOpacity: 0 },
    primaryBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 18,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.divider,
    },
    dividerText: {
      fontSize: 10,
      color: colors.textMuted,
      marginHorizontal: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    secondaryBtn: {
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: '#075E54',
    },
    secondaryBtnText: {
      color: '#075E54',
      fontSize: 15,
      fontWeight: '700',
    },

    // ── Footer ──────────────────────────────────────────────────────────────────
    footerNote: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 24,
    },
  });