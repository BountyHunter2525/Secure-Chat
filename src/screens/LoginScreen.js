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
import { signIn } from '../services/authService';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen({ navigation }) {
  const { isDark, colors } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await signIn(email.trim(), password);
      if (error) {
        Alert.alert('Login Failed', error.message);
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

          {/* ── Logo / Brand ── */}
          <View style={s.brandSection}>
            <View style={s.logoCircle}>
              <Text style={s.logoEmoji}>🔒</Text>
            </View>
            <Text style={s.appName}>SecureChat</Text>
            <Text style={s.tagline}>Private. Fast. Yours.</Text>
          </View>

          {/* ── Card ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Welcome back</Text>
            <Text style={s.cardSub}>Sign in to your account</Text>

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
                  placeholder="Enter password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  style={[s.input, { flex: 1 }]}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Text style={s.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login button */}
            <TouchableOpacity
              style={[s.primaryBtn, loading && s.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.primaryBtnText}>Sign In</Text>
              }
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>OR</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Register link */}
            <TouchableOpacity
              style={s.secondaryBtn}
              onPress={() => navigation.navigate('Signup')}
              activeOpacity={0.85}
            >
              <Text style={s.secondaryBtnText}>Create New Account</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.footerNote}>
            🔒 Your messages are private and secure
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

    // ── Brand section ───────────────────────────────────────────────────────────
    brandSection: {
      alignItems: 'center',
      marginBottom: 36,
    },
    logoCircle: {
      width: 84,
      height: 84,
      borderRadius: 28,
      backgroundColor: '#075E54',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      elevation: 8,
      shadowColor: '#075E54',
      shadowOpacity: 0.4,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
    logoEmoji: {
      fontSize: 42,
    },
    appName: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: 0.5,
    },
    tagline: {
      fontSize: 14,
      color: colors.textSub,
      marginTop: 4,
    },

    // ── Form card ───────────────────────────────────────────────────────────────
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
      marginBottom: 24,
    },

    // ── Input fields ─────────────────────────────────────────────────────────────
    fieldGroup: {
      marginBottom: 16,
    },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.1,
      color: colors.textMuted,
      marginBottom: 8,
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
    inputIcon: {
      fontSize: 17,
      marginRight: 10,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      paddingVertical: 13,
    },
    eyeIcon: {
      fontSize: 18,
      paddingLeft: 8,
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
    btnDisabled: {
      backgroundColor: '#aaa',
      shadowOpacity: 0,
    },
    primaryBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 20,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.divider,
    },
    dividerText: {
      fontSize: 12,
      color: colors.textMuted,
      marginHorizontal: 12,
      fontWeight: '600',
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
      marginTop: 28,
    },
  });