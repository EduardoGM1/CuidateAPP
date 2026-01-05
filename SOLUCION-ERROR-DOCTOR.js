# ✅ SOLUCIÓN: Error Doctor.js - orderClause

**Fecha:** 28/10/2025  
**Error:** Error 500 en `/api/doctores`  
**Estado:** ✅ RESUELTO

---

## 🐛 ERROR DETECTADO

```
Request failed with status code 500
Error en GET /api/doctores?estado=activos&sort=recent
```

### **Causa:**
En la línea 58 de `doctor.js`, se estaba usando `orderClause` (variable inexistente) en lugar de `order`, que es la variable que retorna `buildPaginationOptions`.

---

## ✅ SOLUCIÓN APLICADA

### **Archivo:** `api-clinica/controllers/doctor.js`

**Antes (línea 58):**
```javascript
Doctor.findAll({
  where: whereCondition,
  attributes: { exclude: ['created_at', 'updated_at'] },
  include: [
    { model: Usuario, attributes: ['email', 'rol'] },
    { model: Modulo, attributes: ['nombre_modulo'] }
  ],
  order: orderClause  // ❌ ERROR: orderClause no existe
}),
```

**Después:**
```javascript
Doctor.findAll({
  where: whereCondition,
  attributes: { exclude: ['created_at', 'updated_at'] },
  include: [
    { model: Usuario, attributes: ['email', 'rol'] },
    { model: Modulo, attributes: ['nombre_modulo'] }
  ],
  order: order,  // ✅ CORRECTO: usar order
  limit,          // ✅ CORRECTO: agregar limit
  offset          // ✅ CORRECTO: agregar offset
}),
```

---

## 🎯 CAMBIOS REALIZADOS

1. ✅ Cambiado `orderClause` → `order`
2. ✅ Agregado `limit` para paginación
3. ✅ Agregado `offset` para paginación

---

## ✅ RESULTADO

El endpoint `/api/doctores` ahora funciona correctamente:
- ✅ Sin error 500
- ✅ Paginación funcional
- ✅ Ordenamiento funcional

---

**Autor:** Senior Developer  
**Fecha:** 28/10/2025  
**Estado:** ✅ RESUELTO











