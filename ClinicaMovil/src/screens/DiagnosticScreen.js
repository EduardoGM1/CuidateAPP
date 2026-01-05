import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Title, Paragraph } from 'react-native-paper';
import axios from 'axios';
import { getApiConfigSync, getApiBaseUrl } from '../config/apiConfig';

const DiagnosticScreen = ({ navigation }) => {
  const [diagnosticResults, setDiagnosticResults] = useState(null);
  const [loading, setLoading] = useState(false);

  // Usar configuración de API dinámica (detecta automáticamente emulador vs dispositivo físico)
  const API_CONFIG = getApiConfigSync();
  const API_BASE_URL = API_CONFIG.baseURL;

  const runDiagnostic = async () => {
    setLoading(true);
    const results = [];

    try {
      // Test 1: Conectividad básica
      results.push({ test: 'Conectividad Básica', status: 'running' });
      setDiagnosticResults([...results]);

      const healthResponse = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
      results[0] = { 
        test: 'Conectividad Básica', 
        status: 'success', 
        message: `✅ Servidor accesible: ${healthResponse.status}`,
        details: healthResponse.data
      };
      setDiagnosticResults([...results]);

      // Test 2: Login
      results.push({ test: 'Autenticación', status: 'running' });
      setDiagnosticResults([...results]);

      const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: 'admin@clinica.com',
        password: 'admin123'
      }, {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      });

      results[1] = { 
        test: 'Autenticación', 
        status: 'success', 
        message: `✅ Login exitoso: ${loginResponse.status}`,
        details: {
          usuario: loginResponse.data.usuario?.email,
          rol: loginResponse.data.usuario?.rol,
          tokenLength: loginResponse.data.token?.length
        }
      };
      setDiagnosticResults([...results]);

      // Test 3: Dashboard con token
      results.push({ test: 'Dashboard API', status: 'running' });
      setDiagnosticResults([...results]);

      const dashboardResponse = await axios.get(`${API_BASE_URL}/api/dashboard/health`, {
        timeout: 5000,
        headers: {
          'Authorization': `Bearer ${loginResponse.data.token}`,
          'Content-Type': 'application/json',
          'X-Device-ID': 'mobile-device-123',
          'X-Platform': 'android',
          'X-App-Version': '1.0.0',
          'X-Client-Type': 'mobile'
        }
      });

      results[2] = { 
        test: 'Dashboard API', 
        status: 'success', 
        message: `✅ Dashboard accesible: ${dashboardResponse.status}`,
        details: dashboardResponse.data
      };
      setDiagnosticResults([...results]);

      // Test 4: Información de red
      results.push({ 
        test: 'Configuración de Red', 
        status: 'info', 
        message: '📡 Configuración actual',
        details: {
          'URL Base': API_BASE_URL,
          'Protocolo': 'HTTP',
          'Timeout': '5000ms',
          'Dispositivo': 'Android Físico'
        }
      });
      setDiagnosticResults([...results]);

    } catch (error) {
      const currentTest = results.find(r => r.status === 'running');
      if (currentTest) {
        const errorIndex = results.indexOf(currentTest);
        results[errorIndex] = {
          test: currentTest.test,
          status: 'error',
          message: `❌ Error: ${error.message}`,
          details: {
            code: error.code,
            response: error.response?.status,
            data: error.response?.data
          }
        };
        setDiagnosticResults([...results]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      case 'running': return '#FF9800';
      case 'info': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'running': return '⏳';
      case 'info': return 'ℹ️';
      default: return '❓';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>🔧 Diagnóstico de Conectividad</Text>
          <Text style={styles.subtitle}>Verificando conexión con el backend</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Configuración Actual</Title>
            <Paragraph>URL Base: {API_BASE_URL}</Paragraph>
            <Paragraph>Descripción: {API_CONFIG.description}</Paragraph>
            <Paragraph>Timeout: {API_CONFIG.timeout}ms</Paragraph>
            <Paragraph>Entorno: {API_BASE_URL.includes('10.0.2.2') ? 'Emulador Android' : API_BASE_URL.includes('localhost') ? 'Dispositivo Físico (adb reverse)' : 'Red Local'}</Paragraph>
          </Card.Content>
        </Card>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={runDiagnostic}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Ejecutando Diagnóstico...' : 'Ejecutar Diagnóstico'}
          </Text>
        </TouchableOpacity>

        {diagnosticResults && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Resultados del Diagnóstico</Text>
            {diagnosticResults.map((result, index) => (
              <Card key={index} style={[styles.resultCard, { borderLeftColor: getStatusColor(result.status) }]}>
                <Card.Content>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultIcon}>{getStatusIcon(result.status)}</Text>
                    <Text style={styles.resultTest}>{result.test}</Text>
                    <Text style={[styles.resultStatus, { color: getStatusColor(result.status) }]}>
                      {result.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.resultMessage}>{result.message}</Text>
                  {result.details && (
                    <View style={styles.resultDetails}>
                      <Text style={styles.detailsTitle}>Detalles:</Text>
                      <Text style={styles.detailsText}>
                        {JSON.stringify(result.details, null, 2)}
                      </Text>
                    </View>
                  )}
                </Card.Content>
              </Card>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Volver</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    marginBottom: 20,
    elevation: 3,
  },
  button: {
    backgroundColor: '#1976D2',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1976D2',
  },
  secondaryButtonText: {
    color: '#1976D2',
  },
  resultsContainer: {
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  resultCard: {
    marginBottom: 10,
    borderLeftWidth: 4,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  resultTest: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  resultStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  resultMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  resultDetails: {
    backgroundColor: '#F9F9F9',
    padding: 10,
    borderRadius: 4,
  },
  detailsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  detailsText: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'monospace',
  },
});

export default DiagnosticScreen;