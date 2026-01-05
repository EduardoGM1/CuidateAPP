import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Title, Paragraph } from 'react-native-paper';
import Logger from '../services/logger';

/**
 * ErrorBoundary - Componente para capturar errores en React
 * 
 * Implementa el patrón Error Boundary para prevenir crashes
 * de la aplicación cuando hay errores en componentes hijos.
 * 
 * Características:
 * - Captura errores de renderizado
 * - Muestra pantalla de error amigable
 * - Permite resetear el error
 * - Envía logs estructurados
 * - No afecta otros componentes
 * 
 * @author Senior Developer
 * @date 2025-10-28
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  /**
   * Método estático que actualiza el estado cuando hay un error
   * 
   * @param {Error} error - Error capturado
   * @param {ErrorInfo} errorInfo - Información adicional del error
   * @returns {Object} - Nuevo estado
   */
  static getDerivedStateFromError(error) {
    // Generar ID único para el error
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      errorId
    };
  }

  /**
   * Método que se ejecuta cuando se captura un error
   * 
   * @param {Error} error - Error capturado
   * @param {ErrorInfo} errorInfo - Información del error
   */
  componentDidCatch(error, errorInfo) {
    // Log estructurado del error
    Logger.error('Error capturado por ErrorBoundary', {
      errorId: this.state.errorId,
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
      errorName: error.name,
      timestamp: new Date().toISOString()
    });

    this.setState({
      error,
      errorInfo
    });
  }

  /**
   * Resetear el error y volver al estado normal
   */
  handleReset = () => {
    Logger.info('Intentando resetear ErrorBoundary', {
      errorId: this.state.errorId,
      timestamp: new Date().toISOString()
    });

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  /**
   * Renderizar pantalla de error amigable
   */
  render() {
    if (this.state.hasError) {
      // Si hay un fallback personalizado, usarlo
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Pantalla de error por defecto
      return (
        <SafeAreaView style={styles.container}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>⚠️</Text>
            </View>

            <Title style={styles.title}>
              ¡Oops! Algo salió mal
            </Title>

            <Paragraph style={styles.description}>
              Ha ocurrido un error inesperado. No te preocupes, tu información está segura.
            </Paragraph>

            <Card style={styles.errorCard}>
              <Card.Content>
                <Text style={styles.errorLabel}>Detalle del error:</Text>
                <Text style={styles.errorMessage} numberOfLines={3}>
                  {this.state.error?.message || 'Error desconocido'}
                </Text>
              </Card.Content>
            </Card>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <Card style={styles.errorCard}>
                <Card.Content>
                  <Text style={styles.errorLabel}>Stack trace (Desarrollo):</Text>
                  <ScrollView style={styles.stackScrollView}>
                    <Text style={styles.stackText}>
                      {this.state.errorInfo.componentStack}
                    </Text>
                  </ScrollView>
                </Card.Content>
              </Card>
            )}

            <View style={styles.actionsContainer}>
              <Button
                mode="contained"
                onPress={this.handleReset}
                style={styles.resetButton}
                buttonColor="#2196F3"
              >
                Intentar de nuevo
              </Button>

              {this.props.onRetry && (
                <Button
                  mode="outlined"
                  onPress={() => {
                    this.handleReset();
                    this.props.onRetry();
                  }}
                  style={styles.retryButton}
                >
                  Recargar
                </Button>
              )}
            </View>

            {this.state.errorId && (
              <Text style={styles.errorId}>
                ID de error: {this.state.errorId}
              </Text>
            )}
          </ScrollView>
        </SafeAreaView>
      );
    }

    // Si no hay error, renderizar hijos normalmente
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 20,
  },
  icon: {
    fontSize: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  errorCard: {
    width: '100%',
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  errorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 13,
    color: '#d32f2f',
    fontFamily: 'monospace',
  },
  stackScrollView: {
    maxHeight: 200,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  stackText: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'monospace',
  },
  actionsContainer: {
    width: '100%',
    marginTop: 24,
    gap: 12,
  },
  resetButton: {
    marginBottom: 8,
  },
  retryButton: {
    borderColor: '#2196F3',
  },
  errorId: {
    fontSize: 11,
    color: '#999',
    marginTop: 16,
    fontFamily: 'monospace',
  },
});

export default ErrorBoundary;




