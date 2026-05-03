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

import PasswordScreen from '../screens/PasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import CartScreen from '../screens/CartScreen';
import DetailScreen from '../screens/DetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingScreen from '../screens/SettingsScreen';
import AdminAddScreen from '../screens/AdminAddScreen';
import AdminEditScreen from '../screens/AdminEditScreen';
import MyOrdersScreen from '../screens/MyOrdersScreen';
import AdminOrdersScreen from '../screens/AdminOrdersScreen';
import WebViewScreen from '../screens/WebViewScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const ProductStack = ({ route }: any) => {
  const { isAdmin, isGuest, userName } = route.params || {};

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#3498db',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="Inventory"
        component={HomeScreen}
        initialParams={{ isAdmin, isGuest, userName }}
      />

      <Stack.Screen
        name="Details"
        component={DetailScreen}
        initialParams={{  isAdmin, isGuest, userName  }}
      />

      <Stack.Screen
        name="AdminAdd"
        component={AdminAddScreen}
        options={{ title: 'Add Product' }}
      />

      <Stack.Screen
        name="AdminEdit"
        component={AdminEditScreen}
        options={{ title: 'Edit Product' }}
      />
    </Stack.Navigator>
  );
};

// shop cart
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

        tabBarStyle: {
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },

        tabBarBadgeStyle: {
          backgroundColor: '#e74c3c',
          color: '#fff',
          fontSize: 11,
          fontWeight: 'bold',
        },
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
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ paddingTop: 0 }}
      >
        <View style={ui.drawerHeader}>
          <View style={ui.avatarCircle}>
            <Icon
              name={params.isAdmin ? 'shield-checkmark-outline' : 'person-outline'}
              size={28}
              color="#3498db"
            />
          </View>

          <Text style={ui.greetingText}>
            Hello, {params.userName || 'Guest'}!!
          </Text>

          <Text style={ui.roleText}>
            {params.isAdmin ? 'Administrator' : params.isGuest ? 'Guest User' : 'Customer'}
          </Text>
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
          <Icon name="log-out-outline" size={22} color="#e74c3c" />
          <Text style={ui.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const AppNavigator = ({ route }: any) => {
  const { isAdmin, isGuest, userName } = route.params || {};

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        drawerActiveTintColor: '#3498db',
        drawerActiveBackgroundColor: '#ebf5fb',
        drawerInactiveTintColor: '#576574',

        drawerLabelStyle: {
          fontSize: 15,
          fontWeight: '500',
          marginLeft: 5,
        },

        drawerItemStyle: {
          borderRadius: 10,
          marginVertical: 4,
          marginHorizontal: 8,
          paddingVertical: 5,
        },

        headerTitle: 'NexusMarket',
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
        name="Dashboard"
        component={MainTabs}
        initialParams={{ isAdmin, isGuest, userName }}
        options={{
          drawerLabel: 'Monarch Store',
          drawerIcon: ({ color, size }) => (
            <Icon name="storefront-outline" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="My Orders"
        component={MyOrdersScreen}
        initialParams={{ userName: userName }}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="receipt-outline" color={color} size={size} />
          ),
          drawerItemStyle: {
            display: (!isAdmin && !isGuest) ? 'flex' : 'none',
            borderRadius: 10,
            marginVertical: 4,
            marginHorizontal: 8,
            paddingVertical: 5,
          },
        }}
      />

      <Drawer.Screen
        name="Manage Orders"
        component={AdminOrdersScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="cube-outline" color={color} size={size} />
          ),
          drawerItemStyle: {
            display: isAdmin && !isGuest ? 'flex' : 'none',
            borderRadius: 10,
            marginVertical: 4,
            marginHorizontal: 8,
            paddingVertical: 5,
          },
        }}
      />

      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        initialParams={{ userName, isAdmin }}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="person-circle-outline" color={color} size={size} />
          ),
          drawerItemStyle: {
            display: isGuest ? 'none' : 'flex',
            borderRadius: 10,
            marginVertical: 4,
            marginHorizontal: 8,
            paddingVertical: 5,
          },
        }}
      />

      <Drawer.Screen
        name="WebScreenView"
        component={WebViewScreen}
        options={{
          title: 'Cloud View',
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="Settings"
        component={SettingScreen}
        initialParams={{
          userName: route.params?.userName,
          isGuest: route.params?.isGuest,
          isAdmin: route.params?.isAdmin,
        }}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="settings-outline" color={color} size={size} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

const ui = StyleSheet.create({
  drawerHeader: {
    padding: 20,
    paddingTop: 28,
    backgroundColor: '#3498db',
    marginBottom: 10,
  },

  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  greetingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },

  roleText: {
    color: '#ecf0f1',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },

  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f4f4f4',
    marginBottom: 20,
  },

  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e74c3c',
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 10,
    gap: 8,
  },

  logoutText: {
    color: '#e74c3c',
    fontWeight: 'bold',
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default AppNavigator;