// ============================================================
// ============ BATERÍA  ============
// ============================================================
function initBatteryVisualization(containerId, initialSOC) {
const svg = d3.select(containerId);
const width = 320;
const height = 460;

svg.attr("width", width).attr("height", height);

// Crear batería principal
const batteryGroup = svg.append("g")
    .attr("transform", `translate(${width/2 + 25}, 22)`);

// Cuerpo de la batería 
const batteryWidth = 180; 
const batteryHeight = 340;

// Marco exterior
batteryGroup.append("rect")
    .attr("x", -batteryWidth/2)
    .attr("y", 0)
    .attr("width", batteryWidth)
    .attr("height", batteryHeight)
    .attr("rx", 15) 
    .attr("ry", 15) 
    .attr("fill", "none")
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 6);

// Terminal positivo 
batteryGroup.append("rect")
    .attr("x", -25)
    .attr("y", -22)
    .attr("width", 50)
    .attr("height", 22)
    .attr("rx", 6)
    .attr("fill", "#fbbf24")
    .attr("stroke", "#d97706")
    .attr("stroke-width", 3);

// Nivel de carga
const chargeLevel = batteryGroup.append("rect")
    .attr("x", -batteryWidth/2 + 12)
    .attr("y", batteryHeight)
    .attr("width", batteryWidth - 24)
    .attr("height", 0)
    .attr("rx", 10)
    .attr("fill", "#10b981");

// Marcas de nivel
for (let i = 0; i <= 100; i += 20) {
    const yPos = batteryHeight - (i/100) * batteryHeight;
    
    // Líneas de indicador 
    batteryGroup.append("line")
    .attr("x1", -batteryWidth/2 - 20)
    .attr("x2", -batteryWidth/2 - 5)
    .attr("y1", yPos)
    .attr("y2", yPos)
    .attr("stroke", "#6b7280")
    .attr("stroke-width", 4); 
    
    // Texto de porcentaje 
    batteryGroup.append("text")
    .attr("x", -batteryWidth/2 - 25)
    .attr("y", yPos + 5)
    .attr("text-anchor", "end")
    .attr("fill", "#ffffff")
    .attr("font-size", "28px")
    .attr("font-weight", "600")
    .text(i + "%");
}

// Función para actualizar batería
function updateBattery(soc) {
    const socPercent = soc * 100;
    const fillHeight = (socPercent / 100) * batteryHeight;
    const yPos = batteryHeight - fillHeight;
    
    // Determinar color según estado energético
    let color, statusText;
    
    if (socPercent < 15) {
    color = "#ef4444";
    statusText = TRANSLATIONS.critical || "CRÍTICO";
    } else if (socPercent < 30) {
    color = "#f59e0b";
    statusText = TRANSLATIONS.low || "BAJO";
    } else if (socPercent < 70) {
    color = "#3b82f6";
    statusText = TRANSLATIONS.normal || "NORMAL";
    } else {
    color = "#10b981";
    statusText = TRANSLATIONS.optimal || "ÓPTIMO";
    }
    
    // Animación de nivel
    chargeLevel.transition()
    .duration(800)
    .attr("y", yPos)
    .attr("height", fillHeight)
    .attr("fill", color);
    
    // Actualizar porcentaje debajo de la batería
    const percentageLarge = document.getElementById('battery-percentage-large');
    if (percentageLarge) {
    percentageLarge.textContent = Math.round(socPercent) + '%';
    // percentageLarge.style.color = color;
    // percentageLarge.style.fontSize = '45px'; 
    // percentageLarge.style.fontWeight = '850'; 
    // percentageLarge.style.marginTop = '0px';
    // percentageLarge.style.textShadow = '0 3px 8px rgba(0,0,0,0.4)';
    }
    
    // Actualizar estado en el footer 
    const statusElement = document.getElementById('battery-status');
    if (statusElement) {
    statusElement.textContent = statusText;
    statusElement.style.color = color;
    // statusElement.style.fontSize = '2.0rem';
    // statusElement.style.fontWeight = '700';
    }
    
    return socPercent;
}

// Inicializar con valores por defecto
updateBattery(initialSOC || 0.5);

return updateBattery;
}

// ============================================================
// ============ TANQUE DE AGUA ============
// ============================================================
function crearTanqueAguaRealista(containerId, valorInicial) {
const container = d3.select(containerId);
container.html(""); // Limpiar contenedor

const width = 380;
const height = 520;

const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

// Dimensiones del tanque
const tanqueWidth = 200;
const tanqueHeight = 340;
const tanqueX = (width - tanqueWidth) / 2;
const tanqueY = 50;
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

// Base del tanque
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
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 3);

// Reflejo metálico
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
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 2);

// Nivel de agua
const agua = svg.append("rect")
    .attr("x", tanqueX)
    .attr("width", tanqueWidth)
    .attr("fill", "url(#gradAgua)")
    .attr("rx", tanqueCurvatura - 2)
    .attr("opacity", 0.85);

// Superficie del agua 
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
    .attr("font-size", "28px")
    .attr("text-anchor", "end")
    .text(i + "%");
}

// Líneas pequeñas cada 10%
// for (let i = 10; i < 100; i += 10) {
//     if (i % 25 !== 0) {
//     const y = tanqueY + tanqueHeight - (i / 100) * tanqueHeight;
//     svg.append("line")
//         .attr("x1", tanqueX - 10)
//         .attr("x2", tanqueX - 5)
//         .attr("y1", y)
//         .attr("y2", y)
//         .attr("stroke", "#00bfff")
//         .attr("stroke-width", 2);
//     }
// }

