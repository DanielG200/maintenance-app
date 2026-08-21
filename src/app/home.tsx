import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState, useEffect } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getItems } from '@/utils/storage';

import { supabase } from '@/utils/supabase';

function formatDate(dateString: string) {
  if (!dateString) return 'Not scheduled';

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDaysUntil(dateString: string) {
  const today = new Date();
  const date = new Date(dateString);

  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return Math.ceil(
    (date.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

export default function HomeScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            const { error } =
              await supabase.auth.signOut();

            if (error) {
              console.error(
                'Logout error:',
                error
              );
              return;
            }

            router.replace('/login');
          },
        },
      ]
    );
  };

  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const testSupabase = async () => {
      const { data, error } =
        await supabase.auth.getSession();

      console.log('SUPABASE CONNECTION:', {
        session: data.session,
        error,
      });
    };

    testSupabase();
  }, []);

  const loadItems = async () => {
    const savedItems = await getItems();
    console.log('HOME ITEMS:', savedItems);
    setItems(savedItems);
  };

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  const maintenanceTasks = items.flatMap((item) =>
    (item.maintenance || []).map((task: any) => ({
      ...task,
      itemName: item.name,
      itemId: item.id,
    }))
  );

  const upcomingTasks = maintenanceTasks
    .filter((task) => {
      if (!task.nextDue) return false;

      const days = getDaysUntil(task.nextDue);

      return days >= 0 && days <= 30;
    })
    .sort(
      (a, b) =>
        new Date(a.nextDue).getTime() -
        new Date(b.nextDue).getTime()
    );

  const overdueTasks = maintenanceTasks
    .filter((task) => {
      if (!task.nextDue) return false;

      return getDaysUntil(task.nextDue) < 0;
    })
    .sort(
      (a, b) =>
        new Date(a.nextDue).getTime() -
        new Date(b.nextDue).getTime()
    );

  const recentHistory = maintenanceTasks
    .flatMap((task) =>
      (task.history || []).map((entry: any) => ({
        ...entry,
        taskName: task.name,
        itemName: task.itemName,
        itemId: task.itemId,
      }))
    )
    .sort(
      (a, b) =>
        new Date(b.completedAt).getTime() -
        new Date(a.completedAt).getTime()
    )
    .slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Maintenance
            </Text>

            <Text style={styles.subtitle}>
              Keep your items in good shape.
            </Text>
          </View>
        </View>

        {/* Add Item */}
        <Pressable
          style={styles.addButton}
          onPress={() => router.push('/add-item')}
        >
          <Text style={styles.addIcon}>+</Text>

          <Text style={styles.addText}>
            Add an Item
          </Text>
        </Pressable>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {items.length}
            </Text>

            <Text style={styles.statLabel}>
              Items
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {upcomingTasks.length}
            </Text>

            <Text style={styles.statLabel}>
              Upcoming
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text
              style={[
                styles.statNumber,
                overdueTasks.length > 0 &&
                  styles.overdueNumber,
              ]}
            >
              {overdueTasks.length}
            </Text>

            <Text style={styles.statLabel}>
              Overdue
            </Text>
          </View>
        </View>

        {/* My Items */}
        <Text style={styles.sectionTitle}>
          My Items
        </Text>

        {items.length > 0 ? (
          <>
            <View style={styles.itemsGrid}>
              {items.slice(0, 4).map((item) => {
                return (
                  <Pressable
                    key={item.id}
                    style={styles.itemCard}
                    onPress={() =>
                      router.push({
                        pathname: '/item-details',
                        params: { id: item.id },
                      })
                    }
                  >
                    {item.image_url ? (
                      <Image
                        source={{ uri: item.image_url }}
                        style={styles.itemCardImage}
                      />
                    ) : (
                    <View style={styles.itemCardIcon}>
                      <Text style={styles.itemCardEmoji}>
                        🔧
                      </Text>
                    </View>
                  )}

                  <Text
                    style={styles.itemCardName}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>

                  {item.category ? (
                    <Text
                      style={styles.itemCardCategory}
                      numberOfLines={1}
                    >
                      {item.category}
                    </Text>
                  ) : null}
                </Pressable>
                );
              })}
            </View>

            {items.length > 4 && (
              <Pressable
                style={styles.viewAllButton}
                onPress={() => router.push('/items')}
              >
                <Text style={styles.viewAllText}>
                  View All Items
                </Text>

                <Text style={styles.viewAllArrow}>
                  →
                </Text>
              </Pressable>
            )}
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📦</Text>

            <Text style={styles.emptyTitle}>
              No items yet
            </Text>

            <Text style={styles.emptyText}>
              Add your first item to start tracking
              maintenance.
            </Text>
          </View>
        )}

        {/* Overdue */}
        {overdueTasks.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Needs Attention
            </Text>

            {overdueTasks.slice(0, 5).map((task) => (
              <Pressable
                key={`${task.itemId}-${task.id}`}
                style={styles.taskCard}
                onPress={() =>
                  router.push({
                    pathname: '/item-details',
                    params: { id: task.itemId },
                  })
                }
              >
                <View style={styles.warningIcon}>
                  <Text>!</Text>
                </View>

                <View style={styles.taskInfo}>
                  <Text style={styles.taskName}>
                    {task.name}
                  </Text>

                  <Text style={styles.itemName}>
                    {task.itemName}
                  </Text>

                  <Text style={styles.overdueText}>
                    Overdue · {formatDate(task.nextDue)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </>
        )}

        {/* Upcoming */}
        <Text style={styles.sectionTitle}>
          Upcoming Maintenance
        </Text>

        {upcomingTasks.length > 0 ? (
          upcomingTasks.slice(0, 5).map((task) => {
            const days = getDaysUntil(task.nextDue);

            return (
              <Pressable
                key={`${task.itemId}-${task.id}`}
                style={styles.taskCard}
                onPress={() =>
                  router.push({
                    pathname: '/item-details',
                    params: { id: task.itemId },
                  })
                }
              >
                <View style={styles.toolIcon}>
                  <Text>🔧</Text>
                </View>

                <View style={styles.taskInfo}>
                  <Text style={styles.taskName}>
                    {task.name}
                  </Text>

                  <Text style={styles.itemName}>
                    {task.itemName}
                  </Text>

                  <Text style={styles.taskDate}>
                    {days === 0
                      ? 'Due today'
                      : days === 1
                      ? 'Due tomorrow'
                      : `Due in ${days} days`}
                  </Text>
                </View>

                <Text style={styles.dateValue}>
                  {formatDate(task.nextDue)}
                </Text>
              </Pressable>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              ✓
            </Text>

            <Text style={styles.emptyTitle}>
              You're all caught up
            </Text>

            <Text style={styles.emptyText}>
              No maintenance is due in the next 30
              days.
            </Text>
          </View>
        )}

        {/* Recent */}
        <Text style={styles.sectionTitle}>
          Recent Maintenance
        </Text>

        {recentHistory.length > 0 ? (
          recentHistory.map((entry) => (
            <Pressable
              key={entry.id}
              style={styles.historyCard}
              onPress={() =>
                router.push({
                  pathname: '/item-details',
                  params: { id: entry.itemId },
                })
              }
            >
              <View style={styles.historyIcon}>
                <Text>✓</Text>
              </View>

              <View style={styles.taskInfo}>
                <Text style={styles.taskName}>
                  {entry.taskName}
                </Text>

                <Text style={styles.itemName}>
                  {entry.itemName}
                </Text>

                <Text style={styles.taskDate}>
                  {formatDate(entry.completedAt)}
                </Text>
              </View>

              {entry.cost && (
                <Text style={styles.cost}>
                  {entry.cost}
                </Text>
              )}
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              📋
            </Text>

            <Text style={styles.emptyTitle}>
              No maintenance history
            </Text>

            <Text style={styles.emptyText}>
              Completed maintenance will appear here.
            </Text>
          </View>
        )}

        <Pressable
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>
            Log Out
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

  header: {
    marginBottom: 25,
  },

  greeting: {
    fontSize: 29,
    fontWeight: '700',
    color: '#17181C',
  },

  subtitle: {
    fontSize: 14,
    color: '#777B83',
    marginTop: 5,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 30,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
  },

  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#22252B',
  },

  overdueNumber: {
    color: '#B83A32',
  },

  statLabel: {
    fontSize: 12,
    color: '#858991',
    marginTop: 3,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#17181C',
    marginBottom: 13,
    marginTop: 5,
  },

  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  warningIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#FCEDEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  toolIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#EEF1F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  historyIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#EEF1F5',
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
  },

  itemName: {
    fontSize: 12,
    color: '#858991',
    marginTop: 3,
  },

  taskDate: {
    fontSize: 12,
    color: '#7A7E86',
    marginTop: 4,
  },

  overdueText: {
    fontSize: 12,
    color: '#B83A32',
    marginTop: 4,
    fontWeight: '600',
  },

  dateValue: {
    fontSize: 11,
    color: '#858991',
    marginLeft: 8,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 25,
    alignItems: 'center',
    marginBottom: 25,
  },

  emptyIcon: {
    fontSize: 28,
    marginBottom: 8,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#303238',
  },

  emptyText: {
    fontSize: 13,
    color: '#80838B',
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 5,
  },

  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  cost: {
    fontSize: 13,
    fontWeight: '600',
    color: '#303238',
  },

  addButton: {
    height: 60,
    backgroundColor: '#22252B',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },

  addIcon: {
    color: '#FFFFFF',
    fontSize: 25,
    marginRight: 8,
  },

  addText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 25,
  },

  itemCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 15,
  },

  itemCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EEF1F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  itemCardEmoji: {
    fontSize: 23,
  },

  itemCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#25272C',
  },

  itemCardCategory: {
    fontSize: 12,
    color: '#858991',
    marginTop: 4,
  },

  itemCardImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
    marginBottom: 10,
  },

  viewAllButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EEF1F5',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },

  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#303238',
  },

  viewAllArrow: {
    fontSize: 18,
    marginLeft: 8,
    color: '#303238',
  },

  logoutButton: {
    height: 52,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#D8DADD',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 10,
  },

  logoutText: {
    color: '#B83A32',
    fontSize: 15,
    fontWeight: '700',
  },
});