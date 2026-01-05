import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { mobileApi } from '../../api/servicioApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const iniciarSesion = createAsyncThunk(
  'auth/iniciarSesion',
  async ({ email, password }) => {
    const respuesta = await mobileApi.login(email, password);
    return respuesta;
  }
);

export const registrarUsuario = createAsyncThunk(
  'auth/registrarUsuario',
  async (datosUsuario) => {
    // Para registro usamos el endpoint estándar ya que no hay endpoint móvil específico
    const api = (await import('../../api/servicioApi')).default;
    const respuesta = await api.post('/auth/register', datosUsuario);
    const { token, usuario } = respuesta.data;
    
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('user_data', JSON.stringify(usuario));
    
    return respuesta.data;
  }
);

export const renovarToken = createAsyncThunk(
  'auth/renovarToken',
  async () => {
    const respuesta = await mobileApi.refreshToken();
    return respuesta;
  }
);

export const obtenerConfiguracionMovil = createAsyncThunk(
  'auth/obtenerConfiguracionMovil',
  async () => {
    const respuesta = await mobileApi.getConfig();
    return respuesta;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    usuario: null,
    token: null,
    refreshToken: null,
    estaAutenticado: false,
    cargando: false,
    error: null,
    deviceInfo: null,
    configuracionMovil: null,
  },
  reducers: {
    cerrarSesion: (state) => {
      state.usuario = null;
      state.token = null;
      state.refreshToken = null;
      state.estaAutenticado = false;
      state.error = null;
      state.deviceInfo = null;
      mobileApi.logout();
    },
    limpiarError: (state) => {
      state.error = null;
    },
    establecerUsuario: (state, action) => {
      state.usuario = action.payload;
      state.estaAutenticado = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // Iniciar Sesión
      .addCase(iniciarSesion.pending, (state) => {
        state.cargando = true;
        state.error = null;
      })
      .addCase(iniciarSesion.fulfilled, (state, action) => {
        const { token, refresh_token, usuario, device_info } = action.payload;
        state.usuario = usuario;
        state.token = token;
        state.refreshToken = refresh_token;
        state.deviceInfo = device_info;
        state.estaAutenticado = true;
        state.cargando = false;
        state.error = null;
      })
      .addCase(iniciarSesion.rejected, (state, action) => {
        state.cargando = false;
        state.error = action.error.message || 'Error al iniciar sesión';
      })
      
      // Registrar Usuario
      .addCase(registrarUsuario.pending, (state) => {
        state.cargando = true;
        state.error = null;
      })
      .addCase(registrarUsuario.fulfilled, (state, action) => {
        const { token, usuario } = action.payload;
        state.usuario = usuario;
        state.token = token;
        state.estaAutenticado = true;
        state.cargando = false;
        state.error = null;
      })
      .addCase(registrarUsuario.rejected, (state, action) => {
        state.cargando = false;
        state.error = action.error.message || 'Error al registrar usuario';
      })
      
      // Renovar Token
      .addCase(renovarToken.fulfilled, (state, action) => {
        const { token, refresh_token } = action.payload;
        state.token = token;
        state.refreshToken = refresh_token;
      })
      .addCase(renovarToken.rejected, (state) => {
        // Si falla la renovación, cerrar sesión
        state.usuario = null;
        state.token = null;
        state.refreshToken = null;
        state.estaAutenticado = false;
        mobileApi.logout();
      })
      
      // Obtener Configuración Móvil
      .addCase(obtenerConfiguracionMovil.fulfilled, (state, action) => {
        state.configuracionMovil = action.payload;
      });
  },
});

export const { cerrarSesion, limpiarError, establecerUsuario } = authSlice.actions;
export default authSlice.reducer;