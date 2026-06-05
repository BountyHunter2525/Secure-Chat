import { View, Text, Button } from 'react-native';
import { signOut } from '../services/authService';

export default function HomeScreen({ navigation }) {
  const handleLogout = async () => {
    await signOut();
    navigation.replace('Login');
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: 'bold',
          marginBottom: 20,
        }}
      >
        Welcome to SecureChat
      </Text>

      <Button
        title="Logout"
        onPress={handleLogout}
      />
    </View>
  );
}