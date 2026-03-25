document.addEventListener("DOMContentLoaded", function () {
    d3.select("body").style("background-color", "#0b0f19");

    // ===================== GAUGE VERTICAL (HUMEDAD %) =====================
    function gaugeHumedad(containerId, initial) {
        const container = d3.select(containerId);
        container.html(""); // Limpiar contenedor

        const width = 300;
        const height = 520;

        const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height)
            .style("border-radius", "8px");

        // Paleta de colores según el semáforo de 3 estados
        const humPalette = {
            critico: "#ff6b6b",      // Rojo para CRÍTICO (<30% o >70%)
            advertencia: "#ffd43b",  // Amarillo para ADVERTENCIA (30-40% o 60-70%)
            optimo: "#69db7c",        // Verde para ÓPTIMO (40-60%)
            white: "#ffffff" 
        };

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
            .attr("fill", "#0f1724")
            .attr("stroke", humPalette.white)
            .attr("stroke-width", 3);

        // fill rect
        const min = 0;
        const max = 100;
        const scale = d3.scaleLinear().domain([min, max]).range([frameY + frameH, frameY]);
        
        // ===================== LÍNEAS DE NIVEL =====================
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
            .attr("fill", humPalette.critico)
            .attr("rx", 12);

        const valueText = svg.append("text")
            .attr("x", width/2+30)
            .attr("y", frameY + frameH + 50)
            .attr("fill", humPalette.critico)
            .attr("font-size", "40px")
            .attr("font-weight", "700")
            .attr("text-anchor", "middle")
            .text(initial.toFixed(1) + " %");

        // Indicador de nivel
        const levelText = svg.append("text")
            .attr("x", width/2+30)
            .attr("y", frameY + frameH + 85)
            .attr("fill", humPalette.critico)
            .attr("font-size", "36px")
            .attr("font-weight", "600")
            .attr("text-anchor", "middle")
            .text(getNivelTexto(initial));

        function colorFor(v) {
            if (v < 30 || v > 70) return humPalette.critico;        // CRÍTICO (rojo)
            if ((v >= 30 && v < 40) || (v >= 60 && v <= 70)) return humPalette.advertencia; // ADVERTENCIA (amarillo)
            return humPalette.optimo;                                // ÓPTIMO (verde)
        }

        function getNivelTexto(v) {
            if (v < 30 || v > 70) return "CRÍTICO";
            if ((v >= 30 && v < 40) || (v >= 60 && v <= 70)) return "ADVERTENCIA";
            return "ÓPTIMO";
        }

        function getDescripcionNivel(v) {
            if (v < 30) return "Irritación respiratoria por sequedad extrema";
            if (v < 40) return "Riesgo de sequedad respiratoria";
            if (v < 60) return "Minimiza patógenos, maximiza confort respiratorio";
            if (v <= 70) return "Riesgo de proliferación microbiana";
            return "Riesgo de crecimiento de moho e irritación respiratoria";
        }

        // Estadísticas
        const stats = {
            current: initial,
            min: initial,
            max: initial,
            history: []
        };

        // Actualizar estadísticas
        function updateStats(newVal) {
            stats.current = newVal;
            stats.min = Math.min(stats.min, newVal);
            stats.max = Math.max(stats.max, newVal);
            stats.history.push({
                value: newVal,
                timestamp: new Date().toISOString(),
                nivel: getNivelTexto(newVal),
                color: colorFor(newVal)
            });
            
            // Mantener solo los últimos 100 valores en el historial
            if (stats.history.length > 100) {
                stats.history.shift();
            }
        }

        // =================== FUNCIÓN PARA CARGAR ÚLTIMO DATO DE LA BD ===================
        async function cargarUltimoDatoBD() {
            try {
                console.log('Cargando datos de Humedad desde BD para obtener el último...');
                const response = await fetch('/api/humedad/');
                
                if (!response.ok) {
                    console.log('No se pudieron obtener datos de Humedad de la BD');
                    return null;
                }
                
                const datos = await response.json();
                
                if (datos && Array.isArray(datos) && datos.length > 0) {
                    // Tomar el primer elemento (el más reciente)
                    const ultimoDato = datos[0];
                    
                    // Extraer el valor de Humedad - campo "valor"
                    let ultimoValor = parseFloat(ultimoDato.valor);
                    const nivel = getNivelTexto(ultimoValor);
                    console.log('Último dato de Humedad encontrado:', 
                        ultimoValor.toFixed(1) + ' %', 
                        'Nivel:', nivel,
                        'Fecha:', ultimoDato.fecha_hora || ultimoDato.timestamp);
                    
                    // Actualizar el gauge con el último valor de la BD
                    actualizarGauge(ultimoValor);
                    
                    return ultimoValor;
                } else {
                    console.log('No hay datos de Humedad en la BD');
                    return null;
                }
            } catch (error) {
                console.log('Error al cargar datos de Humedad:', error);
                return null;
            }
        }

        // =================== FUNCIÓN PARA CARGAR MÚLTIPLES DATOS ===================
        async function cargarDatosRecientesBD(limite = 10) {
            try {
                console.log(`Cargando últimos ${limite} datos de Humedad...`);
                const response = await fetch('/api/humedad/');
                
                if (!response.ok) {
                    console.log('No se pudieron obtener datos de Humedad de la BD');
                    return [];
                }
                
                const datos = await response.json();
                
                if (datos && Array.isArray(datos)) {
                    // Tomar los primeros 'limite' elementos (los más recientes)
                    const datosRecientes = datos.slice(0, limite);
                    
                    // Procesar y formatear datos
                    const datosFormateados = datosRecientes.map(dato => {
                        let valor = parseFloat(dato.valor);
                        if (isNaN(valor)) return null;
                        
                        return {
                            id: dato.id,
                            valor: valor,
                            fecha: dato.fecha_hora || dato.timestamp,
                            nivel: getNivelTexto(valor),
                            estado: getNivelTexto(valor).toLowerCase(),
                            color: colorFor(valor),
                            descripcion: getDescripcionNivel(valor)
                        };
                    }).filter(dato => dato !== null);
                    
                    console.log(`Cargados ${datosFormateados.length} datos recientes de Humedad`);
                    return datosFormateados;
                }
                
                return [];
            } catch (error) {
                console.log('Error al cargar datos recientes de Humedad:', error);
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
                .text(newVal.toFixed(1) + " %")
                .attr("fill", newColor);

            levelText
                .transition().duration(300)
                .text(getNivelTexto(newVal))
                .attr("fill", newColor);
            
            // Actualizar estadísticas
            updateStats(newVal);
        }

        // =================== CARGAR ÚLTIMO DATO AL INICIAR ===================
        setTimeout(() => {
            cargarUltimoDatoBD();
        }, 500);

        // =================== RETORNO DE FUNCIONES ===================
        const gaugeObject = {
            update: function(newVal) {
                actualizarGauge(newVal);
            },
            cargarUltimoDato: cargarUltimoDatoBD,
            cargarDatosRecientes: cargarDatosRecientesBD,
            actualizar: actualizarGauge,
            obtenerColorSegunValor: colorFor,
            obtenerNivelTexto: getNivelTexto,
            obtenerDescripcionNivel: getDescripcionNivel,
            // Obtener estadísticas
            getStats: function() {
                return {
                    ...stats,
                    nivelActual: getNivelTexto(stats.current),
                    colorActual: colorFor(stats.current),
                    descripcionActual: getDescripcionNivel(stats.current)
                };
            },
            // Resetear estadísticas
            resetStats: function() {
                stats.min = stats.current;
                stats.max = stats.current;
                stats.history = [];
            }
        };

        return gaugeObject;
    }

    // ===================== SERIE TEMPORAL DE HUMEDAD =====================
    function lineChartHumedad(containerId) {
        const container = d3.select(containerId);
        container.html("");

        const outerW = 1200, outerH = 600;
        const margin = {top: 50, right: 40, bottom: 60, left: 80};
        const width = outerW - margin.left - margin.right;
        const height = outerH - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("width", outerW)
            .attr("height", outerH)
            .style("background", "#0f172a")
            .style("border", "3px solid #ffffff")
            .style("border-radius", "12px")
            .style("box-shadow", "0 4px 20px rgba(255, 107, 107, 0.15)");

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
            .text("HISTÓRICO DE HUMEDAD (%)");

        // Botón para regresar al inicio
        const homeButton = container.append("button")
            .attr("class", "btn btn-sm")
            .style("position", "absolute")
            .style("top", "12px")
            .style("right", "12px")
            .style("background", "rgba(255, 107, 107, 0.2)")
            .style("color", "#ff6b6b")
            .style("border", "1px solid #ff6b6b")
            .style("border-radius", "6px")
            .style("padding", "8px 12px")
            .style("cursor", "pointer")
            .style("z-index", "10")
            .style("transition", "all 0.3s")
            .html('<i class="bi bi-house-door"></i>')
            .on("mouseover", function() {
                d3.select(this)
                    .style("background", "#ff6b6b")
                    .style("color", "#0f172a")
                    .style("transform", "scale(1.05)");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .style("background", "rgba(255, 107, 107, 0.2)")
                    .style("color", "#ff6b6b")
                    .style("transform", "scale(1)");
            })
            .on("click", function() {
                // Regresar al inicio 
                currentStartIndex = Math.max(0, data.length - MAX_VISIBLE_POINTS);
                redraw();
                
                // Efecto visual de click
                d3.select(this)
                    .style("background", "#ff5252")
                    .style("color", "#0f172a");
                
                setTimeout(() => {
                    d3.select(this)
                        .style("background", "rgba(255, 107, 107, 0.2)")
                        .style("color", "#ff6b6b");
                }, 300);
            });

        // Scales
        const x = d3.scaleTime().range([0, width]);
        const y = d3.scaleLinear().range([height, 0]);

        // Paleta de colores para humedad según el semáforo
        const humColors = {
            critico: "#ff6b6b",      // Rojo para CRÍTICO
            advertencia: "#ffd43b",  // Amarillo para ADVERTENCIA
            optimo: "#69db7c"        // Verde para ÓPTIMO
        };

        // Gradiente para el área
        const gradient = svg.append("defs")
            .append("linearGradient")
            .attr("id", "hum-gradient")
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "0%").attr("y2", "100%");

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "rgba(255, 107, 107, 0.4)")
            .attr("stop-opacity", 0.5);

        gradient.append("stop")
            .attr("offset", "80%")
            .attr("stop-color", "rgba(255, 107, 107, 0.1)");

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "rgba(255, 107, 107, 0.05)");

        // Gradiente para la línea
        const lineGradient = svg.append("defs")
            .append("linearGradient")
            .attr("id", "hum-line-gradient")
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "100%").attr("y2", "0%");

        lineGradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#ff6b6b");

        lineGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#ff8787");

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
            .attr("class", "area-hum")
            .attr("fill", "url(#hum-gradient)")
            .attr("stroke", "none");

        // Línea principal
        const path = g.append("path")
            .attr("class", "line-hum")
            .attr("fill", "none")
            .attr("stroke", "url(#hum-line-gradient)")
            .attr("stroke-width", 3.5)
            .style("filter", "drop-shadow(0 0 8px rgba(255, 107, 107, 0.5))");

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
            .attr("y", -60)
            .attr("fill", "#ffffff")
            .attr("font-size", "22px")
            .attr("font-weight", "600")
            .attr("text-anchor", "middle")
            .text("HUMEDAD (%)");
        
        g.append("text")
            .attr("x", width/2)
            .attr("y", height + 40)
            .attr("fill", "#ffffff")
            .attr("font-size", "22px")
            .attr("font-weight", "600")
            .attr("text-anchor", "middle")
            .text("Tiempo");

        // Zonas de humedad en el fondo según el semáforo
        const humZonesData = [
            {min: 0, max: 30, color: "rgba(255, 107, 107, 0.08)", label: "CRÍTICO", emoji: "⚠️"},
            {min: 30, max: 40, color: "rgba(255, 212, 59, 0.08)", label: "ADVERTENCIA", emoji: "⚠️"},
            {min: 40, max: 60, color: "rgba(105, 219, 124, 0.08)", label: "ÓPTIMO", emoji: "✅"},
            {min: 60, max: 70, color: "rgba(255, 212, 59, 0.08)", label: "ADVERTENCIA", emoji: "⚠️"},
            {min: 70, max: 100, color: "rgba(255, 107, 107, 0.08)", label: "CRÍTICO", emoji: "⚠️"}
        ];

        // Tooltip
        d3.select("body").selectAll(".tooltip-humedad").remove();
        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip-humedad")
            .style("position", "absolute")
            .style("background", "rgba(15, 23, 42, 0.95)")
            .style("color", "#e2e8f0")
            .style("padding", "12px 16px")
            .style("border", "2px solid #ff6b6b")
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

        // Línea de referencia (nivel óptimo 50%)
        const referenceLine = g.append("line")
            .attr("class", "reference-line")
            .attr("stroke", "rgba(255, 255, 255, 0.5)")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "8,4")
            .style("opacity", 0.6);

        // Variables de control
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

        // Función para determinar nivel de humedad según el semáforo
        function getHumLevel(v) {
            if (v < 30 || v > 70) return {
                level: "CRÍTICO", 
                color: humColors.critico, 
                emoji: "⚠️",
                estado: "critico",
                descripcion: v < 30 ? "Irritación respiratoria por sequedad extrema" : "Riesgo de crecimiento de moho e irritación respiratoria"
            };
            if ((v >= 30 && v < 40) || (v >= 60 && v <= 70)) return {
                level: "ADVERTENCIA", 
                color: humColors.advertencia, 
                emoji: "⚠️",
                estado: "advertencia",
                descripcion: v < 40 ? "Riesgo de sequedad respiratoria" : "Riesgo de proliferación microbiana"
            };
            return {
                level: "ÓPTIMO", 
                color: humColors.optimo, 
                emoji: "✅",
                estado: "optimo",
                descripcion: "Minimiza patógenos, maximiza confort respiratorio"
            };
        }

        // Función para redibujar el gráfico
        function redraw() {
            const visibleData = getVisibleData();
            if (visibleData.length === 0) return;

            x.domain(d3.extent(visibleData, d => d.time));
            
            const minVal = Math.max(0, d3.min(visibleData, d => d.value) - 5);
            const maxVal = Math.min(100, d3.max(visibleData, d => d.value) + 5);
            y.domain([minVal, maxVal]);

            // Zonas de humedad
            const humZones = g.selectAll(".hum-zone").data(humZonesData);

            humZones.enter()
                .append("rect")
                .attr("class", "hum-zone")
                .merge(humZones)
                .attr("x", 0)
                .attr("width", width)
                .attr("y", d => y(d.max))
                .attr("height", d => y(d.min) - y(d.max))
                .attr("fill", d => d.color)
                .attr("rx", 2);

            humZones.exit().remove();

            // Actualizar línea de referencia (centro del rango óptimo)
            const optimoCentro = 50;
            referenceLine
                .attr("x1", 0)
                .attr("y1", y(optimoCentro))
                .attr("x2", width)
                .attr("y2", y(optimoCentro));

            // Actualizar grid
            grid.call(d3.axisLeft(y)
                .ticks(6)
                .tickSize(-width)
                .tickFormat(""))
                .attr("opacity", 0.15)
                .selectAll("line")
                .attr("stroke", "#ff6b6b");

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
                .attr("stroke", "#ff6b6b")
                .attr("opacity", 0.5);

            yAxisG.call(d3.axisLeft(y)
                .ticks(6)
                .tickFormat(d => d + " %")
                .tickSizeOuter(0))
                .selectAll("text")
                .attr("fill", "#94a3b8")
                .attr("font-size", "11px")
                .attr("font-weight", "500")
                .attr("dx", "-5px");

            yAxisG.selectAll("path, line")
                .attr("stroke", "#ff6b6b")
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
                    const level = getHumLevel(d.value);
                    return level.color;
                })
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 1.5)
                .style("opacity", 0.9)
                .style("cursor", "pointer")
                .on("mouseover", function(event, d) {
                    const mouseX = x(d.time);
                    const mouseY = y(d.value);
                    const levelInfo = getHumLevel(d.value);
                    
                    // Mostrar punto focal
                    focus
                        .attr("cx", mouseX)
                        .attr("cy", mouseY)
                        .transition()
                        .duration(200)
                        .attr("r", 8)
                        .style("opacity", 1);

                    // Mostrar línea vertical
                    verticalLine
                        .attr("x1", mouseX)
                        .attr("y1", 0)
                        .attr("x2", mouseX)
                        .attr("y2", height)
                        .transition()
                        .duration(200)
                        .style("opacity", 1);

                    // Mostrar tooltip
                    tooltip
                        .html(`
                            <div style="display: flex; align-items: center; margin-bottom: 6px;">
                                <div style="width: 12px; height: 12px; background: ${levelInfo.color}; border-radius: 50%; margin-right: 8px;"></div>
                                <strong style="font-size: 16px; color: #ff6b6b;">${d.value.toFixed(1)} %</strong>
                            </div>
                            <div style="color: #94a3b8; margin-bottom: 4px;">
                                <span style="color: ${levelInfo.color}; font-weight: 600;">
                                    ${levelInfo.emoji} ${levelInfo.level}
                                </span>
                            </div>
                            <div style="font-size: 11px; color: #cbd5e1;">
                                ${levelInfo.descripcion}<br><br>
                                ${d3.timeFormat("%H:%M:%S")(d.time)}<br>
                                ${d3.timeFormat("%d/%m/%Y")(d.time)}
                            </div>
                        `)
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 100) + "px")
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

        // Configurar arrastre
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
            const id = `hum-${time.getTime()}-${Math.random()}`;
            
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

        // Función para cargar datos históricos
        async function loadHistoricalData() {
            try {
                const response = await fetch('/api/humedad/');
                if (!response.ok) return;
                
                const apiData = await response.json();
                if (apiData && apiData.length > 0) {
                    // Convertir datos de la API usando valor y fecha_hora
                    const formattedData = apiData.map((item) => ({
                        id: `db-${item.id}`,
                        time: new Date(item.fecha_hora),
                        value: parseFloat(item.valor)
                    })).filter(item => !isNaN(item.time.getTime()) && !isNaN(item.value));
                    
                    if (formattedData.length > 0) {
                        // Ordenar por fecha (más antiguo primero)
                        formattedData.sort((a, b) => a.time - b.time);
                        
                        data = formattedData;
                        currentStartIndex = Math.max(0, data.length - MAX_VISIBLE_POINTS);
                        redraw();
                        
                        // Actualizar gauge con el último valor
                        if (data.length > 0 && window.gaugeHumInstance) {
                            const lastValue = data[data.length - 1].value;
                            window.gaugeHumInstance.update(lastValue);
                        }
                    }
                }
            } catch (error) {
                console.log('No se pudieron cargar datos históricos de humedad:', error);
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
                g.selectAll(".hum-zone").remove();
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
    const gauge = gaugeHumedad("#gauge-humedad", 50.0);
    const series = lineChartHumedad("#serie-humedad");

    // Guardar instancias en ventana global
    window.gaugeHumInstance = gauge;
    window.seriesHumInstance = series;

    // ================= WEBSOCKET =================
    const socket = new WebSocket("ws://" + window.location.host + "/ws/humedad/");

    socket.onmessage = function(e) {
        const mensaje = JSON.parse(e.data);
        const valor = mensaje.valor;
        const fecha = mensaje.fecha_hora;

        gauge.update(valor);
        series.push(valor, fecha);

        if (mensaje.sample_id) {
        socket.send(JSON.stringify({
            type: "ack_metric",
            sample_id: mensaje.sample_id,
            cliente: "web"
        }));
    }
    };

    socket.onopen = function() {
        console.log("WebSocket Humedad conectado");
    };

    socket.onerror = function() {
        console.error("Error en WebSocket Humedad");
    };

    socket.onclose = function() {
        console.warn("WebSocket Humedad desconectado");
        setTimeout(() => {
            location.reload();
        }, 5000);
    };
});