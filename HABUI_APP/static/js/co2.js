document.addEventListener("DOMContentLoaded", function () {
    d3.select("body").style("background-color", "#0b0f19");
    
    // Variables para estadísticas (no se muestran, las mantenemos para posibles usos futuros)
    let stats = {
        current: null,
        min: Infinity,
        max: -Infinity,
        history: []
    };

    // ===================== NUEVOS RANGOS Y COLORES =====================
    const CO2_RANGES = [
        {
            min: 400,
            max: 1000,
            color: "#4caf50",        // Verde
            textColor: "#4caf50",
            quality: "ÓPTIMO",
            description: "Indicador de ventilación adecuada y confort",
            icon: "🟢"
        },
        {
            min: 1000,
            max: 2000,
            color: "#ffc107",        // Amarillo
            textColor: "#ffc107",
            quality: "ADVERTENCIA",
            description: "Somnolencia leve, reducción cognitiva",
            icon: "🟡"
        },
        {
            min: 2000,
            max: Infinity,
            color: "#f44336",        // Rojo
            textColor: "#f44336",
            quality: "CRÍTICO",
            description: "Riesgo fisiológico, hipercapnia progresiva",
            icon: "🔴"
        },
        {
            min: 2000,
            max: Infinity,
            color: "#ffffff",
            textColor: "#ffffff"
        }
    ];

    // Función para obtener el rango según el valor
    function getRangeForValue(v) {
        for (let range of CO2_RANGES) {
            if (v >= range.min && v < range.max) {
                return range;
            }
        }
        // Si está por debajo del mínimo, usar el primer rango pero con color atenuado
        if (v < CO2_RANGES[0].min) {
            return {
                ...CO2_RANGES[0],
                color: "#7ecf7e", // Verde más claro para valores bajos
                textColor: "#7ecf7e",
                quality: "BAJO"
            };
        }
        // Si está por encima del máximo, usar el último rango
        return CO2_RANGES[CO2_RANGES.length - 1];
    }

    // ===================== GAUGE VERTICAL (CO2 ppm) =====================
    function gaugeCO2(containerId, initial) {
        const container = d3.select(containerId);
        container.html(""); // Limpiar contenedor
        
        const width = 300;
        const height = 520;
        const min = 0.0;
        const max = 3000.0; // Máximo 3000 ppm para mejor visualización

        const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height);

        // Paleta de colores según los rangos especificados para CO2
        const colorPalette = {
            // Óptimo: 400 – 1,000 ppm
            green: "#10b981",     // Verde
            // Advertencia: 1,000 – 2,000 ppm
            yellow: "#fbbf24",    // Amarillo
            // Crítico: > 2,000 ppm
            red: "#ef4444",       // Rojo
            // Colores adicionales
            lightGreen: "#34d399",
            darkGreen: "#059669",
            lightRed: "#f87171",
            white: "#ffffff"
        };

        // svg.append("text")
        //     .attr("x", width/2)
        //     .attr("y", 32)
        //     .attr("fill", colorPalette.white)
        //     .attr("font-size", "22px")
        //     .attr("font-weight", "700")
        //     .attr("text-anchor", "middle")
        //     .text("CO₂ (ppm)");

        // outer frame
        const frameX = 85;
        const frameY = 15;
        const frameW = 180;
        const frameH = 360;

        svg.append("rect")
            .attr("x", frameX)
            .attr("y", frameY)
            .attr("width", frameW)
            .attr("height", frameH)
            .attr("rx", 14)
            .attr("fill", "#0f172a")
            .attr("stroke", colorPalette.white)
            .attr("stroke-width", 3);

        // fill rect
        const scale = d3.scaleLinear().domain([min, max]).range([frameY + frameH, frameY]);
        
        // ===================== LÍNEAS DE NIVEL PARA CO2 (0-3000 ppm) =====================
        const nivelesCO2 = [0, 600, 1200, 1800, 2400, 3000];
        
        nivelesCO2.forEach(ppm => {
            const y = scale(ppm);
            
            // Línea horizontal de nivel
            svg.append("line")
                .attr("x1", frameX - 10)
                .attr("y1", y)
                .attr("x2", frameX)
                .attr("y2", y)
                .attr("stroke", colorPalette.white)
                .attr("stroke-width", 1.5);

            svg.append("text")
                .attr("x", frameX - 20)
                .attr("y", y + 4)
                .attr("fill", colorPalette.white)
                .attr("font-size", "28px")
                .attr("font-weight", "500")
                .attr("text-anchor", "end")
                .text(formatPPM(ppm));
        });
        
        // Función para formatear valores de ppm
        function formatPPM(ppm) {
            if (ppm >= 1000) {
                return (ppm / 1000).toFixed(1) + 'k';  // Ej: 1000 → "1.0k", 2400 → "2.4k"
            }
            return ppm.toString();  // Ej: 0 → "0", 600 → "600"
        }

        const fillRect = svg.append("rect")
            .attr("x", frameX)
            .attr("width", frameW)
            .attr("y", scale(initial))
            .attr("height", Math.max(2, (frameY + frameH) - scale(initial)))
            .attr("fill", colorFor(initial))
            .attr("rx", 12);

        const valueText = svg.append("text")
            .attr("x", width/2)
            .attr("y", frameY + frameH + 50)
            .attr("fill", colorFor(initial))
            .attr("font-size", "40px")
            .attr("font-weight", "700")
            .attr("text-anchor", "middle")
            .text(initial.toFixed(0) + " ppm");

        // Indicador de calidad
        const qualityText = svg.append("text")
            .attr("x", width/2)
            .attr("y", frameY + frameH + 100)
            .attr("fill", colorFor(initial))
            .attr("font-size", "36px")
            .attr("font-weight", "600")
            .attr("text-anchor", "middle")
            .text(getQualityText(initial));

        // Definir funciones auxiliares primero
        function colorFor(v) {
            // Asegurar que el valor esté entre 0 y max (3000 ppm)
            const valor = Math.max(min, Math.min(max, v));
            
            // Rangos
            if (valor >= 400 && valor <= 1000) {
                return colorPalette.green;      // Óptimo (verde)
            } else if (valor > 1000 && valor <= 2000) {
                return colorPalette.yellow;     // Advertencia (amarillo)
            } else {
                return colorPalette.red;        // Crítico (rojo)
            }
        }

        function getQualityText(v) {
            // Asegurar que el valor esté entre 0 y max (3000 ppm)
            const valor = Math.max(min, Math.min(max, v));
            
            if (valor >= 400 && valor <= 1000) {
                return "ÓPTIMO";
            } else if (valor > 1000 && valor <= 2000) {
                return "ADVERTENCIA";
            } else {
                return "¡CRÍTICO!";
            }
        }

        // Función para obtener texto corto para el footer
        function getFooterQualityText(v) {
            // Asegurar que el valor esté entre 0 y max (3000 ppm)
            const valor = Math.max(min, Math.min(max, v));
            if (valor >= 400 && valor <= 1000) {
                return "ÓPTIMO";
            } else if (valor > 1000 && valor <= 2000) {
                return "ADVERTENCIA";
            } else {
                return "CRÍTICO";
            }
        }

        // =================== FUNCIÓN DE ACTUALIZACIÓN INTERNA ===================
        function actualizarGauge(newVal) {
            // LIMITAR EL VALOR ENTRE min y max
            const valorLimitado = Math.max(min, Math.min(max, newVal));
            
            const y = scale(valorLimitado);
            const h = Math.max(2, (frameY + frameH) - y);
            const newColor = colorFor(valorLimitado);
            const qualityTextValue = getQualityText(valorLimitado);

            // Actualizar elementos SVG
            fillRect
                .transition().duration(300)
                .attr("y", y)
                .attr("height", h)
                .attr("fill", newColor);

            valueText
                .transition().duration(300)
                .text(valorLimitado.toFixed(0) + " ppm")
                .attr("fill", newColor);

            qualityText
                .transition().duration(300)
                .text(qualityTextValue)
                .attr("fill", newColor);

            // Actualizar elementos HTML
            const qualityElement = document.getElementById('co2-concentration');
            const timeElement = document.getElementById('co2-time');
            
            if (qualityElement) {
                const footerText = getFooterQualityText(valorLimitado);
                qualityElement.textContent = footerText;
                qualityElement.style.color = newColor;
            }
            
            if (timeElement) {
                const ahora = new Date();
                const horaStr = ahora.getHours().toString().padStart(2, '0') + ':' + 
                            ahora.getMinutes().toString().padStart(2, '0');
                timeElement.textContent = horaStr;
            }

            return valorLimitado;
        }

        // =================== FUNCIÓN PARA CARGAR ÚLTIMO DATO DE LA BD ===================
        async function cargarUltimoDatoBD() {
            try {
                console.log('Cargando datos de CO₂ desde BD para obtener el último...');
                const response = await fetch('/api/co2/');
                
                if (!response.ok) {
                    console.log('No se pudieron obtener datos de CO₂ de la BD');
                    return null;
                }
                
                const datos = await response.json();
                
                if (datos && Array.isArray(datos) && datos.length > 0) {
                    // Tomar el primer elemento (el más reciente)
                    const ultimoDato = datos[0];
                    
                    // Extraer el valor de CO₂
                    let ultimoValor = null;
                    
                    if (ultimoDato.concentracion !== undefined && ultimoDato.concentracion !== null) {
                        ultimoValor = parseFloat(ultimoDato.concentracion);
                    } else if (ultimoDato.valor !== undefined && ultimoDato.valor !== null) {
                        ultimoValor = parseFloat(ultimoDato.valor);
                    } else if (ultimoDato.nivel !== undefined && ultimoDato.nivel !== null) {
                        ultimoValor = parseFloat(ultimoDato.nivel);
                    } else {
                        console.log('Campo "concentracion", "valor" o "nivel" no encontrado en:', ultimoDato);
                        return null;
                    }
                    
                    if (isNaN(ultimoValor)) {
                        console.log('Valor de CO₂ no es un número:', ultimoDato);
                        return null;
                    }
                    
                    console.log('Último dato de CO₂ encontrado:', ultimoValor.toFixed(0) + ' ppm', 
                            'ID:', ultimoDato.id, 'Fecha:', ultimoDato.fecha_hora || ultimoDato.timestamp);
                    
                    // Actualizar el gauge con el último valor de la BD
                    actualizarGauge(ultimoValor);
                    
                    return ultimoValor;
                } else {
                    console.log('No hay datos de CO₂ en la BD');
                    return null;
                }
            } catch (error) {
                console.log('Error al cargar datos de CO₂:', error);
                return null;
            }
        }

        // =================== FUNCIÓN PARA CARGAR MÚLTIPLES DATOS ===================
        async function cargarDatosRecientesBD(limite = 10) {
            try {
                console.log(`Cargando últimos ${limite} datos de CO₂...`);
                const response = await fetch('/api/co2/');
                
                if (!response.ok) {
                    console.log('No se pudieron obtener datos de CO₂ de la BD');
                    return [];
                }
                
                const datos = await response.json();
                
                if (datos && Array.isArray(datos)) {
                    // Tomar los primeros 'limite' elementos (los más recientes)
                    const datosRecientes = datos.slice(0, limite);
                    
                    // Procesar y formatear datos
                    const datosFormateados = datosRecientes.map(dato => {
                        let valor;
                        
                        if (dato.concentracion !== undefined && dato.concentracion !== null) {
                            valor = parseFloat(dato.concentracion);
                        } else if (dato.valor !== undefined && dato.valor !== null) {
                            valor = parseFloat(dato.valor);
                        } else if (dato.nivel !== undefined && dato.nivel !== null) {
                            valor = parseFloat(dato.nivel);
                        } else {
                            return null;
                        }
                        
                        if (isNaN(valor)) return null;
                        
                        // Determinar calidad según rangos de CO2
                        let calidad;
                        if (valor >= 400 && valor <= 1000) {
                            calidad = "ÓPTIMO";
                        } else if (valor > 1000 && valor <= 2000) {
                            calidad = "ADVERTENCIA";
                        } else {
                            calidad = "CRÍTICO";
                        }
                        
                        return {
                            id: dato.id,
                            valor: valor,
                            fecha: dato.fecha_hora || dato.timestamp,
                            calidad: calidad
                        };
                    }).filter(dato => dato !== null);
                    
                    console.log(`Cargados ${datosFormateados.length} datos recientes de CO₂`);
                    return datosFormateados;
                }
                
                return [];
            } catch (error) {
                console.log('Error al cargar datos recientes de CO₂:', error);
                return [];
            }
        }

        // =================== CARGAR ÚLTIMO DATO AL INICIAR ===================
        // Cargar el último dato al iniciar
        setTimeout(() => {
            cargarUltimoDatoBD();
        }, 500);

        // =================== RETORNO DE FUNCIONES ===================
        // Crear objeto de retorno con todas las funciones
        const gaugeObject = {
            update: function(newVal) {
                // Versión pública de update que también actualiza elementos HTML
                const valorActualizado = actualizarGauge(newVal);
                
                // Retornar información para usar en otros lugares
                return {
                    valor: valorActualizado,
                    calidad: getQualityText(valorActualizado),
                    color: colorFor(valorActualizado),
                    textoFooter: getFooterQualityText(valorActualizado)
                };
            },
            cargarUltimoDato: cargarUltimoDatoBD,
            cargarDatosRecientes: cargarDatosRecientesBD,
            actualizar: actualizarGauge,
            obtenerColorSegunValor: colorFor,
            obtenerTextoCalidad: getQualityText,
            obtenerRangos: function() {
                return {
                    optimo: { min: 400, max: 1000, color: colorPalette.green, estado: "ÓPTIMO" },
                    advertencia: { min: 1000, max: 2000, color: colorPalette.yellow, estado: "ADVERTENCIA" },
                    critico: { min: 2000, max: 3000, color: colorPalette.red, estado: "CRÍTICO" }
                };
            }
        };

        return gaugeObject;
    }

    // ===================== SERIE TEMPORAL DE CO₂ =====================
    function lineChartCO2(containerId) {
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
            .style("border", "3px solid #ffffff") // Cambiado a verde por defecto
            .style("border-radius", "12px")
            .style("box-shadow", "0 4px 20px rgba(76, 175, 80, 0.15)");

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
            .text(TRANSLATIONS.history_co2 || "HISTÓRICO DE CO₂ (ppm)");

        // Botón para regresar al inicio
        const homeButton = container.append("button")
            .attr("class", "btn btn-sm")
            .style("position", "absolute")
            .style("top", "12px")
            .style("right", "12px")
            .style("background", "rgba(76, 175, 80, 0.2)") // Verde
            .style("color", "#4caf50")
            .style("border", "1px solid #4caf50")
            .style("border-radius", "6px")
            .style("padding", "8px 12px")
            .style("cursor", "pointer")
            .style("z-index", "10")
            .style("transition", "all 0.3s")
            .html('<i class="bi bi-house-door"></i>')  // Icono de Bootstrap
            .on("mouseover", function() {
                d3.select(this)
                    .style("background", "#4caf50")
                    .style("color", "#0f172a")
                    .style("transform", "scale(1.05)");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .style("background", "rgba(76, 175, 80, 0.2)")
                    .style("color", "#4caf50")
                    .style("transform", "scale(1)");
            })
            .on("click", function() {
                // Regresar al inicio 
                currentStartIndex = Math.max(0, data.length - MAX_VISIBLE_POINTS);
                redraw();
                
                // Efecto visual de click
                d3.select(this)
                    .style("background", "#45a049")
                    .style("color", "#0f172a");
                
                setTimeout(() => {
                    d3.select(this)
                        .style("background", "rgba(76, 175, 80, 0.2)")
                        .style("color", "#4caf50");
                }, 300);
            });

        // Scales
        const x = d3.scaleTime().range([0, width]);
        const y = d3.scaleLinear().range([height, 0]);

        // Gradiente para el área
        const gradient = svg.append("defs")
            .append("linearGradient")
            .attr("id", "co2-gradient")
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "0%").attr("y2", "100%");

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "rgba(76, 175, 80, 0.4)") // Verde
            .attr("stop-opacity", 0.5);

        gradient.append("stop")
            .attr("offset", "80%")
            .attr("stop-color", "rgba(76, 175, 80, 0.1)");

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "rgba(76, 175, 80, 0.05)");

        // Gradiente para la línea
        const lineGradient = svg.append("defs")
            .append("linearGradient")
            .attr("id", "co2-line-gradient")
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "100%").attr("y2", "0%");

        lineGradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#4caf50");

        lineGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#45a049");

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
            .attr("class", "area-co2")
            .attr("fill", "url(#co2-gradient)")
            .attr("stroke", "none");

        // Línea principal
        const path = g.append("path")
            .attr("class", "line-co2")
            .attr("fill", "none")
            .attr("stroke", "url(#co2-line-gradient)")
            .attr("stroke-width", 3.5)
            .style("filter", "drop-shadow(0 0 8px rgba(76, 175, 80, 0.5))");

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
            .attr("y", -62)
            .attr("fill", "#ffffff")
            .attr("font-size", "22px")
            .attr("font-weight", "600")
            .attr("text-anchor", "middle")
            .text("CO₂ (ppm)");
        
        g.append("text")
            .attr("x", width/2)
            .attr("y", height + 40) // 40px debajo del eje X
            .attr("fill", "#ffffff")
            .attr("font-size", "22px")
            .attr("font-weight", "600")
            .attr("text-anchor", "middle")
            .text(TRANSLATIONS.tiempo || "Tiempo");

        // NUEVAS ZONAS DE CO₂ según los rangos actualizados
        const co2ZonesData = [
            {
                min: 400, 
                max: 1000, 
                color: "rgba(76, 175, 80, 0.1)", 
                label: "ÓPTIMO",
                description: "400 - 1000 ppm"
            },
            {
                min: 1000, 
                max: 2000, 
                color: "rgba(255, 193, 7, 0.1)", 
                label: "ADVERTENCIA",
                description: "1000 - 2000 ppm"
            },
            {
                min: 2000, 
                max: 3000, 
                color: "rgba(244, 67, 54, 0.1)", 
                label: "CRÍTICO",
                description: "> 2000 ppm"
            }
        ];

        // Tooltip
        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip-co2")
            .style("position", "absolute")
            .style("background", "rgba(15, 23, 42, 0.95)")
            .style("color", "#e2e8f0")
            .style("padding", "12px 16px")
            .style("border", "2px solid #4caf50")
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
            .attr("fill", "#4caf50")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 2)
            .style("filter", "drop-shadow(0 0 6px rgba(76, 175, 80, 0.8))")
            .style("opacity", 0);

        // Línea vertical guía
        const verticalLine = g.append("line")
            .attr("class", "vertical-line")
            .attr("stroke", "rgba(255, 255, 255, 0.3)")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,5")
            .style("opacity", 0);

        // Líneas de referencia para los límites de los rangos
        const referenceLines = g.append("g")
            .attr("class", "reference-lines");

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

        // Función para redibujar el gráfico
        function redraw() {
            const visibleData = getVisibleData();
            if (visibleData.length === 0) return;

            x.domain(d3.extent(visibleData, d => d.time));
            
            const minVal = Math.max(300, d3.min(visibleData, d => d.value) - 50);
            const maxVal = Math.min(3000, d3.max(visibleData, d => d.value) + 50);
            y.domain([minVal, maxVal]);

            // Zonas de CO₂
            const co2Zones = g.selectAll(".co2-zone").data(co2ZonesData);

            co2Zones.enter()
                .append("rect")
                .attr("class", "co2-zone")
                .merge(co2Zones)
                .attr("x", 0)
                .attr("width", width)
                .attr("y", d => y(d.max))
                .attr("height", d => y(d.min) - y(d.max))
                .attr("fill", d => d.color)
                .attr("rx", 2);

            co2Zones.exit().remove();

            // Actualizar líneas de referencia para los límites de rangos
            const linesData = [
                {value: 400, label: "Mínimo Óptimo", color: "rgba(76, 175, 80, 0.5)"},
                {value: 1000, label: "Límite Advertencia", color: "rgba(255, 193, 7, 0.5)"},
                {value: 2000, label: "Límite Crítico", color: "rgba(244, 67, 54, 0.5)"}
            ];

            const referenceLine = referenceLines.selectAll(".reference-line")
                .data(linesData);

            referenceLine.enter()
                .append("line")
                .attr("class", "reference-line")
                .merge(referenceLine)
                .attr("x1", 0)
                .attr("y1", d => y(d.value))
                .attr("x2", width)
                .attr("y2", d => y(d.value))
                .attr("stroke", d => d.color)
                .attr("stroke-width", 1)
                .attr("stroke-dasharray", "8,4")
                .style("opacity", 0.5);

            referenceLine.exit().remove();

            // Actualizar grid
            grid.call(d3.axisLeft(y)
                .ticks(6)
                .tickSize(-width)
                .tickFormat(""))
                .attr("opacity", 0.15)
                .selectAll("line")
                .attr("stroke", "#4caf50");

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
                .attr("stroke", "#4caf50")
                .attr("opacity", 0.5);

            yAxisG.call(d3.axisLeft(y)
                .ticks(6)
                .tickFormat(d => d + " ppm")
                .tickSizeOuter(0))
                .selectAll("text")
                .attr("fill", "#94a3b8")
                .attr("font-size", "11px")
                .attr("font-weight", "500")
                .attr("dx", "-5px");

            yAxisG.selectAll("path, line")
                .attr("stroke", "#4caf50")
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

            // Puntos de datos con colores según el nuevo rango
            const points = g.selectAll(".data-point")
                .data(visibleData, d => d.id);

            points.enter()
                .append("circle")
                .attr("class", "data-point")
                .merge(points)
                .attr("cx", d => x(d.time))
                .attr("cy", d => y(d.value))
                .attr("r", 4)
                .attr("fill", d => getRangeForValue(d.value).color)
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 1.5)
                .style("opacity", 0.9)
                .style("cursor", "pointer")
                .on("mouseover", function(event, d) {
                    const range = getRangeForValue(d.value);
                    
                    focus
                        .attr("cx", x(d.time))
                        .attr("cy", y(d.value))
                        .attr("fill", range.color)
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

                    tooltip
                        .html(`
                            <div style="display: flex; align-items: center; margin-bottom: 6px;">
                                <div style="font-size: 18px; margin-right: 8px;">${range.icon}</div>
                                <strong style="font-size: 16px; color: ${range.textColor};">${Math.round(d.value)} ppm</strong>
                            </div>
                            <div style="color: ${range.textColor}; margin-bottom: 4px; font-weight: 600;">
                                ${range.quality}
                            </div>
                            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 6px;">
                                ${range.description}
                            </div>
                            <div style="font-size: 11px; color: #cbd5e1; border-top: 1px solid #334155; padding-top: 6px;">
                                ${d3.timeFormat("%H:%M:%S")(d.time)}<br>
                                ${d3.timeFormat("%d/%m/%Y")(d.time)}
                            </div>
                        `)
                        .style("border-color", range.color)
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

        // Función para cargar datos históricos
        async function loadHistoricalData() {
            try {
                const response = await fetch('/api/co2/');
                if (!response.ok) return;
                
                const apiData = await response.json();
                if (apiData && apiData.length > 0) {
                    // Convertir datos de la API usando concentracion y fecha_hora
                    const formattedData = apiData.map((item) => ({
                        id: `db-${item.id}`,
                        time: new Date(item.fecha_hora),
                        value: parseFloat(item.concentracion)
                    })).filter(item => !isNaN(item.time.getTime()) && !isNaN(item.value));
                    
                    if (formattedData.length > 0) {
                        // Ordenar por fecha (más antiguo primero)
                        formattedData.sort((a, b) => a.time - b.time);
                        
                        data = formattedData;
                        currentStartIndex = Math.max(0, data.length - MAX_VISIBLE_POINTS);
                        redraw();
                        
                        // Actualizar gauge con el último valor
                        if (data.length > 0 && window.gaugeInstance) {
                            const lastValue = data[data.length - 1].value;
                            window.gaugeInstance.update(lastValue);
                        }
                    }
                }
            } catch (error) {
                console.log('No se pudieron cargar datos históricos:', error);
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
                g.selectAll(".co2-zone").remove();
                g.selectAll(".data-counter").remove();
                g.selectAll(".reference-line").remove();
                
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
    const gauge = gaugeCO2("#gauge-co2", 600);
    const series = lineChartCO2("#serie-co2");
    
    // Guardar instancia globalmente para acceso desde otras funciones
    window.gaugeInstance = gauge;
    window.seriesInstance = series;

    // ================= WEBSOCKET =================
    const socket = new WebSocket("ws://" + window.location.host + "/ws/co2/");

    socket.onmessage = function(e) {
        const mensaje = JSON.parse(e.data);
        const valor = mensaje.valor;
        const fecha = mensaje.fecha_hora;

        gauge.update(valor);
        series.push(valor, fecha);
    };
});