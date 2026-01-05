const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 * 
 * Configurado para permitir múltiples dispositivos simultáneos:
 * - Dispositivo físico (USB o WiFi)
 * - Emulador Android
 * - Múltiples dispositivos físicos
 * 
 * IMPORTANTE: Para usar múltiples dispositivos, iniciar Metro con:
 *   npm run start:multi
 *   o
 *   npx react-native start --host 0.0.0.0
 * 
 * Esto hace que Metro escuche en todas las interfaces de red (0.0.0.0),
 * permitiendo conexiones desde:
 * - localhost (para emulador con adb reverse)
 * - IP local (192.168.x.x) para dispositivos físicos en la misma red
 * - 10.0.2.2 (para emulador Android sin adb reverse)
 * 
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  // Asegurar que Metro se ejecute desde la carpeta correcta del proyecto
  projectRoot: __dirname,
  watchFolders: [__dirname],
  server: {
    // Configuración del servidor Metro
    // Por defecto Metro escucha en el puerto 8081
    // Para múltiples dispositivos, debe escuchar en 0.0.0.0 (todas las interfaces)
    // Esto se configura al iniciar Metro con --host 0.0.0.0
    
    // Middleware mejorado para permitir múltiples dispositivos
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        // Permitir CORS para conexiones desde diferentes dispositivos
        // Esto es necesario cuando múltiples dispositivos se conectan desde diferentes IPs
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        
        // Permitir preflight requests
        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }
        
        return middleware(req, res, next);
      };
    },
  },
  // Configuración de resolver
  resolver: {
    // Asegurar que resuelve correctamente los módulos
    sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json'],
    // Asegurar que resuelve desde el directorio correcto
    roots: [path.resolve(__dirname)],
  },
  // Configuración de watcher (opcional, mejora rendimiento con múltiples dispositivos)
  watcher: {
    // Aumentar el límite de archivos observados si es necesario
    // Por defecto es suficiente para la mayoría de proyectos
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

