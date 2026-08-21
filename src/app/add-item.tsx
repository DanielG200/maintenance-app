import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '@/utils/supabase';

// Change this to your test user's Supabase UUID
const TEST_USER_ID = '24dcd992-6393-4945-87e0-42a2749ecea3';

// Your local backend
const API_URL = 'http://localhost:5000';

export default function AddItemScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [lastMaintenance, setLastMaintenance] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      return;
    }

    try {
      // Get the currently logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('No logged-in user:', userError);
        alert('You must be logged in to add an item.');
        return;
      }

      let imageUrl: string | null = null;

      // Upload image if one was selected
      if (image) {
        console.log('Reading image...');

        const response = await fetch(image);
        const blob = await response.blob();

        const fileName = `items/${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 10)}.jpg`;

        console.log('Uploading image...');

        const { data: uploadData, error: uploadError } =
          await supabase.storage
            .from('item-images')
            .upload(fileName, blob, {
              contentType: 'image/jpeg',
              upsert: false,
            });

        if (uploadError) {
          console.error(
            'Image upload error:',
            uploadError
          );
          throw uploadError;
        }

        const { data: publicUrlData } =
          supabase.storage
            .from('item-images')
            .getPublicUrl(uploadData.path);

        imageUrl = publicUrlData.publicUrl;

        console.log('Image uploaded:', imageUrl);
      }

      // Save item to Supabase
      const { data, error } = await supabase
        .from('items')
        .insert({
          user_id: user.id,
          name: name.trim(),
          category: category.trim() || null,
          brand: brand.trim() || null,
          model: model.trim() || null,
          year: year.trim() || null,
          last_maintenance:
            lastMaintenance.trim() || null,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (error) {
        console.error(
          'Error saving item to Supabase:',
          error
        );
        throw error;
      }

      console.log('ITEM SAVED:', data);

      router.replace('/home');
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Could not save item. Please try again.');
    }
  };

  const takePhoto = async () => {
    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission required',
        'Camera permission is required.'
      );
      return;
    }

    const result =
      await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

    if (!result.canceled) {
      const uri = result.assets[0].uri;

      setImage(uri);

      router.push({
        pathname: '/identify-item',
        params: {
          imageUri: uri,
        },
      });
    }
  };

  const choosePhoto = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission required',
        'Photo library permission is required.'
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

    if (!result.canceled) {
      const uri = result.assets[0].uri;

      setImage(uri);

      router.push({
        pathname: '/identify-item',
        params: {
          imageUri: uri,
        },
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}

          <View style={styles.header}>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.backButton}>‹</Text>
            </Pressable>

            <Text style={styles.headerTitle}>
              Add Item
            </Text>

            <View style={styles.headerSpacer} />
          </View>

          <Text style={styles.introTitle}>
            What do you want to maintain?
          </Text>

          <Text style={styles.introText}>
            Add some information about your item so we
            can help you keep it maintained.
          </Text>

          {/* Take Photo */}

          <Pressable
            style={styles.photoButton}
            onPress={takePhoto}
          >
            <Text style={styles.photoIcon}>📷</Text>

            <View>
              <Text style={styles.photoTitle}>
                Take a photo
              </Text>

              <Text style={styles.photoSubtitle}>
                Take a picture of the item
              </Text>
            </View>
          </Pressable>

          {/* Choose Photo */}

          <Pressable
            style={styles.photoButton}
            onPress={choosePhoto}
          >
            <Text style={styles.photoIcon}>🖼️</Text>

            <View>
              <Text style={styles.photoTitle}>
                Choose existing photo
              </Text>

              <Text style={styles.photoSubtitle}>
                Select a photo from your library
              </Text>
            </View>
          </Pressable>

          {/* Image Preview */}

          {image && (
            <Image
              source={{ uri: image }}
              style={styles.previewImage}
            />
          )}

          {/* Item Name */}

          <View style={styles.field}>
            <Text style={styles.label}>
              Item Name *
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. Toyota Corolla"
              placeholderTextColor="#9A9DA3"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Category */}

          <View style={styles.field}>
            <Text style={styles.label}>
              Category
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. Vehicle, Appliance, Equipment"
              placeholderTextColor="#9A9DA3"
              value={category}
              onChangeText={setCategory}
            />
          </View>

          {/* Brand */}

          <View style={styles.field}>
            <Text style={styles.label}>
              Brand
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. Toyota"
              placeholderTextColor="#9A9DA3"
              value={brand}
              onChangeText={setBrand}
            />
          </View>

          {/* Model */}

          <View style={styles.field}>
            <Text style={styles.label}>
              Model
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. Corolla"
              placeholderTextColor="#9A9DA3"
              value={model}
              onChangeText={setModel}
            />
          </View>

          {/* Year */}

          <View style={styles.field}>
            <Text style={styles.label}>
              Year
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. 2021"
              placeholderTextColor="#9A9DA3"
              value={year}
              onChangeText={setYear}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>

          {/* Last Maintenance */}

          <View style={styles.field}>
            <Text style={styles.label}>
              Last Maintenance
            </Text>

            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9A9DA3"
              value={lastMaintenance}
              onChangeText={setLastMaintenance}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.helperText}>
              You can leave this blank if you don't know.
            </Text>
          </View>

          {/* Save */}

          <Pressable
            style={[
              styles.saveButton,
              (!name.trim() || saving) &&
                styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!name.trim() || saving}
          >
            <Text style={styles.saveText}>
              {saving ? 'Saving...' : 'Save Item'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },

  keyboard: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  backButton: {
    fontSize: 38,
    lineHeight: 40,
    color: '#22252B',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#17181C',
  },

  headerSpacer: {
    width: 30,
  },

  introTitle: {
    fontSize: 27,
    fontWeight: '700',
    color: '#17181C',
    marginBottom: 8,
  },

  introText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#737780',
    marginBottom: 28,
  },

  field: {
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#303238',
    marginBottom: 8,
  },

  input: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#17181C',
    borderWidth: 1,
    borderColor: '#E3E5E8',
  },

  helperText: {
    fontSize: 12,
    color: '#858991',
    marginTop: 7,
  },

  saveButton: {
    height: 56,
    backgroundColor: '#22252B',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },

  saveButtonDisabled: {
    opacity: 0.45,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  photoButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  photoIcon: {
    fontSize: 28,
    marginRight: 14,
  },

  photoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22252B',
  },

  photoSubtitle: {
    fontSize: 13,
    color: '#7A7E86',
    marginTop: 3,
  },

  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    marginBottom: 20,
  },
});