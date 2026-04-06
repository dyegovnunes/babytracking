import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialIcons } from '@expo/vector-icons'
import TrackerScreen from '../screens/TrackerScreen'
import HistoryScreen from '../screens/HistoryScreen'
import InsightsScreen from '../screens/InsightsScreen'
import ProfileScreen from '../screens/ProfileScreen'
import SettingsScreen from '../screens/SettingsScreen'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

const tabIcons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  'Início': 'track-changes',
  'Histórico': 'history',
  'Insights': 'insights',
  'Perfil': 'person',
}

function MainTabs() {
  const insets = useSafeAreaInsets()

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => (
          <MaterialIcons
            name={tabIcons[route.name] ?? 'circle'}
            size={focused ? 26 : 24}
            color={color}
          />
        ),
        tabBarStyle: {
          backgroundColor: '#181538',
          borderTopColor: '#47446440',
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 4,
        },
        tabBarActiveTintColor: '#b79fff',
        tabBarInactiveTintColor: '#aca7cc',
        tabBarLabelStyle: {
          fontFamily: 'PlusJakartaSans',
          fontSize: 10,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Início" component={TrackerScreen} />
      <Tab.Screen name="Histórico" component={HistoryScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

export default function AppNavigation() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: true,
          headerTitle: 'Configurações',
          headerStyle: { backgroundColor: '#0d0a27' },
          headerTintColor: '#e7e2ff',
          headerTitleStyle: { fontFamily: 'Manrope', fontWeight: '700' },
        }}
      />
    </Stack.Navigator>
  )
}
