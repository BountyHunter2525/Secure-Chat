import { Alert } from 'react-native';
import { signUp } from '../services/authService';
import { useState } from 'react';
import { supabase } from '../config/supabase';
import {
  View,
  Text,
  TextInput,
  Button,
} from 'react-native';

export default function SignupScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
const handleSignup = async () => {
  if (!username || !email || !password) {
    Alert.alert(
      'Error',
      'Please fill all fields'
    );
    return;
  }

  const { data, error } = await signUp(
    email,
    password
  );

  if (error) {
    Alert.alert(
      'Signup Failed',
      error.message
    );
    return;
  }

  const user = data.user;

  if (!user) {
    Alert.alert(
      'Error',
      'User creation failed'
    );
    return;
  }

  const { error: profileError } =
    await supabase
      .from('profiles')
      .insert([
        {
          id: user.id,
          username: username,
          online: false,
        },
      ]);

  if (profileError) {
  console.log(profileError);

  Alert.alert(
    'Profile Error',
    JSON.stringify(profileError)
  );

  return;
}

  Alert.alert(
    'Success',
    'Account created successfully'
  );

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
        Create Account
      </Text>

      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        style={{
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
          marginBottom: 15,
        }}
      />

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
        title="Sign Up"
        onPress={handleSignup}
      />

      <View style={{ height: 15 }} />

      <Button
        title="Already have an account?"
        onPress={() => navigation.navigate('Login')}
      />
    </View>
  );
}