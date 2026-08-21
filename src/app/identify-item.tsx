import { useLocalSearchParams, useRouter } from 'expo-router';
import { addItem } from '@/utils/storage';
import { scheduleMaintenanceNotifications } from '@/utils/notifications';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function IdentifyItemScreen() {
  const router = useRouter();
  const { imageUri } = useLocalSearchParams();

  const image = Array.isArray(imageUri)
    ? imageUri[0]
    : imageUri;

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const identifyItem = async () => {
    if (!image) {
      setError('No image found.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const imageResponse = await fetch(image);
      const originalBlob = await imageResponse.blob();

      // Force the uploaded image to have a valid image MIME type.
      const imageBlob = new Blob(
        [originalBlob],
        { type: 'image/jpeg' }
      );

      const formData = new FormData();

      formData.append(
        'image',
        imageBlob,
        'item.jpg'
      );

      console.log(
        'Sending request to:',
        `${API_URL}/api/identify-item`
      );

      const response = await fetch(
        `${API_URL}/api/identify-item`,
        {
          method: 'POST',
          body: formData,
        }
      );

      console.log(
        'Backend response status:',
        response.status
      );

      const data = await response.json();

      console.log(
        'Backend response:',
        data
      );

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            `Backend error (${response.status})`
        );
      }

      setResult(data);
    } catch (err: any) {
      console.error(
        'Identification error:',
        err
      );

      setError(
        err?.message ||
          'Failed to identify item.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backButton}>‹</Text>
          </Pressable>

          <Text style={styles.headerTitle}>
            Identify Item
          </Text>

          <View style={styles.spacer} />
        </View>

        {/* Photo */}
        {image && (
          <Image
            source={{ uri: image }}
            style={styles.image}
          />
        )}

        {/* Identify button */}
        {!result && (
          <Pressable
            style={[
              styles.identifyButton,
              loading && styles.disabledButton,
            ]}
            onPress={identifyItem}
            disabled={loading}
          >
            {loading ? (
              <>
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />

                <Text style={styles.identifyText}>
                  Analyzing...
                </Text>
              </>
            ) : (
              <Text style={styles.identifyText}>
                Identify Item
              </Text>
            )}
          </Pressable>
        )}

        {/* Error */}
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Results */}
        {result && (
          <>
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>
                IDENTIFIED ITEM
              </Text>

              <Text style={styles.resultName}>
                {result.item.name}
              </Text>

              <Text style={styles.category}>
                {result.item.category}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>
              Recommended Maintenance
            </Text>

            {result.maintenance.map(
              (task: any, index: number) => (
                <View
                  key={index}
                  style={styles.maintenanceCard}
                >
                  <View style={styles.taskIcon}>
                    <Text>🔧</Text>
                  </View>

                  <View style={styles.taskInfo}>
                    <Text style={styles.taskName}>
                      {task.name}
                    </Text>

                    <Text style={styles.taskInterval}>
                      Every {task.interval}{' '}
                      {task.unit}
                    </Text>

                    <Text style={styles.cost}>
                      Estimated cost:{' '}
                      {task.estimatedCost}
                    </Text>
                  </View>
                </View>
              )
            )}

            <Pressable
              style={styles.continueButton}
              onPress={async () => {
                try {
                  const maintenanceTasks =
                    await Promise.all(
                      result.maintenance.map(
                        async (task: any) => {
                          const nextDue = new Date();

                          const unit = String(
                            task.unit
                          ).toLowerCase();

                          if (unit.includes('day')) {
                            nextDue.setDate(
                              nextDue.getDate() +
                                Number(task.interval)
                            );
                          } else if (unit.includes('week')) {
                            nextDue.setDate(
                              nextDue.getDate() +
                                Number(task.interval) * 7
                            );
                          } else if (unit.includes('month')) {
                            nextDue.setMonth(
                              nextDue.getMonth() +
                                Number(task.interval)
                            );
                          } else if (unit.includes('year')) {
                            nextDue.setFullYear(
                              nextDue.getFullYear() +
                                Number(task.interval)
                            );
                          }

                          const maintenance = {
                            id:
                              Date.now().toString() +
                              Math.random().toString(),
                            name: task.name,
                            interval: task.interval,
                            unit: task.unit,
                            estimatedCost:
                              task.estimatedCost,
                            nextDue: nextDue.toISOString(),
                            lastCompleted: null,
                          };

                          const notificationIds =
                            await scheduleMaintenanceNotifications(
                              maintenance
                            );

                          return {
                            ...maintenance,
                            notificationIds,
                          };
                        }
                      )
                    );

                  const newItem = {
                    id: Date.now().toString(),
                    name: result.item.name,
                    category: result.item.category,
                    imageUri: image,
                    maintenance: maintenanceTasks,
                  };

                  await addItem(newItem);

                  router.replace('/home');
                } catch (error) {
                  console.error(
                    'Error saving item:',
                    error
                  );
                }
              }}
            >
              <Text style={styles.continueText}>
                Add to My Items
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
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

  spacer: {
    width: 30,
  },

  image: {
    width: '100%',
    height: 260,
    borderRadius: 20,
    marginBottom: 20,
  },

  identifyButton: {
    height: 52,
    backgroundColor: '#22252B',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 20,
  },

  disabledButton: {
    opacity: 0.7,
  },

  identifyText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },

  errorCard: {
    backgroundColor: '#FDECEC',
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
  },

  errorText: {
    color: '#B83A32',
    fontSize: 14,
    textAlign: 'center',
  },

  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 25,
  },

  resultLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#858991',
    letterSpacing: 1,
    marginBottom: 7,
  },

  resultName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#17181C',
    marginBottom: 5,
  },

  category: {
    fontSize: 14,
    color: '#737780',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#17181C',
    marginBottom: 13,
  },

  maintenanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  taskIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F0F1F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  taskInfo: {
    flex: 1,
  },

  taskName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#25272C',
    marginBottom: 4,
  },

  taskInterval: {
    fontSize: 12,
    color: '#7A7E86',
    marginBottom: 3,
  },

  cost: {
    fontSize: 12,
    color: '#5E636B',
  },

  continueButton: {
    height: 52,
    backgroundColor: '#22252B',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },

  continueText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});