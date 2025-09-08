Requerimientos Funcionales: Buscador de Cartas ARCANA
1. Objetivo de la Aplicación
El propósito de esta aplicación web es proporcionar una herramienta digital, interactiva y fácil de usar para que los Directores de Juego (DJ) y los jugadores del sistema de rol ARCANA puedan buscar, visualizar y organizar todas las cartas disponibles en el sistema. La herramienta debe agilizar la creación de personajes, la progresión y la consulta de reglas durante las partidas.

2. Vista Principal y Flujo de Usuario
2.1. Vista por Defecto
Al cargar la aplicación, el usuario debe ser presentado con una galería visual de todas las cartas del sistema, ordenadas por defecto alfabéticamente por su nombre. Cada carta en esta vista de galería debe ser un resumen visual que muestre, como mínimo, su nombre, nivel y el ícono o nombre del atributo principal que requiere.

2.2. Interacción Básica
Al pasar el cursor sobre una carta en la galería, esta debería tener un sutil efecto visual para indicar que es interactiva.

Al hacer clic en una carta, se debe mostrar una vista detallada con toda la información de la misma (ver sección 4).

3. Funcionalidad de Búsqueda y Filtrado
Esta es la funcionalidad central de la herramienta. En un lugar visible y accesible de la interfaz (preferiblemente una barra lateral o una sección superior), deben estar presentes las siguientes opciones para que el usuario pueda refinar la galería de cartas en tiempo real:

3.1. Búsqueda por Texto
Un campo de texto que permita al usuario escribir el nombre de una carta. La galería de cartas debe actualizarse automáticamente a medida que el usuario escribe, mostrando solo las cartas cuyo nombre coincida con el texto introducido.

3.2. Filtros
Debe haber un conjunto de filtros que el usuario pueda combinar para encontrar exactamente lo que necesita. Al aplicar cualquier filtro, la galería se actualiza instantáneamente.

Filtrar por Nivel:

Una serie de botones, checkboxes o un slider que permita seleccionar uno o varios niveles (del 1 al 5).

Ejemplo de uso: Un jugador quiere ver todas las cartas de Nivel 3.

Filtrar por Tipo de Carta:

Opciones para seleccionar "Accionable", "De Efecto" o ambas.

Ejemplo de uso: Un DJ quiere buscar una habilidad pasiva, así que filtra por "De Efecto".

Filtrar por Requerimiento de Atributo:

Botones o íconos para cada uno de los cinco atributos: Cuerpo, Agilidad, Mente, Instinto, Presencia.

Ejemplo de uso: Un personaje con mucha Agilidad quiere ver qué cartas podría usar, así que filtra por "Agilidad".

Filtrar por Sintonía (Escuela o Disciplina):

Un menú desplegable o una lista de checkboxes que incluya todas las "Sintonías" disponibles (ej. "Magia Sacerdotal", "Maestro de Armas", "Furia", "Infiltrador", etc.).

Ejemplo de uso: Un jugador que está construyendo un bárbaro quiere ver todas las habilidades relacionadas con la furia, así que filtra por "Furia".

3.3. Botón para Limpiar Filtros
Un botón visible que permita al usuario eliminar todos los filtros aplicados y la búsqueda de texto con un solo clic, restaurando la vista de la galería a su estado por defecto.

4. Vista de Detalle de la Carta
Al hacer clic en cualquier carta de la galería, la aplicación debe mostrar una vista ampliada y clara con toda su información, presentada de forma legible:

Nombre de la Carta (destacado)

Nivel

Tipo (Accionable o De Efecto)

Requerimiento/s (ej. "Cuerpo 2", "Sintonía con el Acero")

Descripción Completa (el texto que explica su efecto)

Cooldown (si lo tiene)

Esta vista puede ser un pop-up (modal) sobre la galería o una sección dedicada en la página. Debe haber una forma clara de cerrarla y volver a la galería.

# Requerimientos técnicos: Aplicación Web Modular con Vanilla JavaScript

## 🏗️ **Arquitectura General**

### **Patrón de Diseño**
- **Arquitectura Modular por Componentes**: Cada funcionalidad se encapsula en componentes independientes
- **Separación de Responsabilidades**: Lógica de negocio, presentación y datos separados en capas
- **Patrón de Servicios**: Servicios especializados para manejo de datos y estado
- **Router Client-Side**: Navegación SPA sin recargas de página

