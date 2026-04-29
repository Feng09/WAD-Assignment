import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { getOrdersFromDB } from '../services/db-service';
import { useIsFocused } from '@react-navigation/native';
import {getUserOrdersFromFirebase} from '../services/firebase-services';
export default function MyOrdersScreen({ route }: any) {
  const userName = route?.params?.userName;
  const [groupedOrders, setGroupedOrders] = useState<any[]>([]);
  const isFocused = useIsFocused(); // to make sure the refresh

  const groupOrderData = (data: any[]) => {
  const groups = data.reduce((acc: any, item: any) => {
    // firebase format
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
      // local sqlite order format
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

  useEffect(() => {
    const loadOrders = async() =>{
      if(!userName) return;
      try{
        //get from firebase first
        const firebaseOrders = await getUserOrdersFromFirebase(userName);
        if(firebaseOrders.length>0){
          groupOrderData(firebaseOrders);
          return;
        }
        //back to sqlite
        getOrdersFromDB(userName,(data)=>{
          groupOrderData(data);
        });
      }catch(error){
        console.log("firebase orders failed, using sqlite",error);
        getOrdersFromDB(userName,(data)=>{
          groupOrderData(data);
        });
      }
    };
    if (isFocused && userName) {
      loadOrders();
    }
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
                color: item.status === "Completed" ? "#27ae60" : "#f39c12",
                fontWeight: "bold"
              }}
            >
              Status: {item.status === "Completed" ? "Shipped" : item.status || "Pending"}
            </Text>
            {/* show all the item in the order */}
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
          </View>
        )}
        ListEmptyComponent={<Text style={s.empty}>No orders found.</Text>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 10 },
  header: {fontSize: 24, padding: 10, fontWeight: 'bold'},
  orderItem: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: 'bold' },
  date: { fontSize: 12, color: '#95a5a6' },
  details: { marginTop: 5, color: '#7f8c8d' },
  empty: { textAlign: 'center', marginTop: 50, color: '#7f8c8d' }
});