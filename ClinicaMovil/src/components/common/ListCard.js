import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card, Paragraph } from 'react-native-paper';
import { listStyles } from '../../utils/sharedStyles';

/**
 * Componente reutilizable para mostrar cards en listas
 * 
 * @param {Object} props
 * @param {string} props.title - Título principal del card
 * @param {string} props.subtitle - Subtítulo o descripción
 * @param {Array} props.metadata - Array de objetos { icon, text } para mostrar información adicional
 * @param {React.ReactNode} props.badge - Badge o chip opcional (ej: estado)
 * @param {Function} props.onPress - Función a ejecutar al presionar el card
 * @param {string} props.icon - Emoji o ícono opcional
 * @param {Object} props.style - Estilos adicionales para el card
 */
const ListCard = ({ 
  title, 
  subtitle, 
  metadata = [], 
  badge, 
  onPress, 
  icon,
  style 
}) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={[listStyles.citaCard, style]}>
        <Card.Content>
          <View style={listStyles.cardHeader}>
            <View style={listStyles.cardTitleContainer}>
              {icon && <Text style={styles.icon}>{icon}</Text>}
              <Text style={[listStyles.cardTitle, !badge && styles.cardTitleFull]} numberOfLines={2}>
                {title}
              </Text>
            </View>
            {badge && (
              <View style={styles.badgeContainer}>
                {badge}
              </View>
            )}
            {subtitle && (
              <Paragraph style={styles.subtitle} numberOfLines={2}>
                {subtitle}
              </Paragraph>
            )}
          </View>

          {metadata.length > 0 && (
            <View style={listStyles.cardInfo}>
              {metadata.map((item, index) => (
                <View key={index} style={listStyles.infoRow}>
                  {item.icon && (
                    <Text style={listStyles.infoIcon}>{item.icon}</Text>
                  )}
                  <Text style={listStyles.infoText} numberOfLines={2}>
                    {item.text}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  badgeContainer: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  cardTitleFull: {
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
});

export default ListCard;

