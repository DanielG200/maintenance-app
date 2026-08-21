import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SETTINGS_KEY = '@reminder_settings';

const defaultSettings = {
  thirtyDays: true,
  sevenDays: true,
  oneDay: true,
  dueDate: true,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission() {
  if (Platform.OS === 'web') {
    return false;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } =
      await Notifications.requestPermissionsAsync();

    finalStatus = status;
  }

  return finalStatus === 'granted';
}

async function getReminderSettings() {
  try {
    const saved = await AsyncStorage.getItem(SETTINGS_KEY);

    if (saved) {
      return {
        ...defaultSettings,
        ...JSON.parse(saved),
      };
    }
  } catch (error) {
    console.error('Error loading reminder settings:', error);
  }

  return defaultSettings;
}

export async function scheduleMaintenanceNotifications(
  maintenance: any
) {
  const hasPermission = await requestNotificationPermission();

  if (!hasPermission || !maintenance.nextDue) {
    return [];
  }

  const settings = await getReminderSettings();

  const dueDate = new Date(maintenance.nextDue);
  dueDate.setHours(9, 0, 0, 0);

  const reminders = [
    {
      daysBefore: 30,
      enabled: settings.thirtyDays,
      title: 'Maintenance coming up 🔧',
      body: `${maintenance.name} is due in 30 days.`,
    },
    {
      daysBefore: 7,
      enabled: settings.sevenDays,
      title: 'Maintenance reminder 🔧',
      body: `${maintenance.name} is due in 7 days.`,
    },
    {
      daysBefore: 1,
      enabled: settings.oneDay,
      title: 'Maintenance tomorrow 🔧',
      body: `${maintenance.name} is due tomorrow.`,
    },
    {
      daysBefore: 0,
      enabled: settings.dueDate,
      title: 'Maintenance due today 🔧',
      body: `${maintenance.name} is due today.`,
    },
  ];

  const notificationIds: string[] = [];

  for (const reminder of reminders) {
    if (!reminder.enabled) {
      continue;
    }

    const notificationDate = new Date(dueDate);

    notificationDate.setDate(
      notificationDate.getDate() - reminder.daysBefore
    );

    if (notificationDate.getTime() <= Date.now()) {
      continue;
    }

    const notificationId =
      await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.body,
          sound: 'default',
        },
        trigger: {
          type:
            Notifications.SchedulableTriggerInputTypes.DATE,
          date: notificationDate,
        },
      });

    notificationIds.push(notificationId);
  }

  return notificationIds;
}

export async function cancelMaintenanceNotifications(
  notificationIds: string[]
) {
  if (!notificationIds) {
    return;
  }

  for (const id of notificationIds) {
    if (!id) continue;

    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (error) {
      console.error(
        'Error cancelling notification:',
        error
      );
    }
  }
}

export async function rescheduleMaintenance(
  maintenance: any
) {
  // Cancel existing notifications
  if (maintenance.notificationIds?.length) {
    await cancelMaintenanceNotifications(
      maintenance.notificationIds
    );
  }

  // Schedule notifications using current settings
  const notificationIds =
    await scheduleMaintenanceNotifications(maintenance);

  return notificationIds;
}