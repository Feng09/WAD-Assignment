  import React, { useState, useEffect } from 'react';
  import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    TextInput,
    ScrollView,
  } from 'react-native';

  import Icon from 'react-native-vector-icons/Ionicons';
  import { useIsFocused } from '@react-navigation/native';
  import { WebView } from 'react-native-webview';
  import openMap from 'react-native-open-maps';

  import {
    getOrderCount,
    getTotalSpent,
    updateUserAddress,
    getUserProfile,
  } from '../services/db-service';
  import {updateCloudUserAddress} from'../services/userCloudService';


  export default function ProfileScreen({ route, navigation }: any) {
    const { userName, isAdmin } = route.params || {};

    const [orderTotal, setOrderTotal] = useState(0);
    const [totalSpent, setTotalSpent] = useState(0);
    const [address, setAddress] = useState('');
    const [hasSavedAddress, setHasSavedAddress] = useState(false);
    const [mapQuery, setMapQuery] = useState('Kuala Lumpur');

    const isFocused = useIsFocused();

    useEffect(() => {
  if (isFocused && userName) {
    const finalUserName = userName.trim().toLowerCase();

    getOrderCount(finalUserName, count => {
      setOrderTotal(count);
    });

    getTotalSpent(finalUserName, total => {
      setTotalSpent(total);
    });

    getUserProfile(finalUserName, profile => {
      console.log('Profile loaded:', profile);

      if (profile) {
        const savedAddress = profile.address || '';

        setAddress(savedAddress);
        setHasSavedAddress(savedAddress.trim().length > 0);

        if (savedAddress.trim().length > 0) {
          setMapQuery(savedAddress);
        } else {
          setMapQuery('Kuala Lumpur');
        }
      } else {
        setAddress('');
        setHasSavedAddress(false);
        setMapQuery('Kuala Lumpur');
      }
    });
  }
}, [isFocused, userName]);

    const saveAddress = () => {
  if (!userName) {
    Alert.alert('Error', 'User not found. Please login again.');
    return;
  }

  const finalUserName = userName.trim().toLowerCase();
  const finalAddress = address.trim();

  if (!finalAddress) {
    Alert.alert('Error', 'Please enter your address');
    return;
  }

  updateUserAddress(finalUserName, finalAddress, async (res: any) => {
    if (!res.success) {
      Alert.alert(
        'Error',
        `Failed to save address locally. Reason: ${res.reason || 'Unknown error'}`
      );
      return;
    }

    setAddress(finalAddress);
    setHasSavedAddress(true);
    setMapQuery(finalAddress);

    try {
      const cloudRes = await updateCloudUserAddress(finalUserName, finalAddress);

      console.log('Cloud address update result:', cloudRes);

      if (cloudRes.success === false) {
        Alert.alert(
          'Saved Locally',
          cloudRes.message || 'Address saved locally, but failed to sync to cloud.'
        );
        return;
      }

      Alert.alert('Success', 'Address saved successfully');
    } catch (error: any) {
      console.log('Cloud address sync error:', error.message);

      Alert.alert(
        'Saved Locally',
        `Address saved locally, but failed to sync to cloud: ${error.message}`
      );
    }
  });
};

    const handleOpenNativeMap = () => {
      openMap({
        query: mapQuery || 'Kuala Lumpur',
        provider: 'google',
      });
    };

    return (
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <View style={s.headerCard}>
          <View style={s.avatarPlaceholder}>
            <Text style={s.avatarText}>
              {userName ? userName.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>

          <Text style={s.nameText}>{userName || 'User'}</Text>

          <View style={s.roleTag}>
            <Icon
              name={isAdmin ? 'shield-checkmark-outline' : 'person-outline'}
              size={14}
              color="#3498db"
            />
            <Text style={s.roleTagText}>
              {isAdmin ? 'Administrator' : 'Valued Customer'}
            </Text>
          </View>
        </View>

        <View style={s.statsRow}>
          <View style={s.statItem}>
            <View style={s.statIconBox}>
              <Icon name="receipt-outline" size={22} color="#3498db" />
            </View>
            <Text style={s.statNumber}>{orderTotal}</Text>
            <Text style={s.statLabel}>Orders</Text>
          </View>

          <View style={[s.statItem, s.leftBorder]}>
            <View style={s.statIconBox}>
              <Icon name="wallet-outline" size={22} color="#3498db" />
            </View>
            <Text style={s.statNumber}>RM {totalSpent.toFixed(2)}</Text>
            <Text style={s.statLabel}>Total Spent</Text>
          </View>
        </View>

        <View style={s.addressCard}>
          <View style={s.sectionHeader}>
            <View style={s.sectionIconBox}>
              <Icon name="location-outline" size={22} color="#fff" />
            </View>

            <View>
              <Text style={s.sectionTitle}>Delivery Address</Text>
              <Text style={s.sectionSubtitle}>
                Save your address before checkout
              </Text>
            </View>
          </View>

          <TextInput
            style={s.addressInput}
            placeholder="Enter your street, city, or full address..."
            placeholderTextColor="#95a5a6"
            value={address}
            onChangeText={text => {
              setAddress(text);

              if (text.trim().length > 3) {
                setMapQuery(text.trim());
              }

              if (text.trim().length === 0) {
                setMapQuery('Kuala Lumpur');
              }
            }}
            multiline
          />

          <View pointerEvents="none" style={s.mapContainer}>
            <WebView
              key={mapQuery}
              style={s.map}
              source={{
                uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  mapQuery
                )}`,
              }}
              scrollEnabled={false}
            />
          </View>

          <TouchableOpacity style={s.saveBtn} onPress={saveAddress}>
            <Icon name="save-outline" size={20} color="#fff" />
            <Text style={s.saveBtnText}>
              {hasSavedAddress ? 'Update Address' : 'Save Address'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.navigateLink} onPress={handleOpenNativeMap}>
            <Icon name="navigate-outline" size={18} color="#3498db" />
            <Text style={s.navigateLinkText}>Open in Google Maps App</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const s = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f5f7fa',
    },

    content: {
      padding: 20,
      paddingBottom: 40,
    },

    headerCard: {
      alignItems: 'center',
      padding: 28,
      backgroundColor: '#3498db',
      borderRadius: 22,
      elevation: 4,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },

    avatarPlaceholder: {
      width: 82,
      height: 82,
      borderRadius: 41,
      backgroundColor: '#fff',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 15,
    },

    avatarText: {
      fontSize: 34,
      color: '#3498db',
      fontWeight: 'bold',
    },

    nameText: {
      fontSize: 23,
      fontWeight: 'bold',
      color: '#fff',
    },

    roleTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
      backgroundColor: '#fff',
      paddingHorizontal: 13,
      paddingVertical: 6,
      borderRadius: 20,
    },

    roleTagText: {
      color: '#3498db',
      fontWeight: '700',
      fontSize: 13,
    },

    statsRow: {
      flexDirection: 'row',
      backgroundColor: '#fff',
      marginTop: 20,
      borderRadius: 18,
      paddingVertical: 22,
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 3 },
    },

    statItem: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 8,
    },

    leftBorder: {
      borderLeftWidth: 1,
      borderColor: '#edf0f2',
    },

    statIconBox: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: '#ebf5fb',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },

    statNumber: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#2c3e50',
      textAlign: 'center',
    },

    statLabel: {
      color: '#95a5a6',
      fontSize: 12,
      marginTop: 5,
      fontWeight: '600',
    },

    addressCard: {
      backgroundColor: '#fff',
      marginTop: 20,
      padding: 18,
      borderRadius: 18,
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 3 },
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
    },

    sectionIconBox: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#3498db',
      justifyContent: 'center',
      alignItems: 'center',
    },

    sectionTitle: {
      fontSize: 17,
      fontWeight: 'bold',
      color: '#2c3e50',
    },

    sectionSubtitle: {
      fontSize: 12,
      color: '#95a5a6',
      marginTop: 3,
    },

    addressInput: {
      minHeight: 95,
      borderWidth: 1,
      borderColor: '#dfe6e9',
      borderRadius: 14,
      padding: 13,
      textAlignVertical: 'top',
      backgroundColor: '#fafafa',
      color: '#2c3e50',
      fontSize: 14,
    },

    mapContainer: {
      marginTop: 15,
      height: 320,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#dfe6e9',
      backgroundColor: '#ecf0f1',
    },

    map: {
      flex: 1,
      height: 500,
      marginTop: -100,
    },

    saveBtn: {
      flexDirection: 'row',
      backgroundColor: '#3498db',
      marginTop: 14,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },

    saveBtnText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 15,
    },

    navigateLink: {
      marginTop: 14,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },

    navigateLinkText: {
      color: '#3498db',
      fontWeight: '700',
      fontSize: 14,
    },
  });