const textoNivel = svg.append("text")
    .attr("x", tanqueX + tanqueWidth - 100)
    .attr("y", tanqueY + tanqueHeight + 60)
    .attr("fill", "#00ffcc")
    .attr("font-size", "40px") 
    .attr("font-weight", "700")
    .attr("text-anchor", "middle")
    .style("font-family", "inherit")
    .text("00.0%");


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
    // indicadorNivel.attr("fill", colorIndicador);
    
    // Efecto de llenado
    if (porcentaje > 90) {
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
// return actualizar;
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

    // Paleta de colores
    const colorPalette = {
        // Óptimo: 19.5 – 23.5%
        green: "#10b981",     // Verde
        // Advertencia: 17 – 19.4% o 23.6 – 25%
        yellow: "#fbbf24",    // Amarillo
        // Crítico: < 17% o > 25%
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
    //     .text("O₂ (%)");

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
    
     // ===================== LÍNEAS DE NIVEL NUMÉRICAS =====================
        for (let i = 0; i <= 100; i += 25) {
            const y = scale(i);
            
            // Línea horizontal de nivel
            svg.append("line")
                .attr("x1", frameX - 10)
                .attr("y1", y)
                .attr("x2", frameX)
                .attr("y2", y)
                .attr("stroke", colorPalette.white)
                .attr("stroke-width", 1.5);
            
            // Texto de valor
            svg.append("text")
                .attr("x", frameX - 20)
                .attr("y", y + 4)
                .attr("fill", colorPalette.white)
                .attr("font-size", "28px")
                .attr("font-weight", "500")
                .attr("text-anchor", "end")
                .text(i + "%");
        }

    // Crear y almacenar los elementos que se actualizarán
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
        .text(initial.toFixed(2) + " %");

    // Indicador de calidad
    const qualityText = svg.append("text")
        .attr("x", width/2)
        .attr("y", frameY + frameH + 120)
        .attr("fill", colorFor(initial))
        .attr("font-size", "25px")
        .attr("font-weight", "600")
        .attr("text-anchor", "middle")
        .text(getQualityText(initial));

    // Definir funciones auxiliares primero
    function colorFor(v) {
        // Asegurar que el valor esté entre 0 y 100
        const valor = Math.max(0, Math.min(100, v));
        
        // Rangos según la tabla proporcionada
        if (valor >= 19.5 && valor <= 23.5) {
            return colorPalette.green;      // Óptimo (verde)
        } else if ((valor >= 17 && valor <= 19.4) || (valor >= 23.6 && valor <= 25)) {
            return colorPalette.yellow;     // Advertencia (amarillo)
        } else {
            return colorPalette.red;        // Crítico (rojo)
        }
    }

    function getQualityText(v) {
        // Asegurar que el valor esté entre 0 y 100
        const valor = Math.max(0, Math.min(100, v));
        
        // Rangos según la tabla proporcionada
        if (valor >= 19.5 && valor <= 23.5) {
            return "ÓPTIMO";
        } else if ((valor >= 17 && valor <= 19.4) || (valor >= 23.6 && valor <= 25)) {
            return "ADVERTENCIA";
        } else {
            return "¡CRÍTICO!";
        }
    }

    // Función para obtener texto corto para el footer
    function getFooterQualityText(v) {
        // Asegurar que el valor esté entre 0 y 100
        const valor = Math.max(0, Math.min(100, v));
        
        // Rangos
        if (valor >= 19.5 && valor <= 23.5) {
            return "ÓPTIMO";
        } else if ((valor >= 17 && valor <= 19.4) || (valor >= 23.6 && valor <= 25)) {
            return "ADVERTENCIA";
        } else {
            return "CRÍTICO";
        }
    }

    // =================== FUNCIÓN DE ACTUALIZACIÓN INTERNA ===================
    function actualizarGauge(newVal) {
        // LIMITAR EL VALOR ENTRE 0 Y 100
        const valorLimitado = Math.max(0, Math.min(100, newVal));
        
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
            .text(valorLimitado.toFixed(2) + " %")
            .attr("fill", newColor);

        // qualityText
        //     .transition().duration(300)
        //     .text(qualityTextValue)
        //     .attr("fill", newColor);

        // Actualizar elementos HTML
        const qualityElement = document.getElementById('oxigeno-quality');
        const timeElement = document.getElementById('oxigeno-time');
        
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
                
                // LIMITAR EL VALOR ENTRE 0 Y 100
                ultimoValor = Math.max(0, Math.min(100, ultimoValor));
                
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
                    
                    // LIMITAR EL VALOR ENTRE 0 Y 100
                    valor = Math.max(0, Math.min(100, valor));
                    
                    // Determinar calidad según rangos de oxígeno
                    let calidad;
                    if (valor >= 19.5 && valor <= 23.5) {
                        calidad = "ÓPTIMO";
                    } else if ((valor >= 17 && valor <= 19.4) || (valor >= 23.6 && valor <= 25)) {
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
                
                console.log(`Cargados ${datosFormateados.length} datos recientes de oxígeno`);
                return datosFormateados;
            }
            
            return [];
        } catch (error) {
            console.log('Error al cargar datos recientes de oxígeno:', error);
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
                optimo: { min: 19.5, max: 23.5, color: colorPalette.green, estado: "ÓPTIMO" },
                advertencia: [
                    { min: 17, max: 19.4, color: colorPalette.yellow, estado: "ADVERTENCIA" },
                    { min: 23.6, max: 25, color: colorPalette.yellow, estado: "ADVERTENCIA" }
                ],
                critico: [
                    { min: 0, max: 16.9, color: colorPalette.red, estado: "CRÍTICO" },
                    { min: 25.1, max: 100, color: colorPalette.red, estado: "CRÍTICO" }
                ]
            };
        }
    };

    return gaugeObject;
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
        .attr("y", frameY + frameH + 130)
        .attr("fill", colorFor(initial))
        .attr("font-size", "25px")
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

