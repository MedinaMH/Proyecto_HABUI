// ============================================================
// ============ BATERÍA  ============
// ============================================================
function initBatteryVisualization(containerId, initialSOC) {
const svg = d3.select(containerId);
const width = 320;  // Aumentado de 280 a 320
const height = 460; // Aumentado de 400 a 460

svg.attr("width", width).attr("height", height);

// Crear batería principal
const batteryGroup = svg.append("g")
    .attr("transform", `translate(${width/2 + 25}, 55)`); // Aumentado de 40 a 50

// Cuerpo de la batería - MÁS GRANDE
const batteryWidth = 180;  // Aumentado de 160 a 200
const batteryHeight = 340; // Aumentado de 280 a 340

// Marco exterior
batteryGroup.append("rect")
    .attr("x", -batteryWidth/2)
    .attr("y", 0)
    .attr("width", batteryWidth)
    .attr("height", batteryHeight)
    .attr("rx", 15) // Aumentado de 12 a 15
    .attr("ry", 15) // Aumentado de 12 a 15
    .attr("fill", "none")
    .attr("stroke", "#4b5563")
    .attr("stroke-width", 6); // Aumentado de 5 a 6

// Terminal positivo - MÁS GRANDE
batteryGroup.append("rect")
    .attr("x", -25) // Aumentado de -20 a -25
    .attr("y", -22) // Aumentado de -18 a -22
    .attr("width", 50) // Aumentado de 40 a 50
    .attr("height", 22) // Aumentado de 18 a 22
    .attr("rx", 6) // Aumentado de 5 a 6
    .attr("fill", "#fbbf24")
    .attr("stroke", "#d97706")
    .attr("stroke-width", 3); // Aumentado de 2.5 a 3

// Nivel de carga
const chargeLevel = batteryGroup.append("rect")
    .attr("x", -batteryWidth/2 + 12) // Ajustado para el nuevo tamaño
    .attr("y", batteryHeight)
    .attr("width", batteryWidth - 24) // Ajustado para el nuevo tamaño
    .attr("height", 0)
    .attr("rx", 10) // Aumentado de 8 a 10
    .attr("fill", "#10b981");

// Marcas de nivel
for (let i = 0; i <= 100; i += 20) {
    const yPos = batteryHeight - (i/100) * batteryHeight;
    
    // Líneas de indicador - MÁS GRANDES
    batteryGroup.append("line")
    .attr("x1", -batteryWidth/2 - 20) // Aumentado de -15 a -20
    .attr("x2", -batteryWidth/2 - 5)  // Mantenido
    .attr("y1", yPos)
    .attr("y2", yPos)
    .attr("stroke", "#6b7280")
    .attr("stroke-width", 3); // Aumentado de 2.5 a 3
    
    // Texto de porcentaje - MÁS GRANDE
    batteryGroup.append("text")
    .attr("x", -batteryWidth/2 - 25) // Aumentado de -20 a -25
    .attr("y", yPos + 5)
    .attr("text-anchor", "end")
    .attr("fill", "#cbd5e1")
    .attr("font-size", "20px") // Aumentado de 17px a 20px
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
    statusText = "CRÍTICO";
    } else if (socPercent < 30) {
    color = "#f59e0b";
    statusText = "BAJO";
    } else if (socPercent < 70) {
    color = "#3b82f6";
    statusText = "NORMAL";
    } else {
    color = "#10b981";
    statusText = "ÓPTIMO";
    }
    
    // Animación de nivel
    chargeLevel.transition()
    .duration(800)
    .attr("y", yPos)
    .attr("height", fillHeight)
    .attr("fill", color);
    
    // Actualizar porcentaje debajo de la batería - MUCHO MÁS GRANDE
    const percentageLarge = document.getElementById('battery-percentage-large');
    if (percentageLarge) {
    percentageLarge.textContent = Math.round(socPercent) + '%';
    percentageLarge.style.color = color;
    percentageLarge.style.fontSize = '45px'; // Aumentado de 42px a 56px
    percentageLarge.style.fontWeight = '850'; // Aumentado de 800 a 900
    percentageLarge.style.textShadow = '0 3px 8px rgba(0,0,0,0.4)'; // Sombra más pronunciada
    }
    
    // Actualizar estado en el footer - TEXTO MÁS GRANDE
    const statusElement = document.getElementById('battery-status');
    if (statusElement) {
    statusElement.textContent = statusText;
    statusElement.style.color = color;
    statusElement.style.fontSize = '1.1rem'; // Aumentado ligeramente
    statusElement.style.fontWeight = '700';
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

// Título
// svg.append("text")
//     .attr("x", width / 2)
//     .attr("y", 35)
//     .attr("fill", "#ffffffff")
//     .attr("font-size", "24px")
//     .attr("font-weight", "bold")
//     .attr("text-anchor", "middle")
//     .text("TANQUE DE AGUA");

// Dimensiones del tanque
const tanqueWidth = 200;
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
// const indicadorBarra = svg.append("rect")
//     .attr("x", tanqueX + tanqueWidth + 20)
//     .attr("y", tanqueY)
//     .attr("width", 12)
//     .attr("height", tanqueHeight)
//     .attr("rx", 6)
//     .attr("fill", "#1a252f")
//     .attr("stroke", "#34495e")
//     .attr("stroke-width", 2);

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

// --- DISPLAY NUMÉRICO ---
// const display = svg.append("rect")
//     .attr("x", tanqueX + tanqueWidth - 180)
//     .attr("y", tanqueY + tanqueHeight + 15)
//     .attr("width", 150)
//     .attr("height", 50)
//     .attr("rx", 8)
//     .attr("fill", "#1a252f")
//     .attr("stroke", "#00bfff")
//     .attr("stroke-width", 2);

const textoNivel = svg.append("text")
    .attr("x", tanqueX + tanqueWidth - 100)
    .attr("y", tanqueY + tanqueHeight + 75)
    .attr("fill", "#00ffcc")
    .attr("font-size", "50px")
    .attr("font-weight", "bold")
    .attr("text-anchor", "middle")
    .style("font-family", "'Courier New', monospace")
    .text("00.0%");

// const textoLabel = svg.append("text")
//     .attr("x", tanqueX + tanqueWidth - 100)
//     .attr("y", tanqueY + tanqueHeight + 90)
//     .attr("fill", "#ffffffff")
//     .attr("font-size", "25px")
//     .attr("text-anchor", "middle")
//     .text("NIVEL ACTUAL");

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
    // indicadorNivel.transition()
    // .duration(800)
    // .ease(d3.easeCubicOut)
    // .attr("y", yIndicador)
    // .attr("height", alturaIndicador);
    
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
return actualizar;
}

// ===================== GAUGE VERTICAL (Oxígeno %) =====================
function gaugeO2(containerId, initial) {
    const container = d3.select(containerId);
    container.html(""); // Limpiar contenedor

    const width = 300;
    const height = 520;
    const min = 18.0;
    const max = 23.0;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    // Paleta de verdes
    const greenPalette = {
        light: "#34d399",    // Verde menta claro
        medium: "#10b981",   // Verde esmeralda
        dark: "#059669",     // Verde bosque
        veryDark: "#047857", // Verde muy oscuro
        amber: "#4dabf7",    // Ámbar cálido (cambié a azul para mejor visibilidad)
        red: "#dc2626"       // Rojo intenso
    };

    // outer frame
    const frameX = 60;
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

    // Indicador de calidad EN EL SVG (opcional, puedes comentarlo si quieres)
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
        if (v >= 21.0) return greenPalette.light;   // excelente (verde claro)
        if (v >= 19.5) return greenPalette.amber;   // acceptable (ámbar/azul)
        return greenPalette.red;                     // critico (rojo)
    }

    function getQualityText(v) {
        if (v >= 21.0) return "NIVEL ÓPTIMO";
        if (v >= 19.5) return "NIVEL ACEPTABLE";
        return "¡NIVEL BAJO!";
    }

    // Función para obtener texto corto para el footer
    function getFooterQualityText(v) {
        if (v >= 21.0) return "ÓPTIMO";
        if (v >= 19.5) return "ACEPTABLE";
        return "BAJO";
    }

    return {
        update: function(newVal) {
            const y = scale(newVal);
            const h = Math.max(2, (frameY + frameH) - y);
            const newColor = colorFor(newVal);
            const qualityStatus = getFooterQualityText(newVal);

            // Actualizar gráfico SVG
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

            // ACTUALIZAR ELEMENTOS HTML DEL FOOTER
            const qualityElement = document.getElementById('oxigeno-quality');
            const timeElement = document.getElementById('oxigeno-time');
            
            if (qualityElement) {
                qualityElement.textContent = qualityStatus;
                // Cambiar color según calidad
                if (newVal >= 21.0) {
                    qualityElement.style.color = "#34d399"; // Verde claro
                } else if (newVal >= 19.5) {
                    qualityElement.style.color = "#4dabf7"; // Azul
                } else {
                    qualityElement.style.color = "#dc2626"; // Rojo
                }
            }
            
            // Actualizar tiempo (esto lo hará el WebSocket)
            // El WebSocket debe llamar a esta función y pasar la fecha
            
            return qualityStatus;
        }
    };
}

