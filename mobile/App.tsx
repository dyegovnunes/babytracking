import './global.css'
import { StatusBar } from 'expo-status-bar'
import { useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import { AppProvider, useAppState } from './src/contexts/AppContext'
import AppNavigation from './src/navigation'
import LoginScreen from './src/screens/LoginScreen'
import OnboardingScreen from './src/screens/OnboardingScreen'
import JoinBabyScreen from './src/screens/JoinBabyScreen'

function AppContent() {
  const { user, loading: authLoading } = useAuth()

  if (authLoading) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color="#b79fff" size="large" />
      </View>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}

function AppInner() {
  const { loading, needsOnboarding } = useAppState()
  const [joinMode, setJoinMode] = useState(false)

  if (loading) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color="#b79fff" size="large" />
      </View>
    )
  }

  if (needsOnboarding) {
    if (joinMode) {
      return (
        <JoinBabyScreen
          onComplete={() => setJoinMode(false)}
          onBack={() => setJoinMode(false)}
        />
      )
    }
    return (
      <OnboardingScreen
        onComplete={() => {}}
        onJoin={() => setJoinMode(true)}
      />
    )
  }

  return <AppNavigation />
}

export default function App() {
  return (
    <SafeAreaProvider>
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: '#b79fff',
          background: '#0d0a27',
          card: '#181538',
          text: '#e7e2ff',
          border: '#474464',
          notification: '#ff96b9',
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '800' },
        },
      }}
    >
      <AuthProvider>
        <SafeAreaView className="flex-1 bg-surface" edges={['top', 'left', 'right']}>
          <AppContent />
        </SafeAreaView>
        <StatusBar style="light" />
      </AuthProvider>
    </NavigationContainer>
    </SafeAreaProvider>
  )
}
