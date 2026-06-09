import { View, Text, Button } from 'react-native';
import { useEffect } from 'react';
import { signOut } from '../services/authService';
import { supabase } from '../config/supabase';

export default function HomeScreen({ navigation }) {
  useEffect(() => {
    setOnline();

    return () => {
      setOffline();
    };
  }, []);

  const setOnline = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
      .from('profiles')
      .update({
        online: true,
      })
      .eq('id', user.id);
  };

  const setOffline = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
      .from('profiles')
      .update({
        online: false,
        last_seen:
          new Date().toISOString(),
      })
      .eq('id', user.id);
  };

  const handleLogout = async () => {
    await setOffline();
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

      <View style={{ marginBottom: 20 }}>
        <Button
          title="Chats"
          onPress={() =>
            navigation.navigate('Chats')
          }
        />
      </View>
      <View style={{ marginBottom: 20 }}>
  <Button
    title="Profile"
    onPress={() =>
      navigation.navigate('Profile')
    }
  />
</View>
      <Button
        title="Logout"
        onPress={handleLogout}
      />
    </View>
  );
}