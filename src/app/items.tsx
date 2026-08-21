import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getItems } from '@/utils/storage';

export default function ItemsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);

  const loadItems = async () => {
    const savedItems = await getItems();
    setItems(savedItems);
  };

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backButton}>‹</Text>
          </Pressable>

          <Text style={styles.title}>My Items</Text>

          <View style={styles.headerSpacer} />
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

        {/* Items */}
        {items.length > 0 ? (
          <View style={styles.itemsGrid}>
            {items.map((item) => (
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
                    style={styles.itemImage}
                  />
                ) : (
                  <View style={styles.iconContainer}>
                    <Text style={styles.icon}>
                      🔧
                    </Text>
                  </View>
                )}

                <Text
                  style={styles.itemName}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>

                {item.category ? (
                  <Text
                    style={styles.category}
                    numberOfLines={1}
                  >
                    {item.category}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              📦
            </Text>

            <Text style={styles.emptyTitle}>
              No items yet
            </Text>

            <Text style={styles.emptyText}>
              Add your first item to start tracking
              maintenance.
            </Text>
          </View>
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
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  header: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
    marginBottom: 15,
  },

  backButton: {
    fontSize: 38,
    lineHeight: 40,
    color: '#22252B',
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#17181C',
  },

  headerSpacer: {
    width: 30,
  },

  addButton: {
    height: 54,
    backgroundColor: '#22252B',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
  },

  itemCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 15,
  },

  itemImage: {
    width: '100%',
    height: 130,
    borderRadius: 14,
    marginBottom: 10,
  },

  iconContainer: {
    width: '100%',
    height: 130,
    borderRadius: 14,
    backgroundColor: '#EEF1F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  icon: {
    fontSize: 35,
  },

  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#25272C',
  },

  category: {
    fontSize: 12,
    color: '#858991',
    marginTop: 4,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    marginTop: 10,
  },

  emptyIcon: {
    fontSize: 32,
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 16,
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
});