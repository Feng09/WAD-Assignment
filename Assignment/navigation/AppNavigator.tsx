import React, { useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getCartItems } from '../services/db-service';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList
} from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from '../screens/HomeScreen';
import CartScreen from '../screens/CartScreen';
import DetailScreen from '../screens/DetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingScreen from '../screens/SettingsScreen';
import AdminAddScreen from '../screens/AdminAddScreen';
import AdminEditScreen from '../screens/AdminEditScreen';
import MyOrdersScreen from '../screens/MyOrdersScreen';
import AdminOrdersScreen from '../screens/AdminOrdersScreen'

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();


const ProductStack = ({ route }: any) => {
  const { isAdmin, isGuest, userName } = route.params || {};
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Inventory"
        component={HomeScreen}
        initialParams={{ isAdmin, isGuest, userName }}
      />
      <Stack.Screen name="Details" component={DetailScreen} initialParams={{ userName }} />
      <Stack.Screen name="AdminAdd" component={AdminAddScreen} />
      <Stack.Screen name="AdminEdit" component={AdminEditScreen} options={{ title: 'Edit Product' }} />
    </Stack.Navigator>
  );
};

//shop cart
function MainTabs({ route }: any) {
  console.log("MainTabs level - params:", route.params);

  const { isAdmin, isGuest, userName } = route.params || {};
  const [cartCount, setCartCount] = React.useState(0);
  const refresh = route.params?.refresh;

  const loadCartCount = () => {
    if (!userName || isAdmin) {
      setCartCount(0);
      return;
    }

    getCartItems(userName, (data: any[]) => {
      const total = data.reduce(
        (sum, item) => sum + Number(item.quantity || 1),
        0
      );
      setCartCount(total);
    });
  };

  useEffect(() => {
    loadCartCount();
  }, [userName, isAdmin, refresh]);

  useFocusEffect(
    useCallback(() => {
      loadCartCount();
    }, [userName, isAdmin])
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'Shop') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Cart') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else {
            iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },

        tabBarActiveTintColor: '#3498db',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen
        name="Shop"
        component={ProductStack}
        initialParams={{ isAdmin, isGuest, userName }}
      />

      <Tab.Screen
        name="Cart"
        component={CartScreen}
        initialParams={{ isAdmin, userName }}
        options={{
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
        }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('Cart', {
              isAdmin,
              refresh: Date.now(),
              userName,
            });
          },
        })}
      />
    </Tab.Navigator>
  );
}

function CustomDrawer(props: any) {
  const state = props.navigation.getState();
  const params: any = state.routes[0].params || {};
  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView {...props}>
        <View style={{ padding: 20, backgroundColor: '#00ff5e', marginBottom: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            Hello, {params.userName || 'Guest'}
          </Text>
          {params.isAdmin && <Text style={{ color: '#e67e22', fontSize: 12 }}>Administrator</Text>}
        </View>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      <View style={ui.footer}>
        <TouchableOpacity
          style={ui.logoutBtn}
          onPress={() => {
            props.navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }}
        >
          <Text style={ui.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// 4. Main App Navigator
const AppNavigator = ({ route }: any) => {
  const { isAdmin, isGuest, userName } = route.params || {};

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        drawerActiveTintColor: '#3498db',
        headerStyle: {
          backgroundColor: '#3498db',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Drawer.Screen
        name="Monarch Store"
        component={MainTabs}
        initialParams={{ isAdmin, isGuest, userName }}
      />
      <Drawer.Screen
        name="My Orders"
        component={MyOrdersScreen}
        initialParams={{ userName: userName }}
        options={{ // is it is guest, no show this My Orders
          drawerItemStyle: { display: (!isAdmin && !isGuest) ? 'flex' : 'none' }
        }}
      />
      <Drawer.Screen
        name="Manage Orders"
        component={AdminOrdersScreen}
        options={{
          //  only admin can see this 
          drawerItemStyle: { display: isAdmin && !isGuest ? 'flex' : 'none' }
        }}
      />
      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        initialParams={{ userName, isAdmin }}
        options={{
          // guest cannot see
          drawerItemStyle: { display: isGuest ? 'none' : 'flex' }
        }}
      />
      <Drawer.Screen name="Settings" component={SettingScreen} />
    </Drawer.Navigator>
  );
};

const ui = StyleSheet.create({
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f4f4f4',
    marginBottom: 20
  },
  logoutBtn: {
    paddingVertical: 10
  },
  logoutText: {
    color: '#e74c3c', // Red color
    fontWeight: 'bold',
    fontSize: 16
  }
});

export default AppNavigator;