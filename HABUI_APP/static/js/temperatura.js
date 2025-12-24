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
const termometroY = 70;
const termometroH = 360;
const bulboRadio = 35;

// Bulbo inferior
svg.append("circle")
    .attr("cx", width/2)
    .attr("cy", termometroY + termometroH + bulboRadio)
    .attr("r", bulboRadio)
    .attr("fill", "#0f1724")
    .attr("stroke", tempPalette.veryHot)
    .attr("stroke-width", 3);

// Tubo del termómetro
svg.append("rect")
    .attr("x", termometroX)
    .attr("y", termometroY)
    .attr("width", 30)
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
    .attr("width", 22)
    .attr("y", scale(initial))
    .attr("height", Math.max(2, (termometroY + termometroH) - scale(initial)))
    .attr("fill", tempPalette.veryHot)
    .attr("rx", 11);

// Mercurio en el bulbo
const mercurioBulbo = svg.append("circle")
    .attr("cx", width/2)
    .attr("cy", termometroY + termometroH + bulboRadio)
    .attr("r", bulboRadio - 5)
    .attr("fill", tempPalette.veryHot);

// Valor numérico
const valueText = svg.append("text")
    .attr("x", width/2)
    .attr("y", termometroY + termometroH + bulboRadio + 120)
    .attr("fill", tempPalette.veryHot)
    .attr("font-size", "28px")
    .attr("font-weight", "700")
    .attr("text-anchor", "middle")
    .text(initial.toFixed(1) + " °C");

// Indicador de nivel
const levelText = svg.append("text")
    .attr("x", width/2)
    .attr("y", termometroY + termometroH + bulboRadio + 150)
    .attr("fill", tempPalette.veryHot)
    .attr("font-size", "16px")
    .attr("font-weight", "600")
    .attr("text-anchor", "middle")
    .text(getTempLevel(initial).level);

// Función para determinar color según temperatura
function colorFor(v) {
    if (v < 16) return tempPalette.cold;
    if (v < 22) return tempPalette.cool;
    if (v < 28) return tempPalette.warm;
    if (v < 32) return tempPalette.hot;
    return tempPalette.veryHot;
}

// Función para determinar nivel de temperatura
function getTempLevel(v) {
    if (v < 16) return {level: "FRÍO", emoji: "❄️"};
    if (v < 22) return {level: "FRESCO", emoji: "🌿"};
    if (v < 28) return {level: "CÁLIDO", emoji: "☀️"};
    if (v < 32) return {level: "CALIENTE", emoji: "🔥"};
    return {level: "MUY CALIENTE", emoji: "🥵"};
}

// Marcas de escala
for (let temp = min; temp <= max; temp += 5) {
    const y = scale(temp);
    svg.append("line")
    .attr("x1", termometroX - 10)
    .attr("x2", termometroX)
    .attr("y1", y)
    .attr("y2", y)
    .attr("stroke", tempPalette.veryHot)
    .attr("stroke-width", 1.5);
    
    svg.append("text")
    .attr("x", termometroX - 15)
    .attr("y", y + 4)
    .attr("fill", tempPalette.veryHot)
    .attr("font-size", "12px")
    .attr("text-anchor", "end")
    .text(temp + "°");
}

return {
    update: function(newVal) {
    const y = scale(newVal);
    const h = Math.max(2, (termometroY + termometroH) - y);
    const newColor = colorFor(newVal);
    const newLevel = getTempLevel(newVal);

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
        .text(newLevel.level)
        .attr("fill", newColor);
    }
};
}

