import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';

import { deleteUserAccountLocal } from '../services/db-service';
import { deleteCloudUserAccount } from '../services/userCloudService';

export default function SettingScreen({ navigation, route }: any) {
  const { isGuest, userName, isAdmin } = route.params || {};

  const [notification, setNotification] = useState(true);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [locationAccess, setLocationAccess] = useState(true);
  const [cameraAccess, setCameraAccess] = useState(false);
  const [albumAccess, setAlbumAccess] = useState(true);
  const [contactListAccess, setContactListAccess] = useState(true);

 const handleDeletePress = () => {
  if (!userName) {
    Alert.alert('Error', 'User not found. Please login again.');
    return;
  }

  const finalUserName = userName.trim().toLowerCase();

  Alert.alert(
    'Delete Account Data',
    'This will delete your login account from this device and cloud user list. Your previous order records will still be kept. Are you sure you want to proceed?',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'DELETE',
        style: 'destructive',
        onPress: async () => {
          try {
            // 1. Delete from cloud/API first
            const cloudRes = await deleteCloudUserAccount(finalUserName);

            console.log('Cloud delete user result:', cloudRes);

            if (cloudRes.success === false) {
              Alert.alert(
                'Cloud Delete Failed',
                cloudRes.message || 'Failed to delete user from cloud.'
              );
              return;
            }

            // 2. Delete from local SQLite after cloud success
            deleteUserAccountLocal(finalUserName, (localRes: any) => {
              if (localRes.success) {
                Alert.alert(
                  'Success',
                  'Your account has been deleted from local SQLite and cloud. Your order history is still kept in the system.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        navigation.reset({
                          index: 0,
                          routes: [{ name: 'Login' }],
                        });
                      },
                    },
                  ]
                );
              } else {
                Alert.alert(
                  'Partial Success',
                  `Cloud account deleted, but local account deletion failed. Reason: ${
                    localRes.reason || 'Unknown error'
                  }`
                );
              }
            });
          } catch (error: any) {
            console.log('Delete cloud user error:', error.message);

            Alert.alert(
              'Error',
              `Failed to delete cloud account: ${error.message}`
            );
          }
        },
      },
    ],
    { cancelable: true }
  );
};

  return (
    <ScrollView style={st.base} contentContainerStyle={st.content}>
      <View style={st.headerCard}>
        <View style={st.headerIcon}>
          <Icon
            name={isAdmin ? 'shield-checkmark-outline' : 'settings-outline'}
            size={30}
            color="#3498db"
          />
        </View>

        <View>
          <Text style={st.head}>Settings</Text>
          <Text style={st.subHead}>
            {isAdmin ? 'Administrator Control Panel' : 'Manage your account preferences'}
          </Text>
        </View>
      </View>

      <View style={st.card}>
        <View style={st.row}>
          <View style={st.leftItem}>
            <Icon name="notifications-outline" size={22} color="#3498db" />
            <View>
              <Text style={st.labelText}>Enable Notifications</Text>
              <Text style={st.descText}>Receive app updates and alerts</Text>
            </View>
          </View>

          <Switch
            value={notification}
            onValueChange={() => setNotification(prev => !prev)}
          />
        </View>

        <TouchableOpacity onPress={() => setShowPrivacy(!showPrivacy)}>
          <View style={st.row}>
            <View style={st.leftItem}>
              <Icon name="lock-closed-outline" size={22} color="#3498db" />
              <View>
                <Text style={st.labelText}>Privacy Setting</Text>
                <Text style={st.descText}>Manage app access permissions</Text>
              </View>
            </View>

            <Icon
              name={showPrivacy ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={22}
              color="#7f8c8d"
            />
          </View>
        </TouchableOpacity>

        {showPrivacy && ( 
          <View style={st.dropdown}>
            <View style={st.privacyRow}>
              <Text style={st.privacyText}>Allow access location</Text>
              <Switch
                value={locationAccess}
                onValueChange={() => setLocationAccess(prev => !prev)}
              />
            </View>

            <View style={st.privacyRow}>
              <Text style={st.privacyText}>Allow access camera</Text>
              <Switch
                value={cameraAccess}
                onValueChange={() => setCameraAccess(prev => !prev)}
              />
            </View>

            <View style={st.privacyRow}>
              <Text style={st.privacyText}>Allow access contact list</Text>
              <Switch
                value={contactListAccess}
                onValueChange={() => setContactListAccess(prev => !prev)}
              />
            </View>

            <View style={st.privacyRow}>
              <Text style={st.privacyText}>Allow access photo album</Text>
              <Switch
                value={albumAccess}
                onValueChange={() => setAlbumAccess(prev => !prev)}
              />
            </View>
          </View>
        )}
      </View>

      {!isGuest && (
        <View style={st.card}>
          <TouchableOpacity
            onPress={() => {
              navigation.navigate('UpdatePass', {
                userName: userName,
                isLogin: true,
              });
            }}
          >
            <View style={st.row}>
              <View style={st.leftItem}>
                <Icon name="key-outline" size={22} color="#3498db" />
                <View>
                  <Text style={st.labelText}>Change Password</Text>
                  <Text style={st.descText}>Update your login password</Text>
                </View>
              </View>

              <Icon name="chevron-forward-outline" size={22} color="#7f8c8d" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDeletePress}>
            <View style={st.rowNoBorder}>
              <View style={st.leftItem}>
                <Icon name="trash-outline" size={22} color="#e74c3c" />
                <View>
                  <Text style={st.dangerText}>Delete Account Data</Text>
                  <Text style={st.descText}>Delete login account only</Text>
                </View>
              </View>

              <Icon name="chevron-forward-outline" size={22} color="#e74c3c" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {isAdmin && (
        <View style={st.adminCard}>
          <View style={st.adminHeader}>
            <Icon name="cloud-outline" size={24} color="#fff" />
            <Text style={st.adminTitle}>Admin Cloud View</Text>
          </View>

          <Text style={st.adminDesc}>
            View cloud data from backend web pages.
          </Text>

          <TouchableOpacity
            style={st.adminBtn}
            onPress={() =>
              navigation.navigate('WebScreenView', {
                url: 'http://10.0.2.2:3000/products/view',
              })
            }
          >
            <Icon name="cube-outline" size={20} color="#fff" />
            <Text style={st.adminBtnText}>View Products</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={st.adminBtn}
            onPress={() =>
              navigation.navigate('WebScreenView', {
                url: 'http://10.0.2.2:3000/orders/view',
              })
            }
          >
            <Icon name="receipt-outline" size={20} color="#fff" />
            <Text style={st.adminBtnText}>View Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={st.adminBtn}
            onPress={() =>
              navigation.navigate('WebScreenView', {
                url: 'http://10.0.2.2:3000/users/view',
              })
            }
          >
            <Icon name="people-outline" size={20} color="#fff" />
            <Text style={st.adminBtnText}>View Users</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  base: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    padding: 20,
    borderRadius: 18,
    marginBottom: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  headerIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },

  head: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },

  subHead: {
    fontSize: 13,
    color: '#ecf0f1',
    marginTop: 3,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  rowNoBorder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
  },

  leftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  labelText: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '700',
  },

  descText: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 3,
  },

  dropdown: {
    paddingVertical: 5,
    paddingLeft: 34,
  },

  privacyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
  },

  privacyText: {
    fontSize: 14,
    color: '#34495e',
    fontWeight: '500',
  },

  dangerText: {
    color: '#e74c3c',
    fontWeight: 'bold',
    fontSize: 15,
  },

  adminCard: {
    backgroundColor: '#2c3e50',
    borderRadius: 18,
    padding: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },

  adminTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },

  adminDesc: {
    color: '#bdc3c7',
    fontSize: 13,
    marginBottom: 14,
  },

  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 10,
    gap: 8,
  },

  adminBtnText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 14,
  },
});