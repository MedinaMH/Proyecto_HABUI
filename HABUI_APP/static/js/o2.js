document.addEventListener("DOMContentLoaded", function () {
d3.select("body").style("background-color", "#0b0f19");

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
    if (v >= 21.0) return greenPalette.light;   // excelente (verde claro)
    if (v >= 19.5) return greenPalette.amber;   // acceptable (ámbar)
    return greenPalette.red;                     // critico (rojo)
}

function getQualityText(v) {
    if (v >= 21.0) return TRANSLATIONS.nivel_optimo || "NIVEL ÓPTIMO";
    if (v >= 19.5) return TRANSLATIONS.nivel_aceptable || "NIVEL ACEPTABLE";
    return "¡NIVEL BAJO!";
}

return {
    update: function(newVal) {
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
};
}

// ===================== SERIE TEMPORAL DE OXÍGENO =====================
function lineChartO2(containerId) {
const container = d3.select(containerId);
container.html(""); // Limpiar contenedor

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

// Subtítulo
// svg.append("text")
//     .attr("x", outerW/2)
//     .attr("y", 50)
//     .attr("fill", "#94a3b8")
//     .attr("font-size", "12px")
//     .attr("font-weight", "500")
//     .attr("text-anchor", "middle")
//     .text("Niveles atmosféricos en tiempo real");

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

// Etiqueta eje Y - con corrección de espaciado
g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height/2)
    .attr("y", -50)
    .attr("fill", "#00ff88")
    .attr("font-size", "14px")
    .attr("font-weight", "600")
    .attr("text-anchor", "middle")
    .text("O₂ (%)");

// Zonas de oxígeno en el fondo
const o2ZonesData = [
    {min: 17.5, max: 19.5, color: "rgba(255, 107, 107, 0.08)", label: "BAJO"},
    {min: 19.5, max: 21.5, color: "rgba(77, 171, 247, 0.08)", label: "NORMAL"},
    {min: 21.5, max: 23.0, color: "rgba(0, 255, 136, 0.08)", label: "ÓPTIMO"}
];

// Tooltip - con clase específica
const tooltip = container.append("div")
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
    .attr("stroke-width", 3)
    .attr("stroke-dasharray", "8,4")
    .style("opacity", 0.6);

// Etiqueta línea de referencia
g.append("text")
    .attr("class", "reference-label")
    .attr("fill", "#94a3b8")
    .attr("font-size", "20px")
    .attr("font-weight", "500")
    .style("opacity", 0.7);

let data = [];

function redraw() {
    if (data.length === 0) return;

    const maxPoints = 80;
    if (data.length > maxPoints) {
    data = data.slice(data.length - maxPoints);
    }

    // Actualizar dominios
    x.domain(d3.extent(data, d => new Date(d.t)));
    
    // Determinar rango Y dinámico pero con márgenes
    const minVal = Math.min(17.0, d3.min(data, d => d.v) - 0.5);
    const maxVal = Math.max(23.0, d3.max(data, d => d.v) + 0.5);
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

    // Actualizar etiqueta de referencia
    g.select(".reference-label")
    .attr("x", width - 5)
    .attr("y", y(normalLevel) - 5)
    .attr("text-anchor", "end")
    .text(`${normalLevel}% (Normal)`);

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
    .ticks(6)
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
    .attr("r", 4)
    .attr("fill", d => {
        if (d.v < 19.5) return "#ff6b6b";      // Rojo (bajo)
        if (d.v < 21.5) return "#4dabf7";      // Azul (normal)
        return "#00ff88";                      // Verde (óptimo)
    })
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 1.5)
    .style("opacity", 0.9)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
        const [mouseX, mouseY] = d3.pointer(event);
        const svgMouseX = mouseX + margin.left;
        const svgMouseY = mouseY + margin.top;
        
        focus
        .attr("cx", x(new Date(d.t)))
        .attr("cy", y(d.v))
        .transition()
        .duration(200)
        .attr("r", 8)
        .style("opacity", 1);

        verticalLine
        .attr("x1", x(new Date(d.t)))
        .attr("y1", 0)
        .attr("x2", x(new Date(d.t)))
        .attr("y2", height)
        .transition()
        .duration(200)
        .style("opacity", 1);

        const nivelTexto = (() => {
        if (d.v < 19.5) return "BAJO";
        if (d.v < 21.5) return "NORMAL";
        return "ÓPTIMO";
        })();

        const nivelColor = (() => {
        if (d.v < 19.5) return "#ff6b6b";
        if (d.v < 21.5) return "#4dabf7";
        return "#00ff88";
        })();

        tooltip
        .html(`
            <div style="display: flex; align-items: center; margin-bottom: 6px;">
            <div style="width: 12px; height: 12px; background: ${nivelColor}; border-radius: 50%; margin-right: 8px;"></div>
            <strong style="font-size: 16px; color: #00ff88;">${d.v.toFixed(1)}%</strong>
            </div>
            <div style="color: #94a3b8; margin-bottom: 4px;">
            <span style="color: ${nivelColor}; font-weight: 600;">${nivelTexto}</span>
            <span style="margin-left: 8px; font-size: 11px;">
                ${d.v < 19.5 ? '⚠️ ' : d.v < 21.5 ? '✅ ' : '⭐ '}
            </span>
            </div>
            <div style="font-size: 11px; color: #cbd5e1;">
            ${d3.timeFormat("%H:%M:%S")(new Date(d.t))}<br>
            ${d3.timeFormat("%d/%m/%Y")(new Date(d.t))}
            </div>
            ${d.v < 19.5 ? '<div style="margin-top: 8px; padding: 4px 8px; background: rgba(255, 107, 107, 0.1); border-radius: 4px; font-size: 10px; color: #ff6b6b;">Nivel de oxígeno bajo</div>' : ''}
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

    // Último valor destacado
    const lastData = data[data.length - 1];
    g.selectAll(".last-value-label").remove();
    
    if (lastData) {
    const lastValueColor = lastData.v < 19.5 ? '#ff6b6b' : lastData.v < 21.5 ? '#4dabf7' : '#00ff88';
    
    g.append("text")
        .attr("class", "last-value-label")
        .attr("x", width - 10)
        .attr("y", y(lastData.v) - 15)
        .attr("fill", lastValueColor)
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .attr("text-anchor", "end")
        .style("text-shadow", "0 1px 3px rgba(0,0,0,0.5)")
        .text(`${lastData.v.toFixed(1)}%`);
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
    
    g.selectAll(".data-point").remove();
    g.selectAll(".o2-zone").remove();
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