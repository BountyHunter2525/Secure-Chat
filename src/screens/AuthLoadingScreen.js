import { View, Text } from 'react-native';
import { useEffect } from 'react';
import { supabase } from '../config/supabase';

export default function AuthLoadingScreen({ navigation }) {
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      navigation.replace('Home');
    } else {
      navigation.replace('Login');
    }
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text>Loading...</Text>
    </View>
  );
}