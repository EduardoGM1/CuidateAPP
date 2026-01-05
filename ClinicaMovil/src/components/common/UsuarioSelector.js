/**
 * Componente reutilizable para seleccionar usuario con búsqueda
 * Usado en filtros de auditoría
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Searchbar } from 'react-native-paper';
import gestionService from '../../api/gestionService';
import Logger from '../../services/logger';

const UsuarioSelector = ({ selectedUsuario, onSelectUsuario, style }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    loadUsuarios();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = usuarios.filter(usuario =>
        usuario.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        usuario.rol?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsuarios(filtered);
    } else {
      setFilteredUsuarios(usuarios);
    }
  }, [searchQuery, usuarios]);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const response = await gestionService.getUsuariosAuditoria();
      if (response.success) {
        setUsuarios(response.data.usuarios || []);
        setFilteredUsuarios(response.data.usuarios || []);
      }
    } catch (error) {
      Logger.error('Error cargando usuarios', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUsuario = (usuario) => {
    onSelectUsuario(usuario);
    setShowList(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onSelectUsuario(null);
    setSearchQuery('');
  };

  return (
    <View style={[styles.container, style]}>
      <Searchbar
        placeholder="Buscar usuario..."
        onChangeText={(text) => {
          setSearchQuery(text);
          setShowList(true);
        }}
        value={selectedUsuario ? selectedUsuario.email : searchQuery}
        onFocus={() => setShowList(true)}
        style={styles.searchbar}
      />
      
      {selectedUsuario && (
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <Text style={styles.clearText}>✕ Limpiar</Text>
        </TouchableOpacity>
      )}

      {showList && filteredUsuarios.length > 0 && (
        <View style={styles.listContainer}>
          <FlatList
            data={filteredUsuarios}
            keyExtractor={(item) => item.id_usuario.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.usuarioItem,
                  selectedUsuario?.id_usuario === item.id_usuario && styles.usuarioItemSelected
                ]}
                onPress={() => handleSelectUsuario(item)}
              >
                <Text style={styles.usuarioEmail}>{item.email}</Text>
                <Text style={styles.usuarioRol}>{item.rol}</Text>
              </TouchableOpacity>
            )}
            style={styles.list}
            maxHeight={200}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1,
  },
  searchbar: {
    marginBottom: 8,
  },
  clearButton: {
    alignSelf: 'flex-end',
    padding: 4,
    marginBottom: 8,
  },
  clearText: {
    color: '#1976D2',
    fontSize: 12,
  },
  listContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
    maxHeight: 200,
  },
  list: {
    maxHeight: 200,
  },
  usuarioItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  usuarioItemSelected: {
    backgroundColor: '#E3F2FD',
  },
  usuarioEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  usuarioRol: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default UsuarioSelector;

