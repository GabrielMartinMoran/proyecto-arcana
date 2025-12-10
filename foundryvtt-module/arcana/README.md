# Arcana FoundryVTT Module - TypeScript Version

Este módulo integra Arcana RPG en FoundryVTT utilizando hojas de personaje basadas en web.

## 🚀 Desarrollo

### Configuración Inicial

```bash
npm install
```

### Modo Desarrollo (Recomendado)

Durante el desarrollo, ejecuta el modo watch para recompilar automáticamente:

```bash
npm run watch
```

Esto observará los archivos TypeScript y recompilará automáticamente cuando detecte cambios.

### Compilar para Producción

```bash
npm run build
```

Genera `dist/main.js` que es cargado por FoundryVTT.

## 📁 Estructura del Proyecto

```
arcana/
├── src/
│   ├── types/           # Definiciones de tipos TypeScript
│   │   ├── actor.ts     # Tipos de actores
│   │   ├── messages.ts  # Tipos de mensajes
│   │   ├── config.ts    # Tipos de configuración
│   │   ├── foundry.ts   # Augmentaciones de FoundryVTT
│   │   └── index.ts     # Exportaciones centrales
│   ├── services/        # Servicios siguiendo principios SOLID
│   │   ├── RollHandler.ts     # Manejo de tiradas
│   │   └── ActorUpdater.ts    # Actualización de actores
│   ├── sheets/          # Hojas de personaje
│   │   └── arcana-sheet.ts
│   ├── hooks/           # Hooks de FoundryVTT
│   │   ├── init.ts
│   │   └── render-token-hud.ts
│   ├── listeners/       # Event listeners
│   │   └── message-listener.ts
│   ├── helpers/         # Funciones auxiliares
│   │   ├── actor-urls.ts
│   │   └── rolls-helper.ts
│   ├── config.ts        # Configuración del módulo
│   └── helpers.ts       # Utilidades generales
├── dist/                # Salida compilada (generada automáticamente)
│   ├── main.js          # Bundle compilado
│   └── main.js.map      # Source maps para debugging
├── main.ts              # Punto de entrada
├── build.mjs            # Script de compilación esbuild
├── tsconfig.json        # Configuración TypeScript
├── package.json         # Dependencias y scripts
└── module.json          # Manifest de FoundryVTT

```

## 🛠️ Scripts Disponibles

| Script     | Comando             | Descripción                                  |
| ---------- | ------------------- | -------------------------------------------- |
| Build      | `npm run build`     | Compilar para producción                     |
| Watch      | `npm run watch`     | Compilar automáticamente al cambiar archivos |
| Type Check | `npm run typecheck` | Verificar tipos sin compilar                 |
| Lint       | `npm run lint`      | Validar código con ESLint                    |
| Format     | `npm run format`    | Formatear código con Prettier                |

## 📚 Arquitectura

### Principios SOLID Aplicados

El código sigue principios SOLID para máxima mantenibilidad:

- **Single Responsibility**: Cada servicio tiene una responsabilidad única
  - `RollHandler`: Solo maneja tiradas precalculadas
  - `ActorUpdater`: Solo actualiza actores desde mensajes

- **Dependency Injection**: Los servicios son instanciados en `message-listener.ts`

- **Type Safety**: TypeScript estricto con definiciones de tipos centralizadas

### Tipos Compartidos

Todos los tipos están en `src/types/` para reutilización:

- Importa desde `'../types/actor.js'` para tipos de actores
- Importa desde `'../types/messages.js'` para tipos de mensajes
- Importa desde `'../types/config.js'` para configuración

## 🔧 Integración con FoundryVTT

El módulo ahora compila a `dist/main.js`, referenciado en `module.json`:

```json
{
	"esmodules": ["dist/main.js"]
}
```

**Importante**: El directorio `dist/` NO está en `.gitignore` porque contiene el código compilado necesario para FoundryVTT.

## 🐛 Debug

El build incluye source maps, permitiendo debug directo del código TypeScript en las DevTools del navegador.

## ⚡ Rendimiento

- **Tiempo de compilación**: ~11ms
- **Tamaño del bundle**: 15.9kb (minificado)
- **Source maps**: 32.2kb

## 📝 Notas de Migración

Este proyecto fue migrado de JavaScript puro a TypeScript con:

- ✅ Configuración TypeScript estricta
- ✅ Build system con esbuild
- ✅ Modo watch para desarrollo rápido
- ✅ Refactorización con principios SOLID
- ✅ Separación de concerns en servicios
- ✅ Sistema de tipos robusto

Para más detalles, ver el [walkthrough de migración](/.gemini/antigravity/brain/ac890f8d-7d0d-4d97-a089-1c9dc5cd85c1/walkthrough.md).
