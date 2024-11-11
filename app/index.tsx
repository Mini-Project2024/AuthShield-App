// App.tsx
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
// import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import AuthenticatorScreen from '../screens/AuthenticatorScreen';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import SignupScreen from '../screens/SignupScreen';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();
const Index = () => {

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{headerShown: false}}
          />
          <Stack.Screen
            name="Signup"
            component={SignupScreen}
            options={{headerShown: false}}
          />
          <Stack.Screen
            name="Authenticator"
            component={AuthenticatorScreen}
            options={{headerShown: false}}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default Index;
