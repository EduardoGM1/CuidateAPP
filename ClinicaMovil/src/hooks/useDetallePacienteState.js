import { useReducer } from 'react';

// Estado inicial centralizado
const initialState = {
  // Modales de opciones (menús de 3 puntos)
  modals: {
    showOptionsCitas: false,
    showOptionsSignosVitales: false,
    showOptionsDiagnosticos: false,
    showOptionsMedicamentos: false,
    showOptionsRedApoyo: false,
    showOptionsEsquemaVacunacion: false,
  },
  
  // Modales de agregar
  addModals: {
    showAddCita: false,
    showAddSignosVitales: false,
    showAddDiagnostico: false,
    showAddMedicamentos: false,
    showAddRedApoyo: false,
    showAddEsquemaVacunacion: false,
  },
  
  // Modales de ver todos
  viewModals: {
    showAllSignosVitales: false,
    showAllCitas: false,
    showAllDiagnosticos: false,
    showAllMedicamentos: false,
    showAllRedApoyo: false,
    showAllEsquemaVacunacion: false,
  },
  
  // Estados de carga
  loading: {
    allSignos: false,
    allCitas: false,
    medicamentos: false,
  },
  
  // Estados de guardado
  saving: {
    cita: false,
    signosVitales: false,
    diagnostico: false,
    medicamentos: false,
    redApoyo: false,
    esquemaVacunacion: false,
  },
  
  // Datos de listas
  data: {
    allSignosVitales: [],
    allCitas: [],
    medicamentosDisponibles: [],
  },
  
  // Formularios
  forms: {
    cita: {
      id_doctor: '',
      fecha_cita: '',
      motivo: '',
      observaciones: '',
      es_primera_consulta: false,
    },
    signosVitales: {
      fecha: '',
      peso_kg: '',
      talla_m: '',
      medida_cintura_cm: '',
      presion_sistolica: '',
      presion_diastolica: '',
      glucosa_mg_dl: '',
      colesterol_mg_dl: '',
      trigliceridos_mg_dl: '',
      observaciones: '',
    },
    diagnostico: {
      id_cita: '',
      descripcion: '',
    },
    medicamentos: {
      id_cita: '',
      fecha_inicio: '',
      fecha_fin: '',
      observaciones: '',
      medicamentos: [],
    },
    redApoyo: {
      nombre_contacto: '',
      numero_celular: '',
      email: '',
      direccion: '',
      localidad: '',
      parentesco: '',
    },
    esquemaVacunacion: {
      vacuna: '',
      fecha_aplicacion: '',
      lote: '',
      observaciones: '',
    },
  },
};

// Tipos de acciones
const actionTypes = {
  SET_MODAL: 'SET_MODAL',
  SET_ADD_MODAL: 'SET_ADD_MODAL',
  SET_VIEW_MODAL: 'SET_VIEW_MODAL',
  SET_LOADING: 'SET_LOADING',
  SET_SAVING: 'SET_SAVING',
  SET_DATA: 'SET_DATA',
  SET_FORM_FIELD: 'SET_FORM_FIELD',
  RESET_FORM: 'RESET_FORM',
  RESET_ALL: 'RESET_ALL',
};

// Reducer
function reducer(state, action) {
  switch (action.type) {
    case actionTypes.SET_MODAL:
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload.name]: action.payload.value,
        },
      };
      
    case actionTypes.SET_ADD_MODAL:
      return {
        ...state,
        addModals: {
          ...state.addModals,
          [action.payload.name]: action.payload.value,
        },
      };
      
    case actionTypes.SET_VIEW_MODAL:
      return {
        ...state,
        viewModals: {
          ...state.viewModals,
          [action.payload.name]: action.payload.value,
        },
      };
      
    case actionTypes.SET_LOADING:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.name]: action.payload.value,
        },
      };
      
    case actionTypes.SET_SAVING:
      return {
        ...state,
        saving: {
          ...state.saving,
          [action.payload.name]: action.payload.value,
        },
      };
      
    case actionTypes.SET_DATA:
      return {
        ...state,
        data: {
          ...state.data,
          [action.payload.name]: action.payload.value,
        },
      };
      
    case actionTypes.SET_FORM_FIELD:
      const { formName, fieldName, value } = action.payload;
      return {
        ...state,
        forms: {
          ...state.forms,
          [formName]: {
            ...state.forms[formName],
            [fieldName]: value,
          },
        },
      };
      
    case actionTypes.RESET_FORM:
      const formToReset = action.payload.formName;
      return {
        ...state,
        forms: {
          ...state.forms,
          [formToReset]: initialState.forms[formToReset],
        },
      };
      
    case actionTypes.RESET_ALL:
      return initialState;
      
    default:
      return state;
  }
}

// Hook principal
export function useDetallePacienteState() {
  const [state, dispatch] = useReducer(reducer, initialState);
  
  // Helpers para modales de opciones
  const setModal = (name, value) => {
    dispatch({
      type: actionTypes.SET_MODAL,
      payload: { name, value },
    });
  };
  
  // Helpers para modales de agregar
  const setAddModal = (name, value) => {
    dispatch({
      type: actionTypes.SET_ADD_MODAL,
      payload: { name, value },
    });
  };
  
  // Helpers para modales de vista
  const setViewModal = (name, value) => {
    dispatch({
      type: actionTypes.SET_VIEW_MODAL,
      payload: { name, value },
    });
  };
  
  // Helpers para loading
  const setLoading = (name, value) => {
    dispatch({
      type: actionTypes.SET_LOADING,
      payload: { name, value },
    });
  };
  
  // Helpers para saving
  const setSaving = (name, value) => {
    dispatch({
      type: actionTypes.SET_SAVING,
      payload: { name, value },
    });
  };
  
  // Helpers para data
  const setData = (name, value) => {
    dispatch({
      type: actionTypes.SET_DATA,
      payload: { name, value },
    });
  };
  
  // Helper para actualizar campos de formulario
  const setFormField = (formName, fieldName, value) => {
    dispatch({
      type: actionTypes.SET_FORM_FIELD,
      payload: { formName, fieldName, value },
    });
  };
  
  // Helper para resetear formulario
  const resetForm = (formName) => {
    dispatch({
      type: actionTypes.RESET_FORM,
      payload: { formName },
    });
  };
  
  // Helper para resetear todo
  const resetAll = () => {
    dispatch({ type: actionTypes.RESET_ALL });
  };
  
  return {
    state,
    // Modales
    setModal,
    setAddModal,
    setViewModal,
    // Loading
    setLoading,
    // Saving
    setSaving,
    // Data
    setData,
    // Forms
    setFormField,
    resetForm,
    // Reset
    resetAll,
  };
}

// Exportar action types para uso externo si es necesario
export { actionTypes };











