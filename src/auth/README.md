# Authentication System

Sistema de autenticación JWT implementado con **Passport.js** para el PMS backend.

## 🔐 Características

- ✅ Autenticación basada en JWT (JSON Web Tokens)
- ✅ Protección global de rutas (todas las rutas requieren autenticación por defecto)
- ✅ Decorator `@Public()` para rutas sin autenticación
- ✅ Decorator `@Roles()` para control de acceso basado en roles
- ✅ Decorator `@CurrentUser()` para obtener datos del usuario autenticado
- ✅ Multi-tenant: cada usuario tiene un `tenantId`
- ✅ Passwords hasheados con bcrypt
- ✅ Actualización automática de `lastLoginAt`

---

## 📂 Estructura de Archivos

```
src/auth/
├── strategies/
│   ├── jwt.strategy.ts          # Valida tokens JWT en rutas protegidas
│   └── local.strategy.ts        # Valida email/password en login
├── guards/
│   ├── jwt-auth.guard.ts        # Guard global para JWT (soporta @Public)
│   ├── local-auth.guard.ts      # Guard para endpoint de login
│   └── roles.guard.ts           # Guard para validar roles
├── decorators/
│   ├── public.decorator.ts      # @Public() - marca rutas públicas
│   ├── roles.decorator.ts       # @Roles() - restringe por roles
│   └── current-user.decorator.ts # @CurrentUser() - obtiene usuario actual
├── dto/
│   ├── login.dto.ts             # Request de login
│   └── login-response.dto.ts    # Response de login
├── auth.service.ts              # Lógica de autenticación
├── auth.controller.ts           # Endpoints de auth
└── auth.module.ts               # Módulo de auth
```

---

## 🔄 Diferencia entre Strategies

### 1. **LocalStrategy** ([local.strategy.ts](./strategies/local.strategy.ts))

**¿Cuándo se usa?** Solo durante el **LOGIN**

**¿Qué hace?**
- Intercepta el POST `/auth/login`
- Recibe `email` y `password` del request body
- Llama a `AuthService.validateUser()` para verificar credenciales
- Si son válidas, adjunta el usuario a `req.user`
- Si son inválidas, lanza error 401

**Flujo:**
```
Usuario → POST /auth/login { email, password }
       ↓
LocalAuthGuard activa LocalStrategy
       ↓
LocalStrategy.validate(email, password)
       ↓
AuthService.validateUser() → busca en BD y verifica password
       ↓
Si es válido → req.user = usuario completo de la BD
       ↓
AuthController.login() genera JWT token
       ↓
Response: { access_token, user }
```

**Código simplificado:**
```typescript
// LocalStrategy intercepta el login
async validate(email: string, password: string): Promise<User> {
  // Busca usuario en BD y verifica password
  const user = await this.authService.validateUser(email, password);
  if (!user) {
    throw new UnauthorizedException('Invalid credentials');
  }
  return user; // Se adjunta a req.user
}
```

---

### 2. **JwtStrategy** ([jwt.strategy.ts](./strategies/jwt.strategy.ts))

**¿Cuándo se usa?** En **TODAS las rutas protegidas** después del login

**¿Qué hace?**
- Intercepta requests con header `Authorization: Bearer <token>`
- Extrae y decodifica el token JWT
- Valida que el token sea válido y no haya expirado
- Adjunta los datos del usuario a `req.user`

**Flujo:**
```
Usuario → GET /auth/profile
       → Header: Authorization: Bearer eyJhbGc...
       ↓
JwtAuthGuard activa JwtStrategy
       ↓
JwtStrategy extrae el token del header
       ↓
JwtStrategy decodifica el token (verifica firma y expiración)
       ↓
JwtStrategy.validate(payload) → valida el contenido
       ↓
req.user = { userId, publicId, email, tenantId, role }
       ↓
Controller puede usar @CurrentUser()
```

**Código simplificado:**
```typescript
// JwtStrategy decodifica el token en cada request
async validate(payload: JwtPayload) {
  // payload ya está decodificado del token
  // Solo validamos que tenga los campos necesarios
  if (!payload.sub || !payload.tenantId) {
    throw new UnauthorizedException('Invalid token');
  }

  // Retornamos los datos que queremos en req.user
  return {
    userId: payload.sub,
    publicId: payload.publicId,
    email: payload.email,
    tenantId: payload.tenantId,
    role: payload.role,
  };
}
```

---

## 🔑 Comparación Visual

| Aspecto | LocalStrategy | JwtStrategy |
|---------|---------------|-------------|
| **Cuándo** | Solo en LOGIN | Todas las rutas protegidas |
| **Entrada** | email + password | Token JWT del header |
| **Hace** | Verifica en BD | Decodifica token |
| **Salida** | Usuario completo | Datos del token |
| **Endpoints** | `/auth/login` | `/users/*`, `/auth/profile`, etc. |
| **Guard** | `LocalAuthGuard` | `JwtAuthGuard` (global) |

