import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LocalStorageService, type LocalStorageContext } from './src/services/localStorageService';
import { FocusScreen } from './src/screens/FocusScreen';
import { SyllabusScreen } from './src/screens/SyllabusScreen';
import { DevPanelScreen } from './src/screens/DevPanelScreen';

type TabType = 'focus' | 'syllabus' | 'dev';

export default function App() {
  const [storageContext, setStorageContext] = useState<LocalStorageContext | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('focus');

  useEffect(() => {
    const storage = new LocalStorageService();

    storage
      .initialize()
      .then(setStorageContext)
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to initialize storage.');
      });
  }, []);

  if (errorMessage) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-octagon" size={48} color="#ef4444" />
        <Text style={styles.errorText}>Initialization Error</Text>
        <Text style={styles.errorDesc}>{errorMessage}</Text>
      </View>
    );
  }

  if (!storageContext) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Initializing SyncStudy Database...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* App Content */}
      <View style={styles.content}>
        {activeTab === 'focus' && (
          <FocusScreen
            database={storageContext.database}
            studentId={storageContext.studentId}
            deviceId={storageContext.deviceId}
          />
        )}
        {activeTab === 'syllabus' && (
          <SyllabusScreen
            database={storageContext.database}
            studentId={storageContext.studentId}
            deviceId={storageContext.deviceId}
          />
        )}
        {activeTab === 'dev' && (
          <DevPanelScreen
            database={storageContext.database}
            studentId={storageContext.studentId}
            deviceId={storageContext.deviceId}
            deviceLabel={storageContext.deviceLabel}
          />
        )}
      </View>

      {/* Elegant Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'focus' && styles.tabItemActive]}
          onPress={() => setActiveTab('focus')}
          activeOpacity={0.8}
        >
          <Feather
            name="clock"
            size={20}
            color={activeTab === 'focus' ? '#6366f1' : '#94a3b8'}
          />
          <Text style={[styles.tabLabel, activeTab === 'focus' && styles.tabLabelActive]}>
            Focus
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'syllabus' && styles.tabItemActive]}
          onPress={() => setActiveTab('syllabus')}
          activeOpacity={0.8}
        >
          <Feather
            name="book-open"
            size={20}
            color={activeTab === 'syllabus' ? '#6366f1' : '#94a3b8'}
          />
          <Text style={[styles.tabLabel, activeTab === 'syllabus' && styles.tabLabelActive]}>
            Syllabus
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'dev' && styles.tabItemActive]}
          onPress={() => setActiveTab('dev')}
          activeOpacity={0.8}
        >
          <Feather
            name="sliders"
            size={20}
            color={activeTab === 'dev' ? '#6366f1' : '#94a3b8'}
          />
          <Text style={[styles.tabLabel, activeTab === 'dev' && styles.tabLabelActive]}>
            Dev Panel
          </Text>
        </TouchableOpacity>
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    flex: 1
  },
  content: {
    flex: 1
  },
  errorContainer: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    flex: 1,
    justifyContent: 'center',
    padding: 32
  },
  errorDesc: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center'
  },
  errorText: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 16
  },
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    flex: 1,
    justifyContent: 'center'
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12
  },
  placeholderContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 32
  },
  placeholderDesc: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center'
  },
  placeholderIconCircle: {
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    marginBottom: 16,
    width: 80
  },
  placeholderTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '800'
  },
  statusBadge: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    marginTop: 20,
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  statusBadgeText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700'
  },
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopColor: '#f1f5f9',
    borderTopWidth: 1,
    flexDirection: 'row',
    height: 64,
    justifyContent: 'space-around',
    paddingBottom: 8,
    paddingTop: 8
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
  },
  tabItemActive: {},
  tabLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4
  },
  tabLabelActive: {
    color: '#6366f1',
    fontWeight: '700'
  }
});
