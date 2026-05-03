import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Keyboard,
} from 'react-native';

import {
  updateUserPasswordLocal,
  loginUser,
  debugUsersTable,
} from '../services/db-service';

export default function PasswordScreen({ navigation, route }: any) {
  const { isLogin, userName } = route.params || {};

  const isChangeMode = isLogin === true;
  const isForgotMode = !isChangeMode;

  const [inputUserName, setInputUserName] = useState(userName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = () => {
    Keyboard.dismiss();
    setErrorMsg('');
    debugUsersTable();
    const finalUserName = (isChangeMode ? userName : inputUserName)
      ?.trim()
      .toLowerCase();

    const finalCurrentPassword = currentPassword.trim();
    const finalNewPassword = newPassword.trim();
    const finalConfirmPassword = confirmPassword.trim();

    if (!finalUserName) {
      setErrorMsg('Please enter your username');
      return;
    }

    if (isChangeMode && !finalCurrentPassword) {
      setErrorMsg('Please enter your current password');
      return;
    }

    if (!finalNewPassword || !finalConfirmPassword) {
      setErrorMsg('Please fill in both password fields');
      return;
    }

    if (finalNewPassword.length < 5) {
      setErrorMsg('Password must be at least 5 characters long');
      return;
    }

    if (finalNewPassword !== finalConfirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    setLoading(true);

    if (isChangeMode) {
      loginUser(finalUserName, finalCurrentPassword, (loginRes: any) => {
        if (!loginRes.success) {
          setLoading(false);
          setErrorMsg('Current password is incorrect');
          return;
        }

        updateUserPasswordLocal(
          finalUserName,
          finalNewPassword,
          (updateRes: any) => {
            setLoading(false);

            if (updateRes.success) {
              Alert.alert('Success', 'Password updated successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } else {
              setErrorMsg(updateRes.reason || 'Failed to update password');
            }
          }
        );
      });

      return;
    }

    updateUserPasswordLocal(
      finalUserName,
      finalNewPassword,
      (updateRes: any) => {
        setLoading(false);

        if (updateRes.success) {
          Alert.alert('Success', 'Password reset successfully', [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]);
        } else {
          setErrorMsg(updateRes.reason || 'Username not found in local database');
        }
      }
    );
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>
        {isForgotMode ? 'Forgot Password' : 'Change Password'}
      </Text>

      <Text style={s.subtitle}>
        {isForgotMode
          ? 'Enter your username and create a new password.'
          : 'Enter your current password and create a new password.'}
      </Text>

      {isForgotMode && (
        <TextInput
          style={s.input}
          placeholder="Username"
          value={inputUserName}
          onChangeText={setInputUserName}
          autoCapitalize="none"
        />
      )}

      {isChangeMode && (
        <TextInput
          style={s.input}
          placeholder="Current Password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
        />
      )}

      <TextInput
        style={s.input}
        placeholder="New Password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
      />

      <TextInput
        style={s.input}
        placeholder="Confirm New Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      {errorMsg ? <Text style={s.errorText}>{errorMsg}</Text> : null}

      <TouchableOpacity
        style={[s.button, loading && s.disabled]}
        onPress={handleUpdatePassword}
        disabled={loading}
      >
        <Text style={s.buttonText}>
          {loading ? 'Updating...' : 'Update Password'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={s.backText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 25,
    justifyContent: 'center',
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 25,
  },

  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#2c3e50',
  },

  errorText: {
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
  },

  button: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },

  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  backText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#3498db',
    fontWeight: '600',
  },

  disabled: {
    backgroundColor: '#bdc3c7',
  },
});