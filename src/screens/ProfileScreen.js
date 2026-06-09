import * as FileSystem from 'expo-file-system/legacy';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../config/supabase';

export default function ProfileScreen() {
  const [avatarUrl, setAvatarUrl] =
    useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

const loadProfile = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data, error } =
    await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

  if (data?.avatar_url) {
    setAvatarUrl(
      `${data.avatar_url}?t=${Date.now()}`
    );
  }
};



  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow photo access.'
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes:
            ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

      // picker result available

      if (result.canceled) return;

      const image =
        result.assets[0];

      if (!image?.uri) return;

      await uploadAvatar(image.uri);
    } catch (error) {
      Alert.alert(
        'Error',
        error.message
      );
    }
  };

const uploadAvatar = async (imageUri) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const fileExt =
      imageUri.split('.').pop() || 'jpg';

    const fileName =
      `${user.id}.${fileExt}`;

    const base64 =
  await FileSystem.readAsStringAsync(
    imageUri,
    {
      encoding: 'base64',
    }
  );
  // base64 length logged for debugging

    const byteCharacters =
      atob(base64);

    const byteNumbers =
      new Array(
        byteCharacters.length
      );

    for (
      let i = 0;
      i < byteCharacters.length;
      i++
    ) {
      byteNumbers[i] =
        byteCharacters.charCodeAt(i);
    }

    const byteArray =
      new Uint8Array(
        byteNumbers
      );

    const { error: uploadError } =
      await supabase.storage
        .from('avatars')
        .upload(
          fileName,
          byteArray,
          {
            contentType:
              'image/jpeg',
            upsert: true,
          }
        );

    // upload error available

    if (uploadError) {
      Alert.alert(
        'Upload Error',
        uploadError.message
      );
      return;
    }

    const {
      data: publicUrlData,
    } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const publicUrl =
      publicUrlData.publicUrl;

    // public URL obtained

    const { error: profileError } =
      await supabase
        .from('profiles')
        .update({
          avatar_url:
            publicUrl,
        })
        .eq('id', user.id);

    // profile update result

    if (profileError) {
      Alert.alert(
        'Profile Error',
        profileError.message
      );
      return;
    }

    setAvatarUrl(
      `${publicUrl}?t=${Date.now()}`
    );

        setAvatarUrl(
      `${publicUrl}?t=${Date.now()}`
    );

    Alert.alert(
      'Success',
      'Profile picture updated'
    );
  } catch (error) {
    Alert.alert(
      'Error',
      error.message
    );
  }
};
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Profile
      </Text>

      {avatarUrl ? (
        <Image
          source={{
            uri: avatarUrl,
          }}
          style={styles.avatar}
        />
      ) : (
        <View
          style={
            styles.avatarPlaceholder
          }
        />
      )}

      <Text
        style={styles.instructions}
      >
        Select a profile picture
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={pickImage}
      >
        <Text
          style={styles.buttonText}
        >
          Choose Profile Picture
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },

    title: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 20,
    },

    avatar: {
      width: 150,
      height: 150,
      borderRadius: 75,
      marginBottom: 20,
    },

    avatarPlaceholder: {
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: '#ddd',
      marginBottom: 20,
    },

    instructions: {
      textAlign: 'center',
      color: '#555',
      marginBottom: 20,
    },

    button: {
      backgroundColor: '#007AFF',
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 25,
    },

    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });