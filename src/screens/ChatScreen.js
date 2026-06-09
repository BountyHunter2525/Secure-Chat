import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  Image,
} from 'react-native';
import { supabase } from '../config/supabase';
import {KeyboardAvoidingView,Platform,} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatScreen({ route }) {
  const { conversationId, chatName } = route.params;
  const [displayName, setDisplayName] = useState(chatName);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [userStatus, setUserStatus] = useState('');
  
  const flatListRef = useRef(null);

  useEffect(() => {
    loadCurrentUser();
    loadMessages();
    loadStatus();
    loadAvatar();
    loadChatName();
    const statusInterval = setInterval(
      loadStatus,
      5000
    );
    const channel = supabase
      .channel(`chat-${conversationId}`)
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
      clearInterval(statusInterval);
      supabase.removeChannel(channel);
    };
  }, []);
const loadChatName = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: participants } = await supabase
    .from('participants')
    .select('user_id')
    .eq('conversation_id', conversationId);

  const otherUser = participants.find(
    p => p.user_id !== user.id
  );

  if (!otherUser) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', otherUser.user_id)
    .single();

  if (profile) {
    setDisplayName(profile.username);
  }
};
  const loadCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadStatus = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('online,last_seen')
      .eq('username', displayName)
      .single();
    if (error || !data) return;
    if (data.online) {
      setUserStatus('Online');
    } else {
      setUserStatus(
        `Last seen ${new Date(
          data.last_seen
        ).toLocaleString()}`
      );
    }
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', {
        ascending: true,
      });

    if (error) {
      // error loading messages
      return;
    }

    setMessages(data || []);
  };
  const loadAvatar = async () => {
  const { data } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('username', displayName)
    .single();

  if (data?.avatar_url) {
    setAvatarUrl(
  `${data.avatar_url}?t=${Date.now()}`
);
  }
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
      // error sending message
      return;
    }

    setMessage('');
  };
  useEffect(() => {
  if (displayName) {
    loadAvatar();
  }
}, [displayName]);
return (
  <SafeAreaView
  style={{
    flex: 1,
    backgroundColor: '#f5f5f5',
  }}
  
>
    
    <View
  style={{
    padding: 15,
    borderBottomWidth: 1,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
  }}
>
  {avatarUrl ? (
  <Image
    source={{
      uri: avatarUrl,
    }}
    style={{
      width: 45,
      height: 45,
      borderRadius: 22.5,
      marginRight: 12,
    }}
  />
) : (
    <View
      style={{
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: '#ddd',
        marginRight: 12,
      }}
    />
  )}

  <View>
    <Text
      style={{
        fontSize: 20,
        fontWeight: 'bold',
      }}
    >
      {displayName}
    </Text>

    <Text
      style={{
        color: 'gray',
        marginTop: 2,
      }}
    >
      {userStatus}
    </Text>
  </View>
</View>

    <FlatList
    showsVerticalScrollIndicator={true}
      ref={flatListRef}
      data={messages}
      onLayout={() =>
  flatListRef.current?.scrollToEnd({
    animated: false,
  })
}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{
        padding: 10,
      }}
      onContentSizeChange={() =>
        flatListRef.current?.scrollToEnd({
          animated: true,
        })
      }
      renderItem={({ item }) => {
        const isMine =
          item.sender_id === currentUserId;

        return (
          <View
            style={{
              alignItems: isMine
                ? 'flex-end'
                : 'flex-start',
              marginBottom: 10,
            }}
          >
            <View
              style={{
                maxWidth: '80%',
                padding: 12,
                borderRadius: 15,
                backgroundColor: isMine
                  ? '#DCF8C6'
                  : 'white',
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                }}
              >
                {item.content}
              </Text>

              <Text
                style={{
                  fontSize: 10,
                  color: 'gray',
                  marginTop: 5,
                  alignSelf: 'flex-end',
                }}
              >
                {new Date(
                  item.created_at
                ).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        );
      }}
    />

    <KeyboardAvoidingView
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : 'height'
      }
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 10,
          paddingBottom: 25,
          backgroundColor: 'white',
          borderTopWidth: 1,
        }}
      >
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message..."
          style={{
            flex: 1,
            borderWidth: 1,
            borderRadius: 25,
            paddingHorizontal: 15,
            paddingVertical: 10,
            marginRight: 10,
            backgroundColor: 'white',
          }}
        />

        <Button
          title="Send"
          onPress={sendMessage}
        />
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  
);
}