### **Estructura de Directorios**
```
src/
├── components/          # Componentes reutilizables
│   └── ComponentName/
│       ├── ComponentName.js
│       └── ComponentName.css
├── pages/              # Páginas/vistas principales
│   └── PageName/
│       ├── PageName.js
│       └── PageName.css
├── services/           # Lógica de negocio y datos
├── utils/              # Utilidades compartidas
├── models/             # Modelos de datos
├── libs/               # Librerías externas
└── app.css            # Estilos globales unificados
```

### **Convenciones de Nomenclatura**
- **Componentes y Páginas**: PascalCase (ej: `CardComponent`, `ShopPage`)
- **Servicios, Utils, Models**: kebab-case (ej: `card-service`, `storage-utils`, `user-model`)
- **Archivos CSS**: Mismo nombre que el componente/página (ej: `CardComponent.css`, `ShopPage.css`)

## 🔧 **Consideraciones Técnicas**

### **Sistema de Componentes**

#### **Estructura de Archivos por Componente**
```
src/components/CardComponent/
├── CardComponent.js    # Lógica del componente
└── CardComponent.css   # Estilos específicos del componente
```

#### **Ejemplo de Definición de Componente**
```javascript
/**
 * CardComponent - Componente para mostrar cartas individuales
 * @param {HTMLElement} container - Contenedor donde renderizar
 * @param {Object} props - Propiedades del componente
 */
const CardComponent = (container, props = {}) => {
    // Estado interno del componente
    let state = {
        card: props.card || null,
        showActions: props.showActions !== false,
        compact: props.compact || false,
        ...props
    };

    // Método de renderizado
    const render = () => {
        if (!state.card) {
            return html`<div class="card-error">No se pudo cargar la carta</div>`;
        }

        return html`
            <div class="pokemon-card ${state.compact ? 'compact' : ''}">
                <div class="card-inner">
                    <div class="card-header">
                        <h3 class="card-name">${state.card.name}</h3>
                    </div>
                    <!-- Más contenido del componente -->
                </div>
            </div>
        `;
    };

    // Método de inicialización
    const init = () => {
        loadStyles();
        container.innerHTML = render();
        bindEvents();
    };

    // Método para cargar estilos
    const loadStyles = () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = './src/components/CardComponent/CardComponent.css';
        document.head.appendChild(link);
    };

    // Método para vincular eventos
    const bindEvents = () => {
        // Event listeners específicos del componente
    };

    // Método para actualizar el estado
    const setState = (newState) => {
        state = { ...state, ...newState };
        container.innerHTML = render();
        bindEvents();
    };

    // API pública del componente
    return {
        init,
        setState,
        render
    };
};

// Export del componente
export default CardComponent;
```

### **Sistema de Páginas**

#### **Estructura de Archivos por Página**
```
src/pages/ShopPage/
├── ShopPage.js         # Lógica de la página
└── ShopPage.css        # Estilos específicos de la página
```

#### **Ejemplo de Definición de Página**
```javascript
/**
 * ShopPage - Página de tienda
 * @param {HTMLElement} container - Contenedor donde renderizar
 */
const ShopPage = (container) => {
    let state = {
        cards: [],
        loading: true,
        error: null
    };

    const render = () => html`
        <div class="page-container">
            <div class="page-header">
                <h1 class="page-title">🛒 Tienda</h1>
            </div>
            <div class="page-content">
                ${state.loading ? renderLoading() : renderContent()}
            </div>
        </div>
    `;

    const init = () => {
        loadStyles();
        container.innerHTML = render();
        loadData();
        bindEvents();
    };

    const loadStyles = () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = './src/pages/ShopPage/ShopPage.css';
        document.head.appendChild(link);
    };

    return { init };
};

export default ShopPage;
```

### **Sistema de Estilos con CSS Anidado**

