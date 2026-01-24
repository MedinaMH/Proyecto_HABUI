document.addEventListener("DOMContentLoaded", function () {
d3.select("body").style("background-color", "#0b0f19");

// ============================================================
// ============ TANQUE DE AGUA ====================
// ============================================================
function crearTanqueAgua(containerId, valorInicial) {
    const container = d3.select(containerId);
    container.html(""); // Limpiar contenedor

    const width = 380;
    const height = 520;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    // Título
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 35)
        .attr("fill", "#ffffffff")
        .attr("font-size", "24px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .text("");

    // Dimensiones del tanque
    const tanqueWidth = 220;
    const tanqueHeight = 340;
    const tanqueX = (width - tanqueWidth) / 2;
    const tanqueY = 80;
    const tanqueCurvatura = 15;

    // --- Efectos 3D y sombras ---
    const defs = svg.append("defs");

    // Gradiente para efecto metálico del tanque
    const gradienteTanque = defs.append("linearGradient")
        .attr("id", "gradTanque")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "100%").attr("y2", "0%");

    gradienteTanque.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#2c3e50")
        .attr("stop-opacity", 0.8);

    gradienteTanque.append("stop")
        .attr("offset", "50%")
        .attr("stop-color", "#34495e")
        .attr("stop-opacity", 1);

    gradienteTanque.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#2c3e50")
        .attr("stop-opacity", 0.8);

    // Sombra del tanque
    const filtroSombra = defs.append("filter")
        .attr("id", "sombraTanque")
        .attr("x", "-20%").attr("y", "-20%")
        .attr("width", "140%").attr("height", "140%");

    filtroSombra.append("feDropShadow")
        .attr("dx", "2")
        .attr("dy", "5")
        .attr("stdDeviation", "8")
        .attr("flood-color", "#000")
        .attr("flood-opacity", "0.3");

    // Gradiente para el agua (realista con ondulaciones)
    const gradienteAgua = defs.append("linearGradient")
        .attr("id", "gradAgua")
        .attr("x1", "0%").attr("y1", "100%")
        .attr("x2", "0%").attr("y2", "0%");

    gradienteAgua.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#1e90ff")  // Azul profundo
        .attr("stop-opacity", 0.9);

    gradienteAgua.append("stop")
        .attr("offset", "50%")
        .attr("stop-color", "#00bfff")  // Azul medio
        .attr("stop-opacity", 0.8);

    gradienteAgua.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#87ceeb")  // Azul claro
        .attr("stop-opacity", 0.7);

    // --- ESTRUCTURA DEL TANQUE ---

    // Base del tanque (sombra)
    svg.append("rect")
        .attr("x", tanqueX + 5)
        .attr("y", tanqueY + 5)
        .attr("width", tanqueWidth)
        .attr("height", tanqueHeight)
        .attr("rx", tanqueCurvatura)
        .attr("ry", tanqueCurvatura)
        .attr("fill", "#000")
        .attr("opacity", 0.3)
        .attr("filter", "url(#sombraTanque)");

    // Cuerpo principal del tanque
    const cuerpoTanque = svg.append("rect")
        .attr("x", tanqueX)
        .attr("y", tanqueY)
        .attr("width", tanqueWidth)
        .attr("height", tanqueHeight)
        .attr("rx", tanqueCurvatura)
        .attr("ry", tanqueCurvatura)
        .attr("fill", "url(#gradTanque)")
        .attr("stroke", "#4a6572")
        .attr("stroke-width", 3);

    // Reflejo metálico (efecto 3D)
    const reflejo = svg.append("rect")
        .attr("x", tanqueX + 5)
        .attr("y", tanqueY + 5)
        .attr("width", 40)
        .attr("height", tanqueHeight - 10)
        .attr("rx", 8)
        .attr("fill", "rgba(255, 255, 255, 0.15)")
        .attr("opacity", 0.6);

    // Tapa superior del tanque
    const tapa = svg.append("rect")
        .attr("x", tanqueX - 10)
        .attr("y", tanqueY - 15)
        .attr("width", tanqueWidth + 20)
        .attr("height", 20)
        .attr("rx", 10)
        .attr("fill", "#2c3e50")
        .attr("stroke", "#4a6572")
        .attr("stroke-width", 2);

    // Indicador de llenado (barra lateral)
    const indicadorBarra = svg.append("rect")
        .attr("x", tanqueX + tanqueWidth + 20)
        .attr("y", tanqueY)
        .attr("width", 12)
        .attr("height", tanqueHeight)
        .attr("rx", 6)
        .attr("fill", "#1a252f")
        .attr("stroke", "#34495e")
        .attr("stroke-width", 2);

    // Nivel de agua
    const agua = svg.append("rect")
        .attr("x", tanqueX)
        .attr("width", tanqueWidth)
        .attr("fill", "url(#gradAgua)")
        .attr("rx", tanqueCurvatura - 2)
        .attr("opacity", 0.85);

    // Superficie del agua (ondulación)
    const superficieAgua = svg.append("rect")
        .attr("x", tanqueX)
        .attr("width", tanqueWidth)
        .attr("height", 3)
        .attr("fill", "rgba(255, 255, 255, 0.4)")
        .attr("rx", 2);

    // Indicador de nivel en la barra lateral
    const indicadorNivel = svg.append("rect")
        .attr("x", tanqueX + tanqueWidth + 22)
        .attr("width", 8)
        .attr("fill", "#00bfff")
        .attr("rx", 4);

    // --- MARCAS DE NIVEL ---
    const marcasY = [];
    for (let i = 0; i <= 100; i += 25) {
        const y = tanqueY + tanqueHeight - (i / 100) * tanqueHeight;
        marcasY.push({ y, valor: i });
        
        // Líneas grandes cada 25%
        svg.append("line")
            .attr("x1", tanqueX - 15)
            .attr("x2", tanqueX - 5)
            .attr("y1", y)
            .attr("y2", y)
            .attr("stroke", "#00bfff")
            .attr("stroke-width", 4);
        
        // Texto de porcentaje
        svg.append("text")
            .attr("x", tanqueX - 20)
            .attr("y", y + 4)
            .attr("fill", "#ffffffff")
            .attr("font-size", "20px")
            .attr("text-anchor", "end")
            .text(i + "%");
    }

    // --- DISPLAY NUMÉRICO ---
    const display = svg.append("rect")
        .attr("x", tanqueX + tanqueWidth - 180)
        .attr("y", tanqueY + tanqueHeight + 25)
        .attr("width", 150)
        .attr("height", 50)
        .attr("rx", 8)
        .attr("fill", "#1a252f")
        .attr("stroke", "#00bfff")
        .attr("stroke-width", 2);

    const textoNivel = svg.append("text")
        .attr("x", tanqueX + tanqueWidth - 100)
        .attr("y", tanqueY + tanqueHeight + 60)
        .attr("fill", "#00ffcc")
        .attr("font-size", "35px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .style("font-family", "'Courier New', monospace")
        .text("00.0%");

    const textoLabel = svg.append("text")
        .attr("x", tanqueX + tanqueWidth - 100)
        .attr("y", tanqueY + tanqueHeight + 100)
        .attr("fill", "#ffffffff")
        .attr("font-size", "25px")
        .attr("text-anchor", "middle")
        .text("");

    // --- ESCALA Y ANIMACIÓN ---
    const escala = d3.scaleLinear()
        .domain([0, 100])
        .range([tanqueY + tanqueHeight, tanqueY]);

    function actualizar(valor) {
        const porcentaje = Math.max(0, Math.min(100, valor));
        const yAgua = escala(porcentaje);
        const alturaAgua = tanqueY + tanqueHeight - yAgua;
        
        // Altura para el indicador de la barra lateral
        const yIndicador = escala(porcentaje);
        const alturaIndicador = tanqueY + tanqueHeight - yIndicador;
        
        // Animación del agua
        agua.transition()
            .duration(800)
            .ease(d3.easeCubicOut)
            .attr("y", yAgua)
            .attr("height", alturaAgua);
        
        // Animación de la superficie del agua
        superficieAgua.transition()
            .duration(800)
            .ease(d3.easeCubicOut)
            .attr("y", yAgua);
        
        // Animación del indicador de la barra lateral
        indicadorNivel.transition()
            .duration(800)
            .ease(d3.easeCubicOut)
            .attr("y", yIndicador)
            .attr("height", alturaIndicador);
        
        // Actualizar display numérico
        textoNivel.transition()
            .duration(400)
            .text(porcentaje.toFixed(1) + "%");
        
        // Cambiar color según nivel
        let colorAgua;
        let colorIndicador;
        
        if (porcentaje < 20) {
            colorAgua = "#ff4444";  // Rojo (crítico)
            colorIndicador = "#ff4444";
        } else if (porcentaje < 40) {
            colorAgua = "#ffaa00";  // Naranja (bajo)
            colorIndicador = "#ffaa00";
        } else if (porcentaje < 70) {
            colorAgua = "#00bfff";  // Azul (normal)
            colorIndicador = "#00bfff";
        } else {
            colorAgua = "#00cc66";  // Verde (óptimo)
            colorIndicador = "#00cc66";
        }
        
        // Actualizar gradiente del agua dinámicamente
        defs.select("#gradAgua").remove();
        const nuevoGradiente = defs.append("linearGradient")
            .attr("id", "gradAgua")
            .attr("x1", "0%").attr("y1", "100%")
            .attr("x2", "0%").attr("y2", "0%");
        
        nuevoGradiente.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", d3.color(colorAgua).darker(0.5))
            .attr("stop-opacity", 0.9);
        
        nuevoGradiente.append("stop")
            .attr("offset", "50%")
            .attr("stop-color", colorAgua)
            .attr("stop-opacity", 0.8);
        
        nuevoGradiente.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", d3.color(colorAgua).brighter(0.5))
            .attr("stop-opacity", 0.7);
        
        agua.attr("fill", "url(#gradAgua)");
        indicadorNivel.attr("fill", colorIndicador);
        
        // Efecto de burbujas cuando se llena
        if (porcentaje > 90) {
            // Crear burbujas aleatorias
            for (let i = 0; i < 3; i++) {
                const bubbleX = tanqueX + Math.random() * tanqueWidth * 0.8 + tanqueWidth * 0.1;
                const bubbleY = yAgua + Math.random() * 10;
                const bubbleSize = Math.random() * 4 + 2;
                
                const bubble = svg.append("circle")
                    .attr("cx", bubbleX)
                    .attr("cy", bubbleY)
                    .attr("r", bubbleSize)
                    .attr("fill", "rgba(255, 255, 255, 0.6)")
                    .attr("opacity", 0);
                
                bubble.transition()
                    .duration(1500)
                    .attr("cy", bubbleY - 30)
                    .attr("opacity", 0.8)
                    .transition()
                    .duration(500)
                    .attr("opacity", 0)
                    .remove();
            }
        }
        
        return porcentaje;
    }

    // Inicializar con el valor inicial
    actualizar(valorInicial);

    // =================== CARGAR ÚLTIMO DATO DE LA BD ===================
    async function cargarUltimoDatoBD() {
        try {
            console.log('Cargando datos de agua desde BD para obtener el último...');
            const response = await fetch('/api/agua/');
            
            if (!response.ok) {
                console.log('No se pudieron obtener datos de agua de la BD');
                return;
            }
            
            const datos = await response.json();
            
            if (datos && Array.isArray(datos) && datos.length > 0) {
                // Tomar el primer elemento (el más reciente según tu estructura)
                const ultimoDato = datos[0];
                const ultimoNivel = parseFloat(ultimoDato.nivel);
                
                console.log('Último dato de agua encontrado:', ultimoNivel, 'ID:', ultimoDato.id, 'Fecha:', ultimoDato.fecha_hora);
                
                // Actualizar el tanque con el último valor de la BD
                actualizar(ultimoNivel);
                
                return ultimoNivel;
            } else {
                console.log('No hay datos de agua en la BD');
                return null;
            }
        } catch (error) {
            console.log('Error al cargar datos de agua:', error);
            return null;
        }
    }

    // =================== FUNCIÓN PARA OBTENER MÚLTIPLES DATOS ===================
    async function cargarDatosRecientesBD(limite = 10) {
        try {
            const response = await fetch('/api/agua/');
            
            if (!response.ok) {
                console.log('No se pudieron obtener datos de agua de la BD');
                return [];
            }
            
            const datos = await response.json();
            
            if (datos && Array.isArray(datos)) {
                // Tomar los primeros 'limite' elementos (los más recientes)
                const datosRecientes = datos.slice(0, limite);
                console.log(`Cargados ${datosRecientes.length} datos recientes de agua`);
                return datosRecientes;
            }
            
            return [];
        } catch (error) {
            console.log('Error al cargar datos recientes:', error);
            return [];
        }
    }

    // Cargar el último dato al iniciar (con un pequeño retraso para asegurar que el DOM esté listo)
    setTimeout(() => {
        cargarUltimoDatoBD();
    }, 500);

    // =================== RETORNO DE FUNCIONES ===================
    // Para mantener compatibilidad con tu código existente
    const funcionActualizar = function(valor) {
        return actualizar(valor);
    };
    
    // Añadir funciones adicionales al objeto retornado
    funcionActualizar.cargarUltimoDato = cargarUltimoDatoBD;
    funcionActualizar.cargarDatosRecientes = cargarDatosRecientesBD;
    funcionActualizar.actualizar = actualizar;
    
    return funcionActualizar;
}

// ============================================================
// =========== SERIE TEMPORAL ========================
// ============================================================
function crearSerieTemporalAgua() {
    const container = d3.select("#serie-temporal");
    container.html(""); // Limpiar contenedor

    const outerW = 720, outerH = 520;
    const margin = { top: 50, right: 40, bottom: 60, left: 80 };
    const width = outerW - margin.left - margin.right;
    const height = outerH - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", outerW)
        .attr("height", outerH)
        .style("background", "#0f172a")
        .style("border", "3px solid #00bfff")
        .style("border-radius", "12px")
        .style("box-shadow", "0 4px 20px rgba(0, 191, 255, 0.15)");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Título
    svg.append("text")
        .attr("x", outerW / 2)
        .attr("y", 28)
        .attr("fill", "#ffffffff")
        .attr("font-size", "20px")
        .attr("font-weight", "700")
        .attr("text-anchor", "middle")
        .style("letter-spacing", "0.5px")
        .text(TRANSLATIONS.level_history || "HISTÓRICO DE NIVELES DE AGUA (%)");

    // Botón para regresar al inicio
    const homeButton = container.append("button")
        .attr("class", "btn btn-sm")
        .style("position", "absolute")
        .style("top", "12px")
        .style("right", "12px")
        .style("background", "rgba(0, 191, 255, 0.2)")
        .style("color", "#00bfff")
        .style("border", "1px solid #00bfff")
        .style("border-radius", "6px")
        .style("padding", "8px 12px")
        .style("cursor", "pointer")
        .style("z-index", "10")
        .style("transition", "all 0.3s")
        .html('<i class="bi bi-house-door"></i>')
        .on("mouseover", function() {
            d3.select(this)
                .style("background", "#00bfff")
                .style("color", "#0f172a")
                .style("transform", "scale(1.05)");
        })
        .on("mouseout", function() {
            d3.select(this)
                .style("background", "rgba(0, 191, 255, 0.2)")
                .style("color", "#00bfff")
                .style("transform", "scale(1)");
        })
        .on("click", function() {
            // Regresar al inicio 
            currentStartIndex = Math.max(0, data.length - MAX_VISIBLE_POINTS);
            redraw();
            
            // Efecto visual de click
            d3.select(this)
                .style("background", "#0099cc")
                .style("color", "#0f172a");
            
            setTimeout(() => {
                d3.select(this)
                    .style("background", "rgba(0, 191, 255, 0.2)")
                    .style("color", "#00bfff");
            }, 300);
        });

    // Scales
    const x = d3.scaleTime().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);

    // Gradiente para el área
    const gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "water-gradient")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "0%").attr("y2", "100%");

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "rgba(0, 191, 255, 0.4)")
        .attr("stop-opacity", 0.5);

    gradient.append("stop")
        .attr("offset", "80%")
        .attr("stop-color", "rgba(0, 191, 255, 0.1)");

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "rgba(0, 191, 255, 0.05)");

    // Gradiente para la línea
    const lineGradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "water-line-gradient")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "100%").attr("y2", "0%");

    lineGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#00bfff");

    lineGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#0066cc");

    // Generadores de línea y área
    const line = d3.line()
        .x(d => x(d.time))
        .y(d => y(d.value))
        .curve(d3.curveMonotoneX);

    const area = d3.area()
        .x(d => x(d.time))
        .y0(height)
        .y1(d => y(d.value))
        .curve(d3.curveMonotoneX);

    // Grid horizontal
    const grid = g.append("g")
        .attr("class", "grid");

    // Área de fondo con gradiente
    const areaPath = g.append("path")
        .attr("class", "area-water")
        .attr("fill", "url(#water-gradient)")
        .attr("stroke", "none");

    // Línea principal
    const path = g.append("path")
        .attr("class", "line-water")
        .attr("fill", "none")
        .attr("stroke", "url(#water-line-gradient)")
        .attr("stroke-width", 3.5)
        .style("filter", "drop-shadow(0 0 8px rgba(0, 191, 255, 0.5))");

    // Ejes
    const xAxisG = g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .style("font-size", "12px");

    const yAxisG = g.append("g")
        .attr("class", "y-axis")
        .style("font-size", "12px");

    // Etiqueta eje Y 
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -68)
        .attr("fill", "#00bfff")
        .attr("font-size", "14px")
        .attr("font-weight", "600")
        .attr("text-anchor", "middle")
        .text(TRANSLATIONS.nivel || "Nivel (%)");
    
    g.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("fill", "#00bfff")
        .attr("font-size", "14px")
        .attr("font-weight", "600")
        .attr("text-anchor", "middle")
        .text(TRANSLATIONS.tiempo || "Tiempo");

    // Zonas de nivel de agua en el fondo
    const waterZonesData = [
        {min: 0, max: 20, color: "rgba(244, 67, 54, 0.08)", label: "CRÍTICO"},
        {min: 20, max: 40, color: "rgba(255, 193, 7, 0.08)", label: "BAJO"},
        {min: 40, max: 70, color: "rgba(33, 150, 243, 0.08)", label: "NORMAL"},
        {min: 70, max: 100, color: "rgba(76, 175, 80, 0.08)", label: "ÓPTIMO"}
    ];

    // Tooltip
    const tooltip = container.append("div")
        .attr("class", "tooltip-water")
        .style("position", "absolute")
        .style("background", "rgba(15, 23, 42, 0.95)")
        .style("color", "#e2e8f0")
        .style("padding", "12px 16px")
        .style("border", "2px solid #00bfff")
        .style("border-radius", "10px")
        .style("font-size", "13px")
        .style("font-weight", "500")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("box-shadow", "0 8px 24px rgba(0, 0, 0, 0.3)")
        .style("backdrop-filter", "blur(4px)")
        .style("z-index", "9999");

    // Punto focal interactivo
    const focus = g.append("circle")
        .attr("class", "focus-point")
        .attr("r", 0)
        .attr("fill", "#00ffcc")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2)
        .style("filter", "drop-shadow(0 0 6px rgba(0, 255, 204, 0.8))")
        .style("opacity", 0);

    // Línea vertical guía
    const verticalLine = g.append("line")
        .attr("class", "vertical-line")
        .attr("stroke", "rgba(255, 255, 255, 0.3)")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "5,5")
        .style("opacity", 0);

    // Línea de referencia (nivel recomendado 70%)
    const referenceLine = g.append("line")
        .attr("class", "reference-line")
        .attr("stroke", "rgba(255, 255, 255, 0.5)")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "8,4")
        .style("opacity", 0.6);

    // Variables de control (EXACTAMENTE IGUAL AL CO₂)
    let data = []; // Todos los datos
    const MAX_VISIBLE_POINTS = 15;
    const MAX_MEMORY_POINTS = 1000;
    let currentStartIndex = 0;
    let isDragging = false;
    let dragStartX = 0;

    // Función para obtener datos visibles (EXACTAMENTE IGUAL AL CO₂)
    function getVisibleData() {
        if (data.length === 0) return [];
        
        const endIndex = Math.min(currentStartIndex + MAX_VISIBLE_POINTS, data.length);
        
        if (endIndex - currentStartIndex < MAX_VISIBLE_POINTS && data.length >= MAX_VISIBLE_POINTS) {
            currentStartIndex = data.length - MAX_VISIBLE_POINTS;
        }
        
        return data.slice(currentStartIndex, endIndex);
    }

    // Función para redibujar el gráfico
    function redraw() {
        const visibleData = getVisibleData();
        if (visibleData.length === 0) return;

        x.domain(d3.extent(visibleData, d => d.time));
        y.domain([0, 100]); // Agua siempre de 0 a 100%

        // Zonas de nivel de agua
        const waterZones = g.selectAll(".water-zone").data(waterZonesData);

        waterZones.enter()
            .append("rect")
            .attr("class", "water-zone")
            .merge(waterZones)
            .attr("x", 0)
            .attr("width", width)
            .attr("y", d => y(d.max))
            .attr("height", d => y(d.min) - y(d.max))
            .attr("fill", d => d.color)
            .attr("rx", 2);

        waterZones.exit().remove();

        // Actualizar línea de referencia (70% óptimo)
        const recommendedLevel = 70;
        referenceLine
            .attr("x1", 0)
            .attr("y1", y(recommendedLevel))
            .attr("x2", width)
            .attr("y2", y(recommendedLevel));

        // Actualizar grid
        grid.call(d3.axisLeft(y)
            .ticks(6)
            .tickSize(-width)
            .tickFormat(""))
            .attr("opacity", 0.15)
            .selectAll("line")
            .attr("stroke", "#00bfff");

        // Actualizar ejes
        xAxisG.call(d3.axisBottom(x)
            .ticks(Math.min(6, visibleData.length))
            .tickFormat(d3.timeFormat("%H:%M:%S"))
            .tickSizeOuter(0))
            .selectAll("text")
            .attr("fill", "#94a3b8")
            .attr("font-size", "11px")
            .attr("font-weight", "500");

        xAxisG.selectAll("path, line")
            .attr("stroke", "#00bfff")
            .attr("opacity", 0.5);

        yAxisG.call(d3.axisLeft(y)
            .ticks(6)
            .tickFormat(d => d + "%")
            .tickSizeOuter(0))
            .selectAll("text")
            .attr("fill", "#94a3b8")
            .attr("font-size", "11px")
            .attr("font-weight", "500")
            .attr("dx", "-5px");

        yAxisG.selectAll("path, line")
            .attr("stroke", "#00bfff")
            .attr("opacity", 0.5);

        yAxisG.select(".domain").attr("stroke", "none");

        // Actualizar línea y área
        path.datum(visibleData)
            .transition()
            .duration(300)
            .ease(d3.easeCubicOut)
            .attr("d", line);

        areaPath.datum(visibleData)
            .transition()
            .duration(300)
            .ease(d3.easeCubicOut)
            .attr("d", area);

        // Puntos de datos
        const points = g.selectAll(".data-point")
            .data(visibleData, d => d.id);

        points.enter()
            .append("circle")
            .attr("class", "data-point")
            .merge(points)
            .attr("cx", d => x(d.time))
            .attr("cy", d => y(d.value))
            .attr("r", 4)
            .attr("fill", d => {
                if (d.value < 20) return "#ff4444";
                if (d.value < 40) return "#ffaa00";
                if (d.value < 70) return "#00bfff";
                return "#00cc66";
            })
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1.5)
            .style("opacity", 0.9)
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                focus
                    .attr("cx", x(d.time))
                    .attr("cy", y(d.value))
                    .transition()
                    .duration(200)
                    .attr("r", 8)
                    .style("opacity", 1);

                verticalLine
                    .attr("x1", x(d.time))
                    .attr("y1", 0)
                    .attr("x2", x(d.time))
                    .attr("y2", height)
                    .transition()
                    .duration(200)
                    .style("opacity", 1);

                let nivelTexto, nivelColor;
                if (d.value < 20) {
                    nivelTexto = "CRÍTICO";
                    nivelColor = "#ff4444";
                } else if (d.value < 40) {
                    nivelTexto = "BAJO";
                    nivelColor = "#ffaa00";
                } else if (d.value < 70) {
                    nivelTexto = "NORMAL";
                    nivelColor = "#00bfff";
                } else {
                    nivelTexto = "ÓPTIMO";
                    nivelColor = "#00cc66";
                }

                tooltip
                    .html(`
                        <div style="display: flex; align-items: center; margin-bottom: 6px;">
                            <div style="width: 12px; height: 12px; background: ${nivelColor}; border-radius: 50%; margin-right: 8px;"></div>
                            <strong style="font-size: 16px; color: #00bfff;">${d.value.toFixed(1)}%</strong>
                        </div>
                        <div style="color: #94a3b8; margin-bottom: 4px;">
                            <span style="color: ${nivelColor}; font-weight: 600;">${nivelTexto}</span>
                            <span style="margin-left: 8px; font-size: 11px;">
                                ${d.value < 20 ? '🔴 ' : d.value < 40 ? '🟡 ' : d.value < 70 ? '🔵 ' : '🟢 '}
                            </span>
                        </div>
                        <div style="font-size: 11px; color: #cbd5e1;">
                            ${d3.timeFormat("%H:%M:%S")(d.time)}<br>
                            ${d3.timeFormat("%d/%m/%Y")(d.time)}
                        </div>
                        ${d.value < 20 ? '<div style="margin-top: 8px; padding: 4px 8px; background: rgba(255, 68, 68, 0.1); border-radius: 4px; font-size: 10px; color: #ff4444;">¡Nivel crítico! Reponer agua urgentemente</div>' : ''}
                    `)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 80) + "px")
                    .transition()
                    .duration(200)
                    .style("opacity", 1);
            })
            .on("mouseout", function() {
                focus.transition()
                    .duration(200)
                    .attr("r", 0)
                    .style("opacity", 0);

                verticalLine.transition()
                    .duration(200)
                    .style("opacity", 0);

                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0);
            });

        points.exit()
            .transition()
            .duration(200)
            .attr("r", 0)
            .remove();

        // Mostrar contador de datos (IGUAL AL CO₂)
        g.selectAll(".data-counter").remove();
        g.append("text")
            .attr("class", "data-counter")
            .attr("x", width - 10)
            .attr("y", 20)
            .attr("fill", "#94a3b8")
            .attr("font-size", "10px")
            .attr("text-anchor", "end")
            .text(`${Math.min(currentStartIndex + MAX_VISIBLE_POINTS, data.length)}/${data.length}`);
    }

    // Configurar arrastre (EXACTAMENTE IGUAL AL CO₂)
    svg.on("mousedown", function(event) {
        isDragging = true;
        dragStartX = event.clientX;
        svg.style("cursor", "grabbing");
    });

    svg.on("mousemove", function(event) {
        if (!isDragging) return;
        
        const dragDelta = event.clientX - dragStartX;
        const pointsToMove = Math.round(dragDelta / (width / MAX_VISIBLE_POINTS) * -1);
        
        if (pointsToMove !== 0) {
            currentStartIndex += pointsToMove;
            currentStartIndex = Math.max(0, currentStartIndex);
            currentStartIndex = Math.min(data.length - MAX_VISIBLE_POINTS, currentStartIndex);
            redraw();
            dragStartX = event.clientX;
        }
    });

    svg.on("mouseup", function() {
        isDragging = false;
        svg.style("cursor", "grab");
    });

    svg.on("mouseleave", function() {
        isDragging = false;
        svg.style("cursor", "default");
    });

    svg.style("cursor", "grab");

    // Función para agregar nuevo dato (EXACTAMENTE IGUAL AL CO₂, pero con value en lugar de nivel)
    function addData(value, timestampStr) {
        const time = new Date(timestampStr || new Date());
        const id = `water-data-${time.getTime()}-${Math.random()}`;
        
        data.push({
            id: id,
            time: time,
            value: value  // Cambiado de "nivel" a "value" para coincidir con CO₂
        });
        
        if (data.length > MAX_MEMORY_POINTS) {
            data = data.slice(data.length - MAX_MEMORY_POINTS);
            if (currentStartIndex > data.length - MAX_VISIBLE_POINTS) {
                currentStartIndex = Math.max(0, data.length - MAX_VISIBLE_POINTS);
            }
        }
        
        // ESTA ES LA PARTE CLAVE QUE FALTABA - IGUAL AL CO₂
        const visibleData = getVisibleData();
        if (visibleData.length > 0 && 
            visibleData[visibleData.length - 1].id === data[data.length - 2]?.id) {
            currentStartIndex = Math.max(0, data.length - MAX_VISIBLE_POINTS);
        }
        
        redraw();
    }

    // Función para cargar datos históricos desde API
    async function loadHistoricalData() {
        try {
            const response = await fetch('/api/agua/');
            if (!response.ok) return;
            
            const apiData = await response.json();
            if (apiData && apiData.length > 0) {
                // Convertir datos usando nivel y fecha_hora
                const formattedData = apiData.map((item) => ({
                    id: `db-${item.id}`,
                    time: new Date(item.fecha_hora),
                    value: parseFloat(item.nivel)  // Cambiado a "value"
                })).filter(item => !isNaN(item.time.getTime()) && !isNaN(item.value));
                
                if (formattedData.length > 0) {
                    // Ordenar por fecha (más antiguo primero) - IGUAL AL CO₂
                    formattedData.sort((a, b) => a.time - b.time);
                    
                    data = formattedData;
                    currentStartIndex = Math.max(0, data.length - MAX_VISIBLE_POINTS);
                    redraw();
                    
                    console.log(`Datos de agua cargados: ${data.length} puntos`);
                }
            }
        } catch (error) {
            console.log('No se pudieron cargar datos históricos de agua:', error);
        }
    }

    // Cargar datos históricos al inicio
    loadHistoricalData();

    // Función de actualización que mantiene la compatibilidad
    function actualizarSerie(nivel) {
        addData(nivel);
    }

    return {
        // Función original para compatibilidad
        actualizarSerie: actualizarSerie,
        
        // Nuevas funciones (IGUAL AL CO₂)
        push: function(value, timestampStr) {
            addData(value, timestampStr);
        },
        reset: function() {
            data = [];
            currentStartIndex = 0;
            path.datum([]).attr("d", line);
            areaPath.datum([]).attr("d", area);
            
            g.selectAll(".data-point").remove();
            g.selectAll(".water-zone").remove();
            g.selectAll(".data-counter").remove();
            
            focus.attr("r", 0).style("opacity", 0);
            verticalLine.style("opacity", 0);
            tooltip.style("opacity", 0);
        },
        setData: function(newData) {
            data = newData.map((d, i) => ({
                id: `data-${i}`,
                time: new Date(d.t),
                value: d.v
            }));
            currentStartIndex = Math.max(0, data.length - MAX_VISIBLE_POINTS);
            redraw();
        },
        // Función pública para regresar al inicio
        goHome: function() {
            currentStartIndex = Math.max(0, data.length - MAX_VISIBLE_POINTS);
            redraw();
        }
    };
}