// ===================== GAUGE VERTICAL (CO2 ppm) =====================
function gaugeCO2(containerId, initial) {
    const container = d3.select(containerId);
    container.html(""); // Limpiar contenedor
    const stats = {
        current: initial,
        min: initial,
        max: initial,
        history: []
    };
    const width = 300;
    const height = 520;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("border-radius", "8px");

    // outer frame
    const frameX = 60;
    const frameY = 60;
    const frameW = 180;
    const frameH = 360;

    svg.append("rect")
        .attr("x", frameX)
        .attr("y", frameY)
        .attr("width", frameW)
        .attr("height", frameH)
        .attr("rx", 14)
        .attr("fill", "#0f1724")
        .attr("stroke", "#ffb74d")
        .attr("stroke-width", 3);

    // fill rect
    const min = 300;
    const max = 2500;
    const scale = d3.scaleLinear().domain([min, max]).range([frameY + frameH, frameY]);

    const fillRect = svg.append("rect")
        .attr("x", frameX)
        .attr("width", frameW)
        .attr("y", scale(initial))
        .attr("height", Math.max(2, (frameY + frameH) - scale(initial)))
        .attr("fill", "#ffb74d")
        .attr("rx", 12);

    const valueText = svg.append("text")
        .attr("x", width/2)
        .attr("y", frameY + frameH + 50)
        .attr("fill", "#ffb74d")
        .attr("font-size", "40px")
        .attr("font-weight", "700")
        .attr("text-anchor", "middle")
        .text(initial + " ppm");

    // Indicador de concentración en SVG (opcional)
    const concentrationText = svg.append("text")
        .attr("x", width/2)
        .attr("y", frameY + frameH + 85)
        .attr("fill", "#ffb74d")
        .attr("font-size", "25px")
        .attr("font-weight", "600")
        .attr("text-anchor", "middle")
        .text(getConcentrationText(initial));

    // color overlay depending on ranges (good/moderate/high)
    function colorFor(v) {
        if (v < 800) return "#7ef9a3";        // good (greenish)
        if (v < 1200) return "#ffd86b";       // moderate (amber)
        return "#ff7a7a";                     // high (red)
    }

    // Función para obtener texto de concentración para SVG
    function getConcentrationText(v) {
        if (v < 800) return "NIVEL NORMAL";
        if (v < 1200) return "NIVEL MODERADO";
        return "¡NIVEL ALTO!";
    }

    // Función para obtener texto corto para el footer
    function getFooterConcentrationText(v) {
        if (v < 800) return "NORMAL";
        if (v < 1200) return "MODERADO";
        return "ALTO";
    }

    // Actualizar estadísticas (aunque no se muestren)
    function updateStats(newVal) {
        stats.current = newVal;
        stats.min = Math.min(stats.min, newVal);
        stats.max = Math.max(stats.max, newVal);
        stats.history.push({
            value: newVal,
            timestamp: new Date().toISOString()
        });
        
        // Mantener solo los últimos 100 valores en el historial
        if (stats.history.length > 100) {
            stats.history.shift();
        }
    }

    return {
        update: function(newVal) {
            const y = scale(newVal);
            const h = Math.max(2, (frameY + frameH) - y);
            const newColor = colorFor(newVal);
            const concentrationStatus = getFooterConcentrationText(newVal);

            // Actualizar gráfico SVG
            fillRect
                .transition().duration(300)
                .attr("y", y)
                .attr("height", h)
                .attr("fill", newColor);

            valueText.text(Math.round(newVal) + " ppm");
            
            concentrationText
                .transition().duration(300)
                .text(getConcentrationText(newVal))
                .attr("fill", newColor);
            
            // Actualizar estadísticas
            updateStats(newVal);
            
            // ACTUALIZAR ELEMENTOS HTML DEL FOOTER
            const concentrationElement = document.getElementById('co2-concentration');
            const timeElement = document.getElementById('co2-time');
            
            if (concentrationElement) {
                concentrationElement.textContent = concentrationStatus;
                // Cambiar color según concentración
                if (newVal < 800) {
                    concentrationElement.style.color = "#7ef9a3"; // Verde
                } else if (newVal < 1200) {
                    concentrationElement.style.color = "#ffd86b"; // Ámbar
                } else {
                    concentrationElement.style.color = "#ff7a7a"; // Rojo
                }
            }
            
            // El tiempo se actualizará desde el WebSocket
            
            return concentrationStatus;
        }
    };
}

