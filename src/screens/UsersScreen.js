import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '../config/supabase';

export default function UsersScreen({
  navigation,
}) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id);

    if (error) {
      console.log(error);
      return;
    }

    setUsers(data || []);
  };

  const startChat = async (
    selectedUser
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const {
      data: conversation,
      error: conversationError,
    } = await supabase
      .from('conversations')
      .insert([
        {
          name: `${selectedUser.username}`,
          is_group: false,
        },
      ])
      .select()
      .single();

    if (conversationError) {
      console.log(conversationError);
      return;
    }

    await supabase
      .from('participants')
      .insert([
        {
          conversation_id:
            conversation.id,
          user_id: user.id,
        },
        {
          conversation_id:
            conversation.id,
          user_id: selectedUser.id,
        },
      ]);

    navigation.navigate('Chat', {
      conversationId:
        conversation.id,
      chatName:
        selectedUser.username,
    });
  };

  return (
    <View
      style={{
        flex: 1,
        padding: 20,
      }}
    >
      <FlatList
        data={users}
        keyExtractor={(item) =>
          item.id
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              startChat(item)
            }
            style={{
              padding: 15,
              borderWidth: 1,
              borderRadius: 10,
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                fontSize: 18,
              }}
            >
              {item.username}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}