document.addEventListener("DOMContentLoaded", function () {
    d3.select("body").style("background-color", "#0b0f19");

    // ===================== GAUGE TERMÓMETRO =====================
    function gaugeTemperatura(containerId, initial) {
        const container = d3.select(containerId);
        container.html(""); // Limpiar contenedor

        const width = 300;
        const height = 520;
        const min = 0;      // °C mínimo visual
        const max = 45;     // °C máximo visual

        const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height);

        // Paleta de colores según el semáforo de 3 estados
        const tempPalette = {
            critico: "#ff6b6b",      // Rojo para CRÍTICO (<18°C o >26°C)
            advertencia: "#ffd43b",  // Amarillo para ADVERTENCIA (18-20°C o 24-26°C)
            optimo: "#69db7c",        // Verde para ÓPTIMO (20-24°C)
            white: "#ffffff"
        };

        // Diseño tipo termómetro
        const termometroX = width/2 - 15;
        const termometroY = 15;
        const termometroH = 360;
        const bulboRadio = 35;

        // Bulbo inferior
        svg.append("circle")
            .attr("cx", width/2 + 15)
            .attr("cy", termometroY + termometroH + bulboRadio)
            .attr("r", bulboRadio)
            .attr("fill", "#0f1724")
            .attr("stroke", tempPalette.white)
            .attr("stroke-width", 4);

        // Tubo del termómetro
        svg.append("rect")
            .attr("x", termometroX)
            .attr("y", termometroY)
            .attr("width", 60)
            .attr("height", termometroH)
            .attr("rx", 15)
            .attr("fill", "#0f1724")
            .attr("stroke", tempPalette.white)
            .attr("stroke-width", 3);

        // Escala para el mercurio
        const scale = d3.scaleLinear()
            .domain([min, max])
            .range([termometroY + termometroH, termometroY]);

        // Mercurio (líquido del termómetro)
        const mercurio = svg.append("rect")
            .attr("x", termometroX + 4)
            .attr("width", 52)
            .attr("y", scale(initial))
            .attr("height", Math.max(2, (termometroY + termometroH) - scale(initial)))
            .attr("fill", tempPalette.critico)
            .attr("rx", 11);

        // Mercurio en el bulbo
        const mercurioBulbo = svg.append("circle")
            .attr("cx", width/2 + 15)
            .attr("cy", termometroY + termometroH + bulboRadio)
            .attr("r", bulboRadio - 5)
            .attr("fill", tempPalette.critico);

        // Valor numérico (justo arriba del texto del nivel)
        const valueText = svg.append("text")
            .attr("x", width/2 + 15)
            .attr("y", termometroY + termometroH + bulboRadio + 70)
            .attr("fill", tempPalette.critico)
            .attr("font-size", "40px")
            .attr("font-weight", "700")
            .attr("text-anchor", "middle")
            .text(initial.toFixed(1) + " °C");

        // FUNCIÓN para determinar nivel de temperatura según el semáforo
        function getTempLevel(v) {
            if (v < 18 || v > 26) return {
                nivel: "CRÍTICO", 
                emoji: "⚠️",
                color: tempPalette.critico,
                estado: "critico"
            };
            if ((v >= 18 && v < 20) || (v >= 24 && v <= 26)) return {
                nivel: TRANSLATIONS.advertencia || "ADVERTENCIA", 
                emoji: "⚠️",
                color: tempPalette.advertencia,
                estado: "advertencia"
            };
            return {
                nivel: "ÓPTIMO", 
                emoji: "✅",
                color: tempPalette.optimo,
                estado: "optimo"
            };
        }

        // Función para determinar color según temperatura
        function colorFor(v) {
            const level = getTempLevel(v);
            return level.color;
        }

        // TEXTO DE NIVEL
        const levelText = svg.append("text")
            .attr("x", width/2 + 15)
            .attr("y", termometroY + termometroH + bulboRadio + 110) 
            .attr("fill", tempPalette.critico)
            .attr("font-size", "36px")  
            .attr("font-weight", "600")
            .attr("text-anchor", "middle")
            .text(getTempLevel(initial).nivel);

        // TEXTO DESCRIPTIVO 
        const descText = svg.append("text")
            .attr("x", width/2 + 15)
            .attr("y", termometroY + termometroH + bulboRadio + 125)
            .attr("fill", "#94a3b8")  // Color gris para contraste
            .attr("font-size", "14px")
            .attr("font-weight", "500")
            .attr("text-anchor", "middle")
            .text(getTempDescription(initial));

        // Función para obtener descripción según el nivel
        function getTempDescription(v) {
            if (v < 18 || v > 26) return "Riesgo fisiológico, estrés térmico";
            if ((v >= 18 && v < 20) || (v >= 24 && v <= 26)) return "Leve incomodidad térmica";
            return "Zona de confort térmico humano óptimo";
        }

        // Marcas de escala
        for (let temp = min; temp <= max; temp += 5) {
            const y = scale(temp);
            svg.append("line")
                .attr("x1", termometroX - 20)
                .attr("x2", termometroX)
                .attr("y1", y)
                .attr("y2", y)
                .attr("stroke", tempPalette.white)
                .attr("stroke-width", 2);
            
            svg.append("text")
                .attr("x", termometroX - 18)
                .attr("y", y + 4)
                .attr("fill", tempPalette.white)
                .attr("font-size", "28px")
                .attr("text-anchor", "end")
                .text(temp + "°");
        }

        // =================== FUNCIÓN PARA CARGAR ÚLTIMO DATO DE LA BD ===================
        async function cargarUltimoDatoBD() {
            try {
                console.log('Cargando datos de Temperatura desde BD para obtener el último...');
                const response = await fetch('/api/temperatura/');
                
                if (!response.ok) {
                    console.log('No se pudieron obtener datos de Temperatura de la BD');
                    // Si no hay datos se agrega 22°C como valor por defecto (dentro del rango óptimo)
                    actualizarGauge(22.0);
                    return 22.0;
                }
                
                const datos = await response.json();
                
                if (datos && Array.isArray(datos) && datos.length > 0) {
                    // Tomar el primer elemento (el más reciente)
                    const ultimoDato = datos[0];
                    
                    // Extraer el valor de Temperatura
                    let ultimoValor;
                    if (ultimoDato.temperatura !== undefined) {
                        ultimoValor = parseFloat(ultimoDato.temperatura);
                    } else if (ultimoDato.valor !== undefined) {
                        ultimoValor = parseFloat(ultimoDato.valor);
                    } else {
                        // Si no encuentra temperatura ni valor, usar 22°C (óptimo)
                        console.log('Campo no encontrado, usando valor por defecto 22°C');
                        ultimoValor = 22.0;
                    }
                    
                    console.log('Último dato de Temperatura encontrado:', ultimoValor.toFixed(1) + ' °C', 
                            'Estado:', getTempLevel(ultimoValor).nivel,
                            'Fecha:', ultimoDato.fecha_hora || ultimoDato.timestamp);
                    
                    // Actualizar el gauge con el último valor de la BD
                    actualizarGauge(ultimoValor);
                    
                    return ultimoValor;
                } else {
                    console.log('No hay datos de Temperatura en la BD, usando valor por defecto 22°C');
                    // Si no hay datos, usar 22°C como valor por defecto (dentro del rango óptimo)
                    actualizarGauge(22.0);
                    return 22.0;
                }
            } catch (error) {
                console.log('Error al cargar datos de Temperatura:', error);
                // En caso de error, usar 22°C como valor por defecto (dentro del rango óptimo)
                actualizarGauge(22.0);
                return 22.0;
            }
        }

        // =================== FUNCIÓN PARA CARGAR MÚLTIPLES DATOS ===================
        async function cargarDatosRecientesBD(limite = 10) {
            try {
                console.log(`Cargando últimos ${limite} datos de Temperatura...`);
                const response = await fetch('/api/temperatura/');
                
                if (!response.ok) {
                    console.log('No se pudieron obtener datos de Temperatura de la BD');
                    return [];
                }
                
                const datos = await response.json();
                
                if (datos && Array.isArray(datos)) {
                    // Tomar los primeros 'limite' elementos (los más recientes)
                    const datosRecientes = datos.slice(0, limite);
                    
                    // Procesar y formatear datos
                    const datosFormateados = datosRecientes.map(dato => {
                        let valor;
                        // Buscar el campo de temperatura
                        if (dato.temperatura !== undefined) {
                            valor = parseFloat(dato.temperatura);
                        } else if (dato.valor !== undefined) {
                            valor = parseFloat(dato.valor);
                        } else {
                            return null;
                        }
                        
                        if (isNaN(valor)) return null;
                        
                        const nivelInfo = getTempLevel(valor);
                        
                        return {
                            id: dato.id || `temp-${Date.now()}-${Math.random()}`,
                            valor: valor,
                            fecha: dato.fecha_hora || dato.timestamp,
                            nivel: nivelInfo.nivel,
                            estado: nivelInfo.estado,
                            color: nivelInfo.color
                        };
                    }).filter(dato => dato !== null);
                    
                    console.log(`Cargados ${datosFormateados.length} datos recientes de Temperatura`);
                    return datosFormateados;
                }
                
                return [];
            } catch (error) {
                console.log('Error al cargar datos recientes de Temperatura:', error);
                return [];
            }
        }

        // =================== FUNCIÓN DE ACTUALIZACIÓN INTERNA ===================
        function actualizarGauge(newVal) {
            const y = scale(newVal);
            const h = Math.max(2, (termometroY + termometroH) - y);
            const newLevel = getTempLevel(newVal);
            const newColor = newLevel.color;

            mercurio
                .transition().duration(300)
                .attr("y", y)
                .attr("height", h)
                .attr("fill", newColor);

            mercurioBulbo
                .transition().duration(300)
                .attr("fill", newColor);

            valueText
                .transition().duration(300)
                .text(newVal.toFixed(1) + " °C")
                .attr("fill", newColor);

            // Actualizar texto del nivel
            levelText
                .transition().duration(300)
                .text(newLevel.nivel)
                .attr("fill", newColor);

            // Actualizar texto descriptivo
            descText
                .transition().duration(300)
                .text(getTempDescription(newVal))
                .attr("fill", "#94a3b8");
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
            obtenerNivelTemperatura: getTempLevel,
            // Función para obtener el nivel actual
            getNivelActual: function() {
                return getTempLevel(parseFloat(valueText.text().replace(' °C', '')));
            }
        };

        return gaugeObject;
    }

    // ===================== SERIE TEMPORAL DE TEMPERATURA =====================
    function lineChartTemperatura(containerId) {
        const container = d3.select(containerId);
        container.html(""); // Limpiar contenedor

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
            .style("box-shadow", "0 4px 20px rgba(0, 0, 0, 0.15)");

        // Título
        svg.append("text")
            .attr("x", outerW/2)
            .attr("y", 28)
            .attr("fill", "#ffffffff")
            .attr("font-size", "20px")
            .attr("font-weight", "700")
            .attr("text-anchor", "middle")
            .style("letter-spacing", "0.5px")
            .text(TRANSLATIONS.history_temperatura || "HISTÓRICO DE TEMPERATURA");

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

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

        // Paleta de colores para temperatura según el semáforo
        const tempColors = {
            critico: "#ff6b6b",      // Rojo para CRÍTICO
            advertencia: "#ffd43b",  // Amarillo para ADVERTENCIA
            optimo: "#69db7c"        // Verde para ÓPTIMO
        };

        // Gradiente para el área (usar color del nivel actual)
        const gradient = svg.append("defs")
            .append("linearGradient")
            .attr("id", "temp-gradient")
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
            .attr("id", "temp-line-gradient")
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
            .attr("class", "area-temp")
            .attr("fill", "url(#temp-gradient)")
            .attr("stroke", "none");

        // Línea principal
        const path = g.append("path")
            .attr("class", "line-temp")
            .attr("fill", "none")
            .attr("stroke", "url(#temp-line-gradient)")
            .attr("stroke-width", 3)
            .style("filter", "drop-shadow(0 0 6px rgba(255, 107, 107, 0.3))");

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
            .text(TRANSLATIONS.temperatura || "Temperatura (°C)");
        
        g.append("text")
            .attr("x", width/2)
            .attr("y", height + 40)
            .attr("fill", "#ffffff")
            .attr("font-size", "22px")
            .attr("font-weight", "600")
            .attr("text-anchor", "middle")
            .text(TRANSLATIONS.tiempo || "Tiempo");

        // Zonas de temperatura en el fondo según el semáforo
        const tempZonesData = [
            {min: 0, max: 18, color: "rgba(255, 107, 107, 0.08)", label: "CRÍTICO", emoji: "⚠️"},
            {min: 18, max: 20, color: "rgba(255, 212, 59, 0.08)", label: "ADVERTENCIA", emoji: "⚠️"},
            {min: 20, max: 24, color: "rgba(105, 219, 124, 0.08)", label: "ÓPTIMO", emoji: "✅"},
            {min: 24, max: 26, color: "rgba(255, 212, 59, 0.08)", label: "ADVERTENCIA", emoji: "⚠️"},
            {min: 26, max: 45, color: "rgba(255, 107, 107, 0.08)", label: "CRÍTICO", emoji: "⚠️"}
        ];

        // Tooltip
        d3.select("body").selectAll(".tooltip-temperatura").remove();
        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip-temperatura")
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
            .attr("fill", "#ffd700")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 2)
            .style("filter", "drop-shadow(0 0 6px rgba(255, 215, 0, 0.6))")
            .style("opacity", 0);

        // Línea vertical guía
        const verticalLine = g.append("line")
            .attr("class", "vertical-line")
            .attr("stroke", "rgba(255, 255, 255, 0.3)")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,5")
            .style("opacity", 0);

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

        // Función para determinar nivel de temperatura según el semáforo
        function getTempLevel(v) {
            if (v < 18 || v > 26) return {
                level: "CRÍTICO", 
                color: tempColors.critico, 
                emoji: "⚠️",
                estado: "critico"
            };
            if ((v >= 18 && v < 20) || (v >= 24 && v <= 26)) return {
                level: TRANSLATIONS.advertencia || "ADVERTENCIA", 
                color: tempColors.advertencia, 
                emoji: "⚠️",
                estado: "advertencia"
            };
            return {
                level: "ÓPTIMO", 
                color: tempColors.optimo, 
                emoji: "✅",
                estado: "optimo"
            };
        }

        // Función para redibujar el gráfico
        function redraw() {
            const visibleData = getVisibleData();
            if (visibleData.length === 0) return;

            // Actualizar dominios
            x.domain(d3.extent(visibleData, d => d.time));
            
            // Determinar rango Y dinámico
            const minVal = Math.max(0, d3.min(visibleData, d => d.value) - 5);
            const maxVal = Math.min(45, d3.max(visibleData, d => d.value) + 5);
            y.domain([minVal, maxVal]);

            // Zonas de temperatura en el fondo
            const tempZones = g.selectAll(".temp-zone").data(tempZonesData);

            tempZones.enter()
                .append("rect")
                .attr("class", "temp-zone")
                .merge(tempZones)
                .attr("x", 0)
                .attr("width", width)
                .attr("y", d => y(d.max))
                .attr("height", d => y(d.min) - y(d.max))
                .attr("fill", d => d.color)
                .attr("rx", 2);

            tempZones.exit().remove();

            // Actualizar grid
            grid.call(d3.axisLeft(y)
                .ticks(6)
                .tickSize(-width)
                .tickFormat(""))
                .attr("opacity", 0.1)
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
                .tickFormat(d => d + "°C")
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
                    const level = getTempLevel(d.value);
                    return level.color;
                })
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 1.5)
                .style("opacity", 0.9)
                .style("cursor", "pointer")
                .on("mouseover", function(event, d) {
                    const mouseX = x(d.time);
                    const mouseY = y(d.value);
                    const levelInfo = getTempLevel(d.value);
                    
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
                                <strong style="font-size: 16px; color: #ff6b6b;">${d.value.toFixed(1)}°C</strong>
                            </div>
                            <div style="color: #94a3b8; margin-bottom: 4px;">
                                <span style="color: ${levelInfo.color}; font-weight: 600;">
                                    ${levelInfo.emoji} ${levelInfo.level}
                                </span>
                            </div>
                            <div style="font-size: 11px; color: #cbd5e1;">
                                ${d3.timeFormat("%H:%M:%S")(d.time)}<br>
                                ${d3.timeFormat("%d/%m/%Y")(d.time)}
                            </div>
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
            const id = `temp-${time.getTime()}-${Math.random()}`;
            
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

        // Función para cargar datos históricos desde la API
        async function loadHistoricalData() {
            try {
                const response = await fetch('/api/temperatura/');
                if (!response.ok) return;
                
                const apiData = await response.json();
                if (apiData && apiData.length > 0) {
                    // Convertir datos de la API usando temperatura y fecha_hora
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
                        if (data.length > 0 && window.gaugeTempInstance) {
                            const lastValue = data[data.length - 1].value;
                            window.gaugeTempInstance.update(lastValue);
                        }
                    }
                }
            } catch (error) {
                console.log('No se pudieron cargar datos históricos de temperatura:', error);
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
                g.selectAll(".temp-zone").remove();
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
    const gauge = gaugeTemperatura("#gauge-temperatura", 22.0);
    const series = lineChartTemperatura("#serie-temperatura");

    // Guardar instancias en ventana global si es necesario
    window.gaugeTempInstance = gauge;
    window.seriesTempInstance = series;

    // ================= WEBSOCKET =================
    const socket = new WebSocket("ws://" + window.location.host + "/ws/temperatura/");

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
        console.log("WebSocket Temperatura conectado");
    };

    socket.onerror = function() {
        console.error("Error en WebSocket Temperatura");
    };

    socket.onclose = function() {
        console.warn("WebSocket Temperatura desconectado");
        setTimeout(() => {
            location.reload();
        }, 5000);
    };
});