import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';

export default function SettingScreen() {
  return (
    <View style={st.base}>
      <View style={st.row}>
        <Text>Enable Notifications</Text>
        <Switch value={true} />
      </View>
      <View style={st.row}>
        <Text>Night Mode</Text>
        <Switch value={false} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  base: { flex: 1, backgroundColor: '#fff', padding: 25 },
  head: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 20, borderBottomWidth: 1, borderColor: '#f0f0f0' }
});