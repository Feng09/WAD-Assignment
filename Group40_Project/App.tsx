import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './screens/LoginScreen';
import AppNavigator from './navigation/AppNavigator'; // This is Drawer/Tabs
import PasswordScreen from './screens/PasswordScreen';
import { initDB } from './services/db-service';
import{useEffect} from 'react'
import{View,Text} from 'react-native'
const Stack = createStackNavigator();

export default function App() {
  useEffect(() => { 
  initDB(); /// load the database when launch the app
  }, []);
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} /> 
        <Stack.Screen name="MainApp" component={AppNavigator} />
        <Stack.Screen 
        name="ForgotPassword" 
        component={PasswordScreen} 
        options={{ 
            headerShown: true, 
            title: 'Reset Password',
            headerStyle: {
              backgroundColor: '#3498db', 
            },
            headerTintColor: '#fff', 
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }} 
        />
        <Stack.Screen 
          name="UpdatePass" 
          component={PasswordScreen} 
          options={{ 
            headerShown: true, 
            title: 'Reset Password',
            headerStyle: {
              backgroundColor: '#3498db',
            },
            headerTintColor: '#fff', 
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}