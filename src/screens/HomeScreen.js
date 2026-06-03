import { View, Text, Button } from 'react-native';
import { useState } from 'react';

export default function HomeScreen() {
  const [count, setCount] = useState(0);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text>SecureChat Counter: {count}</Text>

      <Button
        title="Increase"
        onPress={() => setCount(count + 5)}
      />
    </View>
  );
}