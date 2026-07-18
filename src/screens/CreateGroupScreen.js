import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../config/supabase';
import { uploadImageToSupabase } from '../utils/uploadImage';

export default function CreateGroupScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [groupAvatarUri, setGroupAvatarUri] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;
    setCurrentUserId(user.id);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id);

    if (error) {
      console.log('loadUsers error:', error);
      return;
    }

    setUsers(data || []);
  };

  const toggleUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const pickGroupAvatar = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow photo access.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;
      setGroupAvatarUri(result.assets[0]?.uri || null);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name.');
      return;
    }

    if (selectedUsers.length < 1) {
      Alert.alert('Error', 'Select at least one member.');
      return;
    }

    setCreating(true);

    try {
      // 1. Create the conversation row
      const { data: conversation, error: conversationError } =
        await supabase
          .from('conversations')
          .insert([{ name: groupName.trim(), is_group: true }])
          .select()
          .single();

      if (conversationError) {
        console.log('createGroup conversation error:', conversationError);
        Alert.alert('Error', 'Failed to create group.');
        return;
      }

      // 2. Insert participants FIRST (before avatar upload)
      //    This is critical: RLS on conversations requires the user to be
      //    a participant before they can UPDATE the row.
      const participantRows = [
        ...selectedUsers.map((userId) => ({
          conversation_id: conversation.id,
          user_id: userId,
        })),
        { conversation_id: conversation.id, user_id: currentUserId },
      ];

      const { error: participantError } = await supabase
        .from('participants')
        .insert(participantRows);

      if (participantError) {
        console.log('createGroup participant error:', participantError);
        Alert.alert('Error', 'Failed to add members.');
        return;
      }

      // 3. Now upload the group avatar (user is now a participant — RLS will pass)
      if (groupAvatarUri) {
        try {
          const fileExt = groupAvatarUri.split('.').pop() || 'jpg';
          const fileName = `group_${conversation.id}.${fileExt}`;

          const publicUrl = await uploadImageToSupabase(
            groupAvatarUri,
            'avatars',
            fileName
          );

          const { error: avatarUpdateError } = await supabase
            .from('conversations')
            .update({ avatar_url: publicUrl })
            .eq('id', conversation.id);

          if (avatarUpdateError) {
            console.log('Group avatar DB update error:', avatarUpdateError.message);
            // Non-fatal — group and participants are already created
          }
        } catch (uploadError) {
          console.log('Group avatar upload error:', uploadError.message);
        }
      }

      navigation.replace('Chat', {
        conversationId: conversation.id,
        chatName: conversation.name,
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>Create Group</Text>

      {/* ── Group Avatar Picker ── */}
      <TouchableOpacity
        onPress={pickGroupAvatar}
        style={styles.avatarContainer}
        activeOpacity={0.8}
      >
        {groupAvatarUri ? (
          <Image source={{ uri: groupAvatarUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderIcon}>👥</Text>
          </View>
        )}
        <View style={styles.cameraOverlay}>
          <Text style={styles.cameraIcon}>📷</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.avatarHint}>Tap to add a group photo</Text>

      {/* ── Group Name Input ── */}
      <TextInput
        value={groupName}
        onChangeText={setGroupName}
        placeholder="Group name"
        placeholderTextColor="#999"
        style={styles.nameInput}
      />

      {/* ── Member selection list ── */}
      <Text style={styles.sectionHeader}>
        Add Members ({selectedUsers.length} selected)
      </Text>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        style={styles.list}
        renderItem={({ item }) => {
          const selected = selectedUsers.includes(item.id);
          return (
            <TouchableOpacity
              onPress={() => toggleUser(item.id)}
              style={[styles.userRow, selected && styles.userRowSelected]}
              activeOpacity={0.7}
            >
              {item.avatar_url ? (
                <Image
                  source={{ uri: `${item.avatar_url}?t=1` }}
                  style={styles.userAvatar}
                />
              ) : (
                <View style={styles.userAvatarPlaceholder}>
                  <Text style={styles.userAvatarInitial}>
                    {item.username ? item.username[0].toUpperCase() : '?'}
                  </Text>
                </View>
              )}

              <Text style={styles.userName}>{item.username}</Text>

              {selected && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* ── Create Button ── */}
      <TouchableOpacity
        onPress={createGroup}
        disabled={creating}
        style={[styles.createButton, creating && styles.createButtonDisabled]}
        activeOpacity={0.8}
      >
        {creating ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text style={styles.createButtonText}>Create Group</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#111',
    textAlign: 'center',
  },

  // ── Avatar ─────────────────────────────────────────────────────────────
  avatarContainer: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: 6,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#075E54',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderIcon: {
    fontSize: 40,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    fontSize: 16,
  },
  avatarHint: {
    textAlign: 'center',
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },

  // ── Group Name Input ────────────────────────────────────────────────────
  nameInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: 'white',
    color: '#111',
  },

  // ── Member List ─────────────────────────────────────────────────────────
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  list: {
    flex: 1,
    marginBottom: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#eee',
  },
  userRowSelected: {
    backgroundColor: '#DCF8C6',
    borderColor: '#25D366',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#128C7E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarInitial: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userName: {
    flex: 1,
    fontSize: 16,
    color: '#111',
  },
  checkmark: {
    fontSize: 18,
    color: '#25D366',
    fontWeight: 'bold',
  },

  // ── Create Button ───────────────────────────────────────────────────────
  createButton: {
    backgroundColor: '#075E54',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  createButtonDisabled: {
    backgroundColor: '#aaa',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});