// ============== INSTANCIAS ==============
const actualizarTanque = crearTanqueAgua("#grafico-tanque", 0);
const actualizarSerieTemporal = crearSerieTemporalAgua();

// ============================================================
// ====================== WEBSOCKET AGUA ======================
// ============================================================

// Usar las instancias existentes
const socket = new WebSocket("ws://" + window.location.host + "/ws/agua/");

socket.onmessage = function(e) {
    const mensaje = JSON.parse(e.data);
    const valor = parseFloat(mensaje.nivel);
    const fecha = mensaje.fecha_hora;
    
    // Actualizar el tanque usando la instancia existente
    if (typeof actualizarTanque === 'function') {
        actualizarTanque(valor);
    }
    
    // Actualizar la serie temporal - usar .push() como CO₂ si está disponible
    if (actualizarSerieTemporal && typeof actualizarSerieTemporal.push === 'function') {
        // Si tiene método .push() (nueva versión)
        actualizarSerieTemporal.push(valor, fecha);
    } else if (typeof actualizarSerieTemporal === 'function') {
        // Si es la función antigua (compatibilidad)
        actualizarSerieTemporal(valor);
    }
    
    console.log('Datos WebSocket agua recibidos:', { valor, fecha });
};

socket.onopen = function() {
    console.log("WebSocket Tanque de Agua conectado");
};

socket.onerror = function(error) {
    console.error("Error en conexión WebSocket agua:", error);
};

socket.onclose = function() {
    console.warn("Conexión WebSocket agua cerrada");
    // Reconectar después de 3 segundos
    setTimeout(() => {
        location.reload();
    }, 3000);
};
});