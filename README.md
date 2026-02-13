# SafeAir App

Proyecto fullstack para monitoreo de calidad de aire y control basico de actuadores (ventana, ventilador, alarma).

## 1. Que hay en esta carpeta

La carpeta `safeAir-app` tiene 2 proyectos:

- `frontend-safe`: aplicacion Angular (UI para invitado y operador).
- `backend-safeair`: API REST con Express + MongoDB.

## 2. Arquitectura general

Frontend (Angular) consume API REST del backend:

- Autenticacion y sesion de usuario.
- Lecturas de sensores (`air-data`).
- Estado/accion de controles (`air-control`).
- Reportes y exportaciones (CSV/XLS/PDF/JSON desde frontend).

Backend (Express) expone rutas CRUD y guarda datos en MongoDB Atlas via Mongoose.

## 3. Estructura rapida del proyecto

```text
safeAir-app/
  backend-safeair/
    app.js
    index.js
    config/db.js
    models/
    controllers/
    routes/
  frontend-safe/
    src/app/
      components/
      services/
      app.routes.ts
```

## 4. Frontend: como funciona

### 4.1 Rutas principales

Definidas en `frontend-safe/src/app/app.routes.ts`:

- `/` -> Home publico (`GuestHome`).
- `/registro` -> Registro.
- `/login` -> Inicio de sesion.
- `/guest-window` -> Vista invitado con lectura en tiempo real y controles.
- `/operator-welcome` -> Contenedor del operador.
- `/operator-welcome/dashboard` -> Dashboard con graficas.
- `/operator-welcome/reports` -> Reportes y exportaciones.
- `/operator-welcome/settings` -> Configuracion.

### 4.2 Servicios principales

En `frontend-safe/src/app/services/`:

- `auth.service.ts`
  - Login, registro, reset de password.
  - Guarda sesion en `localStorage` (`userLogged`, `userRole`, `userEmail`, `userName`).
- `air-data.service.ts`
  - `getReadings()` para historial de lecturas.
- `air-control.service.ts`
  - `getControl()` para estado actual de actuadores.
  - `updateControl()` para enviar cambios manuales.

### 4.3 Flujo de usuario

1. Usuario se registra o inicia sesion.
2. Si rol es `operator`, navega a modulo operador; si no, a vista invitado.
3. Pantallas consumen lecturas cada 5 segundos para refrescar estado.
4. Usuario puede enviar acciones manuales (abrir/cerrar ventana, alarma, ventilador).
5. Modulo reportes calcula metricas y permite exportar archivos.

## 5. Backend: como funciona

### 5.1 Arranque

- `backend-safeair/index.js`: inicia servidor.
- `backend-safeair/app.js`: configura middlewares y rutas.
- `backend-safeair/config/db.js`: conexion a MongoDB Atlas.

### 5.2 Rutas API

Base URL backend: `http://localhost:3000` en local.

#### Usuarios (`/api/users`)

- `POST /` -> crear usuario.
- `POST /login` -> login.
- `PUT /reset-password` -> cambiar password por email.
- `GET /:id`, `PUT /:id`, `DELETE /:id` -> CRUD usuario.

#### Lecturas de aire (`/api/air-data`)

- `POST /` -> crear lectura.
- `GET /` -> listar lecturas (ordenadas por fecha desc).
- `GET /:id`, `PUT /:id`, `DELETE /:id` -> CRUD lectura.

#### Control de actuadores (`/api/air-control`)

- `GET /` -> obtener estado de control (documento unico).
- `PUT /` -> actualizar campos permitidos (`modo_manual`, `ventana`, `ventilador`, `alarma`).

#### Reportes (`/api/reports`)

- `POST /`, `GET /`, `PUT /:id`, `DELETE /:id`.

### 5.3 Modelos MongoDB

- `User`: email, password hash, role (`guest|operator`), status.
- `AirData`: fecha_hora, habitacion, sensores, controles.
- `AirControl`: modo_manual, ventana, ventilador, alarma, updated_at.
- `Report`: from, to, type, createdAt.

## 6. Flujo de datos end-to-end

1. Sensor/dispositivo envia lectura a `POST /api/air-data`.
2. Frontend consulta `GET /api/air-data` para dashboard/reportes.
3. Usuario operador/invitado envia accion manual a `PUT /api/air-control`.
4. Frontend consulta `GET /api/air-control` para reflejar estado actual.

## 7. Como ejecutar en local

### Requisitos

- Node.js 18+ recomendado.
- npm.
- Acceso a MongoDB Atlas (o adaptar conexion a Mongo local).

### 7.1 Backend

```bash
cd backend-safeair
npm install
npm run dev
```

Servidor por defecto: `http://localhost:3000`.

### 7.2 Frontend

```bash
cd frontend-safe
npm install
npm start
```

App por defecto: `http://localhost:4200`.

## 8. Recomendaciones tecnicas (siguiente paso)

1. Mover URLs y credenciales a variables de entorno (`.env`).
2. Unificar base URL del frontend para todos los servicios.
3. Implementar autenticacion con token (JWT) y middleware de autorizacion por rol.
4. Corregir codificacion UTF-8 en rutas y textos.
5. Agregar README especifico dentro de `frontend-safe` y `backend-safeair` con comandos propios.
