import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
} from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <Text>Email</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Enter Email"
        style={{
          borderWidth: 1,
          marginBottom: 20,
          padding: 10,
        }}
      />

      <Text>Password</Text>

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Enter Password"
        secureTextEntry
        style={{
          borderWidth: 1,
          marginBottom: 20,
          padding: 10,
        }}
      />

      <Button
        title="Login"
        onPress={() => {
          console.log(email);
          console.log(password);
        }}
      />
    </View>
  );
}