---

## 🚀 Uso

### 1. Login

**Request:**
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "code": 200,
  "status": "successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "publicId": "550e8400-e29b-41d4-a716-446655440000",
      "email": "admin@example.com",
      "firstName": "System",
      "lastName": "Admin",
      "role": "ADMIN",
      "tenantId": 1
    }
  },
  "timestamp": "2025-11-04T10:00:00.000Z"
}
```

---

### 2. Acceder a Rutas Protegidas

**Request:**
```bash
GET /auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "code": 200,
  "status": "successful",
  "data": {
    "userId": 1,
    "publicId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@example.com",
    "tenantId": 1,
    "role": "ADMIN"
  },
  "timestamp": "2025-11-04T10:00:00.000Z"
}
```

---

### 3. Usar en Controllers

#### Ruta Pública (sin autenticación)
```typescript
import { Public } from './auth/decorators/public.decorator';

@Public()
@Get()
getHello() {
  return 'Hello World'; // Cualquiera puede acceder
}
```

#### Obtener Usuario Actual
```typescript
import { CurrentUser, CurrentUserData } from './auth/decorators/current-user.decorator';

@Get('profile')
getProfile(@CurrentUser() user: CurrentUserData) {
  // user = { userId, publicId, email, tenantId, role }
  return user;
}

// También puedes obtener un campo específico
@Get('email')
getEmail(@CurrentUser('email') email: string) {
  return { email };
}
```

#### Restringir por Roles
```typescript
import { UseGuards } from '@nestjs/common';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Delete(':id')
deleteUser(@Param('id') id: string) {
  // Solo ADMIN y MANAGER pueden acceder
}

@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Post('critical-action')
criticalAction() {
  // Solo ADMIN puede acceder
}
```

---

## 🔐 Contenido del Token JWT

El token contiene el siguiente payload:

```typescript
{
  sub: number;        // user.id (interno)
  publicId: string;   // user.publicId (UUID)
  email: string;      // user.email
  tenantId: number;   // tenant del usuario
  role: string;       // UserRole (ADMIN, MANAGER, etc.)
  iat: number;        // Issued at (timestamp)
  exp: number;        // Expiration (timestamp)
}
```

---

## ⚙️ Configuración

### Variables de Entorno

Añade a tu archivo `.env`:

```env
# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=1h
```

**Importante:**
- Cambia `JWT_SECRET` en producción por un valor aleatorio y seguro
- `JWT_EXPIRES_IN` puede ser: `15m`, `1h`, `7d`, etc.

---

## 🧪 Testing con Swagger

1. Inicia la aplicación: `pnpm run start:dev`
2. Ve a `http://localhost:3000/api/docs`
3. **Identifica rutas protegidas**: Las rutas con 🔒 (candadito) requieren autenticación
4. Haz login en `POST /auth/login` (sin candadito, es pública)
5. Copia el `access_token` de la respuesta
6. Click en **"Authorize"** (botón verde arriba a la derecha)
7. Pega el token (sin "Bearer", solo el token)
8. Ahora puedes probar todas las rutas protegidas (con 🔒)

---

## 👥 Usuarios de Prueba

Si ejecutaste los seeds (`pnpm run seed:run`), tienes estos usuarios:

| Email | Password | Role | Tenant ID |
|-------|----------|------|-----------|
| admin@example.com | password123 | ADMIN | 1 |
| manager@example.com | password123 | MANAGER | 1 |
| receptionist@example.com | password123 | RECEPTIONIST | 1 |
| housekeeper@example.com | password123 | HOUSEKEEPER | 1 |

---

## 🔒 Seguridad

- ✅ Passwords hasheados con bcrypt (10 rounds)
- ✅ Tokens firmados con secreto en variables de entorno
- ✅ Validación de expiración de tokens
- ✅ Usuarios inactivos no pueden hacer login
- ✅ `@Exclude()` en campos sensibles (passwordHash, id, tenantId)
- ✅ Email único globalmente (no se puede duplicar)

---

## 📝 Notas Importantes

1. **Protección Global**: Todas las rutas están protegidas por defecto. Usa `@Public()` para rutas sin auth.

2. **Multi-tenant**: El `tenantId` se obtiene automáticamente del usuario al hacer login. No es necesario enviarlo en cada request.

3. **Roles**: Los roles están definidos en `src/users/enums/user-role.enum.ts`:
   - `ADMIN`
   - `MANAGER`
   - `RECEPTIONIST`
   - `HOUSEKEEPER`

4. **Request User**: En cualquier ruta protegida puedes acceder a:
   ```typescript
   @CurrentUser() user: CurrentUserData
   // user = { userId, publicId, email, tenantId, role }
   ```

5. **Email Único**: El email es único globalmente, no por tenant. Si necesitas permitir emails duplicados por tenant, tendrías que modificar la entidad User.
