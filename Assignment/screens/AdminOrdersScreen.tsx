import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { completeOrder, getAllOrdersFromDB } from '../services/db-service';
import { getAllOrdersFromFirebase, completeOrderInFirebase } from '../services/firebase-services';

export default function AdminOrdersScreen() {
  const [groupedOrders, setGroupedOrders] = useState<any[]>([]);
  const isFocused = useIsFocused();
  const groupOrderData = (data: any[]) => {
    let groups: any = {};

    for (let i = 0; i < data.length; i++) {
      let item = data[i];

      // Firebase order may store items as array
      if (item.items && Array.isArray(item.items)) {
        const id = item.firebaseId || item.orderId || item.orderDate;
        if (!groups[id]) {
          groups[id] = {
            id,
            date: item.orderDate,
            user: item.userName,
            status: item.status || "Pending",
            items: item.items,
            total: item.total || 0,
          };
        }
      } else {
        // SQLite order row
        const id = item.orderId || item.orderDate;

        if (!groups[id]) {
          groups[id] = {
            id,
            date: item.orderDate,
            user: item.userName,
            status: item.status || "Pending",
            items: [],
            total: 0,
          };
        }

        groups[id].items.push(item);
        groups[id].total += item.price * item.quantity;
      }
    }

    setGroupedOrders(Object.values(groups));
  };
  const loadOrders = async () => {
    try {
      //try firebase first
      const firebaseOrders = await getAllOrdersFromFirebase();
      if (firebaseOrders.length > 0) {
        groupOrderData(firebaseOrders);
        return;
      }
      //back to sqlite
      getAllOrdersFromDB((data) => {
        groupOrderData(data);
      });
    } catch (error) {
      console.log("Firebase orders failed, using SQLite:", error);

      getAllOrdersFromDB((data) => {
        groupOrderData(data);
      });
    }
  };

  const handleComplete = async (id: string) => {
    try {
      //update firebase status
      await completeOrderInFirebase(id);
      // update local sqlite
      completeOrder(id, () => {
      });
      Alert.alert("Success", "Order status updated");
      loadOrders();

    } catch (error) {
      console.log("Complete order error:", error);
      Alert.alert("Error", "Failed to update Firebase order");
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadOrders();
    }
  }, [isFocused]);

  return (
    <View style={s.container}>
      <Text style={s.header}>All Customer Orders</Text>
      <FlatList
        data={groupedOrders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }: any) => (
          <View style={s.card}>
            <View style={s.row}>
              <Text style={s.userText}>Customer: {item.user}</Text>
              <Text style={s.dateText}>{item.date}</Text>
            </View>
            <Text style={s.orderId}>ID: {item.id}</Text>

            <View style={s.divider} />

            {item.items.map((prod: any, index: number) => (
              <View key={index} style={s.itemRow}>
                <Text style={{ flex: 2 }}>{prod.title}</Text>
                <Text style={{ flex: 1, textAlign: 'center' }}>x{prod.quantity}</Text>
                <Text style={{ flex: 1, textAlign: 'right' }}>RM {Number(prod.price).toFixed(2)}</Text>
              </View>
            ))}

            <View style={s.divider} />
            <Text style={s.total}>Total Revenue: RM {item.total.toFixed(2)}</Text>
            <View style={s.statusRow}>
              <Text style={s.statusText}>
                Status: {item.status || "Pending"}
              </Text>

              {item.status !== "Completed" && (
                <TouchableOpacity
                  style={s.completeBtn}
                  onPress={() => handleComplete(item.id)}
                >
                  <Text style={s.completeBtnText}>Completed</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eceff1', padding: 10 },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#37474f', textAlign: 'center' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  userText: { fontWeight: 'bold', color: '#1976d2', fontSize: 16 },
  dateText: { color: '#78909c', fontSize: 12 },
  orderId: { fontSize: 10, color: '#b0bec5' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 8 },
  itemRow: { flexDirection: 'row', marginBottom: 4 },
  total: { textAlign: 'right', fontWeight: 'bold', fontSize: 16, color: '#2e7d32', marginTop: 5 },
  completeBtn: {
    backgroundColor: '#27ae60',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },

  completeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },

  statusText: {
    fontWeight: 'bold',
    color: '#f39c12',
  },
});