// ===================== SERIE TEMPORAL DE TEMPERATURA =====================
function lineChartTemperatura(containerId) {
const container = d3.select(containerId);
container.html(""); // Limpiar contenedor

const outerW = 720, outerH = 520;
const margin = {top: 50, right: 40, bottom: 60, left: 80};
const width = outerW - margin.left - margin.right;
const height = outerH - margin.top - margin.bottom;

const svg = container.append("svg")
    .attr("width", outerW)
    .attr("height", outerH)
    .style("background", "#0f172a")
    .style("border", "2px solid #1e293b")
    .style("border-radius", "12px")
    .style("box-shadow", "0 4px 20px rgba(0, 0, 0, 0.15)");

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

// Scales
const x = d3.scaleTime().range([0, width]);
const y = d3.scaleLinear().range([height, 0]);

// Paleta de colores para temperatura
const tempColors = {
    cold: "#4dabf7",       // Azul para frío
    cool: "#69db7c",       // Verde para fresco
    warm: "#ffd43b",       // Amarillo para cálido
    hot: "#ff922b",        // Naranja para caliente
    veryHot: "#ff6b6b"     // Rojo para muy caliente
};

// Gradiente para el área
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
    .x(d => x(new Date(d.t)))
    .y(d => y(d.v))
    .curve(d3.curveMonotoneX);

const area = d3.area()
    .x(d => x(new Date(d.t)))
    .y0(height)
    .y1(d => y(d.v))
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
    .style("font-size", "11px");

const yAxisG = g.append("g")
    .attr("class", "y-axis")
    .style("font-size", "11px");

// Etiqueta eje Y
g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height/2)
    .attr("y", -55)
    .attr("fill", "#ff6b6b")
    .attr("font-size", "12px")
    .attr("font-weight", "600")
    .attr("text-anchor", "middle")
    .text("TEMPERATURA (°C)");

// Zonas de temperatura en el fondo
const tempZonesData = [
    {min: 0, max: 16, color: "rgba(77, 171, 247, 0.08)", label: "FRÍO", emoji: "❄️"},
    {min: 16, max: 22, color: "rgba(105, 219, 124, 0.08)", label: "FRESCO", emoji: "🌿"},
    {min: 22, max: 28, color: "rgba(255, 212, 59, 0.08)", label: "CÁLIDO", emoji: "☀️"},
    {min: 28, max: 32, color: "rgba(255, 146, 43, 0.08)", label: "CALIENTE", emoji: "🔥"},
    {min: 32, max: 45, color: "rgba(255, 107, 107, 0.08)", label: "MUY CALIENTE", emoji: "🥵"}
];

// Tooltip
const tooltip = container.append("div")
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

let data = [];

// Función para determinar nivel de temperatura
function getTempLevel(v) {
    if (v < 16) return {level: "FRÍO", color: tempColors.cold, emoji: "❄️"};
    if (v < 22) return {level: "FRESCO", color: tempColors.cool, emoji: "🌿"};
    if (v < 28) return {level: "CÁLIDO", color: tempColors.warm, emoji: "☀️"};
    if (v < 32) return {level: "CALIENTE", color: tempColors.hot, emoji: "🔥"};
    return {level: "MUY CALIENTE", color: tempColors.veryHot, emoji: "🥵"};
}

