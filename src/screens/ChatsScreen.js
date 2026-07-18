import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../config/supabase';
import { useTheme } from '../context/ThemeContext';

export default function ChatsScreen({ navigation }) {
  const { colors, isDark } = useTheme();

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    initScreen();

    const channel = supabase
      .channel('chat-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        loadChats();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, () => {
        loadChats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => {
        loadChats();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const initScreen = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
    await loadChats(user?.id);
  };

  // ── Load chats ─────────────────────────────────────────────────────────────
  const loadChats = async (uid) => {
    const resolvedUid = uid || currentUserId ||
      (await supabase.auth.getUser()).data?.user?.id;
    if (!resolvedUid) return;

    setLoading(true);

    const { data: participants, error } = await supabase
      .from('participants')
      .select(`
        conversation_id,
        conversations (
          id, name, is_group, avatar_url, updated_at
        )
      `)
      .eq('user_id', resolvedUid);

    if (error) { setLoading(false); return; }

    const chatData = await Promise.all(
      participants.map(async (p) => {
        const conv = p.conversations;

        const { data: users } = await supabase
          .from('participants')
          .select('user_id')
          .eq('conversation_id', conv.id);

        let chatName = conv.name;
        let chatAvatar = conv.avatar_url;

        if (!conv.is_group) {
          const other = users?.find((u) => u.user_id !== resolvedUid);
          if (other) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', other.user_id)
              .single();
            if (profile) {
              chatName = profile.username;
              chatAvatar = profile.avatar_url;
            }
          }
        }

        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, image_url, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', resolvedUid)
          .eq('is_read', false);

        return {
          id: conv.id,
          name: chatName,
          avatar: chatAvatar ? `${chatAvatar}?t=${Date.now()}` : null,
          is_group: conv.is_group,
          unreadCount: unreadCount || 0,
          lastMessage: lastMsg?.content || (lastMsg?.image_url ? '📷 Photo' : 'No messages yet'),
          lastMessageTime: lastMsg?.created_at || null,
          updated_at: conv.updated_at,
        };
      })
    );

    chatData.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
    setChats(chatData);
    setLoading(false);
  };

  // ── Delete / Leave ─────────────────────────────────────────────────────────
  const handleLongPress = (item) => {
    if (item.is_group) {
      Alert.alert(
        item.name,
        'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Leave Group',
            style: 'destructive',
            onPress: () => leaveGroup(item),
          },
        ]
      );
    } else {
      Alert.alert(
        'Delete Chat',
        `Delete your conversation with ${item.name}? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteChat(item),
          },
        ]
      );
    }
  };

  const leaveGroup = async (item) => {
    const uid = currentUserId ||
      (await supabase.auth.getUser()).data?.user?.id;

    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('conversation_id', item.id)
      .eq('user_id', uid);

    if (error) {
      Alert.alert('Error', 'Could not leave group: ' + error.message);
      return;
    }
    // Remove from local list instantly
    setChats((prev) => prev.filter((c) => c.id !== item.id));
  };

  const deleteChat = async (item) => {
    // Delete messages → participants → conversation
    await supabase.from('messages').delete().eq('conversation_id', item.id);
    await supabase.from('participants').delete().eq('conversation_id', item.id);
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', item.id);

    if (error) {
      Alert.alert('Error', 'Could not delete chat: ' + error.message);
      return;
    }
    setChats((prev) => prev.filter((c) => c.id !== item.id));
  };

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = searchQuery.trim()
    ? chats.filter((c) =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chats;

  // ── Styles ─────────────────────────────────────────────────────────────────
  const s = makeStyles(colors, isDark);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.screen}>
      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: isDark ? '#1e293b' : '#075E54' }]}>
        <View>
          <Text style={s.headerTitle}>Messages</Text>
          <Text style={s.headerSub}>{chats.length} conversation{chats.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity
            style={s.headerBtn}
            onPress={() => navigation.navigate('Users')}
            activeOpacity={0.8}
          >
            <Text style={s.headerBtnIcon}>💬</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.headerBtn, { marginLeft: 8 }]}
            onPress={() => navigation.navigate('CreateGroup')}
            activeOpacity={0.8}
          >
            <Text style={s.headerBtnIcon}>👥</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.content}>
        {/* ── Search bar ── */}
        <View style={s.searchWrapper}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search conversations…"
            placeholderTextColor={colors.textMuted}
            style={s.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={s.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── List ── */}
        {loading ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={s.loadingText}>Loading chats…</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={filtered.length === 0 ? s.emptyList : null}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={s.emptyContainer}>
                <Text style={s.emptyIcon}>💬</Text>
                <Text style={s.emptyTitle}>
                  {searchQuery ? 'No results found' : 'No chats yet'}
                </Text>
                <Text style={s.emptyDesc}>
                  {searchQuery
                    ? `Nothing matches "${searchQuery}"`
                    : 'Start a new conversation or create a group!'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const colours = ['#075E54', '#128C7E', '#34B7F1', '#9C27B0', '#FF5722'];
              const ci = (item.name?.charCodeAt(0) || 0) % colours.length;
              const placeholderBg = item.is_group ? '#075E54' : colours[ci];

              return (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('Chat', {
                      conversationId: item.id,
                      chatName: item.name,
                    })
                  }
                  onLongPress={() => handleLongPress(item)}
                  delayLongPress={350}
                  style={s.chatRow}
                  activeOpacity={0.7}
                >
                  {/* Avatar */}
                  <View style={s.avatarContainer}>
                    {item.avatar ? (
                      <Image source={{ uri: item.avatar }} style={s.avatar} />
                    ) : (
                      <View style={[s.avatarPlaceholder, { backgroundColor: placeholderBg }]}>
                        <Text style={s.avatarInitial}>
                          {item.name ? item.name[0].toUpperCase() : '?'}
                        </Text>
                      </View>
                    )}
                    {/* Online dot — show only for DMs (not groups) */}
                    {!item.is_group && (
                      <View style={s.onlineDot} />
                    )}
                  </View>

                  {/* Body */}
                  <View style={s.chatBody}>
                    <View style={s.chatTopRow}>
                      <Text style={s.chatName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text
                        style={[
                          s.chatTime,
                          item.unreadCount > 0 && s.chatTimeUnread,
                        ]}
                      >
                        {item.lastMessageTime
                          ? new Date(item.lastMessageTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </Text>
                    </View>

                    <View style={s.chatBottomRow}>
                      <Text
                        numberOfLines={1}
                        style={[
                          s.lastMessage,
                          item.unreadCount > 0 && s.lastMessageUnread,
                        ]}
                      >
                        {item.lastMessage === '📷 Photo' ? 'Photo' : item.lastMessage}
                      </Text>
                      {item.unreadCount > 0 && (
                        <View style={s.badge}>
                          <Text style={s.badgeText}>
                            {item.unreadCount > 99 ? '99+' : item.unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* ── Hint for long press ── */}
        {!loading && filtered.length > 0 && (
          <Text style={s.hint}>Long press a chat to delete or leave</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Style factory ──────────────────────────────────────────────────────────────
const makeStyles = (colors, isDark) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },

    // ── Header ──────────────────────────────────────────────────────────────
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 24,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: '#ffffff',
      marginBottom: 2,
    },
    headerSub: {
      fontSize: 13,
      color: 'rgba(255, 255, 255, 0.8)',
      fontWeight: '500',
    },
    headerActions: {
      flexDirection: 'row',
    },
    headerBtn: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerBtnIcon: {
      fontSize: 16,
    },

    // ── Content ─────────────────────────────────────────────────────────────
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 16,
    },

    // ── Search ──────────────────────────────────────────────────────────────
    searchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      marginBottom: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    searchIcon: {
      fontSize: 14,
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      padding: 0,
    },
    searchClear: {
      fontSize: 12,
      color: colors.textMuted,
      marginLeft: 8,
    },

    // ── Loading ──────────────────────────────────────────────────────────────
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      color: colors.textSub,
      fontSize: 14,
    },

    // ── Chat row ─────────────────────────────────────────────────────────────
    chatRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
      backgroundColor: colors.bg,
    },
    avatarContainer: {
      position: 'relative',
      marginRight: 12,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
    },
    avatarPlaceholder: {
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarInitial: {
      color: 'white',
      fontSize: 18,
      fontWeight: '600',
    },
    onlineDot: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#10b981',
      borderWidth: 2,
      borderColor: colors.bg,
    },
    chatBody: {
      flex: 1,
    },
    chatTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 3,
    },
    chatName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    chatTime: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '500',
    },
    chatTimeUnread: {
      color: '#10b981',
      fontWeight: '600',
    },
    chatBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    lastMessage: {
      flex: 1,
      fontSize: 13,
      color: colors.textSub,
      marginRight: 8,
    },
    lastMessageUnread: {
      color: colors.text,
      fontWeight: '500',
    },
    badge: {
      backgroundColor: '#10b981',
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    badgeText: {
      color: 'white',
      fontSize: 10,
      fontWeight: '600',
    },

    // ── Empty state ───────────────────────────────────────────────────────────
    emptyList: {
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 80,
      paddingHorizontal: 40,
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
    },
    emptyDesc: {
      fontSize: 13,
      color: colors.textSub,
      textAlign: 'center',
      lineHeight: 18,
    },

    // ── Hint ──────────────────────────────────────────────────────────────────
    hint: {
      textAlign: 'center',
      fontSize: 11,
      color: colors.textMuted,
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.divider,
    },
  });