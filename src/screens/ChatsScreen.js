import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '../config/supabase';

export default function ChatsScreen({ navigation }) {
  const [chats, setChats] = useState([]);

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from('participants')
      .select(`
        conversation_id,
        conversations (
          id,
          name,
          created_at
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.log(error);
      return;
    }

    setChats(data || []);
  };

  const createChat = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const {
      data: conversation,
      error: conversationError,
    } = await supabase
      .from('conversations')
      .insert([
        {
          name: 'Test Chat',
          is_group: false,
        },
      ])
      .select()
      .single();

    if (conversationError) {
      console.log(conversationError);
      return;
    }

    const { error: participantError } =
      await supabase
        .from('participants')
        .insert([
          {
            conversation_id: conversation.id,
            user_id: user.id,
          },
        ]);

    if (participantError) {
      console.log(participantError);
      return;
    }

    loadChats();
  };

  return (
    <View
      style={{
        flex: 1,
        padding: 20,
      }}
      
    >
      <Button
  title="New Chat"
  onPress={() =>
    navigation.navigate('Users')
  }
/>
<View style={{ height: 10 }} />
      <Button
        title="Create Test Chat"
        onPress={createChat}
      />

      <FlatList
        data={chats}
        keyExtractor={(item) =>
          item.conversation_id
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('Chat', {
                conversationId:
                  item.conversations.id,
                chatName:
                  item.conversations.name,
              })
            }
            style={{
              padding: 15,
              borderWidth: 1,
              borderRadius: 10,
              marginTop: 10,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: 'bold',
              }}
            >
              {item.conversations.name}
            </Text>

            <Text>
              {new Date(
                item.conversations.created_at
              ).toLocaleString()}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}