function redraw() {
    if (data.length === 0) return;

    const maxPoints = 80;
    if (data.length > maxPoints) {
    data = data.slice(data.length - maxPoints);
    }

    // Actualizar dominios
    x.domain(d3.extent(data, d => new Date(d.t)));
    
    // Determinar rango Y dinámico
    const minVal = Math.max(0, d3.min(data, d => d.v) - 5);
    const maxVal = Math.min(45, d3.max(data, d => d.v) + 5);
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

    // Actualizar ejes con mejor formato
    xAxisG.call(d3.axisBottom(x)
    .ticks(6)
    .tickFormat(d3.timeFormat("%H:%M:%S"))
    .tickSizeOuter(0))
    .selectAll("text")
    .attr("fill", "#94a3b8")
    .attr("font-size", "10px")
    .attr("font-weight", "500");

    xAxisG.selectAll("path, line")
    .attr("stroke", "#64748b")
    .attr("opacity", 0.5);

    yAxisG.call(d3.axisLeft(y)
    .ticks(6)
    .tickFormat(d => d + "°C")
    .tickSizeOuter(0))
    .selectAll("text")
    .attr("fill", "#94a3b8")
    .attr("font-size", "10px")
    .attr("font-weight", "500")
    .attr("dx", "-5px");

    yAxisG.selectAll("path, line")
    .attr("stroke", "#64748b")
    .attr("opacity", 0.5);

    // Eliminar el dominio de la línea del eje Y
    yAxisG.select(".domain").attr("stroke", "none");

    // Actualizar línea y área con transición
    path.datum(data)
    .transition()
    .duration(500)
    .ease(d3.easeCubicOut)
    .attr("d", line);

    areaPath.datum(data)
    .transition()
    .duration(500)
    .ease(d3.easeCubicOut)
    .attr("d", area);

    // Puntos de datos interactivos
    const points = g.selectAll(".data-point")
    .data(data, d => d.t);

    points.enter()
    .append("circle")
    .attr("class", "data-point")
    .merge(points)
    .attr("cx", d => x(new Date(d.t)))
    .attr("cy", d => y(d.v))
    .attr("r", 3.5)
    .attr("fill", d => {
        const level = getTempLevel(d.v);
        return level.color;
    })
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 1)
    .style("opacity", 0.8)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
        const mouseX = x(new Date(d.t));
        const mouseY = y(d.v);
        const levelInfo = getTempLevel(d.v);
        
        // Mostrar punto focal
        focus
        .attr("cx", mouseX)
        .attr("cy", mouseY)
        .transition()
        .duration(200)
        .attr("r", 6)
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
            <strong style="font-size: 14px; color: #ff6b6b;">${d.v.toFixed(1)}°C</strong>
            </div>
            <div style="color: #94a3b8; margin-bottom: 4px; font-size: 12px;">
            <span style="color: ${levelInfo.color}; font-weight: 600;">
                ${levelInfo.emoji} ${levelInfo.level}
            </span>
            </div>
            <div style="font-size: 11px; color: #94a3b8; border-top: 1px solid rgba(255, 107, 107, 0.2); padding-top: 6px;">
            ${d3.timeFormat("%H:%M:%S")(new Date(d.t))}<br>
            ${d3.timeFormat("%d/%m/%Y")(new Date(d.t))}
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

    // Último valor destacado
    const lastData = data[data.length - 1];
    g.selectAll(".last-value-label").remove();
    
    if (lastData) {
    const lastLevelInfo = getTempLevel(lastData.v);
    
    g.append("text")
        .attr("class", "last-value-label")
        .attr("x", width - 10)
        .attr("y", y(lastData.v) - 12)
        .attr("fill", lastLevelInfo.color)
        .attr("font-size", "10px")
        .attr("font-weight", "600")
        .attr("text-anchor", "end")
        .style("text-shadow", "0 1px 2px rgba(0,0,0,0.5)")
        .text(`${lastData.v.toFixed(1)}°C`);
    }
}

return {
    push: function(value, timestampStr) {
    const t = timestampStr || new Date().toISOString();
    data.push({ v: value, t: t });
    redraw();
    },
    reset: function() {
    data = [];
    path.datum(data).attr("d", line);
    areaPath.datum(data).attr("d", area);
    
    // Limpiar elementos
    g.selectAll(".data-point").remove();
    g.selectAll(".temp-zone").remove();
    g.selectAll(".last-value-label").remove();
    
    focus.attr("r", 0).style("opacity", 0);
    verticalLine.style("opacity", 0);
    tooltip.style("opacity", 0);
    },
    setData: function(newData) {
    data = newData;
    redraw();
    }
};
}

// ============== INSTANCIAS ==============
const gauge = gaugeTemperatura("#gauge-temperatura", 22.0);
const series = lineChartTemperatura("#serie-temperatura");

// ================= WEBSOCKET =================
const socket = new WebSocket("ws://" + window.location.host + "/ws/temperatura/");

socket.onmessage = function(e) {
const mensaje = JSON.parse(e.data);
const valor = mensaje.valor;
const fecha = mensaje.fecha_hora;

gauge.update(valor);
series.push(valor, fecha);
};

socket.onopen = function() {
console.log("WebSocket Temperatura conectado");
};

socket.onerror = function() {
console.error("Error en WebSocket Temperatura");
};

socket.onclose = function() {
console.warn("WebSocket Temperatura desconectado");
};
});