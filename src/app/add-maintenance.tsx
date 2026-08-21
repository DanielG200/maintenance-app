import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
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

import { addMaintenance } from '@/utils/storage';

import { scheduleMaintenanceNotifications } from '@/utils/notifications';

export default function AddMaintenanceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [name, setName] = useState('');
  const [interval, setInterval] = useState('');
  const [unit, setUnit] = useState('Months');
  const [lastCompleted, setLastCompleted] = useState('');
  const [cost, setCost] = useState('');

  const calculateNextDue = () => {
    if (!lastCompleted || !interval) {
      return '';
    }

    const date = new Date(lastCompleted);
    const amount = Number(interval);

    if (Number.isNaN(date.getTime()) || !amount) {
      return '';
    }

    if (unit === 'Days') {
      date.setDate(date.getDate() + amount);
    } else if (unit === 'Weeks') {
      date.setDate(date.getDate() + amount * 7);
    } else if (unit === 'Months') {
      date.setMonth(date.getMonth() + amount);
    } else if (unit === 'Years') {
      date.setFullYear(date.getFullYear() + amount);
    }

    return date.toISOString().split('T')[0];
  };

  const handleSave = async () => {
    if (!name.trim() || !interval || !lastCompleted) {
      return;
    }

    const nextDue = calculateNextDue();

    const maintenance = {
      id: Date.now().toString(),
      name: name.trim(),
      interval: Number(interval),
      unit,
      lastCompleted,
      nextDue,
      estimatedCost: cost.trim(),
    };

    try {
      const notificationIds =
        await scheduleMaintenanceNotifications(maintenance);

      const maintenanceWithNotification = {
      ...maintenance,
      notificationIds,
      };

      await addMaintenance(
      String(id),
      maintenanceWithNotification
      );

      router.back();
    } catch (error) {
      console.error('Error saving maintenance:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.backButton}>‹</Text>
            </Pressable>

            <Text style={styles.headerTitle}>
              Add Maintenance
            </Text>

            <View style={styles.spacer} />
          </View>

          <Text style={styles.title}>
            Create a maintenance schedule
          </Text>

          <Text style={styles.subtitle}>
            Tell us how often this item needs maintenance.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>
              Maintenance Name *
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. Oil Change"
              placeholderTextColor="#9A9DA3"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              Repeat Every *
            </Text>

            <View style={styles.intervalRow}>
              <TextInput
                style={styles.intervalInput}
                placeholder="6"
                placeholderTextColor="#9A9DA3"
                value={interval}
                onChangeText={setInterval}
                keyboardType="number-pad"
              />

              <View style={styles.units}>
                {['Days', 'Weeks', 'Months', 'Years'].map(
                  (option) => (
                    <Pressable
                      key={option}
                      style={[
                        styles.unitButton,
                        unit === option &&
                          styles.unitButtonActive,
                      ]}
                      onPress={() => setUnit(option)}
                    >
                      <Text
                        style={[
                          styles.unitText,
                          unit === option &&
                            styles.unitTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              Last Completed *
            </Text>

            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9A9DA3"
              value={lastCompleted}
              onChangeText={setLastCompleted}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              Estimated Cost
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. 75"
              placeholderTextColor="#9A9DA3"
              value={cost}
              onChangeText={setCost}
              keyboardType="decimal-pad"
            />
          </View>

          {calculateNextDue() ? (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>
                Next Maintenance
              </Text>

              <Text style={styles.previewDate}>
                {calculateNextDue()}
              </Text>
            </View>
          ) : null}

          <Pressable
            style={styles.saveButton}
            onPress={handleSave}
          >
            <Text style={styles.saveText}>
              Save Maintenance
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

  spacer: {
    width: 30,
  },

  title: {
    fontSize: 27,
    fontWeight: '700',
    color: '#17181C',
    marginBottom: 8,
  },

  subtitle: {
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

  intervalRow: {
    flexDirection: 'row',
    gap: 10,
  },

  intervalInput: {
    width: 80,
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#17181C',
    borderWidth: 1,
    borderColor: '#E3E5E8',
  },

  units: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  unitButton: {
    paddingHorizontal: 11,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8EAED',
    justifyContent: 'center',
  },

  unitButtonActive: {
    backgroundColor: '#22252B',
  },

  unitText: {
    fontSize: 11,
    color: '#555960',
    fontWeight: '600',
  },

  unitTextActive: {
    color: '#FFFFFF',
  },

  preview: {
    backgroundColor: '#EEF1F5',
    borderRadius: 17,
    padding: 18,
    marginBottom: 20,
  },

  previewLabel: {
    fontSize: 12,
    color: '#737780',
    marginBottom: 5,
  },

  previewDate: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22252B',
  },

  saveButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#22252B',
    justifyContent: 'center',
    alignItems: 'center',
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});