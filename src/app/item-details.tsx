import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/utils/supabase';

import {
  cancelMaintenanceNotifications,
  scheduleMaintenanceNotifications,
} from '@/utils/notifications';

import { Alert } from 'react-native';

function formatDate(dateString: string) {
  if (!dateString) {
    return 'Not recorded';
  }

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

function calculateAverageCost(history: any[]) {
  const costs = history
    .map((entry) => {
      if (!entry.cost) return null;

      const value = Number(
        String(entry.cost).replace(/[^0-9.]/g, '')
      );

      return Number.isFinite(value) ? value : null;
    })
    .filter(
      (value): value is number => value !== null
    );

  if (costs.length === 0) {
    return null;
  }

  const average =
    costs.reduce((sum, value) => sum + value, 0) /
    costs.length;

  return `$${average.toFixed(2)}`;
}

function calculateTotalCost(history: any[]) {
  const costs = history
    .map((entry) => {
      if (!entry.cost) return null;

      const value = Number(
        String(entry.cost).replace(/[^0-9.]/g, '')
      );

      return Number.isFinite(value) ? value : null;
    })
    .filter(
      (value): value is number => value !== null
    );

  if (costs.length === 0) {
    return null;
  }

  const total = costs.reduce(
    (sum, value) => sum + value,
    0
  );

  return `$${total.toFixed(2)}`;
}

export default function ItemDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [item, setItem] = useState<any>(null);

  // Completion modal
  const [completionModalVisible, setCompletionModalVisible] =
    useState(false);

  const [selectedTask, setSelectedTask] =
    useState<any>(null);

  const [cost, setCost] = useState('');

  const [savingCompletion, setSavingCompletion] =
    useState(false);

  useEffect(() => {
    const loadItem = async () => {
      try {
        const { data, error } = await supabase
          .from('items')
          .select(`
            *,
            maintenance (
              *
            )
          `)
          .eq('id', String(id))
          .single();

        if (error) {
          console.error('Error loading item:', error);
          return;
        }

        setItem({
          ...data,
          maintenance: (data.maintenance || []).map(
            (task: any) => ({
              ...task,
              lastCompleted: task.last_completed,
              nextDue: task.next_due,
              lastCost: task.last_cost,
              notificationIds:
                task.notification_ids || [],
            })
          ),
        });
      } catch (error) {
        console.error('Error loading item:', error);
      }
    };

    loadItem();
  }, [id]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete ${item.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('items')
                .delete()
                .eq('id', String(id));

              if (error) {
                throw error;
              }

              router.replace('/home');
            } catch (error) {
              console.error('Error deleting item:', error);

              Alert.alert(
                'Error',
                'Could not delete item.'
              );
            }
          },
        },
      ]
    );
  };

  // Open completion modal
  const handleCompleteMaintenance = (task: any) => {
    setSelectedTask(task);
    setCost('');
    setCompletionModalVisible(true);
  };

  const handleDeleteMaintenance = (task: any) => {
    Alert.alert(
      'Delete Maintenance',
      `Are you sure you want to delete "${task.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (task.notificationIds?.length) {
                await cancelMaintenanceNotifications(
                  task.notificationIds
                );
              }

              const { error } = await supabase
                .from('maintenance')
                .delete()
                .eq('id', String(task.id))
                .eq('item_id', String(id));

              if (error) {
                throw error;
              }

              setItem((current: any) => ({
                ...current,
                maintenance: (
                  current.maintenance || []
                ).filter(
                  (maintenance: any) =>
                    maintenance.id !== String(task.id)
                ),
              }));
            } catch (error) {
              console.error(
                'Error deleting maintenance:',
                error
              );

              Alert.alert(
                'Error',
                'Could not delete maintenance.'
              );
            }
          },
        },
      ]
    );
  };

  // Save completed maintenance
  const saveCompletedMaintenance = async () => {
    if (!selectedTask || savingCompletion) {
      return;
    }

    setSavingCompletion(true);

    try {
      // Cancel existing reminders
      if (selectedTask.notificationIds?.length) {
        await cancelMaintenanceNotifications(
          selectedTask.notificationIds
        );
      }

      const today = new Date();

      const nextDue = new Date(today);

      const interval =
        Number(selectedTask.interval) || 0;

      const unit = String(
        selectedTask.unit || ''
      ).toLowerCase();

      if (unit.includes('day')) {
        nextDue.setDate(
          nextDue.getDate() + interval
        );
      } else if (unit.includes('week')) {
        nextDue.setDate(
          nextDue.getDate() + interval * 7
        );
      } else if (unit.includes('month')) {
        nextDue.setMonth(
          nextDue.getMonth() + interval
        );
      } else if (unit.includes('year')) {
        nextDue.setFullYear(
          nextDue.getFullYear() + interval
        );
      }

      const cleanedCost = cost
        .replace(/[^0-9.]/g, '')
        .trim();

      const updatedTask = {
        ...selectedTask,

        lastCompleted:
          today.toISOString(),

        nextDue:
          nextDue.toISOString(),

        lastCost:
          cleanedCost
            ? `$${cleanedCost}`
            : null,
      };

      const historyEntry = {
        id: `${Date.now()}-${Math.random()}`,
        completedAt: today.toISOString(),
        cost: cleanedCost
          ? `$${cleanedCost}`
          : null,
      };

      // Schedule new reminders
      const notificationIds =
        await scheduleMaintenanceNotifications(
          updatedTask
        );

      // Save maintenance
      const { error: maintenanceError } =
        await supabase
          .from('maintenance')
          .update({
            last_completed: today.toISOString(),
            next_due: nextDue.toISOString(),
            last_cost: cleanedCost
              ? `$${cleanedCost}`
              : null,
            notification_ids: notificationIds,
          })
          .eq('id', String(selectedTask.id))
          .eq('item_id', String(id));

      if (maintenanceError) {
        throw maintenanceError;
      }

      const { error: historyError } =
        await supabase
          .from('maintenance_history')
          .insert({
            maintenance_id: String(selectedTask.id),
            item_id: String(id),
            completed_at: today.toISOString(),
            cost: cleanedCost
              ? `$${cleanedCost}`
              : null,
          });

      if (historyError) {
        throw historyError;
      }

      // Reload item
      const { data: refreshedItem, error } =
        await supabase
          .from('items')
          .select(`
            *,
            maintenance (
              *,
              maintenance_history (
                *
              )
            )
          `)
          .eq('id', String(id))
          .single();

      if (error) {
        throw error;
      }

      setItem({
        ...refreshedItem,
        maintenance:
          refreshedItem.maintenance || [],
      });

      // Close modal
      setCompletionModalVisible(false);
      setSelectedTask(null);
      setCost('');
    } catch (error) {
      console.error(
        'Error completing maintenance:',
        error
      );

      Alert.alert(
        'Error',
        'Could not save the completed maintenance.'
      );
    } finally {
      setSavingCompletion(false);
    }
  };

  if (!item) {
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
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backButton}>
              ‹
            </Text>
          </Pressable>

          <Text style={styles.headerTitle}>
            Item Details
          </Text>

          <Pressable
            style={styles.settingsButton}
            onPress={() =>
              router.push(
                '/reminder-settings'
              )
            }
          >
            <Text style={styles.settingsIcon}>
              ⚙️
            </Text>
          </Pressable>
        </View>

        {/* Item */}
        <View style={styles.itemHeader}>
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.itemImage}
            />
          ) : (
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>
                🔧
              </Text>
            </View>
          )}

          <Text style={styles.itemName}>
            {item.name}
          </Text>

          {item.brand || item.model ? (
            <Text style={styles.itemSubtitle}>
              {[item.brand, item.model]
                .filter(Boolean)
                .join(' ')}
              {item.year
                ? ` • ${item.year}`
                : ''}
            </Text>
          ) : null}

          {item.category ? (
            <Text style={styles.category}>
              {item.category}
            </Text>
          ) : null}
        </View>

        {/* Add Maintenance */}
        <Pressable
          style={styles.addMaintenanceButton}
          onPress={() =>
            router.push({
              pathname:
                '/add-maintenance',
              params: {
                id: item.id,
              },
            })
          }
        >
          <Text
            style={
              styles.addMaintenanceIcon
            }
          >
            +
          </Text>

          <Text
            style={
              styles.addMaintenanceText
            }
          >
            Add Maintenance
          </Text>
        </Pressable>

        {/* Maintenance */}
        <Text style={styles.sectionTitle}>
          Maintenance
        </Text>

        {item.maintenance?.length > 0 ? (
          item.maintenance.map(
            (task: any) => (
              <View
                key={task.id}
                style={
                  styles.maintenanceCard
                }
              >
                <View style={styles.taskIcon}>
                  <Text>🔧</Text>
                </View>

                <View style={styles.taskInfo}>
                  <Text
                    style={styles.taskName}
                  >
                    {task.name}
                  </Text>

                  <Text
                    style={styles.taskDate}
                  >
                    Last completed:{' '}
                    {formatDate(
                      task.lastCompleted
                    )}
                  </Text>

                  <Text
                    style={styles.taskDate}
                  >
                    Next maintenance:{' '}
                    {formatDate(
                      task.nextDue
                    )}
                  </Text>

                  {task.lastCost ? (
                    <Text
                      style={
                        styles.taskCost
                      }
                    >
                      Last cost:{' '}
                      {task.lastCost}
                    </Text>
                  ) : null}

                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.editButton}
                      onPress={() =>
                        router.push({
                          pathname: '/edit-maintenance',
                          params: {
                            itemId: String(id),
                            maintenanceId: String(task.id),
                          },
                        })
                      }
                    >
                      <Text style={styles.editText}>
                        Edit
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.completeButton}
                      onPress={() =>
                        handleCompleteMaintenance(task)
                      }
                    >
                      <Text style={styles.completeText}>
                        Mark as Completed
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.deleteMaintenanceButton}
                      onPress={() =>
                        handleDeleteMaintenance(task)
                      }
                    >
                      <Text style={styles.deleteMaintenanceText}>
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )
          )
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              🛠️
            </Text>

            <Text
              style={styles.emptyTitle}
            >
              No maintenance scheduled
            </Text>

            <Text
              style={styles.emptyText}
            >
              We'll add recommended
              maintenance tasks here.
            </Text>
          </View>
        )}

        {/* Last Maintenance */}
        <Text style={styles.sectionTitle}>
          Last Maintenance
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>
            Last serviced
          </Text>

          <Text style={styles.infoValue}>
            {item.maintenance?.some(
              (task: any) =>
                task.lastCompleted
            )
              ? formatDate(
                  item.maintenance
                    .filter(
                      (task: any) =>
                        task.lastCompleted
                    )
                    .sort(
                      (
                        a: any,
                        b: any
                      ) =>
                        new Date(
                          b.lastCompleted
                        ).getTime() -
                        new Date(
                          a.lastCompleted
                        ).getTime()
                    )[0]
                    .lastCompleted
                )
              : 'Not recorded'}
          </Text>
        </View>

        {/* Maintenance History */}
          <Text style={styles.sectionTitle}>
            Maintenance History
          </Text>

          {(() => {
            const history = (item.maintenance || [])
              .flatMap((task: any) =>
                (task.history || []).map(
                  (entry: any) => ({
                    ...entry,
                    taskName: task.name,
                  })
                )
              )
              .sort(
                (a: any, b: any) =>
                  new Date(b.completedAt).getTime() -
                  new Date(a.completedAt).getTime()
              );

            if (history.length === 0) {
              return (
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
              );
            }

            const averageCost =
              calculateAverageCost(history);

            const totalCost =
              calculateTotalCost(history);

            return (
              <>
                {(averageCost || totalCost) && (
                  <View style={styles.costSummaryCard}>
                    {totalCost && (
                      <View style={styles.costSummaryItem}>
                        <Text style={styles.costSummaryLabel}>
                          Total spent
                        </Text>

                        <Text style={styles.costSummaryValue}>
                          {totalCost}
                        </Text>
                      </View>
                    )}

                    {averageCost && (
                      <View style={styles.costSummaryItem}>
                        <Text style={styles.costSummaryLabel}>
                          Average cost
                        </Text>

                        <Text style={styles.costSummaryValue}>
                          {averageCost}
                        </Text>
                      </View>
                    )}

                    <View style={styles.costSummaryItem}>
                      <Text style={styles.costSummaryLabel}>
                        Completed
                      </Text>

                      <Text style={styles.costSummaryValue}>
                        {history.length}
                      </Text>
                    </View>
                  </View>
                )}

                {history.map((entry: any) => (
                  <View
                    key={entry.id}
                    style={styles.historyCard}
                  >
                    <View style={styles.historyIcon}>
                      <Text>✓</Text>
                    </View>

                    <View style={styles.historyInfo}>
                      <Text style={styles.historyTask}>
                        {entry.taskName}
                      </Text>

                      <Text style={styles.historyDate}>
                        {formatDate(entry.completedAt)}
                      </Text>

                      {entry.cost ? (
                        <Text style={styles.historyCost}>
                          {entry.cost}
                        </Text>
                      ) : (
                        <Text style={styles.historyNoCost}>
                          Cost not recorded
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </>
            );
          })()}

        {/* Maintenance recommendations */}
        <View style={styles.futureCard}>
          <Text style={styles.futureIcon}>
            ✨
          </Text>

          <View
            style={styles.futureContent}
          >
            <Text
              style={styles.futureTitle}
            >
              Maintenance recommendations
            </Text>

            <Text
              style={styles.futureText}
            >
              Later, we'll automatically
              recommend maintenance based
              on what this item is.
            </Text>
          </View>
        </View>

        {/* Delete */}
        <Pressable
          style={styles.deleteButton}
          onPress={handleDelete}
        >
          <Text style={styles.deleteText}>
            Delete Item
          </Text>
        </Pressable>
      </ScrollView>

      {/* ================================================= */}
      {/* COMPLETE MAINTENANCE MODAL */}
      {/* ================================================= */}

      <Modal
        visible={completionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setCompletionModalVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text
              style={styles.modalTitle}
            >
              Complete Maintenance
            </Text>

            <Text
              style={styles.modalTaskName}
            >
              {selectedTask?.name}
            </Text>

            <Text
              style={styles.modalLabel}
            >
              Actual cost
            </Text>

            <View
              style={styles.costInputContainer}
            >
              <Text
                style={styles.currencySymbol}
              >
                $
              </Text>

              <TextInput
                style={styles.costInput}
                value={cost}
                onChangeText={setCost}
                placeholder="0.00"
                placeholderTextColor="#A0A3AA"
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>

            <Text
              style={styles.modalHint}
            >
              You can leave this blank if
              you don't want to record the
              cost.
            </Text>

            <View
              style={styles.modalButtons}
            >
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setCompletionModalVisible(
                    false
                  );
                  setSelectedTask(null);
                  setCost('');
                }}
              >
                <Text
                  style={
                    styles.cancelButtonText
                  }
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={
                  styles.saveButton
                }
                onPress={
                  saveCompletedMaintenance
                }
                disabled={
                  savingCompletion
                }
              >
                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  {savingCompletion
                    ? 'Saving...'
                    : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    color: '#70747C',
    fontSize: 15,
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

  settingsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF0F3',
    justifyContent: 'center',
    alignItems: 'center',
  },

  settingsIcon: {
    fontSize: 19,
  },

  itemHeader: {
    alignItems: 'center',
    marginBottom: 35,
  },

  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 26,
    backgroundColor: '#EDEFF2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  icon: {
    fontSize: 42,
  },

  itemImage: {
    width: 90,
    height: 90,
    borderRadius: 26,
    marginBottom: 16,
  },

  itemName: {
    fontSize: 27,
    fontWeight: '700',
    color: '#17181C',
    textAlign: 'center',
  },

  itemSubtitle: {
    fontSize: 15,
    color: '#737780',
    marginTop: 6,
  },

  category: {
    fontSize: 13,
    color: '#8A8E96',
    marginTop: 5,
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

  taskDate: {
    fontSize: 12,
    color: '#7A7E86',
    marginBottom: 2,
  },

  taskCost: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4E525A',
    marginTop: 2,
  },

  completeButton: {
    alignSelf: 'flex-start',
    marginTop: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#EEF1F5',
  },

  completeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#303238',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 25,
    alignItems: 'center',
    marginBottom: 30,
  },

  emptyIcon: {
    fontSize: 30,
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#303238',
    marginBottom: 5,
  },

  emptyText: {
    fontSize: 13,
    color: '#80838B',
    textAlign: 'center',
    lineHeight: 19,
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 17,
    marginBottom: 25,
  },

  infoLabel: {
    fontSize: 12,
    color: '#858991',
    marginBottom: 5,
  },

  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#25272C',
  },

  futureCard: {
    backgroundColor: '#EEF1F5',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
  },

  futureIcon: {
    fontSize: 23,
    marginRight: 12,
  },

  futureContent: {
    flex: 1,
  },

  futureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#303238',
    marginBottom: 5,
  },

  futureText: {
    fontSize: 13,
    color: '#6D7179',
    lineHeight: 19,
  },

  addMaintenanceButton: {
    height: 52,
    backgroundColor: '#22252B',
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },

  addMaintenanceIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    marginRight: 8,
  },

  addMaintenanceText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  deleteButton: {
    height: 52,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#D8DADD',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 10,
  },

  deleteText: {
    color: '#B83A32',
    fontSize: 15,
    fontWeight: '700',
  },

  // Modal

  modalOverlay: {
    flex: 1,
    backgroundColor:
      'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#17181C',
    marginBottom: 7,
  },

  modalTaskName: {
    fontSize: 14,
    color: '#737780',
    marginBottom: 22,
  },

  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#303238',
    marginBottom: 8,
  },

  costInputContainer: {
    height: 52,
    borderWidth: 1,
    borderColor: '#D8DADD',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#303238',
    marginRight: 6,
  },

  costInput: {
    flex: 1,
    fontSize: 17,
    color: '#17181C',
  },

  modalHint: {
    fontSize: 12,
    color: '#858991',
    marginTop: 8,
    lineHeight: 17,
  },

  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },

  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 13,
    backgroundColor: '#EEF0F3',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#303238',
  },

  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 13,
    backgroundColor: '#22252B',
    justifyContent: 'center',
    alignItems: 'center',
  },

  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  costSummaryCard: {
    backgroundColor: '#22252B',
    borderRadius: 17,
    padding: 18,
    marginBottom: 12,
  },

  costSummaryItem: {
    marginBottom: 12,
  },

  costSummaryLabel: {
    fontSize: 12,
    color: '#BFC2C8',
    marginBottom: 4,
  },

  costSummaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  historyIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#EEF1F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  historyInfo: {
    flex: 1,
  },

  historyTask: {
    fontSize: 15,
    fontWeight: '700',
    color: '#25272C',
    marginBottom: 3,
  },

  historyDate: {
    fontSize: 12,
    color: '#7A7E86',
  },

  historyCost: {
    fontSize: 13,
    fontWeight: '600',
    color: '#303238',
    marginTop: 4,
  },

  historyNoCost: {
    fontSize: 12,
    color: '#9A9DA4',
    marginTop: 4,
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 9,
  },

  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#22252B',
  },

  editText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  deleteMaintenanceButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#FDECEC',
  },

  deleteMaintenanceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B83A32',
  },
});