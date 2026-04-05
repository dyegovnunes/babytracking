import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Text } from 'react-native'
import TrackerScreen from '../screens/TrackerScreen'
import HistoryScreen from '../screens/HistoryScreen'
import InsightsScreen from '../screens/InsightsScreen'
import ProfileScreen from '../screens/ProfileScreen'
import SettingsScreen from '../screens/SettingsScreen'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Tracker: '📋',
    Histórico: '🕐',
    Insights: '📊',
    Perfil: '👤',
  }
  return (
    <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.5 }}>
      {icons[label] ?? '•'}
    </Text>
  )
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
        tabBarStyle: {
          backgroundColor: '#181538',
          borderTopColor: '#47446440',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
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
      <Tab.Screen name="Tracker" component={TrackerScreen} />
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
