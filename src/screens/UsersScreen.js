import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../config/supabase';
import { useTheme } from '../context/ThemeContext';

export default function UsersScreen({ navigation }) {
  const { isDark, colors } = useTheme();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(null); // userId being opened
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  // ── Load all other users ───────────────────────────────────────────────────
  const loadUsers = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, online, last_seen')
      .neq('id', user.id)
      .order('online', { ascending: false })  // online users first
      .order('username', { ascending: true });

    if (!error) setUsers(data || []);
    setLoading(false);
  };

  // ── Start or reopen a DM ───────────────────────────────────────────────────
  const startChat = async (selectedUser) => {
    if (startingChat) return;
    setStartingChat(selectedUser.id);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Sort IDs to make the lookup order-independent
      const user1 = user.id < selectedUser.id ? user.id : selectedUser.id;
      const user2 = user.id < selectedUser.id ? selectedUser.id : user.id;

      // Check for existing DM via direct_chats table
      const { data: existingChat } = await supabase
        .from('direct_chats')
        .select('conversation_id')
        .eq('user1_id', user1)
        .eq('user2_id', user2)
        .maybeSingle();

      if (existingChat) {
        navigation.navigate('Chat', {
          conversationId: existingChat.conversation_id,
          chatName: selectedUser.username,
        });
        return;
      }

      // Create new conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert([{ name: selectedUser.username, is_group: false }])
        .select()
        .single();

      if (convError) return;

      // Add both as participants
      await supabase.from('participants').insert([
        { conversation_id: conversation.id, user_id: user.id },
        { conversation_id: conversation.id, user_id: selectedUser.id },
      ]);

      // Record in direct_chats for future lookups
      await supabase.from('direct_chats').insert([
        { user1_id: user1, user2_id: user2, conversation_id: conversation.id },
      ]);

      navigation.navigate('Chat', {
        conversationId: conversation.id,
        chatName: selectedUser.username,
      });
    } finally {
      setStartingChat(null);
    }
  };

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = searchQuery.trim()
    ? users.filter((u) =>
        u.username?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

  const s = makeStyles(colors, isDark);

  return (
    <SafeAreaView style={s.screen}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>New Chat</Text>
          <Text style={s.headerSub}>{users.length} users available</Text>
        </View>
      </View>

      {/* ── Search ── */}
      <View style={s.searchWrapper}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by username…"
          placeholderTextColor={colors.textMuted}
          style={s.searchInput}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={s.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Online section header ── */}
      {!loading && filtered.some((u) => u.online) && !searchQuery && (
        <Text style={s.sectionLabel}>● ONLINE NOW</Text>
      )}

      {/* ── List ── */}
      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={s.loadingText}>Loading users…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={filtered.length === 0 ? s.emptyList : null}
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <Text style={s.emptyIcon}>🔍</Text>
              <Text style={s.emptyTitle}>
                {searchQuery ? 'No users found' : 'No other users yet'}
              </Text>
              <Text style={s.emptyDesc}>
                {searchQuery
                  ? `Nothing matches "${searchQuery}"`
                  : 'Invite your friends to join SecureChat!'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const colours = ['#075E54', '#128C7E', '#34B7F1', '#9C27B0', '#FF5722'];
            const ci = (item.username?.charCodeAt(0) || 0) % colours.length;
            const isBusy = startingChat === item.id;

            return (
              <TouchableOpacity
                onPress={() => startChat(item)}
                disabled={!!startingChat}
                style={s.userRow}
                activeOpacity={0.7}
              >
                {/* Avatar */}
                <View style={s.avatarWrapper}>
                  {item.avatar_url ? (
                    <Image
                      source={{ uri: `${item.avatar_url}?t=1` }}
                      style={s.avatar}
                    />
                  ) : (
                    <View style={[s.avatarPlaceholder, { backgroundColor: colours[ci] }]}>
                      <Text style={s.avatarInitial}>
                        {item.username ? item.username[0].toUpperCase() : '?'}
                      </Text>
                    </View>
                  )}
                  {/* Online indicator dot */}
                  <View style={[
                    s.statusDot,
                    { backgroundColor: item.online ? '#25D366' : (isDark ? '#555' : '#ccc') },
                  ]} />
                </View>

                {/* Info */}
                <View style={s.userInfo}>
                  <Text style={s.userName}>{item.username}</Text>
                  <Text style={[
                    s.userStatus,
                    item.online && s.userStatusOnline,
                  ]}>
                    {item.online
                      ? '● Online'
                      : item.last_seen
                      ? `Last seen ${new Date(item.last_seen).toLocaleDateString()}`
                      : 'Offline'}
                  </Text>
                </View>

                {/* Action */}
                <View style={s.actionArea}>
                  {isBusy ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <View style={s.chatChip}>
                      <Text style={s.chatChipText}>Message</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors, isDark) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },

    // ── Header ──────────────────────────────────────────────────────────────────
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 10,
      backgroundColor: colors.bg,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginRight: 12,
    },
    backIcon: {
      fontSize: 18,
      color: colors.text,
      fontWeight: 'bold',
      lineHeight: 18,
      textAlign: 'center',
      textAlignVertical: 'center',
      includeFontPadding: false,
    },
    headerText: { flex: 1 },
    headerTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
    },
    headerSub: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 1,
    },

    // ── Search ──────────────────────────────────────────────────────────────────
    searchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderRadius: 14,
      marginHorizontal: 16,
      marginBottom: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    searchIcon: { fontSize: 15, marginRight: 8 },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      padding: 0,
    },
    searchClear: {
      fontSize: 14,
      color: colors.textMuted,
      paddingLeft: 8,
    },

    // ── Section label ────────────────────────────────────────────────────────────
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.1,
      color: '#25D366',
      marginHorizontal: 20,
      marginTop: 12,
      marginBottom: 6,
    },

    // ── Loading ──────────────────────────────────────────────────────────────────
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

    // ── User row ─────────────────────────────────────────────────────────────────
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
    },
    avatarWrapper: {
      position: 'relative',
      marginRight: 14,
    },
    avatar: {
      width: 54,
      height: 54,
      borderRadius: 27,
    },
    avatarPlaceholder: {
      width: 54,
      height: 54,
      borderRadius: 27,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarInitial: {
      color: 'white',
      fontSize: 22,
      fontWeight: 'bold',
    },
    statusDot: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 13,
      height: 13,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: colors.bg,
    },
    userInfo: { flex: 1 },
    userName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 3,
    },
    userStatus: {
      fontSize: 13,
      color: colors.textSub,
    },
    userStatusOnline: {
      color: '#25D366',
      fontWeight: '500',
    },
    actionArea: {
      marginLeft: 10,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 72,
    },
    chatChip: {
      backgroundColor: isDark ? '#005C4B' : '#E8F5E9',
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    chatChipText: {
      color: isDark ? '#25D366' : '#075E54',
      fontSize: 13,
      fontWeight: '600',
    },

    // ── Empty state ───────────────────────────────────────────────────────────────
    emptyList: { flex: 1 },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 80,
      paddingHorizontal: 40,
    },
    emptyIcon: { fontSize: 52, marginBottom: 16 },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    emptyDesc: {
      fontSize: 14,
      color: colors.textSub,
      textAlign: 'center',
      lineHeight: 20,
    },
  });