# Tech Stack & Rules - CAF Funes Maxi Vóley

## Tech Stack
- **Framework:** React 18 con TypeScript para un desarrollo robusto y tipado.
- **Estilos:** Tailwind CSS para un diseño responsivo y mantenible.
- **Iconos:** Lucide React (reemplazando FontAwesome para mejor integración con React).
- **Backend/Base de Datos:** Supabase (PostgreSQL) para persistencia de datos en tiempo real.
- **Enrutamiento:** React Router para la navegación entre secciones.
- **Notificaciones:** React Hot Toast para feedback visual al usuario.
- **Componentes UI:** Shadcn/UI para componentes accesibles y consistentes.

## Reglas de Desarrollo
- **Persistencia:** Prohibido el uso de `localStorage`. Todas las operaciones deben ser `async/await` usando el cliente de Supabase.
- **Componentización:** Cada sección (Dashboard, Fixture, Plantel, etc.) debe ser un componente independiente en `src/components/` o `src/pages/`.
- **Tipado:** Definir interfaces de TypeScript para todos los modelos de datos (Player, Match, Video, etc.).
- **Estado Global:** Usar hooks personalizados o Context API si es necesario para compartir el estado de carga.
- **Diseño:** Mantener la estética "Dark Mode" con acentos verdes (`#1B5E20`) y dorados (`#FFD700`) definida originalmente.
- **Simplicidad:** Priorizar código limpio y legible sobre abstracciones complejas.