// App.tsx
import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import RescuerScreen from './src/screens/RescuerScreen';
import VictimScreen from './src/screens/VictimScreen';
import { COLORS } from './src/utils/constants';

type RootStackParamList = {
  Home: undefined;
  Rescuer: undefined;
  Victim: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const DarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.text,
    border: COLORS.border,
  },
};

export default function App() {
  return (
    <NavigationContainer theme={DarkTheme}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Rescuer"
          component={RescuerScreen}
          options={{ title: 'Modo Rescatista', headerBackTitle: 'Volver' }}
        />
        <Stack.Screen
          name="Victim"
          component={VictimScreen}
          options={{ title: 'Señal SOS', headerBackTitle: 'Volver' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