// ===================== GAUGE TERMÓMETRO =====================
function gaugeTemperatura(containerId, initial) {
    const container = d3.select(containerId);
    container.html(""); // Limpiar contenedor

    const width = 280;
    const height = 420;
    const min = 0;      // °C mínimo visual
    const max = 45;     // °C máximo visual

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    const tempPalette = {
        critico: "#ff6b6b",      // Rojo para CRÍTICO (<18°C o >26°C)
        advertencia: "#ffd43b",  // Amarillo para ADVERTENCIA (18-20°C o 24-26°C)
        optimo: "#69db7c",        // Verde para ÓPTIMO (20-24°C)
        contorno: "#ffffff"
    };

    // Diseño tipo termómetro
    const termometroX = width/2 - 15;
    const termometroY = 15;
    const termometroH = 280;
    const bulboRadio = 28;

    // Bulbo inferior
    svg.append("circle")
        .attr("cx", width/2 + 15)
        .attr("cy", termometroY + termometroH + bulboRadio)
        .attr("r", bulboRadio)
        .attr("fill", "#0f1724")
        .attr("stroke", tempPalette.contorno)
        .attr("stroke-width", 4);

    // Tubo del termómetro
    svg.append("rect")
        .attr("x", termometroX)
        .attr("y", termometroY)
        .attr("width", 60)
        .attr("height", termometroH)
        .attr("rx", 15)
        .attr("fill", "#0f1724")
        .attr("stroke", tempPalette.contorno)
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
        .attr("y", termometroY + termometroH + bulboRadio + 85)
        .attr("fill", tempPalette.critico)
        .attr("font-size", "40px")
        .attr("font-weight", "700")
        .attr("text-anchor", "middle")
        .text(initial.toFixed(1) + " °C");

    // FUNCIÓN para determinar nivel de temperatura
    function getTempLevel(v) {
        if (v < 18 || v > 26) return {
            nivel: "CRÍTICO", 
            emoji: "⚠️",
            color: tempPalette.critico,
            estado: "critico"
        };
        if ((v >= 18 && v < 20) || (v >= 24 && v <= 26)) return {
            nivel: "ADVERTENCIA", 
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
        .attr("y", termometroY + termometroH + bulboRadio + 130) 
        .attr("fill", tempPalette.critico)
        .attr("font-size", "30px")  
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
            .attr("stroke", tempPalette.contorno)
            .attr("stroke-width", 2);
        
        svg.append("text")
            .attr("x", termometroX - 25)
            .attr("y", y + 4)
            .attr("fill", tempPalette.contorno)
            .attr("font-size", "25px")
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
                return null;
            }
            
            const datos = await response.json();
            
            if (datos && Array.isArray(datos) && datos.length > 0) {
                // Tomar el primer elemento (el más reciente)
                const ultimoDato = datos[0];
                
                // Extraer el valor de Temperatura - COMO LO HACE CO2
                let ultimoValor = null;
                
                if (ultimoDato.temperatura !== undefined && ultimoDato.temperatura !== null) {
                    ultimoValor = parseFloat(ultimoDato.temperatura);
                } else if (ultimoDato.valor !== undefined && ultimoDato.valor !== null) {
                    ultimoValor = parseFloat(ultimoDato.valor);
                } else if (ultimoDato.nivel !== undefined && ultimoDato.nivel !== null) {
                    ultimoValor = parseFloat(ultimoDato.nivel);
                } else {
                    console.log('Campo "temperatura", "valor" o "nivel" no encontrado en:', ultimoDato);
                    return null;
                }
                
                if (isNaN(ultimoValor)) {
                    console.log('Valor de Temperatura no es un número:', ultimoDato);
                    return null;
                }
                
                console.log('Último dato de Temperatura encontrado:', ultimoValor.toFixed(1) + ' °C', 
                        'ID:', ultimoDato.id, 'Fecha:', ultimoDato.fecha_hora || ultimoDato.timestamp);
                
                // Actualizar el gauge con el último valor de la BD
                actualizarGauge(ultimoValor);
                
                return ultimoValor;
            } else {
                console.log('No hay datos de Temperatura en la BD');
                return null;
            }
        } catch (error) {
            console.log('Error al cargar datos de Temperatura:', error);
            return null;
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
                    
                    if (dato.temperatura !== undefined && dato.temperatura !== null) {
                        valor = parseFloat(dato.temperatura);
                    } else if (dato.valor !== undefined && dato.valor !== null) {
                        valor = parseFloat(dato.valor);
                    } else if (dato.nivel !== undefined && dato.nivel !== null) {
                        valor = parseFloat(dato.nivel);
                    } else {
                        return null;
                    }
                    
                    if (isNaN(valor)) return null;
                    
                    const nivelInfo = getTempLevel(valor);
                    
                    return {
                        id: dato.id,
                        valor: valor,
                        fecha: dato.fecha_hora || dato.timestamp,
                        nivel: nivelInfo.nivel,
                        estado: nivelInfo.estado,
                        color: nivelInfo.color,
                        descripcion: getTempDescription(valor)
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
            
        // ACTUALIZAR ELEMENTOS HTML DEL FOOTER
        const feelingElement = document.getElementById('temp-feeling') || 
                                document.getElementById('temp-quality');
        const timeElement = document.getElementById('temp-time');
        
        if (feelingElement) {
            feelingElement.textContent = newLevel.nivel;
            feelingElement.style.color = newColor;
        }
        
        if (timeElement) {
            const ahora = new Date();
            const horaStr = ahora.getHours().toString().padStart(2, '0') + ':' + 
                            ahora.getMinutes().toString().padStart(2, '0');
            timeElement.textContent = horaStr;
        }
    }

    // =================== CARGAR ÚLTIMO DATO AL INICIAR ===================
    // Cargar el último dato al iniciar (con un pequeño retraso para asegurar que el DOM esté listo)
    setTimeout(() => {
        cargarUltimoDatoBD().then(ultimoValor => {
            if (ultimoValor !== null) {
                console.log('Gauge Temperatura inicializado con valor de BD:', ultimoValor.toFixed(1) + ' °C');
            }
        });
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
        obtenerNivelTemperatura: getTempLevel,
        obtenerTextoSensacion: function(v) {
            return getTempLevel(v).nivel;
        },
        obtenerTextoFooter: function(v) {
            return getTempLevel(v).nivel;
        },
        // Función para obtener el nivel actual
        getNivelActual: function() {
            return getTempLevel(parseFloat(valueText.text().replace(' °C', '')));
        },
        // Función para forzar actualización desde BD
        actualizarDesdeBD: function() {
            return cargarUltimoDatoBD().then(valor => {
                if (valor !== null) {
                    return valor;
                }
                return null;
            });
        }
    };

    return gaugeObject;
}

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

    const humPalette = {
        critico: "#ff6b6b",      // Rojo para CRÍTICO (<30% o >70%)
        advertencia: "#ffd43b",  // Amarillo para ADVERTENCIA (30-40% o 60-70%)
        optimo: "#69db7c",        // Verde para ÓPTIMO (40-60%)
        contorno: "#ffffff"
    };

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
        .attr("fill", "#0f1724")
        .attr("stroke", humPalette.contorno)
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
        .attr("y", frameY + frameH + 130)
        .attr("fill", humPalette.critico)
        .attr("font-size", "25px")
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

    // Función para obtener texto corto para el footer
    function getFooterTexto(v) {
        return getNivelTexto(v);
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
                
                // Extraer el valor de Humedad - COMO LO HACE CO2 Y TEMPERATURA
                let ultimoValor = null;
                
                if (ultimoDato.humedad !== undefined && ultimoDato.humedad !== null) {
                    ultimoValor = parseFloat(ultimoDato.humedad);
                } else if (ultimoDato.valor !== undefined && ultimoDato.valor !== null) {
                    ultimoValor = parseFloat(ultimoDato.valor);
                } else if (ultimoDato.nivel !== undefined && ultimoDato.nivel !== null) {
                    ultimoValor = parseFloat(ultimoDato.nivel);
                } else {
                    console.log('Campo "humedad", "valor" o "nivel" no encontrado en:', ultimoDato);
                    return null;
                }
                
                if (isNaN(ultimoValor)) {
                    console.log('Valor de Humedad no es un número:', ultimoDato);
                    return null;
                }
                
                console.log('Último dato de Humedad encontrado:', ultimoValor.toFixed(1) + ' %', 
                        'ID:', ultimoDato.id, 'Fecha:', ultimoDato.fecha_hora || ultimoDato.timestamp);
                
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
                
                // Procesar y formatear datos - COMO LO HACE CO2 Y TEMPERATURA
                const datosFormateados = datosRecientes.map(dato => {
                    let valor;
                    
                    if (dato.humedad !== undefined && dato.humedad !== null) {
                        valor = parseFloat(dato.humedad);
                    } else if (dato.valor !== undefined && dato.valor !== null) {
                        valor = parseFloat(dato.valor);
                    } else if (dato.nivel !== undefined && dato.nivel !== null) {
                        valor = parseFloat(dato.nivel);
                    } else {
                        return null;
                    }
                    
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
        const nivelTexto = getNivelTexto(newVal);

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
            .text(nivelTexto)
            .attr("fill", newColor);
        
        // Actualizar estadísticas
        updateStats(newVal);
        
        // ACTUALIZAR ELEMENTOS HTML DEL FOOTER
        const feelingElement = document.getElementById('humidity-condition')
        const timeElement = document.getElementById('humidity-time');
        
        if (feelingElement) {
            feelingElement.textContent = nivelTexto;
            feelingElement.style.color = newColor;
        }
        
        if (timeElement) {
            const ahora = new Date();
            const horaStr = ahora.getHours().toString().padStart(2, '0') + ':' + 
                            ahora.getMinutes().toString().padStart(2, '0');
            timeElement.textContent = horaStr;
        }
    }

    // =================== CARGAR ÚLTIMO DATO AL INICIAR ===================
    setTimeout(() => {
        cargarUltimoDatoBD().then(ultimoValor => {
            if (ultimoValor !== null) {
                console.log('Gauge Humedad inicializado con valor de BD:', ultimoValor.toFixed(1) + ' %');
            }
        });
    }, 500);

    // =================== RETORNO DE FUNCIONES ===================
    const gaugeObject = {
        update: function(newVal) {
            actualizarGauge(newVal);
            const nivelInfo = {
                valor: newVal,
                nivel: getNivelTexto(newVal),
                color: colorFor(newVal),
                textoFooter: getFooterTexto(newVal)
            };
            return nivelInfo;
        },
        cargarUltimoDato: cargarUltimoDatoBD,
        cargarDatosRecientes: cargarDatosRecientesBD,
        actualizar: actualizarGauge,
        obtenerColorSegunValor: colorFor,
        obtenerNivelTexto: getNivelTexto,
        obtenerDescripcionNivel: getDescripcionNivel,
        obtenerTextoFooter: getFooterTexto,
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
        },
        // Función para forzar actualización desde BD
        actualizarDesdeBD: function() {
            return cargarUltimoDatoBD().then(valor => {
                if (valor !== null) {
                    return valor;
                }
                return null;
            });
        },
        // Función para obtener rangos
        obtenerRangos: function() {
            return {
                optimo: { min: 40, max: 60, color: humPalette.optimo, estado: "ÓPTIMO", descripcion: "Minimiza patógenos, maximiza confort respiratorio" },
                advertencia: [
                    { min: 30, max: 40, color: humPalette.advertencia, estado: "ADVERTENCIA", descripcion: "Riesgo de sequedad respiratoria" },
                    { min: 60, max: 70, color: humPalette.advertencia, estado: "ADVERTENCIA", descripcion: "Riesgo de proliferación microbiana" }
                ],
                critico: [
                    { min: 0, max: 30, color: humPalette.critico, estado: "CRÍTICO", descripcion: "Irritación respiratoria por sequedad extrema" },
                    { min: 70, max: 100, color: humPalette.critico, estado: "CRÍTICO", descripcion: "Riesgo de crecimiento de moho e irritación respiratoria" }
                ]
            };
        }
    };

    return gaugeObject;
}

// ===================== SISTEMA PRINCIPAL =====================
// Instancias de gráficos
let batteryActualizar = null;
let tanqueAguaActualizar = null;
let gaugeO2Instancia = null;
let gaugeCO2Instancia = null;
let gaugeTempInstancia = null;
let gaugeHumInstancia = null;

// WebSockets
let wsBateria = null;
let wsAgua = null;
let wsO2 = null;
let wsCO2 = null;
let wsTemp = null;
let wsHum = null;

// Conexión status
let connectionStatus = {
    bateria: false,
    agua: false,
    oxigeno: false,
    co2: false,
    temperatura: false,
    humedad: false
};

// Tiempos de última actualización
let lastUpdate = {
    bateria: null,
    agua: null,
    oxigeno: null,
    co2: null,
    temperatura: null,
    humedad: null
};

// Inicializar todas las visualizaciones
function inicializarVisualizaciones() {
    console.log("Inicializando visualizaciones...");

    // Inicializar con valores por defecto
    batteryActualizar = initBatteryVisualization("#battery-svg", 0.65);
    tanqueAguaActualizar = crearTanqueAguaRealista("#tanque-agua", 65);
    gaugeO2Instancia = gaugeO2("#oxigeno-gauge", 21.5);
    gaugeCO2Instancia = gaugeCO2("#co2-gauge", 600);
    gaugeTempInstancia = gaugeTemperatura("#temperatura-gauge", 22.5);
    gaugeHumInstancia = gaugeHumedad("#humedad-gauge", 55.0);

    // Inicializar WebSockets
    inicializarWebSockets();

    // Actualizar timestamp global
    setInterval(() => {
        const now = new Date();
        const lastUpdateElement = document.getElementById('last-update');
        if (lastUpdateElement) {
            lastUpdateElement.textContent = 
                `Última actualización: ${now.toLocaleTimeString()}`;
        }
    }, 1000);
}

// Función para inicializar todos los WebSocket
function inicializarWebSockets() {
    const host = window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    console.log("Inicializando WebSockets...");
    console.log("Host:", host);
    console.log("Protocol:", protocol);

    // Mostrar estado de conexión
    const connectionElement = document.getElementById('connection-status');
    if (connectionElement) {
        // connectionElement.style.display = 'flex';
        connectionElement.className = 'connection-status connected';
        connectionElement.innerHTML = '<i class="fas fa-circle"></i><span>Conectando WebSockets...</span>';
    }

    // ========== WEBSOCKET PARA BATERÍA ==========
    try {
        wsBateria = new WebSocket("ws://" + window.location.host + "/ws/energia/");
        
        wsBateria.onopen = function() {
            console.log("WebSocket Batería conectado");
            connectionStatus.bateria = true;
            actualizarEstadoConexion();
        };
        
        wsBateria.onmessage = function(e) {
            console.log("Datos recibidos de batería:", e.data);
            try {
                const data = JSON.parse(e.data);
                const soc = parseFloat(data.battery);
                const fecha = data.fecha_hora || new Date().toISOString();
                
                if (batteryActualizar) {
                    batteryActualizar(soc);
                }
                lastUpdate.bateria = fecha;
                
                // Actualizar estado
                const statusElement = document.getElementById('battery-status');
                const timeElement = document.getElementById('battery-time');
                
                if (statusElement) {
                    if (soc < 0.15) {
                        statusElement.textContent = TRANSLATIONS.critical || "CRÍTICO";
                        statusElement.style.color = "#ef4444";
                        agregarAlerta(TRANSLATIONS.critical_battery || "Nivel de batería crítico", "critical");
                    } else if (soc < 0.3) {
                        statusElement.textContent = TRANSLATIONS.low || "BAJO";
                        statusElement.style.color = "#f59e0b";
                        agregarAlerta(TRANSLATIONS.low_battery || "Nivel de batería bajo", "warning");
                    } else if (soc < 0.7) {
                        statusElement.textContent = TRANSLATIONS.normal || "NORMAL";
                        statusElement.style.color = "#3b82f6";
                    } else {
                        statusElement.textContent = TRANSLATIONS.optimal || "ÓPTIMO";
                        statusElement.style.color = "#10b981";
                    }
                }
                
                if (timeElement) {
                    timeElement.textContent = new Date(fecha).toLocaleTimeString();
                }
                
            } catch (error) {
                console.error('❌ Error procesando datos de batería:', error);
            }
        };
        
        wsBateria.onerror = function(error) {
            console.error("❌ Error en WebSocket Batería:", error);
            connectionStatus.bateria = false;
            actualizarEstadoConexion();
        };
        
        wsBateria.onclose = function() {
            console.warn("⚠️ WebSocket Batería desconectado");
            connectionStatus.bateria = false;
            actualizarEstadoConexion();
            setTimeout(() => {
                console.log("🔄 Reintentando conexión de batería...");
                inicializarWebSockets();
            }, 5000);
        };
    } catch (error) {
        console.error("❌ Error al crear WebSocket Batería:", error);
    }

    // ========== WEBSOCKET PARA AGUA ==========
    try {
        wsAgua = new WebSocket("ws://" + window.location.host + "/ws/agua/");
        
        wsAgua.onopen = function() {
            console.log("WebSocket Agua conectado");
            connectionStatus.agua = true;
            actualizarEstadoConexion();
        };
        
        wsAgua.onmessage = function(e) {
            console.log("Datos recibidos de agua:", e.data);
            try {
                const data = JSON.parse(e.data);
                const valor = parseFloat(data.nivel);
                const fecha = data.fecha_hora;
                
                if (tanqueAguaActualizar) {
                    tanqueAguaActualizar(valor);
                }
                lastUpdate.agua = fecha;
                
                // Actualizar estado
                const statusElement = document.getElementById('agua-status');
                const timeElement = document.getElementById('agua-time');
                
                if (statusElement) {
                    if (valor < 20) {
                        statusElement.textContent = TRANSLATIONS.agua_critical || "CRÍTICO";
                        statusElement.style.color = "#ef4444";
                        agregarAlerta(TRANSLATIONS.critical_water || "Nivel de agua crítico", "critical");
                    } else if (valor < 40) {
                        statusElement.textContent = TRANSLATIONS.agua_low || "BAJO";
                        statusElement.style.color = "#f59e0b";
                    } else {
                        statusElement.textContent = TRANSLATIONS.agua_normal || "NORMAL";
                        statusElement.style.color = "#22c55e";
                    }
                }
                
                if (timeElement) {
                    timeElement.textContent = new Date(fecha).toLocaleTimeString();
                }
            } catch (error) {
                console.error('❌ Error procesando datos de agua:', error);
            }
        };
        
        wsAgua.onerror = function(error) {
            console.error("❌ Error en WebSocket Agua:", error);
            connectionStatus.agua = false;
            actualizarEstadoConexion();
        };
        
        wsAgua.onclose = function() {
            console.warn("⚠️ WebSocket Agua desconectado");
            connectionStatus.agua = false;
            actualizarEstadoConexion();
            setTimeout(() => {
                console.log("🔄 Reintentando conexión de agua...");
                inicializarWebSockets();
            }, 5000);
        };
    } catch (error) {
        console.error("❌ Error al crear WebSocket Agua:", error);
    }

    // ========== WEBSOCKET PARA OXÍGENO ==========
    try {
        wsO2 = new WebSocket(`${protocol}//${host}/ws/oxigeno/`);
        
        wsO2.onopen = function() {
            console.log("WebSocket Oxígeno conectado");
            connectionStatus.oxigeno = true;
            actualizarEstadoConexion();
        };
        
        wsO2.onmessage = function(e) {
            console.log("Datos recibidos de oxígeno:", e.data);
            try {
                const data = JSON.parse(e.data);
                if (gaugeO2Instancia) {
                    gaugeO2Instancia.update(data.nivel);
                }
                lastUpdate.oxigeno = data.fecha_hora;
                // ACTUALIZAR EL TIEMPO EN EL FOOTER
                const timeElement = document.getElementById('oxigeno-time');
                if (timeElement && data.fecha_hora) {
                    timeElement.textContent = new Date(data.fecha_hora).toLocaleTimeString();
                }
                actualizarCalidadAire();
            } catch (error) {
                console.error('❌ Error procesando datos de oxígeno:', error);
            }
        };
        
        wsO2.onerror = function(error) {
            console.error("❌ Error en WebSocket Oxígeno:", error);
            connectionStatus.oxigeno = false;
            actualizarEstadoConexion();
        };
        
        wsO2.onclose = function() {
            console.warn("⚠️ WebSocket Oxígeno desconectado");
            connectionStatus.oxigeno = false;
            actualizarEstadoConexion();
            setTimeout(() => {
                console.log("🔄 Reintentando conexión de oxígeno...");
                inicializarWebSockets();
            }, 5000);
        };
    } catch (error) {
        console.error("❌ Error al crear WebSocket Oxígeno:", error);
    }

    // ========== WEBSOCKET PARA CO2 ==========
    try {
        wsCO2 = new WebSocket(`${protocol}//${host}/ws/co2/`);
        
        wsCO2.onopen = function() {
            console.log("✅ WebSocket CO2 conectado");
            connectionStatus.co2 = true;
            actualizarEstadoConexion();
        };
        
        wsCO2.onmessage = function(e) {
            try {
                const data = JSON.parse(e.data);
                if (gaugeCO2Instancia) {
                    gaugeCO2Instancia.update(data.valor);
                }
                lastUpdate.co2 = data.fecha_hora;
                const timeElement = document.getElementById('co2-time');
                if (timeElement && data.fecha_hora) {
                    timeElement.textContent = new Date(data.fecha_hora).toLocaleTimeString();
                }
                actualizarCalidadAire();
            } catch (error) {
                console.error('Error procesando datos de CO2:', error);
            }
        };
        
        wsCO2.onerror = function(error) {
            console.error("Error en WebSocket CO2:", error);
            connectionStatus.co2 = false;
            actualizarEstadoConexion();
        };
        
        wsCO2.onclose = function() {
            console.warn("WebSocket CO2 desconectado");
            connectionStatus.co2 = false;
            actualizarEstadoConexion();
            setTimeout(() => inicializarWebSockets(), 5000);
        };
    } catch (error) {
        console.error("Error al crear WebSocket CO2:", error);
    }

    // ========== WEBSOCKET PARA TEMPERATURA ==========
    try {
        wsTemp = new WebSocket(`${protocol}//${host}/ws/temperatura/`);
        
        wsTemp.onopen = function() {
            console.log("✅ WebSocket Temperatura conectado");
            connectionStatus.temperatura = true;
            actualizarEstadoConexion();
        };
        
        wsTemp.onmessage = function(e) {
            try {
                const data = JSON.parse(e.data);
                const valor = data.valor;
                
                if (gaugeTempInstancia) {
                    gaugeTempInstancia.update(valor);
                }
                lastUpdate.temperatura = data.fecha_hora;
                
                // Actualizar sensación térmica
                const feelingElement = document.getElementById('temp-feeling');
                if (feelingElement) {
                    if (valor >= 20 && valor <= 24) {
                        feelingElement.textContent = "ÓPTIMO";
                        feelingElement.style.color = "#10b981"; // Verde
                    } else if ((valor >= 18 && valor < 20) || (valor > 24 && valor <= 26)) {
                        feelingElement.textContent = "ADVERTENCIA";
                        feelingElement.style.color = "#fbbf24"; // Amarillo
                        agregarAlerta("Leve incomodidad térmica", "warning");
                    } else if (valor < 18) {
                        feelingElement.textContent = "CRÍTICO";
                        feelingElement.style.color = "#ef4444"; // Azul para frío
                        agregarAlerta("Riesgo fisiológico por frío", "critical");
                    } else { // valor > 26
                        feelingElement.textContent = "CRÍTICO";
                        feelingElement.style.color = "#ef4444"; // Rojo para calor
                        agregarAlerta("Riesgo fisiológico por calor", "critical");
                    }
                }
                
                const timeElement = document.getElementById('temp-time');
                if (timeElement) {
                    timeElement.textContent = new Date(data.fecha_hora).toLocaleTimeString();
                }
            } catch (error) {
                console.error('Error procesando datos de temperatura:', error);
            }
        };
        
        wsTemp.onerror = function(error) {
            console.error("Error en WebSocket Temperatura:", error);
            connectionStatus.temperatura = false;
            actualizarEstadoConexion();
        };
        
        wsTemp.onclose = function() {
            console.warn("WebSocket Temperatura desconectado");
            connectionStatus.temperatura = false;
            actualizarEstadoConexion();
            setTimeout(() => inicializarWebSockets(), 5000);
        };
    } catch (error) {
        console.error("Error al crear WebSocket Temperatura:", error);
    }

    // ========== WEBSOCKET PARA HUMEDAD ==========
    try {
        wsHum = new WebSocket(`${protocol}//${host}/ws/humedad/`);
        
        wsHum.onopen = function() {
            console.log("✅ WebSocket Humedad conectado");
            connectionStatus.humedad = true;
            actualizarEstadoConexion();
        };
        
        wsHum.onmessage = function(e) {
            try {
                const data = JSON.parse(e.data);
                const valor = data.valor;
                
                if (gaugeHumInstancia) {
                    gaugeHumInstancia.update(valor);
                }
                lastUpdate.humedad = data.fecha_hora;
                
                // Actualizar condición de humedad
                const conditionElement = document.getElementById('humidity-condition');
                if (conditionElement) {
                    if (valor >= 40 && valor <= 60) {
                        conditionElement.textContent = "ÓPTIMO";
                        conditionElement.style.color = "#10b981"; // Verde
                    } else if ((valor >= 30 && valor < 40) || (valor > 60 && valor <= 70)) {
                        conditionElement.textContent = "ADVERTENCIA";
                        conditionElement.style.color = "#fbbf24"; // Amarillo
                        
                        // Opcional: agregar alerta para advertencia
                        agregarAlerta("Leve incomodidad térmica", "warning");
                    } else if (valor < 30) {
                        conditionElement.textContent = "CRÍTICO";
                        conditionElement.style.color = "#ef4444"; // Azul para frío
                        agregarAlerta("Riesgo fisiológico por frío", "critical");
                    } else { // valor > 26
                        conditionElement.textContent = "CRÍTICO";
                        conditionElement.style.color = "#ef4444"; // Rojo para calor
                        agregarAlerta("Riesgo fisiológico por calor", "critical");
                    }
                }
                
                const timeElement = document.getElementById('humidity-time');
                if (timeElement) {
                    timeElement.textContent = new Date(data.fecha_hora).toLocaleTimeString();
                }
            } catch (error) {
                console.error('Error procesando datos de humedad:', error);
            }
        };
        
        wsHum.onerror = function(error) {
            console.error("Error en WebSocket Humedad:", error);
            connectionStatus.humedad = false;
            actualizarEstadoConexion();
        };
        
        wsHum.onclose = function() {
            console.warn("WebSocket Humedad desconectado");
            connectionStatus.humedad = false;
            actualizarEstadoConexion();
            setTimeout(() => inicializarWebSockets(), 5000);
        };
    } catch (error) {
        console.error("Error al crear WebSocket Humedad:", error);
    }
}

// Función para actualizar el estado de conexión
function actualizarEstadoConexion() {
    const connectionElement = document.getElementById('connection-status');
    if (!connectionElement) return;
    
    const totalConexiones = Object.keys(connectionStatus).length;
    const conexionesActivas = Object.values(connectionStatus).filter(v => v).length;

    if (conexionesActivas === totalConexiones) {
        connectionElement.className = 'connection-status connected';
        connectionElement.innerHTML = `<i class="fas fa-circle"></i><span>Todos los sensores conectados (${conexionesActivas}/${totalConexiones})</span>`;
    } else if (conexionesActivas > 0) {
        connectionElement.className = 'connection-status connected';
        connectionElement.innerHTML = `<i class="fas fa-circle"></i><span>Sensores parcialmente conectados (${conexionesActivas}/${totalConexiones})</span>`;
        
        // Mostrar alerta de sensores desconectados
        const sensoresDesconectados = [];
        if (!connectionStatus.bateria) sensoresDesconectados.push("Batería");
        if (!connectionStatus.agua) sensoresDesconectados.push("Agua");
        if (!connectionStatus.oxigeno) sensoresDesconectados.push("Oxígeno");
        if (!connectionStatus.co2) sensoresDesconectados.push("CO2");
        if (!connectionStatus.temperatura) sensoresDesconectados.push("Temperatura");
        if (!connectionStatus.humedad) sensoresDesconectados.push("Humedad");
        
        if (sensoresDesconectados.length > 0) {
            agregarAlerta(`${TRANSLATIONS.disconnected_sensors || "Sensores desconectados"}: ${sensoresDesconectados.join(", ")}`, "warning");
        }
    } else {
        connectionElement.className = 'connection-status disconnected';
        connectionElement.innerHTML = `<i class="fas fa-circle"></i><span>Todos los sensores desconectados</span>`;
    }
}

// Función para actualizar la calidad general del aire
function actualizarCalidadAire() {
    if (!lastUpdate.oxigeno || !lastUpdate.co2) return;

    const qualityElement = document.getElementById('aire-quality');
    const timeElement = document.getElementById('aire-time');

    // Obtener valores actuales
    const o2Element = d3.select("#oxigeno-gauge").select("text:nth-child(2)");
    const co2Element = d3.select("#co2-gauge").select("text:nth-child(2)");

    if (o2Element.empty() || co2Element.empty()) return;

    const o2Text = o2Element.text();
    const co2Text = co2Element.text();

    const o2 = parseFloat(o2Text) || 21.0;
    const co2 = parseInt(co2Text) || 600;

    let calidad = "BUENA";
    let color = "#22c55e";

    if (o2 < 19.5 || co2 > 1200) {
        calidad = "CRÍTICA";
        color = "#ef4444";
        agregarAlerta(TRANSLATIONS.critical_air || "Calidad del aire crítica", "critical");
    } else if (o2 < 21.0 || co2 > 800) {
        calidad = "MODERADA";
        color = "#f59e0b";
    }

    if (qualityElement) {
        qualityElement.textContent = calidad;
        qualityElement.style.color = color;
    }

    // Usar el timestamp más reciente
    const latestTime = new Date(Math.max(
        new Date(lastUpdate.oxigeno || 0),
        new Date(lastUpdate.co2 || 0)
    ));

    if (timeElement && latestTime.getTime() > 0) {
        timeElement.textContent = latestTime.toLocaleTimeString();
    }
}

// Función para agregar alertas al panel
function agregarAlerta(mensaje, tipo = "info") {
    const container = document.getElementById('alerts-container');
    if (!container) return;
    
    const now = new Date();

    const alerta = document.createElement('div');
    alerta.className = `alert-item ${tipo}`;
    alerta.innerHTML = `
        <i class="fas fa-${tipo === 'critical' ? 'exclamation-circle' : 
                            tipo === 'warning' ? 'exclamation-triangle' : 
                            'info-circle'}"></i>
        <span>${mensaje}</span>
        <span class="alert-time">${now.toLocaleTimeString()}</span>
    `;

    container.insertBefore(alerta, container.firstChild);

    // Limitar a 5 alertas
    if (container.children.length > 5) {
        container.removeChild(container.lastChild);
    }

    // Auto-remover después de 30 segundos
    setTimeout(() => {
        if (alerta.parentNode) {
            alerta.remove();
        }
    }, 30000);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializarVisualizaciones);

// Manejar recarga de página
window.addEventListener('beforeunload', function() {
    [wsBateria, wsAgua, wsO2, wsCO2, wsTemp, wsHum].forEach(ws => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
    });
});

// Debug: Verificar si hay errores en la consola
window.addEventListener('error', function(e) {
    console.error("Error global detectado:", e.error);
});