// ===================== GAUGE TERMÓMETRO =====================
function gaugeTemperatura(containerId, initial) {
    const container = d3.select(containerId);
    container.html(""); // Limpiar contenedor

    const width = 300;
    const height = 500;
    const min = 0;      // °C mínimo visual
    const max = 45;     // °C máximo visual

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    // Paleta de colores térmica
    const tempPalette = {
        cold: "#4dabf7",        // Azul frío
        cool: "#69db7c",        // Verde fresco
        warm: "#ffd43b",        // Amarillo cálido
        hot: "#ff922b",         // Naranja caliente
        veryHot: "#ff6b6b"      // Rojo muy caliente
    };

    // Diseño tipo termómetro
    const termometroX = width/2 - 15;
    const termometroY = 15;
    const termometroH = 360;
    const bulboRadio = 30;

    // Bulbo inferior
    svg.append("circle")
        .attr("cx", width/2 + 15)
        .attr("cy", termometroY + termometroH + bulboRadio)
        .attr("r", bulboRadio)
        .attr("fill", "#0f1724")
        .attr("stroke", tempPalette.veryHot)
        .attr("stroke-width", 4);

    // Tubo del termómetro
    svg.append("rect")
        .attr("x", termometroX)
        .attr("y", termometroY)
        .attr("width", 60)
        .attr("height", termometroH)
        .attr("rx", 15)
        .attr("fill", "#0f1724")
        .attr("stroke", tempPalette.veryHot)
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
        .attr("fill", tempPalette.veryHot)
        .attr("rx", 11);

    // Mercurio en el bulbo
    const mercurioBulbo = svg.append("circle")
        .attr("cx", width/2 + 15)
        .attr("cy", termometroY + termometroH + bulboRadio)
        .attr("r", bulboRadio - 5)
        .attr("fill", tempPalette.veryHot);

    // Valor numérico
    const valueText = svg.append("text")
        .attr("x", width/2)
        .attr("y", termometroY + termometroH + bulboRadio + 75) 
        .attr("fill", tempPalette.veryHot)
        .attr("font-size", "40px") // Aumentado de 28px a 40px
        .attr("font-weight", "700")
        .attr("text-anchor", "middle")
        .text(initial.toFixed(1) + " °C");

    // Indicador de Nivel
    const levelText = svg.append("text")
        .attr("x", width/2)
        .attr("y", termometroY + termometroH + bulboRadio + 140) 
        .attr("fill", tempPalette.veryHot)
        .attr("font-size", "25px") 
        .attr("font-weight", "600")
        .attr("text-anchor", "middle")
        .text(getTempLevelText(initial));

    // Función para determinar color según temperatura
    function colorFor(v) {
        if (v < 16) return tempPalette.cold;
        if (v < 22) return tempPalette.cool;
        if (v < 28) return tempPalette.warm;
        if (v < 32) return tempPalette.hot;
        return tempPalette.veryHot;
    }

    // Función para obtener texto para el indicador grande
    function getTempLevelText(v) {
        if (v < 16) return "FRÍO";
        if (v < 22) return "FRESCO";
        if (v < 28) return "CÁLIDO";
        if (v < 32) return "CALIENTE";
        return "MUY CALIENTE";
    }

    // Función para obtener texto corto para el footer
    function getFooterTempText(v) {
        if (v < 16) return "FRÍO";
        if (v < 22) return "FRESCO";
        if (v < 28) return "CÁLIDO";
        if (v < 32) return "CALIENTE";
        return "MUY CALIENTE";
    }

    // Marcas de escala
    for (let temp = min; temp <= max; temp += 5) {
        const y = scale(temp);
        svg.append("line")
        .attr("x1", termometroX - 20)
        .attr("x2", termometroX)
        .attr("y1", y)
        .attr("y2", y)
        .attr("stroke", tempPalette.veryHot)
        .attr("stroke-width", 2);
        
        // Solo mostrar marcas cada 5 grados
        if (temp % 5 === 0) {
            svg.append("text")
            .attr("x", termometroX - 22)
            .attr("y", y + 4)
            .attr("fill", tempPalette.veryHot)
            .attr("font-size", "25px") 
            .attr("text-anchor", "end")
            .text(temp + "°");
        }
    }

    return {
        update: function(newVal) {
            const y = scale(newVal);
            const h = Math.max(2, (termometroY + termometroH) - y);
            const newColor = colorFor(newVal);
            const newLevel = getTempLevelText(newVal);
            const footerText = getFooterTempText(newVal);

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

            levelText
                .transition().duration(300)
                .text(newLevel)
                .attr("fill", newColor);
            
            // ACTUALIZAR ELEMENTOS HTML DEL FOOTER
            const feelingElement = document.getElementById('temp-feeling');
            const timeElement = document.getElementById('temp-time');
            
            if (feelingElement) {
                feelingElement.textContent = footerText;
                // Cambiar color según temperatura
                if (newVal < 16) {
                    feelingElement.style.color = "#4dabf7"; // Azul frío
                } else if (newVal < 22) {
                    feelingElement.style.color = "#69db7c"; // Verde fresco
                } else if (newVal < 28) {
                    feelingElement.style.color = "#ffd43b"; // Amarillo cálido
                } else if (newVal < 32) {
                    feelingElement.style.color = "#ff922b"; // Naranja caliente
                } else {
                    feelingElement.style.color = "#ff6b6b"; // Rojo muy caliente
                }
            }
            
            return footerText;
        }
    };
}

