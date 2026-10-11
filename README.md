# Databodega · Panel de ventas

Panel de seguimiento comercial hecho con React y el CSV semanal de Databodega.

## Abrir el dashboard

1. Instala Node.js si aún no está instalado.
2. En esta carpeta ejecuta `npm install` para instalar las dependencias.
3. Ejecuta `npm start` y abre `http://localhost:4173` en el navegador. Las tipografías web necesitan conexión a internet; la aplicación y los datos corren localmente.

El archivo `ventas_databodega.csv` se sirve localmente. Para revisar otra versión, usa **Cargar CSV**; la vista la procesa en el navegador y actualiza los gráficos.

El panel está organizado en tres secciones: **Resumen** incluye tendencia semanal combinada (barras de unidades y líneas de precio mínimo/máximo), ventas por categoría y mezcla de ingresos; **Productos** combina comparación de ingresos, dispersión de precio frente a volumen y demanda semanal; **Seguimiento** muestra tendencia de quiebres, comparación por zona y un mapa de calor por semana. El estado de conexión aparece en la barra lateral y en la parte superior; al cargar un CSV válido se muestra una confirmación temporal. Si la base inicial no está disponible, aparece el estado desconectado y un acceso para cargar un archivo.

## Indicadores y alcance

- **Ingresos estimados:** `precio_unit × unidades_vendidas`.
- **Quiebres de stock:** cantidad de registros con `quiebre_stock = 1`, expresada como porcentaje de las filas filtradas.
- **Venta promedio por unidad:** ingresos estimados divididos entre unidades vendidas.
- **Promociones:** porcentaje de registros con `promocion = 1`.
- Filtros disponibles: zona, producto, categoría y período (12, 13, 26, 52 semanas o todo el histórico). El buscador filtra por nombre o SKU. El gráfico de ritmo muestra la demanda semanal del producto y zona seleccionados.

Los datos abarcan 105 semanas, del 1 de enero de 2024 al 29 de diciembre de 2025. Ingreso estimado no equivale a utilidad: el CSV no incluye costos, margen ni precios promocionales separados.

Al cargar el archivo, el panel normaliza variantes de zona como `callao ` y elimina filas idénticas repetidas por semana, zona y SKU. En la base entregada se consolidan 90 filas duplicadas de 45 claves. Si una clave repetida tiene valores distintos, el CSV se carga, se cuenta la primera fila y el panel muestra ambos registros para revisión. Conviene resolver esos conflictos antes de usar los datos para pronosticar o sugerir pedidos. La guía plantea un pronóstico a cuatro semanas como alcance posterior del producto.
