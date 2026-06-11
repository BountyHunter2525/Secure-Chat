import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    Button,
    Alert,
} from 'react-native';
import { supabase } from '../config/supabase';

export default function CreateGroupScreen({
    navigation,
}) {
    const [users, setUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] =
        useState([]);
    const [groupName, setGroupName] =
        useState('');
    const [currentUserId, setCurrentUserId] =
        useState('');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        setCurrentUserId(user.id);

        const { data, error } =
            await supabase
                .from('profiles')
                .select('*')
                .neq('id', user.id);

        if (error) {
            console.log(error);
            return;
        }

        setUsers(data || []);
    };

    const toggleUser = (userId) => {
        if (
            selectedUsers.includes(userId)
        ) {
            setSelectedUsers(
                selectedUsers.filter(
                    (id) => id !== userId
                )
            );
        } else {
            setSelectedUsers([
                ...selectedUsers,
                userId,
            ]);
        }
    };

    const createGroup = async () => {
        if (!groupName.trim()) {
            Alert.alert(
                'Error',
                'Enter a group name'
            );
            return;
        }

        if (
            selectedUsers.length < 1
        ) {
            Alert.alert(
                'Error',
                'Select at least one member'
            );
            return;
        }

        const {
            data: conversation,
            error: conversationError,
        } = await supabase
            .from('conversations')
            .insert([
                {
                    name: groupName,
                    is_group: true,
                },
            ])
            .select()
            .single();

        if (conversationError) {
            console.log(
                conversationError
            );
            return;
        }

        const participantRows =
            selectedUsers.map(
                (userId) => ({
                    conversation_id:
                        conversation.id,
                    user_id: userId,
                })
            );

        participantRows.push({
            conversation_id:
                conversation.id,
            user_id: currentUserId,
        });

        const {
            error: participantError,
        } = await supabase
            .from('participants')
            .insert(
                participantRows
            );

        if (participantError) {
            console.log(
                participantError
            );
            return;
        }

        navigation.replace(
            'Chat',
            {
                conversationId:
                    conversation.id,
                chatName:
                    conversation.name,
            }
        );
    };

    return (
  <SafeAreaView
    style={{
      flex: 1,
      padding: 20,
    }}
  >
            <Text
                style={{
                    fontSize: 24,
                    fontWeight: 'bold',
                    marginBottom: 20,
                }}
            >
                Create Group
            </Text>

            <TextInput
                value={groupName}
                onChangeText={
                    setGroupName
                }
                placeholder="Group Name"
                style={{
                    borderWidth: 1,
                    borderColor: '#ccc',
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 20,
                }}
            />

            <FlatList
                data={users}
                keyExtractor={(item) =>
                    item.id
                }
                renderItem={({
                    item,
                }) => {
                    const selected =
                        selectedUsers.includes(
                            item.id
                        );

                    return (
                        <TouchableOpacity
                            onPress={() =>
                                toggleUser(
                                    item.id
                                )
                            }
                            style={{
                                padding: 15,
                                borderBottomWidth: 1,
                                borderColor:
                                    '#eee',
                                backgroundColor:
                                    selected
                                        ? '#DCF8C6'
                                        : 'white',
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 18,
                                }}
                            >
                                {
                                    item.username
                                }
                            </Text>
                        </TouchableOpacity>
                    );
                }}
            />

            <View
                style={{
                    marginTop: 15,
                }}
            >
                <Button
                    title="Create Group"
                    onPress={
                        createGroup
                    }
                />
            </View>
        </SafeAreaView>
    );
}