import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORES } from '../../utils/constantes';

const Logo = ({ 
  size = 'large', 
  showText = true, 
  logoSource = null,
  logoText = 'CuidaTeApp',
  logoEmoji = '🏥'
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          logoSize: 30,
          textSize: 16,
          containerPadding: 10
        };
      case 'medium':
        return {
          logoSize: 45,
          textSize: 22,
          containerPadding: 15
        };
      case 'large':
      default:
        return {
          logoSize: 60,
          textSize: 28,
          containerPadding: 20
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View style={[styles.container, { paddingVertical: sizeStyles.containerPadding }]}>
      {logoSource ? (
        <Image 
          source={logoSource} 
          style={[styles.logoImage, { 
            width: sizeStyles.logoSize, 
            height: sizeStyles.logoSize 
          }]} 
          resizeMode="contain"
        />
      ) : (
        <Text style={[styles.logoEmoji, { fontSize: sizeStyles.logoSize }]}>
          {logoEmoji}
        </Text>
      )}
      {showText && (
        <Text style={[styles.logoText, { fontSize: sizeStyles.textSize }]}>
          {logoText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    marginBottom: 10,
  },
  logoImage: {
    marginBottom: 10,
  },
  logoText: {
    fontWeight: 'bold',
    color: COLORES.PRIMARIO,
    textAlign: 'center',
  },
});

export default Logo;

