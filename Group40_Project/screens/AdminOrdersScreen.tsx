import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { updateOrderStatus, getAllOrdersFromDB, db } from '../services/db-service';
import { getCloudOrders, updateCloudOrderStatus } from '../services/orderCloudService';
import { socket } from '../services/socketService';

export default function AdminOrdersScreen() {
  const [groupedOrders, setGroupedOrders] = useState<any[]>([]);
  const isFocused = useIsFocused();
  const groupOrderData = (data: any[]) => {
    let groups: any = {};

    for (let i = 0; i < data.length; i++) {
      let item = data[i];

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
      
      const cloudOrders = await getCloudOrders();
      console.log("Cloud orders:", cloudOrders);

    db.transaction((tx: any) => {
      tx.executeSql("DELETE FROM Orders", [], () => {
        cloudOrders.forEach((order: any) => {
          const orderId = order.orderId;
          const userName = order.userName || "Unknown";
          const date = order.orderDate || new Date().toISOString();

          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              tx.executeSql(
                "INSERT INTO Orders (orderId, userName, title, price, quantity, orderDate, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [
                  orderId,
                  userName,
                  item.title || item.name,
                  item.price || 0,
                  item.quantity || 1,
                  date,
                  order.status || "Pending",
                ]
              );
            });
          }
        });

        getAllOrdersFromDB((data) => {
          groupOrderData(data);
        });
      });
    });
  } catch (error) {
    console.log("API orders failed, using SQLite:", error);
    getAllOrdersFromDB((data) => {
      groupOrderData(data);
    });
  }
};

const handleShipOrder = async (id: string) => {
  try {
    await updateCloudOrderStatus(id, "Shipped");
    updateOrderStatus(id, "Shipped", () => {
      Alert.alert("Success", "Order has been marked as shipped.");
      loadOrders();
    });
  } catch (error) {
    console.log("Ship order error:", error);
    updateOrderStatus(id, "Shipped", () => {
      Alert.alert(
        "Updated Locally",
        "Order marked as shipped locally, but API update failed."
      );
      loadOrders();
    });
  }
};

useEffect(() => {
  if (isFocused) {
    loadOrders();
  }

  socket.on("orderCreated", () => {
    console.log("Socket orderCreated received");
    loadOrders();
  });

  socket.on("orderStatusUpdated", () => {
    console.log("Socket orderStatusUpdated received");
    loadOrders();
  });

  return () => {
    socket.off("orderCreated");
    socket.off("orderStatusUpdated");
  };
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
                <Text style={{ flex: 2 }}>{prod.title|| prod.name}</Text>
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

              {(item.status ||"Pending")==="Pending" && (
                <TouchableOpacity
                  style={s.completeBtn}
                  onPress={() => handleShipOrder(item.id)}
                >
                  <Text style={s.completeBtnText}>Mark as Shipped</Text>
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