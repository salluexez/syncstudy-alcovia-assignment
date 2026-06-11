import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SyncStudy</Text>
      <Text style={styles.subtitle}>Offline-first study sync</Text>
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
  title: {
    color: '#0f172a',
    fontSize: 32,
    fontWeight: '700'
  }
});
