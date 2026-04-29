import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { getOrderCount,getTotalSpent } from '../services/db-service';
import { useIsFocused } from '@react-navigation/native';

export default function ProfileScreen({ route, navigation }: any) {
  const { userName, isAdmin } = route.params || {};
  const [orderTotal, setOrderTotal] = useState(0);
  const isFocused = useIsFocused();
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    if (isFocused && userName) {
      getOrderCount(userName, (count) => setOrderTotal(count));
      getTotalSpent(userName, (total) => setTotalSpent(total));
    }
  }, [isFocused]);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to exit?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: () => navigation.replace('Login') } // 返回登录页
    ]);
  };

  return (
    <View style={s.container}>
      {/* profile detail */}
      <View style={s.headerCard}>
        <View style={s.avatarPlaceholder}>
          <Text style={s.avatarText}>{userName?.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={s.nameText}>{userName}</Text>
        <Text style={s.roleTag}>{isAdmin ? "Administrator" : "Valued Customer"}</Text>
      </View>

      {/* order number record */}
      <View style={s.statsRow}>
        <View style={s.statItem}>
          <Text style={s.statNumber}>{orderTotal}</Text>
          <Text style={s.statLabel}>Orders</Text>
        </View>
        <View style={[s.statItem, { borderLeftWidth: 1, borderColor: '#eee' }]}>
          <Text style={s.statNumber}>RM {totalSpent.toFixed(2)}</Text>
          <Text style={s.statLabel}>Total Spent</Text>
        </View>
      </View>

      {/* menu */}
      <View style={s.menuContainer}>
        <TouchableOpacity style={s.menuItem} onPress={() => navigation.navigate('Settings')}>
          <Text style={s.menuText}>Settings</Text>
          <Text style={s.arrow}></Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[s.menuItem, s.logoutBtn]} onPress={handleLogout}>
          <Text style={[s.menuText, { color: '#e74c3c' }]}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  header: {fontSize: 24, padding: 10, fontWeight: 'bold'},
  headerCard: { alignItems: 'center', padding: 30, backgroundColor: '#fff', borderRadius: 20, elevation: 2 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3498db', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  avatarText: { fontSize: 32, color: '#fff', fontWeight: 'bold' },
  nameText: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50' },
  roleTag: { marginTop: 5, color: '#3498db', fontWeight: '600', backgroundColor: '#ebf5fb', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  statsRow: { flexDirection: 'row', backgroundColor: '#fff', marginTop: 20, borderRadius: 15, padding: 20, elevation: 2 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  statLabel: { color: '#95a5a6', fontSize: 12, marginTop: 5 },
  menuContainer: { marginTop: 30 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 18, borderRadius: 12, marginBottom: 10, elevation: 1 },
  menuText: { fontSize: 16, color: '#34495e' },
  arrow: { color: '#bdc3c7' },
  logoutBtn: { marginTop: 20, borderWidth: 1, borderColor: '#fadbd8' }
});