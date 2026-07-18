import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { supabase } from '../config/supabase';
import { KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToSupabase } from '../utils/uploadImage';
import { useTheme } from '../context/ThemeContext';

export default function ChatScreen({ route, navigation }) {
  const { conversationId, chatName } = route.params;
  const { isDark, colors } = useTheme();

  const [displayName, setDisplayName] = useState(chatName);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [isGroup, setIsGroup] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [userStatus, setUserStatus] = useState('');
  // Full-screen image preview
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  // Group avatar uploading
  const [uploadingGroupAvatar, setUploadingGroupAvatar] = useState(false);
  // Participants modal
  const [showParticipants, setShowParticipants] = useState(false);
  const [participants, setParticipants] = useState([]);

  const flatListRef = useRef(null);

  // ── Dark-mode aware chat colours (matching WhatsApp dark palette) ───────────
  const chatBg      = isDark ? '#0B141A' : '#E5DDD5';
  const headerBg    = isDark ? '#1F2C34' : '#075E54';
  const myBubble    = isDark ? '#005C4B' : '#DCF8C6';
  const otherBubble = isDark ? '#202C33' : '#FFFFFF';
  const bubbleText  = isDark ? '#E9EDEF' : '#111111';
  const metaText    = isDark ? '#8696A0' : '#777777';
  const inputBarBg  = isDark ? '#1F2C34' : '#F0F0F0';
  const inputBg     = isDark ? '#2A3942' : '#FFFFFF';
  const inputText   = isDark ? '#E9EDEF' : '#111111';

  useEffect(() => {
    initScreen();
    const statusInterval = setInterval(loadStatus, 5000);

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        loadMessages();
        markMessagesAsRead();
      })
      .subscribe();

    return () => {
      clearInterval(statusInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  const initScreen = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
    await loadConversationInfo(user?.id);
    await loadMessages();
    await markMessagesAsRead(user?.id);
  };

  // ── Conversation info ────────────────────────────────────────────────────────
  const loadConversationInfo = async (userId) => {
    const { data: conversation } = await supabase
      .from('conversations')
      .select('name, is_group, avatar_url')
      .eq('id', conversationId)
      .single();

    if (!conversation) return;

    if (conversation.is_group) {
      setIsGroup(true);
      setDisplayName(conversation.name);
      if (conversation.avatar_url) {
        setAvatarUrl(`${conversation.avatar_url}?t=${Date.now()}`);
      }
      const { count } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);
      setParticipantCount(count || 0);
      loadParticipants();
    } else {
      const { data: parts } = await supabase
        .from('participants')
        .select('user_id')
        .eq('conversation_id', conversationId);

      const other = parts?.find((p) => p.user_id !== userId);
      if (other) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url, online, last_seen')
          .eq('id', other.user_id)
          .single();
        if (profile) {
          setDisplayName(profile.username);
          if (profile.avatar_url) {
            setAvatarUrl(`${profile.avatar_url}?t=${Date.now()}`);
          }
          updateStatusFromProfile(profile);
        }
      }
    }
  };

  const updateStatusFromProfile = (profile) => {
    if (profile.online) {
      setUserStatus('Online');
    } else if (profile.last_seen) {
      setUserStatus(`Last seen ${new Date(profile.last_seen).toLocaleString()}`);
    } else {
      setUserStatus('');
    }
  };

  // ── Participants ─────────────────────────────────────────────────────────────
  const loadParticipants = async () => {
    const { data: rows } = await supabase
      .from('participants')
      .select('user_id')
      .eq('conversation_id', conversationId);

    if (!rows?.length) return;
    const ids = rows.map((r) => r.user_id);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, online')
      .in('id', ids);

    setParticipants(profiles || []);
  };

  // ── Status polling (DM only) ─────────────────────────────────────────────────
  const loadStatus = async () => {
    if (isGroup) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data: parts } = await supabase
      .from('participants')
      .select('user_id')
      .eq('conversation_id', conversationId);

    const other = parts?.find((p) => p.user_id !== user?.id);
    if (!other) return;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('online, last_seen')
      .eq('id', other.user_id)
      .single();

    if (!error && profile) updateStatusFromProfile(profile);
  };

  // ── Messages ─────────────────────────────────────────────────────────────────
  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select(`*, profiles!messages_sender_id_fkey ( username )`)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error) setMessages(data || []);
  };

  const markMessagesAsRead = async (userId) => {
    const uid = userId || (await supabase.auth.getUser()).data?.user?.id;
    if (!uid) return;
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', uid)
      .eq('is_read', false);
  };

  // ── Send text ────────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    const text = message.trim();
    setMessage('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('messages').insert([{
        conversation_id: conversationId,
        sender_id: user.id,
        content: text,
      }]);
    } finally {
      setSending(false);
    }
  };

  // ── Send image ───────────────────────────────────────────────────────────────
  const pickAndSendImage = async () => {
    if (sending) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow photo access.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (result.canceled) return;

      const image = result.assets[0];
      if (!image?.uri) return;
      setSending(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSending(false); return; }

      const ext = image.uri.split('.').pop() || 'jpg';
      const fileName = `${conversationId}_${Date.now()}.${ext}`;
      const publicUrl = await uploadImageToSupabase(image.uri, 'chat-images', fileName);

      const { error } = await supabase.from('messages').insert([{
        conversation_id: conversationId,
        sender_id: user.id,
        content: null,
        image_url: publicUrl,
      }]);

      if (error) Alert.alert('Error', 'Failed to send image.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSending(false);
    }
  };

  // ── Change group avatar ───────────────────────────────────────────────────────
  const changeGroupAvatar = async () => {
    if (!isGroup || uploadingGroupAvatar) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow photo access.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.8,
      });
      if (result.canceled) return;

      const image = result.assets[0];
      if (!image?.uri) return;
      setUploadingGroupAvatar(true);

      const ext = image.uri.split('.').pop() || 'jpg';
      const fileName = `group_${conversationId}.${ext}`;
      const publicUrl = await uploadImageToSupabase(image.uri, 'avatars', fileName);

      const { data: updatedConv, error } = await supabase
        .from('conversations')
        .update({ avatar_url: publicUrl })
        .eq('id', conversationId)
        .select('avatar_url')
        .single();

      if (error || !updatedConv) {
        Alert.alert('Permission Error',
          'Could not save the group photo. Check your Supabase RLS policy for the conversations table.');
        return;
      }

      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
      Alert.alert('Success', 'Group photo updated!');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setUploadingGroupAvatar(false);
    }
  };

  // ── Delete a message ──────────────────────────────────────────────────────────
  const deleteMessage = async (messageId) => {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      Alert.alert('Error', 'Could not delete message: ' + error.message);
      return;
    }
    // Remove from local state immediately for instant feedback
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  const handleMessageLongPress = (item) => {
    // Only the sender can delete their own message
    if (item.sender_id !== currentUserId) return;

    Alert.alert(
      'Delete Message',
      'Delete this message for everyone?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '🗑️  Delete',
          style: 'destructive',
          onPress: () => deleteMessage(item.id),
        },
      ]
    );
  };

  // ── Render message bubble ─────────────────────────────────────────────────────
  const renderMessage = ({ item, index }) => {
    const isMine = item.sender_id === currentUserId;
    const prevItem = index > 0 ? messages[index - 1] : null;
    const showSenderName = isGroup && !isMine &&
      (!prevItem || prevItem.sender_id !== item.sender_id);

    return (
      <View style={[
        styles.msgRow,
        isMine ? styles.msgRowMine : styles.msgRowOther,
      ]}>
        {/* Wrap bubble in TouchableOpacity for long-press delete */}
        <TouchableOpacity
          activeOpacity={0.85}
          delayLongPress={350}
          onLongPress={() => handleMessageLongPress(item)}
          style={[
            styles.bubble,
            { backgroundColor: isMine ? myBubble : otherBubble },
            isMine ? styles.bubbleMine : styles.bubbleOther,
          ]}
        >
          {/* Group sender name */}
          {showSenderName && (
            <Text style={[styles.senderName, { color: isDark ? '#53BDEB' : '#2196F3' }]}>
              {item.profiles?.username}
            </Text>
          )}

          {/* Image message */}
          {item.image_url ? (
            <TouchableOpacity
              onPress={() => setPreviewImageUrl(item.image_url)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: item.image_url }}
                style={styles.msgImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : (
            <Text style={[styles.msgText, { color: bubbleText }]}>
              {item.content}
            </Text>
          )}

          {/* Meta row: time + read receipt */}
          <View style={styles.metaRow}>
            <Text style={[styles.timestamp, { color: metaText }]}>
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: '2-digit', minute: '2-digit',
              })}
            </Text>
            {isMine && (
              <Text style={[
                styles.readReceipt,
                { color: item.is_read
                  ? (isDark ? '#53BDEB' : '#2196F3')
                  : metaText },
              ]}>
                {item.is_read ? '✓✓' : '✓'}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: chatBg }]}>

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        {/* Back button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        {/* Avatar — tapping changes group photo */}
        <TouchableOpacity
          onPress={isGroup ? changeGroupAvatar : undefined}
          disabled={!isGroup || uploadingGroupAvatar}
          activeOpacity={isGroup ? 0.75 : 1}
          style={styles.headerAvatarWrap}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatarPlaceholder,
              { backgroundColor: isDark ? '#2A3942' : '#128C7E' }]}>
              <Text style={styles.headerAvatarInitial}>
                {displayName ? displayName[0].toUpperCase() : '?'}
              </Text>
            </View>
          )}
          {uploadingGroupAvatar && (
            <ActivityIndicator
              size="small" color="#fff"
              style={[StyleSheet.absoluteFill, styles.avatarSpinner]}
            />
          )}
        </TouchableOpacity>

        {/* Name + status — tapping opens participants for groups */}
        <TouchableOpacity
          style={styles.headerInfo}
          onPress={isGroup ? () => setShowParticipants(true) : undefined}
          activeOpacity={isGroup ? 0.75 : 1}
        >
          <Text style={styles.headerName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[styles.headerSub,
            userStatus === 'Online' && { color: '#25D366' }]}
            numberOfLines={1}
          >
            {isGroup
              ? `${participantCount} participants • tap to view`
              : userStatus}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Messages ── */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.msgList}
        showsVerticalScrollIndicator={false}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={renderMessage}
      />

      {/* ── Input bar ── */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.inputBar, { backgroundColor: inputBarBg }]}>
          {/* Attach image */}
          <TouchableOpacity
            onPress={pickAndSendImage}
            disabled={sending}
            style={styles.attachBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.attachIcon}>📎</Text>
          </TouchableOpacity>

          {/* Text input */}
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Message…"
            placeholderTextColor={isDark ? '#8696A0' : '#999'}
            style={[styles.textInput, { backgroundColor: inputBg, color: inputText }]}
            multiline
          />

          {/* Send */}
          <TouchableOpacity
            onPress={sendMessage}
            disabled={sending || !message.trim()}
            style={[
              styles.sendBtn,
              { backgroundColor: message.trim() && !sending ? '#25D366' : (isDark ? '#2A3942' : '#ccc') },
            ]}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.sendIcon}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Full-screen image preview modal ── */}
      <Modal
        visible={!!previewImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <View style={styles.previewOverlay}>
          <TouchableOpacity
            style={styles.previewClose}
            onPress={() => setPreviewImageUrl(null)}
          >
            <Text style={styles.previewCloseText}>✕</Text>
          </TouchableOpacity>
          {previewImageUrl && (
            <Image
              source={{ uri: previewImageUrl }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* ── Participants bottom sheet ── */}
      <Modal
        visible={showParticipants}
        transparent
        animationType="slide"
        onRequestClose={() => setShowParticipants(false)}
      >
        <TouchableOpacity
          style={styles.participantsOverlay}
          activeOpacity={1}
          onPress={() => setShowParticipants(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.participantsSheet, { backgroundColor: isDark ? '#1F2C34' : '#FFFFFF' }]}
            onPress={() => {}}
          >
            <View style={[styles.sheetHandle, { backgroundColor: isDark ? '#3C4F5C' : '#DDD' }]} />

            <Text style={[styles.sheetTitle, { color: isDark ? '#E9EDEF' : '#111' }]}>
              {displayName}
            </Text>
            <Text style={[styles.sheetSubtitle, { color: isDark ? '#8696A0' : '#888' }]}>
              {participantCount} participant{participantCount !== 1 ? 's' : ''}
            </Text>

            <FlatList
              data={participants}
              keyExtractor={(p) => p.id}
              style={styles.participantsList}
              renderItem={({ item }) => {
                const colours = ['#075E54', '#128C7E', '#34B7F1', '#9C27B0', '#FF5722'];
                const colour = colours[(item.username?.charCodeAt(0) || 0) % colours.length];
                return (
                  <View style={[styles.participantRow,
                    { borderBottomColor: isDark ? '#2A3942' : '#f0f0f0' }]}>
                    {item.avatar_url ? (
                      <Image
                        source={{ uri: `${item.avatar_url}?t=1` }}
                        style={styles.participantAvatar}
                      />
                    ) : (
                      <View style={[styles.participantAvatarPh, { backgroundColor: colour }]}>
                        <Text style={styles.participantInitial}>
                          {item.username ? item.username[0].toUpperCase() : '?'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.participantInfo}>
                      <Text style={[styles.participantName, { color: isDark ? '#E9EDEF' : '#111' }]}>
                        {item.username}
                      </Text>
                      <Text style={[
                        styles.participantStatus,
                        item.online ? styles.participantOnline : { color: isDark ? '#8696A0' : '#aaa' },
                      ]}>
                        {item.online ? '● Online' : '○ Offline'}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />

            <TouchableOpacity
              style={[styles.sheetCloseBtn, { backgroundColor: isDark ? '#2A3942' : '#f5f5f5' }]}
              onPress={() => setShowParticipants(false)}
            >
              <Text style={[styles.sheetCloseBtnText, { color: isDark ? '#E9EDEF' : '#333' }]}>
                Close
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

// ── Static styles (colour-independent parts only) ────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backIcon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
    lineHeight: 20,          // prevents vertical drift on Android
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false, // removes Android's extra top padding
  },
  headerAvatarWrap: {
    position: 'relative',
    marginRight: 10,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  headerAvatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarInitial: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },
  avatarSpinner: {
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  headerInfo: { flex: 1 },
  headerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },

  // ── Messages ─────────────────────────────────────────────────────────────────
  msgList: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  msgRow: { marginBottom: 4 },
  msgRowMine: { alignItems: 'flex-end' },
  msgRowOther: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: 5,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  bubbleMine: { borderTopRightRadius: 3 },
  bubbleOther: { borderTopLeftRadius: 3 },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 21,
  },
  msgImage: {
    width: 220,
    height: 180,
    borderRadius: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 3,
  },
  timestamp: {
    fontSize: 10,
    marginRight: 4,
  },
  readReceipt: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Input bar ────────────────────────────────────────────────────────────────
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'android' ? 10 : 8,
  },
  attachBtn: {
    width: 40,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  attachIcon: { fontSize: 22 },
  textInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 130,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginRight: 8,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    fontSize: 18,
    color: 'white',
  },

  // ── Full-screen image preview ────────────────────────────────────────────────
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewClose: {
    position: 'absolute',
    top: 52,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCloseText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  previewImage: {
    width: '100%',
    height: '85%',
  },

  // ── Participants sheet ────────────────────────────────────────────────────────
  participantsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  participantsSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: '75%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  sheetSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 16,
  },
  participantsList: { maxHeight: 420 },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  participantAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 14,
  },
  participantAvatarPh: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantInitial: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  participantInfo: { flex: 1 },
  participantName: {
    fontSize: 15,
    fontWeight: '600',
  },
  participantStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  participantOnline: {
    color: '#25D366',
  },
  sheetCloseBtn: {
    marginTop: 18,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sheetCloseBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});