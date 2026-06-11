import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LocalStorageService, type LocalStorageContext } from './src/services/localStorageService';

export default function App() {
  const [storageContext, setStorageContext] = useState<LocalStorageContext | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const storage = new LocalStorageService();

    storage
      .initialize()
      .then(setStorageContext)
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to initialize storage.');
      });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SyncStudy</Text>
      <Text style={styles.subtitle}>Offline-first study sync</Text>
      <Text style={styles.status}>
        {errorMessage ??
          (storageContext
            ? `Local device ${storageContext.deviceLabel} is ready`
            : 'Initializing local storage...')}
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    flex: 1,
    justifyContent: 'center',
    padding: 24
  },
  subtitle: {
    color: '#475569',
    fontSize: 16,
    marginTop: 8
  },
  status: {
    color: '#334155',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center'
  },
  title: {
    color: '#0f172a',
    fontSize: 32,
    fontWeight: '700'
  }
});
