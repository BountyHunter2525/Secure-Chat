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

  if (!user) return;

  const user1 =
    user.id < selectedUser.id
      ? user.id
      : selectedUser.id;

  const user2 =
    user.id < selectedUser.id
      ? selectedUser.id
      : user.id;

  const {
    data: existingChat,
    error: existingError,
  } = await supabase
    .from('direct_chats')
    .select('conversation_id')
    .eq('user1_id', user1)
    .eq('user2_id', user2)
    .maybeSingle();

  if (existingError) {
    console.log(existingError);
    return;
  }

  if (existingChat) {
    navigation.navigate('Chat', {
      conversationId:
        existingChat.conversation_id,
      chatName:
        selectedUser.username,
    });

    return;
  }

  const {
    data: conversation,
    error: conversationError,
  } = await supabase
    .from('conversations')
    .insert([
      {
        name:
          selectedUser.username,
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
          conversation_id:
            conversation.id,
          user_id: user.id,
        },
        {
          conversation_id:
            conversation.id,
          user_id:
            selectedUser.id,
        },
      ]);

  if (participantError) {
    console.log(participantError);
    return;
  }

  const { error: directChatError } =
    await supabase
      .from('direct_chats')
      .insert([
        {
          user1_id: user1,
          user2_id: user2,
          conversation_id:
            conversation.id,
        },
      ]);

  if (directChatError) {
    console.log(directChatError);
    return;
  }

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