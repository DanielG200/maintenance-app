import AsyncStorage from '@react-native-async-storage/async-storage';

const ITEMS_KEY = '@maintenance_items';

const API_URL = 'http://localhost:5000';

export async function getItems() {
  try {
    const response = await fetch(`${API_URL}/api/items`);

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || 'Failed to load items'
      );
    }

    return data.items || [];
  } catch (error) {
    console.error('Error loading items:', error);
    return [];
  }
}

export async function saveItems(items: any[]) {
  try {
    await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Error saving items:', error);
  }
}

export async function addItem(item: any) {
  const items = await getItems();

  const updatedItems = [...items, item];

  await saveItems(updatedItems);

  return updatedItems;
}

export async function deleteItem(id: string) {
  const items = await getItems();

  const updatedItems = items.filter(
    (item: any) => item.id !== id
  );

  await saveItems(updatedItems);

  return updatedItems;
}

export async function addMaintenance(
  itemId: string,
  maintenance: any
) {
  const items = await getItems();

  const updatedItems = items.map((item: any) => {
    if (item.id !== itemId) {
      return item;
    }

    return {
      ...item,
      maintenance: [
        ...(item.maintenance || []),
        maintenance,
      ],
    };
  });

  await saveItems(updatedItems);

  return updatedItems;
}

export async function updateItem(updatedItem: any) {
  const items = await getItems();

  const updatedItems = items.map((item: any) =>
    item.id === updatedItem.id ? updatedItem : item
  );

  await saveItems(updatedItems);

  return updatedItems;
}

export async function updateMaintenance(
  itemId: string,
  maintenanceId: string,
  updatedMaintenance: any
) {
  const items = await getItems();

  const updatedItems = items.map((item: any) => {
    if (item.id !== itemId) {
      return item;
    }

    return {
      ...item,
      maintenance: (item.maintenance || []).map(
        (maintenance: any) =>
          maintenance.id === maintenanceId
            ? updatedMaintenance
            : maintenance
      ),
    };
  });

  await saveItems(updatedItems);

  return updatedItems;
}

export async function addMaintenanceHistory(
  itemId: string,
  maintenanceId: string,
  historyEntry: any
) {
  const items = await getItems();

  const updatedItems = items.map((item: any) => {
    if (item.id !== itemId) {
      return item;
    }

    const maintenance = (item.maintenance || []).map(
      (task: any) => {
        if (task.id !== maintenanceId) {
          return task;
        }

        return {
          ...task,
          history: [
            ...(task.history || []),
            historyEntry,
          ],
        };
      }
    );

    return {
      ...item,
      maintenance,
    };
  });

  await saveItems(updatedItems);

  return updatedItems;
}