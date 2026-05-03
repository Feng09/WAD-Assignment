import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { getOrdersFromDB, updateOrderStatus, db } from '../services/db-service';
import { useIsFocused } from '@react-navigation/native';
import { getCloudOrders, updateCloudOrderStatus } from '../services/orderCloudService';
import { socket } from '../services/socketService';
export default function MyOrdersScreen({ route }: any) {
  const userName = route?.params?.userName;
  const [groupedOrders, setGroupedOrders] = useState<any[]>([]);
  const isFocused = useIsFocused(); // to make sure the refresh

  const groupOrderData = (data: any[]) => {
    const groups = data.reduce((acc: any, item: any) => {
      if (item.items && Array.isArray(item.items)) {
        const id = item.orderId || item.firebaseId || item.orderDate;

        if (!acc[id]) {
          acc[id] = {
            id,
            date: item.orderDate,
            status: item.status || "Pending",
            items: item.items,
            total: item.total || 0,
          };
        }
      } else {
        const id = item.orderId;

        if (!acc[id]) {
          acc[id] = {
            id,
            date: item.orderDate,
            status: item.status || "Pending",
            items: [],
            total: 0,
          };
        }

        acc[id].items.push(item);
        acc[id].total += item.price * item.quantity;
      }

      return acc;
    }, {});

    setGroupedOrders(Object.values(groups));
  };

  const loadOrders = async () => {
    if (!userName) return;

    try {
      const cloudOrders = await getCloudOrders();

      const myOrders = cloudOrders.filter(
      (order: any) => order.userName === userName
    );

    db.transaction((tx: any) => {
      tx.executeSql("DELETE FROM Orders WHERE userName = ?", [userName], () => {
        myOrders.forEach((order: any) => {
          const orderId = order.orderId;
          const date = order.orderDate || new Date().toISOString();

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
        });

        getOrdersFromDB(userName, (data) => {
          groupOrderData(data);
        });
      });
    });
  } catch (error) {
    console.log("API orders failed, using SQLite:", error);

    getOrdersFromDB(userName, (data) => {
      groupOrderData(data);
    });
  }
};

  const handleReceivedOrder = async (id: string) => {
    try {
      await updateCloudOrderStatus(id, "Received");

      updateOrderStatus(id, "Received", () => {
        Alert.alert("Success", "Order marked as received.");
        loadOrders();
      });
    } catch (error) {
      console.log("Receive order API error:", error);

      updateOrderStatus(id, "Received", () => {
        Alert.alert(
          "Updated Locally",
          "Order marked as received locally, but API update failed."
        );
        loadOrders();
      });
    }
  };

  useEffect(() => {
  if (isFocused && userName) {
    loadOrders();
  }

  socket.on("orderStatusUpdated", (order: any) => {
    if (order.userName === userName) {
      loadOrders();
    }
  });

  socket.on("orderCreated", (order: any) => {
    if (order.userName === userName) {
      loadOrders();
    }
  });

  return () => {
    socket.off("orderStatusUpdated");
    socket.off("orderCreated");
  };
}, [isFocused, userName]);

  return (
    <View style={s.container}>
      <FlatList
        data={groupedOrders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }: any) => (
          <View style={{ backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15 }}>
            <Text style={{ fontWeight: 'bold', borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 5 }}>
              Order ID: {item.id}
            </Text>
            <Text
              style={{
                marginTop: 6,
                color:
                  item.status === "Received"
                    ? "#27ae60"
                    : item.status === "Shipped"
                      ? "#2980b9"
                      : "#f39c12",
                fontWeight: "bold",
              }}
            >
              Status: {item.status || "Pending"}
            </Text>
            {item.items.map((prod: any, index: number) => (
              <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ flex: 2 }}>• {prod.title}</Text>
                <Text style={{ flex: 1, textAlign: 'center' }}>x{prod.quantity}</Text>
                <Text style={{ flex: 1, textAlign: 'right' }}>RM {Number(prod.price).toFixed(2)}</Text>
              </View>
            ))}

            <Text style={{ textAlign: 'right', marginTop: 10, fontWeight: 'bold', color: '#e74c3c' }}>
              Total: RM {item.total.toFixed(2)}
            </Text>
            {item.status === "Shipped" && (
  <TouchableOpacity
    style={s.receiveBtn}
    onPress={() => handleReceivedOrder(item.id)}
  >
    <Text style={s.receiveBtnText}>Order Received</Text>
  </TouchableOpacity>
)}
          </View>
        )}
        ListEmptyComponent={<Text style={s.empty}>No orders found.</Text>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 10 },
  orderItem: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: 'bold' },
  date: { fontSize: 12, color: '#95a5a6' },
  details: { marginTop: 5, color: '#7f8c8d' },
  empty: { textAlign: 'center', marginTop: 50, color: '#7f8c8d' },
  receiveBtn: {
  backgroundColor: '#27ae60',
  paddingVertical: 10,
  paddingHorizontal: 12,
  borderRadius: 8,
  marginTop: 12,
  alignSelf: 'flex-end',
},

receiveBtnText: {
  color: '#fff',
  fontWeight: 'bold',
},
});