#### **CSS Anidado Moderno**
```css
/* CardComponent.css */
.pokemon-card {
    background: var(--card-bg);
    border-radius: var(--radius-xl);
    transition: all 0.3s ease;
    
    /* Estados del componente */
    &:hover {
        transform: translateY(-8px);
        box-shadow: var(--shadow-lg);
    }
    
    &.compact {
        height: 300px;
    }
    
    &.used {
        opacity: 0.8;
        border-color: var(--pokemon-red);
    }
    
    /* Elementos internos */
    .card-inner {
        padding: var(--spacing-lg);
        display: flex;
        flex-direction: column;
        height: 100%;
        
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: var(--spacing-md);
            
            .card-name {
                font-size: 1.25rem;
                font-weight: bold;
                color: var(--text-primary);
                margin: 0;
            }
            
            .card-meta {
                display: flex;
                flex-direction: column;
                gap: var(--spacing-xs);
                align-items: flex-end;
            }
        }
        
        .card-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            
            .card-description {
                color: var(--text-secondary);
                font-size: 0.875rem;
                margin-bottom: var(--spacing-md);
                line-height: 1.5;
                flex: 1;
            }
            
            .card-actions {
                display: flex;
                gap: var(--spacing-sm);
                flex-wrap: wrap;
                margin-top: auto;
                padding-top: var(--spacing-md);
                
                .action-button {
                    flex: 1;
                    min-width: 0;
                    font-size: 0.875rem;
                    padding: var(--spacing-md);
                    justify-content: center;
                    
                    &.use-button {
                        background: var(--pokemon-green);
                        
                        &:hover {
                            background: var(--pokemon-green-dark);
                        }
                    }
                    
                    &.sell-button {
                        background: var(--pokemon-yellow);
                        color: white;
                        
                        &:hover {
                            background: var(--pokemon-yellow-dark);
                        }
                    }
                }
            }
        }
    }
    
    /* Responsive design */
    @media (max-width: 768px) {
        .card-inner {
            padding: var(--spacing-md);
            
            .card-header {
                flex-direction: column;
                gap: var(--spacing-sm);
                
                .card-meta {
                    align-items: flex-start;
                }
            }
        }
    }
}
```

#### **Variables CSS Globales**
```css
/* app.css - Variables globales */
:root {
    /* Colores principales */
    --pokemon-blue: #3b82f6;
    --pokemon-yellow: #fbbf24;
    --pokemon-red: #ef4444;
    --pokemon-green: #10b981;
    
    /* Estados hover */
    --pokemon-blue-dark: #2563eb;
    --pokemon-yellow-dark: #d97706;
    --pokemon-red-dark: #dc2626;
    --pokemon-green-dark: #059669;
    
    /* Colores de UI */
    --primary-bg: #1e293b;
    --secondary-bg: #334155;
    --card-bg: #475569;
    --text-primary: #f8fafc;
    --text-secondary: #cbd5e1;
    
    /* Espaciado */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;
    
    /* Border radius */
    --radius-sm: 0.375rem;
    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
    --radius-xl: 1rem;
    
    /* Sombras */
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
```

### **Gestión de Estado**
- **Estado Local por Componente**: Cada componente mantiene su propio estado interno
- **Estado Global a través de Servicios**: Servicios singleton para datos compartidos
- **Persistencia con LocalStorage**: Almacenamiento local del estado de la aplicación
- **Patrón Observer**: Notificaciones entre componentes cuando cambia el estado

### **Sistema de Servicios (kebab-case)**
```javascript
// card-service.js
const CardService = {
    getCards: () => { /* lógica */ },
    addCard: (card) => { /* lógica */ }
};

export default CardService;
```

### **Sistema de Utilidades (kebab-case)**
```javascript
// storage-utils.js
const StorageUtils = {
    save: (key, data) => { /* lógica */ },
    load: (key) => { /* lógica */ }
};

export default StorageUtils;
```

### **Sistema de Routing**
- **Hash-based Routing**: Navegación basada en hash para compatibilidad
- **Route Guards**: Validación de rutas antes de renderizar
- **Dynamic Imports**: Carga dinámica de componentes según la ruta
- **History API**: Integración con el historial del navegador

### **Sistema de Estilos Avanzado**
- **CSS Variables**: Variables CSS para theming y consistencia
- **CSS Anidado**: Estructura jerárquica de estilos para mejor organización
- **BEM Methodology**: Nomenclatura consistente para clases CSS
- **Mobile-First**: Diseño responsive desde móvil hacia desktop
- **CSS Grid y Flexbox**: Layout moderno y flexible
- **Estilos por Componente**: Cada componente tiene su archivo CSS específico
- **Estilos Globales**: `app.css` para estilos compartidos y variables
- **Nesting Selectors**: Selectores anidados para mejor legibilidad

