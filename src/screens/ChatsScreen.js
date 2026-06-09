import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { supabase } from '../config/supabase';

export default function ChatsScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
  loadChats();

  const channel = supabase
    .channel('chat-list')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
      },
      () => {
        loadChats();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
const loadChats = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;
  setLoading(true);

  const { data: participants, error } =
    await supabase
      .from('participants')
      .select(`
        conversation_id,
        conversations (
          id,
          name,
          updated_at
        )
      `)
      .eq('user_id', user.id);

  if (error) {
    // error handled by returning early
    return;
  }

const chatData = await Promise.all(
  participants.map(
    async (participant) => {
      const conversation =
        participant.conversations;

      const { data: users } =
        await supabase
          .from('participants')
          .select('user_id')
          .eq(
            'conversation_id',
            conversation.id
          );

      const otherUser =
        users?.find(
          (u) =>
            u.user_id !== user.id
        );

      let profile = null;

      if (otherUser) {
        const result =
          await supabase
            .from('profiles')
            .select(
              'username, avatar_url'
            )
            .eq(
              'id',
              otherUser.user_id
            )
            .single();

        profile = result.data;
      }

      const {
        data: lastMessage,
      } = await supabase
        .from('messages')
        .select(
          'content, created_at'
        )
        .eq(
          'conversation_id',
          conversation.id
        )
        .order('created_at', {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      return {
        id: conversation.id,

        name:
          profile?.username ||
          conversation.name,

        avatar:
          profile?.avatar_url
            ? `${profile.avatar_url}?t=${Date.now()}`
            : null,

        lastMessage:
          lastMessage?.content ||
          'No messages yet',

        lastMessageTime:
          lastMessage?.created_at ||
          null,

        updated_at:
          conversation.updated_at,
      };
    }
  )
);

chatData.sort(
  (a, b) =>
    new Date(
      b.updated_at || 0
    ) -
    new Date(
      a.updated_at || 0
    )
);

setChats(chatData);
setLoading(false);};
if (loading) {
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
    <FlatList
  data={chats}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate('Chat', {
          conversationId: item.id,
          chatName: item.name,
        })
      }
      style={{
        padding: 15,
        borderBottomWidth: 1,
        borderColor: '#ddd',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {item.avatar ? (
  <Image
    source={{
      uri: item.avatar,
    }}
    style={{
      width: 50,
      height: 50,
      borderRadius: 25,
      marginRight: 12,
    }}
  />
) : (
  <View
    style={{
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#ddd',
      marginRight: 12,
    }}
  />
)}

        <View
          style={{
            flex: 1,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: 'bold',
            }}
          >
            {item.name}
          </Text>

          <Text
            numberOfLines={1}
            style={{
              color: 'gray',
              marginTop: 3,
            }}
          >
            {item.lastMessage}
          </Text>
        </View>

        {item.lastMessageTime && (
          <Text
            style={{
              fontSize: 12,
              color: 'gray',
            }}
          >
            {new Date(
              item.lastMessageTime
            ).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )}
/>
  </View>
  );
}