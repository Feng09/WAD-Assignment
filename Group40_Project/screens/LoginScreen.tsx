import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  Keyboard,
  ScrollView,
} from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons';

import {
  loginUser,
  registerUser,
  loginAdminLocal,
  upsertUserLocal,
} from '../services/db-service';

import {
  registerCloudUser,
} from '../services/userCloudService';

export default function LoginScreen({ navigation }: any) {
  const [userName, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

const handleAuthorisation = async () => {
  Keyboard.dismiss();
  setErrorMsg('');

  const finalUserName = userName.trim().toLowerCase();
  const finalPassword = password.trim();

  if (!finalUserName) {
    setErrorMsg('Please enter username');
    return;
  }

  if (finalPassword.length < 5) {
    setErrorMsg('Password must be at least 5 characters');
    return;
  }

  setLoading(true);

  
  if (isRegistering) {
    try {
      
      const cloudRes = await registerCloudUser(
        finalUserName,
        'customer'
      );

      console.log('Cloud register result:', cloudRes);

      if (cloudRes.success === false) {
        setLoading(false);
        setErrorMsg(cloudRes.message || 'Username already exists in API');
        return;
      }

     
      upsertUserLocal(
        finalUserName,
        finalPassword,
        'user',
        (localRes: any) => {
          setLoading(false);

          if (localRes.success) {
            Alert.alert('Success', 'Account created!', [
              {
                text: 'OK',
                onPress: () => {
                  setIsRegistering(false);
                  setPassword('');
                },
              },
            ]);
          } else {
            setErrorMsg(localRes.reason || 'Failed to save user locally');
          }
        }
      );
    } catch (error: any) {
      console.log('Cloud register error:', error.message);

    
      registerUser(finalUserName, finalPassword, (localRes: any) => {
        setLoading(false);

        if (localRes.success) {
          Alert.alert(
            'Saved Locally',
            'Account created locally, but failed to sync to API.'
          );

          setIsRegistering(false);
          setPassword('');
        } else {
          setErrorMsg(localRes.reason || 'Username already exists or failed to register.');
        }
      });
    }

    return;
  }

  loginAdminLocal(finalUserName, finalPassword, (adminRes: any) => {
    if (adminRes.success) {
      setLoading(false);

      navigation.replace('MainApp', {
        isAdmin: true,
        isGuest: false,
        userName: adminRes.admin.adminName || finalUserName,
      });

      return;
    }

    loginUser(finalUserName, finalPassword, (localRes: any) => {
      setLoading(false);

      if (localRes.success) {
        navigation.replace('MainApp', {
          isAdmin: false,
          isGuest: false,
          userName:
            localRes.user.userName ||
            localRes.user.username ||
            localRes.user.name ||
            finalUserName,
        });
      } else {
        setErrorMsg(localRes.reason || 'Invalid username or password');
      }
    });
  });
};
  return (
    <ScrollView
      style={styles.screenWrapper}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topSection}>
        <View style={styles.logoWrapper}>
          <Image
            source={require('../img/appLogos.jpg')}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>

        <Text style={styles.appName}>Monarch Store</Text>

        <Text style={styles.subtitle}>
          {isRegistering
            ? 'Create your account to start shopping'
            : 'Welcome back, login to continue'}
        </Text>
      </View>

      <View style={styles.formCard}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>
            {isRegistering ? 'Register Account' : 'Login Account'}
          </Text>

          <Text style={styles.formDesc}>
            {isRegistering
              ? 'Fill in your details below'
              : 'Enter your username and password'}
          </Text>
        </View>

        <View style={styles.inputBox}>
          <Icon name="person-outline" size={20} color="#95a5a6" />
          <TextInput
            placeholder="Username"
            style={styles.input}
            placeholderTextColor="#999"
            value={userName}
            autoCapitalize="none"
            onChangeText={text => {
              setErrorMsg('');
              setUsername(text);
            }}
          />
        </View>

        <View style={styles.inputBox}>
          <Icon name="lock-closed-outline" size={20} color="#95a5a6" />
          <TextInput
            placeholder="Password"
            style={styles.input}
            secureTextEntry
            placeholderTextColor="#999"
            value={password}
            onChangeText={text => {
              setErrorMsg('');
              setPassword(text);
            }}
          />
        </View>

        {errorMsg !== '' && (
          <View style={styles.errorBox}>
            <Icon name="alert-circle-outline" size={18} color="#e74c3c" />
            <Text style={styles.error}>{errorMsg}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.disabled]}
          onPress={handleAuthorisation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon
                name={isRegistering ? 'person-add-outline' : 'log-in-outline'}
                size={20}
                color="#fff"
              />
              <Text style={styles.buttonText}>
                {isRegistering ? 'Register' : 'Login'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {!isRegistering && (
          <TouchableOpacity
            onPress={() =>
              navigation.replace('MainApp', {
                isAdmin: false,
                isGuest: true,
              })
            }
            style={styles.guestButton}
          >
            <Icon name="eye-outline" size={18} color="#34495e" />
            <Text style={styles.guest}>Continue as Guest</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => {
            setErrorMsg('');
            setIsRegistering(!isRegistering);
            setPassword('');
          }}
          style={styles.switch}
        >
          <Text style={styles.switchText}>
            {isRegistering
              ? 'Already have an account? Back to Login'
              : 'New here? Create an Account'}
          </Text>
        </TouchableOpacity>

        {!isRegistering && (
          <TouchableOpacity
            onPress={() => {
              setErrorMsg('');
              navigation.navigate('ForgotPassword', {
                isLogin: false,
                userName: '',
              });
            }}
            style={styles.forgotButton}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 22,
  },

  topSection: {
    alignItems: 'center',
    marginBottom: 25,
  },

  logoWrapper: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  logo: {
    width: 118,
    height: 118,
    borderRadius: 59,
  },

  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
  },

  subtitle: {
    color: '#7f8c8d',
    marginTop: 6,
    fontSize: 14,
    textAlign: 'center',
  },

  formCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 22,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  formHeader: {
    marginBottom: 18,
  },

  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
  },

  formDesc: {
    color: '#95a5a6',
    marginTop: 4,
    fontSize: 13,
  },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dfe6e9',
    backgroundColor: '#fafafa',
    borderRadius: 14,
    paddingHorizontal: 13,
    marginBottom: 14,
  },

  input: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 10,
    fontSize: 15,
    color: '#2c3e50',
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fdecea',
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
    gap: 8,
  },

  error: {
    color: '#e74c3c',
    fontSize: 13,
    flex: 1,
  },

  button: {
    backgroundColor: '#3498db',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  disabled: {
    backgroundColor: '#bdc3c7',
  },

  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },

  guestButton: {
    flexDirection: 'row',
    backgroundColor: '#ecf0f1',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 7,
  },

  guest: {
    color: '#34495e',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 14,
  },

  switch: {
    marginTop: 16,
  },

  switchText: {
    textAlign: 'center',
    color: '#3498db',
    fontWeight: '700',
  },

  forgotButton: {
    marginTop: 12,
  },

  forgotText: {
    textAlign: 'center',
    color: '#7f8c8d',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});