### **Gestión de Dependencias**
- **ES6 Modules**: Import/export para modularidad
- **Dynamic Imports**: Carga bajo demanda de módulos
- **No Build Step**: Desarrollo sin herramientas de compilación
- **CDN para Librerías**: Librerías externas cargadas desde CDN

### **Optimizaciones de Rendimiento**
- **Lazy Loading**: Carga diferida de imágenes y componentes
- **Event Delegation**: Reducción de listeners de eventos
- **Debouncing**: Optimización de funciones frecuentes
- **Memory Management**: Limpieza de event listeners y referencias

### **Patrones de Comunicación**
- **Props Down, Events Up**: Comunicación unidireccional
- **Service Bus**: Comunicación entre componentes no relacionados
- **Callback Pattern**: Notificaciones asíncronas
- **Promise-based**: Manejo de operaciones asíncronas

### **Manejo de Errores**
- **Try-Catch Blocks**: Captura de errores en operaciones críticas
- **Error Boundaries**: Aislamiento de errores por componente
- **User Feedback**: Notificaciones de error amigables
- **Fallback UI**: Interfaces de respaldo para estados de error

### **Testing Strategy**
- **Unit Testing**: Pruebas individuales por componente
- **Integration Testing**: Pruebas de interacción entre servicios
- **Mock Services**: Simulación de servicios para pruebas
- **Test Utilities**: Herramientas compartidas para testing

### **Configuración y Despliegue**
- **Environment Variables**: Configuración por entorno
- **Static File Serving**: Servidor estático para desarrollo
- **CDN Integration**: Distribución de assets estáticos
- **Progressive Enhancement**: Funcionalidad básica sin JavaScript

### **Consideraciones de Seguridad**
- **Input Sanitization**: Limpieza de datos de entrada
- **XSS Prevention**: Prevención de ataques de script
- **CSRF Protection**: Protección contra ataques CSRF
- **Content Security Policy**: Políticas de seguridad de contenido

### **Escalabilidad**
- **Modular Architecture**: Fácil adición de nuevos componentes
- **Service Layer**: Lógica de negocio reutilizable
- **Plugin System**: Extensibilidad mediante plugins
- **Configuration-driven**: Comportamiento configurable

### **Mantenibilidad**
- **Single Responsibility**: Cada módulo tiene una responsabilidad
- **DRY Principle**: Evitar duplicación de código
- **Consistent Naming**: Convenciones de nomenclatura claras
- **Documentation**: Documentación técnica actualizada

### **Compatibilidad**
- **ES6+ Features**: Uso de características modernas de JavaScript
- **Polyfills**: Soporte para navegadores antiguos cuando necesario
- **Progressive Enhancement**: Funcionalidad básica sin JavaScript
- **Cross-browser Testing**: Pruebas en múltiples navegadores

## 📋 **Checklist de Implementación**

### **Al crear un nuevo componente:**
- [ ] Crear directorio con nombre PascalCase
- [ ] Crear archivo `.js` con mismo nombre
- [ ] Crear archivo `.css` con mismo nombre
- [ ] Implementar estructura básica del componente
- [ ] Agregar CSS anidado para estilos específicos
- [ ] Implementar método `loadStyles()`
- [ ] Agregar documentación JSDoc

### **Al crear una nueva página:**
- [ ] Crear directorio con nombre PascalCase
- [ ] Crear archivo `.js` con mismo nombre
- [ ] Crear archivo `.css` con mismo nombre
- [ ] Implementar estructura básica de la página
- [ ] Agregar CSS anidado para estilos específicos
- [ ] Registrar ruta en el router
- [ ] Agregar documentación JSDoc

### **Al crear un nuevo servicio/utilidad:**
- [ ] Usar nomenclatura kebab-case
- [ ] Implementar patrón singleton si es necesario
- [ ] Agregar manejo de errores
- [ ] Documentar API pública
- [ ] Agregar tests unitarios

Esta arquitectura proporciona una base sólida para aplicaciones web modernas, manteniendo la simplicidad del vanilla JavaScript mientras aprovecha patrones y principios de desarrollo profesional.
