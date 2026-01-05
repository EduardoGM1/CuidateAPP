# Guía de Testing Automatizado

Esta guía explica cómo usar React Native Testing Library para probar formularios y secciones de la aplicación.

## 📋 Comandos Disponibles

### Ejecutar todos los tests
```bash
npm test
```

### Ejecutar tests en modo watch (desarrollo)
```bash
npm run test:watch
```

### Ejecutar tests con cobertura
```bash
npm run test:coverage
```

### Ejecutar un test específico
```bash
npm test -- DetallePaciente-Formularios
```

### Ejecutar tests de un componente específico
```bash
npm test -- FormModal
```

## 📁 Estructura de Tests

```
src/
├── __tests__/
│   ├── DetallePaciente.test.js              # Tests generales de DetallePaciente
│   ├── DetallePaciente-Formularios.test.js  # Tests de formularios
│   └── ...
└── components/
    └── DetallePaciente/
        └── shared/
            └── __tests__/
                ├── FormModal.test.js        # Tests del componente FormModal
                ├── OptionsModal.test.js     # Tests del componente OptionsModal
                └── HistoryModal.test.js     # Tests del componente HistoryModal (próximamente)
```

## 🧪 Tests Disponibles

### 1. FormModal.test.js
Tests para el componente modal de formularios:
- ✅ Renderizado básico
- ✅ Botones (Guardar/Cancelar)
- ✅ Interacciones
- ✅ Estados (saving, disabled)
- ✅ Contenido del formulario

### 2. OptionsModal.test.js
Tests para el componente modal de opciones:
- ✅ Renderizado
- ✅ Interacciones con opciones
- ✅ Cerrar modal
- ✅ Estilos personalizados
- ✅ Iconos

### 3. DetallePaciente-Formularios.test.js
Tests para formularios en DetallePaciente:
- ✅ Formulario de Comorbilidades
- ✅ Formulario de Red de Apoyo
- ✅ Formulario de Esquema de Vacunación
- ✅ Formulario de Asignación de Doctor
- ✅ Validaciones generales

## 🎯 Ejemplos de Uso

### Ejemplo 1: Probar que un formulario se abre correctamente

```javascript
it('debe abrir modal de agregar comorbilidad', async () => {
  const { getByText } = render(
    <AuthProvider>
      <DetallePaciente route={mockRoute} navigation={mockNavigation} />
    </AuthProvider>
  );

  await waitFor(() => {
    const optionsButton = getByText('Opciones');
    fireEvent.press(optionsButton);
  });

  await waitFor(() => {
    const addButton = getByText(/Agregar Comorbilidad/i);
    expect(addButton).toBeTruthy();
  });
});
```

### Ejemplo 2: Probar validación de campos

```javascript
it('debe validar nombre requerido', async () => {
  const { getByText, getByPlaceholderText } = render(
    <AuthProvider>
      <DetallePaciente route={mockRoute} navigation={mockNavigation} />
    </AuthProvider>
  );

  // Abrir formulario
  await waitFor(() => {
    const optionsButton = getByText('Opciones');
    fireEvent.press(optionsButton);
  });

  // Intentar guardar sin llenar campos
  await waitFor(() => {
    const saveButton = getByText(/Guardar/i);
    fireEvent.press(saveButton);
  });

  // Verificar que no se llamó al servicio
  await waitFor(() => {
    const gestionService = require('../api/gestionService').default;
    expect(gestionService.createPacienteRedApoyo).not.toHaveBeenCalled();
  });
});
```

### Ejemplo 3: Probar interacción con inputs

```javascript
it('debe permitir agregar observaciones', async () => {
  const { getByText, getByPlaceholderText } = render(
    <AuthProvider>
      <DetallePaciente route={mockRoute} navigation={mockNavigation} />
    </AuthProvider>
  );

  // Abrir formulario
  await waitFor(() => {
    const optionsButton = getByText('Opciones');
    fireEvent.press(optionsButton);
  });

  // Escribir en input
  await waitFor(() => {
    const observacionesInput = getByPlaceholderText(/observaciones/i);
    fireEvent.changeText(observacionesInput, 'Diagnosticada en 2020');
    expect(observacionesInput.props.value).toBe('Diagnosticada en 2020');
  });
});
```

## 🔧 Configuración

Los tests están configurados en `jest.config.js` con:
- React Native Testing Library
- Mocks de AsyncStorage
- Mocks de SVG
- Transformaciones necesarias para React Native

## 📝 Mejores Prácticas

1. **Usar `waitFor` para operaciones asíncronas**
   ```javascript
   await waitFor(() => {
     expect(getByText('Texto')).toBeTruthy();
   });
   ```

2. **Limpiar mocks entre tests**
   ```javascript
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

3. **Usar `queryByText` para verificar que algo NO existe**
   ```javascript
   expect(queryByText('Texto')).toBeNull();
   ```

4. **Mockear servicios externos**
   ```javascript
   jest.mock('../api/gestionService', () => ({
     default: {
       createCita: jest.fn(() => Promise.resolve({ id: 1 })),
     }
   }));
   ```

## 🐛 Debugging

### Ver qué se renderiza
```javascript
const { debug } = render(<Component />);
debug(); // Imprime el árbol de componentes
```

### Verificar que un elemento existe
```javascript
const element = getByText('Texto');
expect(element).toBeTruthy();
```

### Verificar que un elemento NO existe
```javascript
const element = queryByText('Texto');
expect(element).toBeNull();
```

## 📊 Cobertura

Para ver el reporte de cobertura después de ejecutar `npm run test:coverage`:
- Abre `coverage/lcov-report/index.html` en tu navegador

## 🚀 Próximos Pasos

- [ ] Agregar tests para HistoryModal
- [ ] Agregar tests para ModalBase
- [ ] Agregar tests de integración E2E
- [ ] Agregar tests de performance
- [ ] Agregar tests de accesibilidad

## 📚 Recursos

- [React Native Testing Library Docs](https://callstack.github.io/react-native-testing-library/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)


