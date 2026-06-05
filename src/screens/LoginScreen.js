import { Alert } from 'react-native';
import { signIn } from '../services/authService';
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
} from 'react-native';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert('Error', 'Please fill all fields');
    return;
  }

  const { data, error } = await signIn(
    email,
    password
  );

  if (error) {
    Alert.alert('Login Failed', error.message);
    return;
  }

  Alert.alert('Success', 'Login Successful');

  navigation.navigate('Home');
};
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <Text
        style={{
          fontSize: 28,
          textAlign: 'center',
          marginBottom: 20,
          fontWeight: 'bold',
        }}
      >
        SecureChat Login
      </Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
          marginBottom: 15,
        }}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
          marginBottom: 20,
        }}
      />

      <Button
        title="Login"
       onPress={handleLogin}
      />

      <View style={{ height: 15 }} />

      <Button
        title="Create Account"
        onPress={() => navigation.navigate('Signup')}
      />
    </View>
  );
}