// ===================== GAUGE VERTICAL (HUMEDAD %) =====================
function gaugeHumedad(containerId, initial) {
const container = d3.select(containerId);
container.html(""); // Limpiar contenedor

const width = 300;
const height = 520;
const min = 0;      // 0%
const max = 100;    // 100%

const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

// Marco exterior vertical
const frameX = 85;
const frameY = 15;
const frameW = 180;
const frameH = 360;

// Marco de fondo
svg.append("rect")
    .attr("x", frameX)
    .attr("y", frameY)
    .attr("width", frameW)
    .attr("height", frameH)
    .attr("rx", 14)
    .attr("fill", "#0f1724")
    .attr("stroke", "#4dabf7")
    .attr("stroke-width", 2);

// Escala para mapear humedad (0-100%) a posición vertical
const scale = d3.scaleLinear()
    .domain([min, max])
    .range([frameY + frameH, frameY]);

// Función para determinar color según humedad
function colorFor(v) {
    if (v < 30) return "#adb5bd";        // Gris (muy seco)
    if (v < 40) return "#ffa94d";        // Naranja (seco)
    if (v < 60) return "#4dabf7";        // Azul (ideal)
    if (v < 70) return "#339af0";        // Azul medio (húmedo)
    return "#228be6";                    // Azul oscuro (muy húmedo)
}

// Función para texto de nivel
function getNivelTexto(v) {
    if (v < 30) return "MUY SECO";
    if (v < 40) return "SECO";
    if (v < 60) return "IDEAL";
    if (v < 70) return "HÚMEDO";
    return "MUY HÚMEDO";
}

// Crear zonas de color con degradado
const zones = [
    {min: 70, max: 100, label: "Muy Húmedo"},
    {min: 60, max: 70, label: "Húmedo"},
    {min: 40, max: 60, label: "Ideal"},
    {min: 30, max: 40, label: "Seco"},
    {min: 0, max: 30, label: "Muy Seco"}
];

// Dibujar zonas de color en el fondo
zones.forEach(zone => {
    const yTop = scale(zone.max);
    const yBottom = scale(zone.min);
    const zoneColor = colorFor(zone.min + (zone.max - zone.min)/2);
    
    svg.append("rect")
    .attr("x", frameX)
    .attr("y", yTop)
    .attr("width", frameW)
    .attr("height", Math.max(2, yBottom - yTop))
    .attr("fill", zoneColor)
    .attr("opacity", 0.15)
    .attr("rx", 12);
});

// Rectángulo de llenado (indicador principal)
const fillRect = svg.append("rect")
    .attr("x", frameX)
    .attr("width", frameW)
    .attr("y", scale(initial))
    .attr("height", Math.max(2, (frameY + frameH) - scale(initial)))
    .attr("fill", colorFor(initial))
    .attr("rx", 12);

// Marcas de escala
for (let i = 0; i <= 100; i += 10) {
    const y = scale(i);
    
    // Marcas principales cada 20%
    if (i % 20 === 0) {
    // Línea de marca
    svg.append("line")
        .attr("x1", frameX - 10)
        .attr("y1", y)
        .attr("x2", frameX)
        .attr("y2", y)
        .attr("stroke", "#4dabf7")
        .attr("stroke-width", 1.5);
    
    // Texto de valor
    svg.append("text")
        .attr("x", frameX - 20)
        .attr("y", y + 4)
        .attr("fill", "#4dabf7")
        .attr("font-size", "28px")
        .attr("font-weight", "500")
        .attr("text-anchor", "end")
        .text(i + "%");
    } else {
    // Marcas menores
    svg.append("line")
        .attr("x1", frameX - 5)
        .attr("y1", y)
        .attr("x2", frameX)
        .attr("y2", y)
        .attr("stroke", "#4dabf7")
        .attr("stroke-width", 1)
        .attr("opacity", 0.7);
    }
}

// Marcas en el lado derecho
// for (let i = 0; i <= 100; i += 20) {
//     const y = scale(i);
//     svg.append("line")
//     .attr("x1", frameX + frameW)
//     .attr("y1", y)
//     .attr("x2", frameX + frameW + 10)
//     .attr("y2", y)
//     .attr("stroke", "#4dabf7")
//     .attr("stroke-width", 1.5);
// }

// VALOR NUMÉRICO
const valueText = svg.append("text")
    .attr("x", width/2 + 30)
    .attr("y", frameY + frameH + 50)
    .attr("fill", colorFor(initial))
    .attr("font-size", "40px")
    .attr("font-weight", "700")
    .attr("text-anchor", "middle")
    .text(initial.toFixed(1) + " %");

// INDICADOR DE NIVEL
const nivelText = svg.append("text")
    .attr("x", width/2 + 25)
    .attr("y", frameY + frameH + 85)
    .attr("fill", colorFor(initial))
    .attr("font-size", "28px")
    .attr("font-weight", "600")
    .attr("text-anchor", "middle")
    .style("letter-spacing", "0.5px")
    // .text(getNivelTexto(initial));

return {
    update: function(newVal) {
    const y = scale(newVal);
    const h = Math.max(2, (frameY + frameH) - y);
    const newColor = colorFor(newVal);

    // Transición del rectángulo de llenado
    fillRect
        .transition()
        .duration(300)
        .attr("y", y)
        .attr("height", h)
        .attr("fill", newColor);

    // Actualizar textos
    valueText
        .text(newVal.toFixed(1) + " %")
        .attr("fill", newColor);

    // nivelText
    //     .text(getNivelTexto(newVal))
    //     .attr("fill", newColor);
    }
};
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
    console.log("🚀 Inicializando visualizaciones...");

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
            console.log("✅ WebSocket Batería conectado");
            connectionStatus.bateria = true;
            actualizarEstadoConexion();
        };
        
        wsBateria.onmessage = function(e) {
            console.log("📥 Datos recibidos de batería:", e.data);
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
                        statusElement.textContent = "CRÍTICO";
                        statusElement.style.color = "#ef4444";
                        agregarAlerta("Nivel de batería crítico", "critical");
                    } else if (soc < 0.3) {
                        statusElement.textContent = "BAJO";
                        statusElement.style.color = "#f59e0b";
                        agregarAlerta("Nivel de batería bajo", "warning");
                    } else if (soc < 0.7) {
                        statusElement.textContent = "NORMAL";
                        statusElement.style.color = "#3b82f6";
                    } else {
                        statusElement.textContent = "ÓPTIMO";
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
            console.log("✅ WebSocket Agua conectado");
            connectionStatus.agua = true;
            actualizarEstadoConexion();
        };
        
        wsAgua.onmessage = function(e) {
            console.log("📥 Datos recibidos de agua:", e.data);
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
                        statusElement.textContent = "CRÍTICO";
                        statusElement.style.color = "#ef4444";
                        agregarAlerta("Nivel de agua crítico", "critical");
                    } else if (valor < 40) {
                        statusElement.textContent = "BAJO";
                        statusElement.style.color = "#f59e0b";
                    } else {
                        statusElement.textContent = "NORMAL";
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
            console.log("✅ WebSocket Oxígeno conectado");
            connectionStatus.oxigeno = true;
            actualizarEstadoConexion();
        };
        
        wsO2.onmessage = function(e) {
            console.log("📥 Datos recibidos de oxígeno:", e.data);
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
                    if (valor < 16) {
                        feelingElement.textContent = "FRÍO";
                        feelingElement.style.color = "#38bdf8";
                    } else if (valor < 22) {
                        feelingElement.textContent = "FRESCO";
                        feelingElement.style.color = "#22d3ee";
                    } else if (valor < 28) {
                        feelingElement.textContent = "AGRADABLE";
                        feelingElement.style.color = "#22c55e";
                    } else if (valor < 32) {
                        feelingElement.textContent = "CALIENTE";
                        feelingElement.style.color = "#f97316";
                        agregarAlerta("Temperatura alta", "warning");
                    } else {
                        feelingElement.textContent = "MUY CALIENTE";
                        feelingElement.style.color = "#ef4444";
                        agregarAlerta("Temperatura muy alta", "critical");
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
                    if (valor < 30) {
                        conditionElement.textContent = "MUY SECO";
                        conditionElement.style.color = "#94a3b8";
                        agregarAlerta("Humedad muy baja", "warning");
                    } else if (valor < 40) {
                        conditionElement.textContent = "SECO";
                        conditionElement.style.color = "#f59e0b";
                    } else if (valor < 60) {
                        conditionElement.textContent = "IDEAL";
                        conditionElement.style.color = "#22c55e";
                    } else if (valor < 70) {
                        conditionElement.textContent = "HÚMEDO";
                        conditionElement.style.color = "#0ea5e9";
                    } else {
                        conditionElement.textContent = "MUY HÚMEDO";
                        conditionElement.style.color = "#3b82f6";
                        agregarAlerta("Humedad muy alta", "warning");
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
            agregarAlerta(`Sensores desconectados: ${sensoresDesconectados.join(", ")}`, "warning");
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
        agregarAlerta("Calidad del aire crítica", "critical");
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