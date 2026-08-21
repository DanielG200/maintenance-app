import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  rescheduleMaintenance,
} from '@/utils/notifications';

import { supabase } from '@/utils/supabase';

const defaultSettings = {
  thirtyDays: true,
  sevenDays: true,
  oneDay: true,
  dueDate: true,
};

export default function ReminderSettingsScreen() {
  const router = useRouter();

  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('No logged-in user:', userError);
        return;
      }

      const { data, error } = await supabase
        .from('reminder_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setSettings({
          thirtyDays: data.thirty_days,
          sevenDays: data.seven_days,
          oneDay: data.one_day,
          dueDate: data.due_date,
        });
      } else {
        // Create default settings for this user
        const { error: insertError } = await supabase
          .from('reminder_settings')
          .insert({
            user_id: user.id,
            thirty_days: true,
            seven_days: true,
            one_day: true,
            due_date: true,
          });

        if (insertError) {
          throw insertError;
        }
      }
    } catch (error) {
      console.error(
        'Error loading reminder settings:',
        error
      );
    }
  };

  const updateSetting = async (
    key: keyof typeof defaultSettings,
    value: boolean
  ) => {
    const updated = {
      ...settings,
      [key]: value,
    };

    setSettings(updated);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError || new Error('No logged-in user');
      }

      const { error } = await supabase
        .from('reminder_settings')
        .upsert(
          {
            user_id: user.id,
            thirty_days: updated.thirtyDays,
            seven_days: updated.sevenDays,
            one_day: updated.oneDay,
            due_date: updated.dueDate,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          }
        );

      if (error) {
        throw error;
      }

      // Keep the existing notification behavior
      // for maintenance reminders.
      const { data: items, error: itemsError } =
        await supabase
          .from('items')
          .select(`
            *,
            maintenance (*)
          `)
          .eq('user_id', user.id);

      if (itemsError) {
        throw itemsError;
      }

      for (const item of items || []) {
        for (const maintenance of item.maintenance || []) {
          await rescheduleMaintenance({
            ...maintenance,
            lastCompleted: maintenance.last_completed,
            nextDue: maintenance.next_due,
            lastCost: maintenance.last_cost,
            notificationIds:
              maintenance.notification_ids || [],
          });
        }
      }
    } catch (error) {
      console.error(
        'Error updating reminder settings:',
        error
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backButton}>‹</Text>
          </Pressable>

          <Text style={styles.headerTitle}>
            Reminder Settings
          </Text>

          <View style={styles.spacer} />
        </View>

        <Text style={styles.title}>
          Stay on top of maintenance
        </Text>

        <Text style={styles.subtitle}>
          Choose when you want to be reminded about upcoming
          maintenance.
        </Text>

        <View style={styles.card}>
          <ReminderRow
            title="30 days before"
            description="Get an early reminder"
            value={settings.thirtyDays}
            onValueChange={(value) =>
              updateSetting('thirtyDays', value)
            }
          />

          <ReminderRow
            title="7 days before"
            description="A week before maintenance"
            value={settings.sevenDays}
            onValueChange={(value) =>
              updateSetting('sevenDays', value)
            }
          />

          <ReminderRow
            title="1 day before"
            description="The day before maintenance"
            value={settings.oneDay}
            onValueChange={(value) =>
              updateSetting('oneDay', value)
            }
          />

          <ReminderRow
            title="On the due date"
            description="Remind me when maintenance is due"
            value={settings.dueDate}
            onValueChange={(value) =>
              updateSetting('dueDate', value)
            }
            last
          />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🔔</Text>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Notifications
            </Text>

            <Text style={styles.infoText}>
              You'll only receive reminders for the notification
              types you've enabled above.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ReminderRow({
  title,
  description,
  value,
  onValueChange,
  last = false,
}: {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        !last && styles.rowBorder,
      ]}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>

        <Text style={styles.rowDescription}>
          {description}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
      />
    </View>
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
    marginBottom: 25,
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
    marginBottom: 25,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
  },

  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#ECEDEF',
  },

  rowText: {
    flex: 1,
    paddingRight: 15,
  },

  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#25272C',
    marginBottom: 4,
  },

  rowDescription: {
    fontSize: 12,
    color: '#858991',
  },

  infoCard: {
    backgroundColor: '#EEF1F5',
    borderRadius: 18,
    padding: 18,
    marginTop: 18,
    flexDirection: 'row',
  },

  infoIcon: {
    fontSize: 22,
    marginRight: 12,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#303238',
    marginBottom: 5,
  },

  infoText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6D7179',
  },
});