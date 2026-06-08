import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
} from 'react-native';
import { supabase } from '../config/supabase';

export default function ChatScreen({ route }) {
  const { conversationId, chatName } = route.params;

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
  loadMessages();

  const channel = supabase
    .channel('messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      () => {
        loadMessages();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', {
        ascending: true,
      });

    if (error) {
      console.log(error);
      return;
    }

    setMessages(data || []);
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from('messages')
      .insert([
        {
          conversation_id: conversationId,
          sender_id: user.id,
          content: message,
        },
      ]);

    if (error) {
      console.log(error);
      return;
    }

    setMessage('');

    loadMessages();
  };

  return (
    <View
      style={{
        flex: 1,
        padding: 15,
      }}
    >
      <Text
        style={{
          fontSize: 22,
          fontWeight: 'bold',
          marginBottom: 15,
        }}
      >
        {chatName}
      </Text>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              padding: 10,
              borderWidth: 1,
              borderRadius: 10,
              marginBottom: 10,
            }}
          >
            <Text>{item.content}</Text>

            <Text
              style={{
                fontSize: 12,
                marginTop: 5,
              }}
            >
              {new Date(
                item.created_at
              ).toLocaleString()}
            </Text>
          </View>
        )}
      />

      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Type a message..."
        style={{
          borderWidth: 1,
          borderRadius: 10,
          padding: 10,
          marginBottom: 10,
        }}
      />

      <Button
        title="Send"
        onPress={sendMessage}
      />
    </View>
  );
}