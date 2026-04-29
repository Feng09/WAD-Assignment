import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, Image, ActivityIndicator, Keyboard
} from 'react-native';

import { loginUser, registerUser } from '../services/db-service';
import { checkUserExists, uploadUserToFirebase, getUserFromFirebase } from '../services/firebase-services';

export default function LoginScreen({ navigation }: any) {
  const [userName, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const handleAuthorisation = async () => {
    Keyboard.dismiss();
    setErrorMsg('');
    if (password.length < 5) {
      setErrorMsg('Password must be at least 5 characters');
      return;
    }
    setLoading(true);

    if (isRegistering) {
      try {
        // Check if username exists in Firebase
        const exists = await checkUserExists(userName.toLowerCase());
        if (exists) {
          setLoading(false);
          setErrorMsg("Username already exists");
          return;
        }
        // save user to Firebase first
        await uploadUserToFirebase({
          name: userName.toLocaleLowerCase(),
          password: password,
          role: 'user',
        });
        // save user to sqlite also
        registerUser(userName, password, (res: any) => {
          setLoading(false);
          if (res.success) {
            Alert.alert("Success", "Account created!", [{ text: "OK", onPress: () => setIsRegistering(false) }]);
          } else {
            setErrorMsg('Username already exists');
          }
        });
      } catch (error) {
        setLoading(false);
        setErrorMsg('Failed to register user to cloud');
      }
    }
    // login (admin and user same)
    else {
      //check from firebase first
      try {
        const firebaseUsers = await getUserFromFirebase(
          userName.toLowerCase(),
          password
        );
        if (firebaseUsers.length > 0) {
          const user: any = firebaseUsers[0];
          navigation.replace('MainApp', {
            isAdmin: user.role === 'admin',
            isGuest: false,
            userName: user.name,
          });
          setLoading(false);
          return;

        }
        //find user from sqlite if not in cloud
        loginUser(userName, password, (res: any) => {
          setLoading(false);
          if (res.success) {
            // using the result from database to determine it is admin or user 
            const isAdminUser = res.user.role === 'admin';
            navigation.replace('MainApp', {
              isAdmin: isAdminUser, // false or true
              isGuest: false,
              userName: res.user.username
            });
          } else {
            setErrorMsg('Invalid username or password');
          }
        });
      } catch (error) {
        // if firebase fail, go sqlite
        loginUser(userName, password, (res: any) => {
          setLoading(false);
          if (res.success) {
            const isAdminUser = res.user.role === 'admin';

            navigation.replace('MainApp', {
              isAdmin: isAdminUser,
              isGuest: false,
              userName: res.user.username,
            });
          } else {
            setErrorMsg('Invalid username or password');
          }
        });
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../img/appLogos.jpg')} style={styles.logo} />
        <Text style={styles.title}>Monarch Store</Text>
        <Text style={styles.subtitle}>
          {isRegistering ? 'Create Account' : 'Login'}
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          placeholder="Username"
          style={styles.input}
          placeholderTextColor="#999"
          onChangeText={t => {
            setErrorMsg('');
            setUsername(t);
          }}
        />

        <TextInput
          placeholder="Password"
          style={styles.input}
          secureTextEntry
          placeholderTextColor="#999"
          onChangeText={t => {
            setErrorMsg('');
            setPassword(t);
          }}
        />

        {errorMsg !== '' && <Text style={styles.error}>{errorMsg}</Text>}

        <TouchableOpacity
          style={[styles.button, loading && styles.disabled]}
          onPress={handleAuthorisation}
          disabled={loading}
        >
          {loading && <ActivityIndicator color="#FFF" />}
          {!loading && <Text style={styles.buttonText}>{isRegistering ? 'Register' : 'Login'}</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setErrorMsg('');
            setIsRegistering(!isRegistering);
          }}
          style={styles.switch}
        >
          <Text style={styles.switchText}>
            {isRegistering ? 'Back to Login' : 'Create an Account'}
          </Text>
        </TouchableOpacity>

        <Text
          style={styles.guest}
          onPress={() => navigation.replace('MainApp', { isAdmin: false, isGuest: true })}
        >
          Continue as Guest
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7F6',
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: { alignItems: 'center', marginBottom: 30 },
  logo: { width: 110, height: 110, borderRadius: 55, borderWidth: 2, borderColor: '#3498db' },
  title: { fontSize: 30, fontWeight: 'bold', color: '#2C3E50', marginTop: 10 },
  subtitle: { fontSize: 14, color: '#7F8C8D' },
  form: { width: '85%', backgroundColor: '#FFF', padding: 25, borderRadius: 15, elevation: 8 },
  input: { borderBottomWidth: 1, borderColor: '#CCC', padding: 10, marginBottom: 20, fontSize: 16 },
  error: { color: '#E74C3C', fontSize: 12, marginBottom: 15, textAlign: 'center' },
  button: { backgroundColor: '#3498db', padding: 15, borderRadius: 10, alignItems: 'center' },
  disabled: { backgroundColor: '#BDC3C7' },
  buttonText: { color: '#FFF', fontWeight: 'bold' },
  switch: { marginTop: 20 },
  switchText: { textAlign: 'center', color: '#34495E', textDecorationLine: 'underline' },
  guest: { textAlign: 'center', marginTop: 20, color: '#95A5A6', fontSize: 12 }
});