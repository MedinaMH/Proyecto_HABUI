document.addEventListener("DOMContentLoaded", function () {
d3.select("body").style("background-color", "#0b0f19");

// ===================== GAUGE VERTICAL (Oxígeno %) =====================
function gaugeO2(containerId, initial) {
    const container = d3.select(containerId);
    container.html(""); // Limpiar contenedor

    const width = 300;
    const height = 520;
    const min = 0.0;
    const max = 100.0;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    // Paleta de verdes
    const greenPalette = {
        light: "#34d399",    // Verde menta claro
        medium: "#10b981",   // Verde esmeralda
        dark: "#059669",     // Verde bosque
        veryDark: "#047857", // Verde muy oscuro
        amber: "#4dabf7",    // Ámbar cálido
        red: "#dc2626"       // Rojo intenso
    };

    svg.append("text")
        .attr("x", width/2)
        .attr("y", 32)
        .attr("fill", "#ffffffff")
        .attr("font-size", "22px")
        .attr("font-weight", "700")
        .attr("text-anchor", "middle")
        .text("O₂ (%)");

    // outer frame
    const frameX = 85;
    const frameY = 70;
    const frameW = 180;
    const frameH = 360;

    svg.append("rect")
        .attr("x", frameX)
        .attr("y", frameY)
        .attr("width", frameW)
        .attr("height", frameH)
        .attr("rx", 14)
        .attr("fill", "#0f172a")
        .attr("stroke", greenPalette.dark)
        .attr("stroke-width", 3);

    // fill rect
    const scale = d3.scaleLinear().domain([min, max]).range([frameY + frameH, frameY]);
    // ===================== LÍNEAS DE NIVEL NUMÉRICAS CADA 20% =====================
    for (let i = 0; i <= 100; i += 25) {
        const y = scale(i);
        
        // Línea horizontal de nivel
        svg.append("line")
            .attr("x1", frameX - 10)
            .attr("y1", y)
            .attr("x2", frameX)
            .attr("y2", y)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1.5);
        
        // Texto de valor
        svg.append("text")
            .attr("x", frameX - 20)
            .attr("y", y + 4)
            .attr("fill", "#ffffff")
            .attr("font-size", "28px")
            .attr("font-weight", "500")
            .attr("text-anchor", "end")
            .text(i + "%");
    }

    const fillRect = svg.append("rect")
        .attr("x", frameX)
        .attr("width", frameW)
        .attr("y", scale(initial))
        .attr("height", Math.max(2, (frameY + frameH) - scale(initial)))
        .attr("fill", greenPalette.medium)
        .attr("rx", 12);

    const valueText = svg.append("text")
        .attr("x", width/2)
        .attr("y", frameY + frameH + 50)
        .attr("fill", greenPalette.light)
        .attr("font-size", "40px")
        .attr("font-weight", "700")
        .attr("text-anchor", "middle")
        .text(initial.toFixed(2) + " %");

    // Indicador de calidad
    const qualityText = svg.append("text")
        .attr("x", width/2)
        .attr("y", frameY + frameH + 85)
        .attr("fill", greenPalette.medium)
        .attr("font-size", "25px")
        .attr("font-weight", "600")
        .attr("text-anchor", "middle")
        .text(getQualityText(initial));

    // color overlay depending on ranges
    function colorFor(v) {
        if (v >= 21.5) return greenPalette.light;   // excelente (verde claro)
        if (v >= 19.5) return greenPalette.amber;   // acceptable (ámbar)
        return greenPalette.red;                     // critico (rojo)
    }

    function getQualityText(v) {
        if (v >= 21.5) return TRANSLATIONS.nivel_optimo || "NIVEL ÓPTIMO";
        if (v >= 19.5) return TRANSLATIONS.nivel_aceptable || "NIVEL ACEPTABLE";
        return "¡NIVEL BAJO!";
    }

    // =================== FUNCIÓN PARA CARGAR ÚLTIMO DATO DE LA BD ===================
    async function cargarUltimoDatoBD() {
        try {
            console.log('Cargando datos de oxígeno desde BD para obtener el último...');
            const response = await fetch('/api/o2/');
            
            if (!response.ok) {
                console.log('No se pudieron obtener datos de oxígeno de la BD');
                return null;
            }
            
            const datos = await response.json();
            
            if (datos && Array.isArray(datos) && datos.length > 0) {
                // Tomar el primer elemento (el más reciente)
                const ultimoDato = datos[0];
                
                // Extraer el valor de oxígeno
                let ultimoValor;
                ultimoValor = parseFloat(ultimoDato.nivel);
                
                console.log('Último dato de oxígeno encontrado:', ultimoValor.toFixed(2) + '%', 
                        'ID:', ultimoDato.id, 'Fecha:', ultimoDato.fecha_hora || ultimoDato.timestamp);
                
                // Actualizar el gauge con el último valor de la BD
                actualizarGauge(ultimoValor);
                
                return ultimoValor;
            } else {
                console.log('No hay datos de oxígeno en la BD');
                return null;
            }
        } catch (error) {
            console.log('Error al cargar datos de oxígeno:', error);
            return null;
        }
    }

    // =================== FUNCIÓN PARA CARGAR MÚLTIPLES DATOS ===================
    async function cargarDatosRecientesBD(limite = 10) {
        try {
            console.log(`Cargando últimos ${limite} datos de oxígeno...`);
            const response = await fetch('/api/o2/');
            
            if (!response.ok) {
                console.log('No se pudieron obtener datos de oxígeno de la BD');
                return [];
            }
            
            const datos = await response.json();
            
            if (datos && Array.isArray(datos)) {
                // Tomar los primeros 'limite' elementos (los más recientes)
                const datosRecientes = datos.slice(0, limite);
                
                // Procesar y formatear datos
                const datosFormateados = datosRecientes.map(dato => {
                    let valor;
                    
                    valor = parseFloat(dato.nivel);
                    
                    if (isNaN(valor)) return null;
                    
                    return {
                        id: dato.id,
                        valor: valor,
                        fecha: dato.fecha_hora || dato.timestamp,
                        calidad: valor >= 21.0 ? "ÓPTIMO" : valor >= 19.5 ? "ACEPTABLE" : "BAJO"
                    };
                }).filter(dato => dato !== null);
                
                console.log(`Cargados ${datosFormateados.length} datos recientes de oxígeno`);
                return datosFormateados;
            }
            
            return [];
        } catch (error) {
            console.log('Error al cargar datos recientes de oxígeno:', error);
            return [];
        }
    }

    // =================== FUNCIÓN DE ACTUALIZACIÓN INTERNA ===================
    function actualizarGauge(newVal) {
        const y = scale(newVal);
        const h = Math.max(2, (frameY + frameH) - y);
        const newColor = colorFor(newVal);

        fillRect
            .transition().duration(300)
            .attr("y", y)
            .attr("height", h)
            .attr("fill", newColor);

        valueText
            .transition().duration(300)
            .text(newVal.toFixed(2) + " %")
            .attr("fill", newColor);

        qualityText
            .transition().duration(300)
            .text(getQualityText(newVal))
            .attr("fill", newColor);
    }

    // =================== CARGAR ÚLTIMO DATO AL INICIAR ===================
    // Cargar el último dato al iniciar (con un pequeño retraso para asegurar que el DOM esté listo)
    setTimeout(() => {
        cargarUltimoDatoBD();
    }, 500);

    // =================== RETORNO DE FUNCIONES ===================
    // Crear objeto de retorno con todas las funciones
    const gaugeObject = {
        update: function(newVal) {
            actualizarGauge(newVal);
        },
        cargarUltimoDato: cargarUltimoDatoBD,
        cargarDatosRecientes: cargarDatosRecientesBD,
        actualizar: actualizarGauge,
        obtenerColorSegunValor: colorFor,
        obtenerTextoCalidad: getQualityText
    };

    return gaugeObject;
}

// ===================== SERIE TEMPORAL DE OXÍGENO =====================
function lineChartO2(containerId) {
    const container = d3.select(containerId);
    container.html("");

    const outerW = 720, outerH = 520;
    const margin = {top: 50, right: 40, bottom: 60, left: 70};
    const width = outerW - margin.left - margin.right;
    const height = outerH - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", outerW)
        .attr("height", outerH)
        .style("background", "#0f172a")
        .style("border", "3px solid #00ff88")
        .style("border-radius", "12px")
        .style("box-shadow", "0 4px 20px rgba(0, 255, 136, 0.15)");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Título
    svg.append("text")
        .attr("x", outerW/2)
        .attr("y", 28)
        .attr("fill", "#ffffffff")
        .attr("font-size", "20px")
        .attr("font-weight", "700")
        .attr("text-anchor", "middle")
        .style("letter-spacing", "0.5px")
        .text(TRANSLATIONS.hist_o2 || "HISTÓRICO DE OXÍGENO (%)");

    // Botón para regresar al inicio
    const homeButton = container.append("button")
        .attr("class", "btn btn-sm")
        .style("position", "absolute")
        .style("top", "12px")
        .style("right", "12px")
        .style("background", "rgba(0, 255, 136, 0.2)")
        .style("color", "#00ff88")
        .style("border", "1px solid #00ff88")
        .style("border-radius", "6px")
        .style("padding", "8px 12px")
        .style("cursor", "pointer")
        .style("z-index", "10")
        .style("transition", "all 0.3s")
        .html('<i class="bi bi-house-door"></i>')
        .on("mouseover", function() {
            d3.select(this)
                .style("background", "#00ff88")
                .style("color", "#0f172a")
                .style("transform", "scale(1.05)");
        })
        .on("mouseout", function() {
            d3.select(this)
                .style("background", "rgba(0, 255, 136, 0.2)")
                .style("color", "#00ff88")
                .style("transform", "scale(1)");
        })
        .on("click", function() {
            currentStartIndex = Math.max(0, data.length - MAX_VISIBLE_POINTS);
            redraw();
            
            d3.select(this)
                .style("background", "#00cc6a")
                .style("color", "#0f172a");
            
            setTimeout(() => {
                d3.select(this)
                    .style("background", "rgba(0, 255, 136, 0.2)")
                    .style("color", "#00ff88");
            }, 300);
        });

    // Scales
    const x = d3.scaleTime().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);

    // Gradiente para el área
    const gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "o2-gradient")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "0%").attr("y2", "100%");

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "rgba(0, 255, 136, 0.4)")
        .attr("stop-opacity", 0.5);

    gradient.append("stop")
        .attr("offset", "80%")
        .attr("stop-color", "rgba(0, 255, 136, 0.1)");

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "rgba(0, 255, 136, 0.05)");

    // Gradiente para la línea
    const lineGradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "o2-line-gradient")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "100%").attr("y2", "0%");

    lineGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#00ff88");

    lineGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#00e5ff");

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
        .attr("class", "area-o2")
        .attr("fill", "url(#o2-gradient)")
        .attr("stroke", "none");

    // Línea principal
    const path = g.append("path")
        .attr("class", "line-o2")
        .attr("fill", "none")
        .attr("stroke", "url(#o2-line-gradient)")
        .attr("stroke-width", 3.5)
        .style("filter", "drop-shadow(0 0 8px rgba(0, 255, 136, 0.5))");

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
        .attr("x", -height/2)
        .attr("y", -50)
        .attr("fill", "#00ff88")
        .attr("font-size", "14px")
        .attr("font-weight", "600")
        .attr("text-anchor", "middle")
        .text("O₂ (%)");
    
    // Etiqueta eje X
    g.append("text")
        .attr("x", width/2)
        .attr("y", height + 40)
        .attr("fill", "#00ff88")
        .attr("font-size", "14px")
        .attr("font-weight", "600")
        .attr("text-anchor", "middle")
        .text(TRANSLATIONS.tiempo || "Tiempo");

    // Zonas de oxígeno en el fondo
    const o2ZonesData = [
        {min: 17.5, max: 19.5, color: "rgba(255, 107, 107, 0.08)", label: "BAJO"},
        {min: 19.5, max: 21.5, color: "rgba(77, 171, 247, 0.08)", label: "NORMAL"},
        {min: 21.5, max: 23.0, color: "rgba(0, 255, 136, 0.08)", label: "ÓPTIMO"}
    ];

    d3.select("body").selectAll(".tooltip-o2").remove();
    // Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip-o2")
        .style("position", "absolute")
        .style("background", "rgba(15, 23, 42, 0.95)")
        .style("color", "#e2e8f0")
        .style("padding", "12px 16px")
        .style("border", "2px solid #00ff88")
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

    // Línea de referencia (nivel normal 20.9%)
    const referenceLine = g.append("line")
        .attr("class", "reference-line")
        .attr("stroke", "rgba(255, 255, 255, 0.5)")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "8,4")
        .style("opacity", 0.6);

    // Variables de control (nuevas para desplazamiento)
    let data = []; // Todos los datos
    const MAX_VISIBLE_POINTS = 15;
    const MAX_MEMORY_POINTS = 1000;
    let currentStartIndex = 0;
    let isDragging = false;
    let dragStartX = 0;

    // Función para obtener datos visibles
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
        
        const minVal = Math.min(17.0, d3.min(visibleData, d => d.value) - 0.5);
        const maxVal = Math.max(23.0, d3.max(visibleData, d => d.value) + 0.5);
        y.domain([minVal, maxVal]);

        // Zonas de oxígeno en el fondo
        const o2Zones = g.selectAll(".o2-zone").data(o2ZonesData);

        o2Zones.enter()
            .append("rect")
            .attr("class", "o2-zone")
            .merge(o2Zones)
            .attr("x", 0)
            .attr("width", width)
            .attr("y", d => y(d.max))
            .attr("height", d => y(d.min) - y(d.max))
            .attr("fill", d => d.color)
            .attr("rx", 2);

        o2Zones.exit().remove();

        // Actualizar línea de referencia (20.9% - nivel normal)
        const normalLevel = 20.9;
        referenceLine
            .attr("x1", 0)
            .attr("y1", y(normalLevel))
            .attr("x2", width)
            .attr("y2", y(normalLevel));

        // Actualizar grid
        grid.call(d3.axisLeft(y)
            .ticks(8)
            .tickSize(-width)
            .tickFormat(""))
            .attr("opacity", 0.15)
            .selectAll("line")
            .attr("stroke", "#00ff88");

        // Actualizar ejes con mejor formato
        xAxisG.call(d3.axisBottom(x)
            .ticks(Math.min(6, visibleData.length))
            .tickFormat(d3.timeFormat("%H:%M:%S"))
            .tickSizeOuter(0))
            .selectAll("text")
            .attr("fill", "#94a3b8")
            .attr("font-size", "11px")
            .attr("font-weight", "500");

        xAxisG.selectAll("path, line")
            .attr("stroke", "#00ff88")
            .attr("opacity", 0.5);

        yAxisG.call(d3.axisLeft(y)
            .ticks(6)
            .tickFormat(d => d.toFixed(1) + "%")
            .tickSizeOuter(0))
            .selectAll("text")
            .attr("fill", "#94a3b8")
            .attr("font-size", "11px")
            .attr("font-weight", "500")
            .attr("dx", "-5px");

        yAxisG.selectAll("path, line")
            .attr("stroke", "#00ff88")
            .attr("opacity", 0.5);

        // Eliminar el dominio de la línea del eje Y
        yAxisG.select(".domain").attr("stroke", "none");

        // Actualizar línea y área con transición
        path.datum(visibleData)
            .transition()
            .duration(500)
            .ease(d3.easeCubicOut)
            .attr("d", line);

        areaPath.datum(visibleData)
            .transition()
            .duration(500)
            .ease(d3.easeCubicOut)
            .attr("d", area);

        // Puntos de datos interactivos
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
                if (d.value < 19.5) return "#ff6b6b";
                if (d.value < 21.5) return "#4dabf7";
                return "#00ff88";
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

                const nivelTexto = (() => {
                    if (d.value < 19.5) return "BAJO";
                    if (d.value < 21.5) return "NORMAL";
                    return "ÓPTIMO";
                })();

                const nivelColor = (() => {
                    if (d.value < 19.5) return "#ff6b6b";
                    if (d.value < 21.5) return "#4dabf7";
                    return "#00ff88";
                })();

                tooltip
                    .html(`
                        <div style="display: flex; align-items: center; margin-bottom: 6px;">
                            <div style="width: 12px; height: 12px; background: ${nivelColor}; border-radius: 50%; margin-right: 8px;"></div>
                            <strong style="font-size: 16px; color: #00ff88;">${d.value.toFixed(1)}%</strong>
                        </div>
                        <div style="color: #94a3b8; margin-bottom: 4px;">
                            <span style="color: ${nivelColor}; font-weight: 600;">${nivelTexto}</span>
                            <span style="margin-left: 8px; font-size: 11px;">
                                ${d.value < 19.5 ? '⚠️ ' : d.value < 21.5 ? '✅ ' : '⭐ '}
                            </span>
                        </div>
                        <div style="font-size: 11px; color: #cbd5e1;">
                            ${d3.timeFormat("%H:%M:%S")(d.time)}<br>
                            ${d3.timeFormat("%d/%m/%Y")(d.time)}
                        </div>
                        ${d.value < 19.5 ? '<div style="margin-top: 8px; padding: 4px 8px; background: rgba(255, 107, 107, 0.1); border-radius: 4px; font-size: 10px; color: #ff6b6b;">Nivel de oxígeno bajo</div>' : ''}
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

        // Mostrar contador de datos
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

    // Configurar arrastre (desplazamiento horizontal)
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

    // Función para agregar nuevo dato
    function addData(value, timestampStr) {
        const time = new Date(timestampStr || new Date());
        const id = `data-${time.getTime()}-${Math.random()}`;
        
        data.push({
            id: id,
            time: time,
            value: value
        });
        
        if (data.length > MAX_MEMORY_POINTS) {
            data = data.slice(data.length - MAX_MEMORY_POINTS);
            if (currentStartIndex > data.length - MAX_VISIBLE_POINTS) {
                currentStartIndex = Math.max(0, data.length - MAX_VISIBLE_POINTS);
            }
        }
        
        const visibleData = getVisibleData();
        if (visibleData.length > 0 && 
            visibleData[visibleData.length - 1].id === data[data.length - 2]?.id) {
            currentStartIndex = Math.max(0, data.length - MAX_VISIBLE_POINTS);
        }
        
        redraw();
    }

    // Función para cargar datos históricos desde la base de datos
    async function loadHistoricalData() {
        try {
            const response = await fetch('/api/o2/');
            if (!response.ok) {
                console.log('Error en respuesta del API');
                return;
            }
            
            const apiData = await response.json();
            if (apiData && apiData.length > 0) {
                // Convertir datos de la API
                // Ajusta los nombres de campo según tu API real
                const formattedData = apiData.map((item) => ({
                    id: `db-${item.id || item.fecha_hora}`,
                    time: new Date(item.fecha_hora || item.timestamp),
                    value: parseFloat(item.nivel)
                })).filter(item => !isNaN(item.time.getTime()) && !isNaN(item.value));
                
                if (formattedData.length > 0) {
                    // Ordenar por fecha (más antiguo primero)
                    formattedData.sort((a, b) => a.time - b.time);
                    
                    data = formattedData;
                    currentStartIndex = Math.max(0, data.length - MAX_VISIBLE_POINTS);
                    redraw();
                    
                    // Actualizar gauge si existe
                    if (data.length > 0 && window.o2GaugeInstance) {
                        const lastValue = data[data.length - 1].value;
                        window.o2GaugeInstance.update(lastValue);
                    }
                }
            }
        } catch (error) {
            console.log('No se pudieron cargar datos históricos de oxígeno:', error);
        }
    }

    // Cargar datos históricos al inicio
    loadHistoricalData();

    return {
        push: function(value, timestampStr) {
            addData(value, timestampStr);
        },
        reset: function() {
            data = [];
            currentStartIndex = 0;
            path.datum([]).attr("d", line);
            areaPath.datum([]).attr("d", area);
            
            g.selectAll(".data-point").remove();
            g.selectAll(".o2-zone").remove();
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
        },
        // Función pública para cargar datos
        loadData: function() {
            loadHistoricalData();
        }
    };
}

// ============== INSTANCIAS ==============
const gauge = gaugeO2("#gauge-o2", 20.5);
const series = lineChartO2("#serie-o2");

// ================= WEBSOCKET =================
const socket = new WebSocket("ws://" + window.location.host + "/ws/oxigeno/");

socket.onmessage = function(e) {
const mensaje = JSON.parse(e.data);
const valor = mensaje.nivel;
const fecha = mensaje.fecha_hora;

gauge.update(valor);
series.push(valor, fecha);
};

socket.onopen = function(e) {
console.log("WebSocket O₂ conectado");
};

socket.onerror = function(e) {
console.error("Error en WebSocket O₂");
};

socket.onclose = function(e) {
console.warn("WebSocket O₂ desconectado");
setTimeout(() => {
    location.reload();
    }, 5000);
};
});