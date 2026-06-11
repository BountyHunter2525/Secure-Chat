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
import { KeyboardAvoidingView, Platform, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatScreen({ route }) {
  const { conversationId, chatName } = route.params;
  const [displayName, setDisplayName] = useState(chatName);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [isGroup, setIsGroup] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [userStatus, setUserStatus] = useState('');

  const flatListRef = useRef(null);

  useEffect(() => {
    loadCurrentUser();
    loadMessages();
    loadStatus();
    loadAvatar();
    loadChatName();
    markMessagesAsRead();
    loadParticipantCount();
    const statusInterval = setInterval(
      loadStatus,
      5000
    );
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          loadMessages();
          markMessagesAsRead();
        }
      )
      .subscribe();

    return () => {
      clearInterval(statusInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  const loadParticipantCount =
    async () => {
      const { data: conversation } =
        await supabase
          .from('conversations')
          .select('is_group')
          .eq('id', conversationId)
          .single();

      if (
        conversation?.is_group
      ) {
        setIsGroup(true);

        const { count } =
          await supabase
            .from('participants')
            .select('*', {
              count: 'exact',
              head: true,
            })
            .eq(
              'conversation_id',
              conversationId
            );

        setParticipantCount(
          count || 0
        );
      }
    };
  const loadChatName = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: conversation } =
      await supabase
        .from('conversations')
        .select(
          'name, is_group'
        )
        .eq('id', conversationId)
        .single();

    if (
      conversation?.is_group
    ) {
      setDisplayName(
        conversation.name
      );
      return;
    }

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
    const { data, error } =
      await supabase
        .from('messages')
        .select(`
        *,
        profiles!messages_sender_id_fkey (
          username
        )
      `)
        .eq(
          'conversation_id',
          conversationId
        )
        .order('created_at', {
          ascending: true,
        });

    if (error) {
      console.log(error);
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
  const markMessagesAsRead = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();



    const { data: messages } =
      await supabase
        .from('messages')
        .select('*')
        .eq(
          'conversation_id',
          conversationId
        );

    const { data, error } =
      await supabase
        .from('messages')
        .update({
          is_read: true,
        })
        .eq(
          'conversation_id',
          conversationId
        )
        .neq(
          'sender_id',
          user.id
        )
        .eq(
          'is_read',
          false
        )
        .select();


  };
  const sendMessage = async () => {
    if (
      !message.trim() ||
      sending
    )
      return;

    setSending(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSending(false);
        return;
      }

      const messageText =
        message.trim();

      setMessage('');

      const { error } =
        await supabase
          .from('messages')
          .insert([
            {
              conversation_id:
                conversationId,
              sender_id: user.id,
              content:
                messageText,
            },
          ]);

      if (error) {
        console.log(error);
      }
    } finally {
      setSending(false);
    }
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
            {isGroup
              ? `${participantCount} participants`
              : userStatus}
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
                {isGroup && !isMine && (
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: 'bold',
                      color: '#2196F3',
                      marginBottom: 4,
                    }}
                  >
                    {item.profiles?.username}
                  </Text>
                )}
                <Text
                  style={{
                    fontSize: 16,
                  }}
                >
                  {item.content}
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    alignSelf: 'flex-end',
                    marginTop: 5,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      color: 'gray',
                      marginRight: 5,
                    }}
                  >
                    {new Date(
                      item.created_at
                    ).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>

                  {isMine && (
                    <Text
                      style={{
                        fontSize: 10,
                        color: item.is_read
                          ? '#2196F3'
                          : 'gray',
                      }}
                    >
                      {item.is_read
                        ? '✓✓'
                        : '✓'}
                    </Text>
                  )}
                </View>
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
            title={
              sending
                ? 'Sending...'
                : 'Send'
            }
            onPress={sendMessage}
            disabled={sending}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>

  );
}