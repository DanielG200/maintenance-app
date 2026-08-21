import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getItems,
  updateMaintenance,
} from '@/utils/storage';

import {
  cancelMaintenanceNotifications,
  scheduleMaintenanceNotifications,
} from '@/utils/notifications';

export default function EditMaintenanceScreen() {
  const router = useRouter();

  const { itemId, maintenanceId } =
    useLocalSearchParams();

  const [task, setTask] = useState<any>(null);

  const [name, setName] = useState('');
  const [interval, setInterval] = useState('');
  const [unit, setUnit] = useState('months');
  const [estimatedCost, setEstimatedCost] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadMaintenance = async () => {
      const items = await getItems();

      const item = items.find(
        (savedItem: any) =>
          savedItem.id === String(itemId)
      );

      const foundTask = item?.maintenance?.find(
        (maintenance: any) =>
          maintenance.id === String(maintenanceId)
      );

      if (!foundTask) {
        Alert.alert(
          'Error',
          'Maintenance task not found.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );

        return;
      }

      setTask(foundTask);

      setName(foundTask.name || '');
      setInterval(
        foundTask.interval
          ? String(foundTask.interval)
          : ''
      );
      setUnit(
        foundTask.unit
          ? String(foundTask.unit).toLowerCase()
          : 'months'
      );
      setEstimatedCost(
        foundTask.estimatedCost
          ? String(foundTask.estimatedCost)
          : ''
      );
    };

    loadMaintenance();
  }, [itemId, maintenanceId]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(
        'Missing Information',
        'Please enter a maintenance name.'
      );
      return;
    }

    const intervalNumber = Number(interval);

    if (
      !interval ||
      Number.isNaN(intervalNumber) ||
      intervalNumber <= 0
    ) {
      Alert.alert(
        'Invalid Interval',
        'Please enter a valid maintenance interval.'
      );
      return;
    }

    try {
      setSaving(true);

      // Cancel old notifications
      if (task?.notificationIds?.length) {
        await cancelMaintenanceNotifications(
          task.notificationIds
        );
      }

      const updatedTask = {
        ...task,

        name: name.trim(),

        interval: intervalNumber,

        unit,

        estimatedCost:
          estimatedCost.trim() || null,
      };

      // If the task already has a nextDue date,
      // recalculate it using the new interval.
      if (task?.lastCompleted) {
        const nextDue = new Date(
          task.lastCompleted
        );

        if (unit === 'days') {
          nextDue.setDate(
            nextDue.getDate() + intervalNumber
          );
        } else if (unit === 'weeks') {
          nextDue.setDate(
            nextDue.getDate() +
              intervalNumber * 7
          );
        } else if (unit === 'months') {
          nextDue.setMonth(
            nextDue.getMonth() + intervalNumber
          );
        } else if (unit === 'years') {
          nextDue.setFullYear(
            nextDue.getFullYear() + intervalNumber
          );
        }

        updatedTask.nextDue =
          nextDue.toISOString();
      }

      // Schedule new notifications
      const notificationIds =
        await scheduleMaintenanceNotifications(
          updatedTask
        );

      updatedTask.notificationIds =
        notificationIds;

      await updateMaintenance(
        String(itemId),
        String(maintenanceId),
        updatedTask
      );

      router.back();
    } catch (error) {
      console.error(
        'Error updating maintenance:',
        error
      );

      Alert.alert(
        'Error',
        'Could not update maintenance.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.loading}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
          >
            <Text style={styles.backButton}>
              ‹
            </Text>
          </Pressable>

          <Text style={styles.headerTitle}>
            Edit Maintenance
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* Name */}
        <Text style={styles.label}>
          Maintenance Name
        </Text>

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Oil Change"
          placeholderTextColor="#999DA5"
        />

        {/* Interval */}
        <Text style={styles.label}>
          Interval
        </Text>

        <View style={styles.intervalRow}>
          <TextInput
            style={[
              styles.input,
              styles.intervalInput,
            ]}
            value={interval}
            onChangeText={setInterval}
            placeholder="6"
            placeholderTextColor="#999DA5"
            keyboardType="numeric"
          />

          <View style={styles.unitContainer}>
            {[
              'days',
              'weeks',
              'months',
              'years',
            ].map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.unitButton,
                  unit === option &&
                    styles.unitButtonSelected,
                ]}
                onPress={() =>
                  setUnit(option)
                }
              >
                <Text
                  style={[
                    styles.unitText,
                    unit === option &&
                      styles.unitTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Estimated Cost */}
        <Text style={styles.label}>
          Estimated Cost
        </Text>

        <TextInput
          style={styles.input}
          value={estimatedCost}
          onChangeText={setEstimatedCost}
          placeholder="$50-$100"
          placeholderTextColor="#999DA5"
        />

        {/* Save */}
        <Pressable
          style={[
            styles.saveButton,
            saving &&
              styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveText}>
            {saving
              ? 'Saving...'
              : 'Save Changes'}
          </Text>
        </Pressable>

        {/* Cancel */}
        <Pressable
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={saving}
        >
          <Text style={styles.cancelText}>
            Cancel
          </Text>
        </Pressable>
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

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loading: {
    fontSize: 15,
    color: '#70747C',
  },

  header: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
  },

  backButton: {
    fontSize: 38,
    lineHeight: 40,
    color: '#22252B',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#17181C',
  },

  headerSpacer: {
    width: 30,
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#303238',
    marginBottom: 8,
    marginTop: 8,
  },

  input: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 15,
    fontSize: 15,
    color: '#25272C',
    borderWidth: 1,
    borderColor: '#E1E3E6',
    marginBottom: 18,
  },

  intervalRow: {
    marginBottom: 5,
  },

  intervalInput: {
    marginBottom: 10,
  },

  unitContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },

  unitButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#EEF1F5',
  },

  unitButtonSelected: {
    backgroundColor: '#22252B',
  },

  unitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555962',
  },

  unitTextSelected: {
    color: '#FFFFFF',
  },

  saveButton: {
    height: 54,
    borderRadius: 15,
    backgroundColor: '#22252B',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  cancelButton: {
    height: 52,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#D8DADD',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },

  cancelText: {
    color: '#303238',
    fontSize: 15,
    fontWeight: '700',
  },
});