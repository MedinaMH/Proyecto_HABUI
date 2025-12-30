document.addEventListener("DOMContentLoaded", function () {
d3.select("body").style("background-color", "#0b0f19");

// ============================================================
// ============ TANQUE DE AGUA ====================
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
svg.append("text")
    .attr("x", width / 2)
    .attr("y", 35)
    .attr("fill", "#ffffffff")
    .attr("font-size", "24px")
    .attr("font-weight", "bold")
    .attr("text-anchor", "middle")
    .text("TANQUE DE AGUA");

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
    .text("NIVEL ACTUAL");

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
return actualizar;
}

// ============================================================
// =========== SERIE TEMPORAL MEJORADA ========================
// ============================================================

function crearSerieTemporalMejorada() {
const container = d3.select("#serie-temporal");
container.html(""); // Limpiar contenedor

const margin = { top: 40, right: 40, bottom: 50, left: 60 };
const width = 650 - margin.left - margin.right;
const height = 480 - margin.top - margin.bottom;

const svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("background", "#0f172a")
    .style("border", "3px solid #00bfff")
    .style("border-radius", "12px")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const data = [];

// Gradiente para el área
const defs = svg.append("defs");
const areaGradient = defs.append("linearGradient")
    .attr("id", "areaGradient")
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "0%").attr("y2", "100%");

areaGradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "rgba(0, 191, 255, 0.3)");

areaGradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "rgba(0, 191, 255, 0.05)");

// Escalas
const x = d3.scaleTime().range([0, width]);
const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);

// Generadores de línea y área
const line = d3.line()
    .x(d => x(d.tiempo))
    .y(d => y(d.nivel))
    .curve(d3.curveMonotoneX);

const area = d3.area()
    .x(d => x(d.tiempo))
    .y0(height)
    .y1(d => y(d.nivel))
    .curve(d3.curveMonotoneX);

// Crear elementos
svg.append("path")
    .attr("class", "area")
    .attr("fill", "url(#areaGradient)");

svg.append("path")
    .attr("class", "line")
    .attr("fill", "none")
    .attr("stroke", "#00bfff")
    .attr("stroke-width", 3);

// Ejes
svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`);

svg.append("g")
    .attr("class", "y-axis");

// Título
svg.append("text")
    .attr("x", width / 2)
    .attr("y", -15)
    .attr("fill", "#ffffffff")
    .attr("font-size", "18px")
    .attr("font-weight", "bold")
    .attr("text-anchor", "middle")
    .text("HISTÓRICO DE NIVELES");

// Grid horizontal
svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y)
    .ticks(5)
    .tickSize(-width)
    .tickFormat("")
    )
    .attr("opacity", 0.2)
    .selectAll("line")
    .attr("stroke", "#00bfff");

// Tooltip - con clase específica
const tooltip = container.append("div")
    .attr("class", "tooltip-water")
    .style("position", "absolute")
    .style("padding", "10px 15px")
    .style("background", "rgba(15, 23, 42, 0.95)")
    .style("color", "#00e5ff")
    .style("border", "2px solid #00bfff")
    .style("border-radius", "8px")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("box-shadow", "0 4px 12px rgba(0, 0, 0, 0.3)");

const focus = svg.append("circle")
    .attr("r", 0)
    .attr("fill", "#00ffcc")
    .attr("stroke", "#fff")
    .attr("stroke-width", 2)
    .style("opacity", 0);

// Función de actualización
function actualizarSerie(nivel) {
    const ahora = new Date();
    data.push({ tiempo: ahora, nivel: nivel });
    
    // Mantener últimos 60 puntos
    if (data.length > 60) {
    data.shift();
    }
    
    // Actualizar escalas
    x.domain(d3.extent(data, d => d.tiempo));
    y.domain([0, 100]);
    
    // Actualizar área y línea
    svg.select(".area")
    .datum(data)
    .transition().duration(300)
    .attr("d", area);
    
    svg.select(".line")
    .datum(data)
    .transition().duration(300)
    .attr("d", line);
    
    // Actualizar ejes
    svg.select(".x-axis")
    .transition().duration(300)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat("%H:%M:%S")))
    .selectAll("text")
    .attr("fill", "#00bfff")
    .attr("font-size", "12px");
    
    svg.select(".y-axis")
    .transition().duration(300)
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + "%"))
    .selectAll("text")
    .attr("fill", "#00bfff")
    .attr("font-size", "12px");
    
    // Puntos de datos interactivos
    const points = svg.selectAll(".data-point")
    .data(data);
    
    points.enter()
    .append("circle")
    .attr("class", "data-point")
    .merge(points)
    .attr("cx", d => x(d.tiempo))
    .attr("cy", d => y(d.nivel))
    .attr("r", 4)
    .attr("fill", d => {
        if (d.nivel < 20) return "#ff4444";
        if (d.nivel < 40) return "#ffaa00";
        if (d.nivel < 70) return "#00bfff";
        return "#00cc66";
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 1)
    .style("opacity", 0.8)
    .on("mouseover", function(event, d) {
        focus
        .attr("cx", x(d.tiempo))
        .attr("cy", y(d.nivel))
        .transition().duration(200)
        .attr("r", 8)
        .style("opacity", 1);
        
        tooltip
        .style("opacity", 1)
        .html(`
            <strong>${d.nivel.toFixed(1)}%</strong><br>
            ${d3.timeFormat("%H:%M:%S")(d.tiempo)}<br>
            ${d3.timeFormat("%Y-%m-%d")(d.tiempo)}
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 40) + "px");
    })
    .on("mouseout", function() {
        focus.transition().duration(200)
        .attr("r", 0)
        .style("opacity", 0);
        
        tooltip.style("opacity", 0);
    });
    
    points.exit().remove();
}

return actualizarSerie;
}

// ============== INSTANCIAS ==============
const actualizarTanque = crearTanqueAguaRealista("#grafico-tanque", 0);
const actualizarSerieTemporal = crearSerieTemporalMejorada();

// ============================================================
// ====================== WEBSOCKET ===========================
// ============================================================

const socket = new WebSocket("ws://" + window.location.host + "/ws/agua/");

socket.onmessage = function (event) {
const data = JSON.parse(event.data);

if (data.nivel !== undefined) {
    const nivel = parseFloat(data.nivel);
    actualizarTanque(nivel);
    actualizarSerieTemporal(nivel);
}
};

socket.onopen = function() {
console.log("WebSocket Tanque de Agua conectado");
};

socket.onerror = function(error) {
console.error("Error en conexión WebSocket:", error);
};

socket.onclose = function() {
console.warn("Conexión WebSocket cerrada");
location.reload()
};

// Simulación inicial para demostración
setTimeout(() => {
actualizarTanque(45);
actualizarSerieTemporal(45);
}, 500);
});