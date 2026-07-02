import React, { useEffect, useRef } from 'react';
import { NavigationContainer, DefaultTheme, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import RescuerScreen from './src/screens/RescuerScreen';
import VictimScreen from './src/screens/VictimScreen';
import { COLORS } from './src/utils/constants';
import { useSeismicDetector } from './src/hooks/useSeismicDetector';

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

function SeismicGuard({ navRef }: { navRef: React.RefObject<NavigationContainerRef<RootStackParamList>> }) {
  const { start, checkPending } = useSeismicDetector(() => {
    navRef.current?.navigate('Victim');
  });

  useEffect(() => {
    start();
    checkPending();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function App() {
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  return (
    <NavigationContainer ref={navRef} theme={DarkTheme}>
      <SeismicGuard navRef={navRef} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Rescuer" component={RescuerScreen} />
        <Stack.Screen name="Victim" component={VictimScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
