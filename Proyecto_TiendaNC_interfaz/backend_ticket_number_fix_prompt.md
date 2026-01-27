**Título: Corrección de la Lógica de Numeración de Tickets Diarios en el Endpoint `/ventas/agregarVenta`**

**Descripción del Problema:**
Actualmente, el frontend intenta gestionar la creación de tickets de venta con numeración consecutiva por día. Sin embargo, al realizar llamadas `POST` al endpoint `/ventas/agregarVenta` para crear nuevas ventas pendientes, el backend siempre devuelve un `numeroTicket` con valor `1`, independientemente del número secuencial sugerido por el frontend o del estado de ventas previas. Esto provoca que el contador de tickets en el frontend se reinicie constantemente a `1`, generando una inconsistencia en la numeración diaria de las ventas.

**Comportamiento Actual del Frontend (después de las últimas modificaciones):**
El frontend ahora realiza los siguientes pasos para determinar el `numeroTicket` de una nueva venta pendiente:
1.  **Al inicializar la página o después de completar una venta:** Realiza una llamada `GET` a `/ventas/obtenerVentaPorDia/{fechaActual}` para obtener todas las ventas del día.
2.  **Calcula el siguiente número de ticket:** Identifica el `numeroTicket` máximo entre todas las ventas con estatus 'F' (Finalizada) o 'C' (Completada) para la fecha actual, y sugiere `maxNumeroTicketCompletado + 1` como el `numeroTicket` para la nueva venta pendiente.
3.  **Envía la sugerencia al backend:** Este `suggestedTicketNumber` se incluye en el payload de la solicitud `POST` a `/ventas/agregarVenta`.
4.  **Muestra el valor devuelto por el backend:** El frontend muestra el `numeroTicket` que recibe en la respuesta de la API `/ventas/agregarVenta`. Si el backend devuelve `1`, el frontend muestra `1`.

**Cambios Requeridos en el Backend (Endpoint: `POST /ventas/agregarVenta`):**

Para resolver este problema y asegurar una numeración de tickets consecutiva y correcta por día, se requiere modificar la lógica de asignación del `numeroTicket` en el backend. Se sugieren dos posibles enfoques, con preferencia por el primero:

**Opción 1 (Recomendada: Backend como Fuente Única de Verdad para la Secuencia):**
El backend debe ser el responsable principal de determinar y asignar el `numeroTicket` correcto.
*   **Lógica de asignación:** Antes de guardar una nueva venta, el backend debe:
    1.  Consultar la base de datos para encontrar el `numeroTicket` máximo (entre ventas con estatus 'F', 'C' o 'P') para el `idCaja` y la fecha actual.
    2.  Asignar a la nueva venta el valor `maxNumeroTicketExistente + 1`. Si no existen ventas previas para ese `idCaja` y fecha, el `numeroTicket` debe ser `1`.
*   **Ignorar `numeroTicket` del payload:** El backend no debería usar (o sobrescribir) el `numeroTicket` que el frontend pueda enviar en el payload, sino generar el suyo propio.
*   **Respuesta:** La respuesta `RespuestaPersonalizada<VentasDTO>` de `/ventas/agregarVenta` debe incluir este `numeroTicket` correcto y generado por el backend.

**Opción 2 (Alternativa: Backend Respeta la Sugerencia del Frontend - Requiere validación):**
Si el diseño del sistema permite que el frontend sugiera el número de ticket, entonces el backend debe:
*   **Aceptar `numeroTicket` del payload:** Validar y utilizar el `numeroTicket` que el frontend envía en el payload `newSaleData`.
*   **Validación de unicidad y secuencia:** El backend debería verificar que el `numeroTicket` sugerido sea consecutivo y no esté ya en uso para el `idCaja` y la fecha. Si no lo es, debería corregirlo o rechazar la solicitud.
*   **Respuesta:** La respuesta `RespuestaPersonalizada<VentasDTO>` debe reflejar el `numeroTicket` que finalmente fue asignado y persistido.

**Impacto Esperado:**
Con cualquiera de estas implementaciones, el frontend podrá mostrar el número de ticket correcto y consecutivo para cada nueva venta pendiente, lo que mejorará la experiencia del usuario y la integridad de los datos de ventas.
