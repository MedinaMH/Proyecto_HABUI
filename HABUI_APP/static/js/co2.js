document.addEventListener("DOMContentLoaded", function () {
d3.select("body").style("background-color", "#0b0f19");
// Variables para estadísticas (no se muestran, las mantenemos para posibles usos futuros)
let stats = {
current: null,
min: Infinity,
max: -Infinity,
history: []
};

// ===================== GAUGE VERTICAL (CO2 ppm) =====================
function gaugeCO2(containerId, initial) {
const container = d3.select(containerId);
container.html(""); // Limpiar contenedor

const width = 300;
const height = 520;

const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("border-radius", "8px");

svg.append("text")
    .attr("x", width/2)
    .attr("y", 32)
    .attr("fill", "#ffffffff")
    .attr("font-size", "22px")
    .attr("font-weight", "700")
    .attr("text-anchor", "middle")
    .text("CO₂ (ppm)");

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

// color overlay depending on ranges (good/moderate/high)
function colorFor(v) {
    if (v < 800) return "#7ef9a3";        // good (greenish)
    if (v < 1200) return "#ffd86b";       // moderate (amber)
    return "#ff7a7a";                     // high (red)
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

    fillRect
        .transition().duration(300)
        .attr("y", y)
        .attr("height", h)
        .attr("fill", colorFor(newVal));

    valueText.text(Math.round(newVal) + " ppm");
    
    // Actualizar estadísticas
    updateStats(newVal);
    }
};
}

// ===================== SERIE TEMPORAL DE CO₂ =====================
function lineChartCO2(containerId) {
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
    .style("border", "3px solid #ffb74d")
    .style("border-radius", "12px")
    .style("box-shadow", "0 4px 20px rgba(255, 183, 77, 0.15)");

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

// Título mejorado
svg.append("text")
    .attr("x", outerW/2)
    .attr("y", 28)
    .attr("fill", "#ffffffff")
    .attr("font-size", "20px")
    .attr("font-weight", "700")
    .attr("text-anchor", "middle")
    .style("letter-spacing", "0.5px")
    .text("HISTÓRICO DE CO₂ (ppm)");

// Subtítulo
svg.append("text")
    .attr("x", outerW/2)
    .attr("y", 50)
    .attr("fill", "#94a3b8")
    .attr("font-size", "12px")
    .attr("font-weight", "500")
    .attr("text-anchor", "middle")
    .text("Concentración en tiempo real");

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
    .attr("stop-color", "rgba(255, 183, 77, 0.4)")
    .attr("stop-opacity", 0.5);

gradient.append("stop")
    .attr("offset", "80%")
    .attr("stop-color", "rgba(255, 183, 77, 0.1)");

gradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "rgba(255, 183, 77, 0.05)");

// Gradiente para la línea
const lineGradient = svg.append("defs")
    .append("linearGradient")
    .attr("id", "co2-line-gradient")
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "100%").attr("y2", "0%");

lineGradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#ffb74d");

lineGradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#ff9800");

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
    .attr("class", "area-co2")
    .attr("fill", "url(#co2-gradient)")
    .attr("stroke", "none");

// Línea principal
const path = g.append("path")
    .attr("class", "line-co2")
    .attr("fill", "none")
    .attr("stroke", "url(#co2-line-gradient)")
    .attr("stroke-width", 3.5)
    .style("filter", "drop-shadow(0 0 8px rgba(255, 183, 77, 0.5))");

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
    .attr("fill", "#ffb74d")
    .attr("font-size", "14px")
    .attr("font-weight", "600")
    .attr("text-anchor", "middle")
    .text("CO₂ (ppm)");

// Zonas de CO₂ en el fondo
const co2ZonesData = [
    {min: 300, max: 800, color: "rgba(76, 175, 80, 0.08)", label: "BUENO"},
    {min: 800, max: 1200, color: "rgba(255, 193, 7, 0.08)", label: "MODERADO"},
    {min: 1200, max: 2500, color: "rgba(244, 67, 54, 0.08)", label: "ALTO"}
];

// Tooltip mejorado
const tooltip = container.append("div")
    .attr("class", "tooltip-co2")
    .style("position", "absolute")
    .style("background", "rgba(15, 23, 42, 0.95)")
    .style("color", "#e2e8f0")
    .style("padding", "12px 16px")
    .style("border", "2px solid #ffb74d")
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
    .style("filter", "drop-shadow(0 0 6px rgba(255, 215, 0, 0.8))")
    .style("opacity", 0);

// Línea vertical guía
const verticalLine = g.append("line")
    .attr("class", "vertical-line")
    .attr("stroke", "rgba(255, 255, 255, 0.3)")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "5,5")
    .style("opacity", 0);

// Línea de referencia (nivel recomendado 800 ppm)
const referenceLine = g.append("line")
    .attr("class", "reference-line")
    .attr("stroke", "rgba(255, 255, 255, 0.5)")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "8,4")
    .style("opacity", 0.6);

// Etiqueta línea de referencia
g.append("text")
    .attr("class", "reference-label")
    .attr("fill", "#94a3b8")
    .attr("font-size", "10px")
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
    const minVal = Math.max(300, d3.min(data, d => d.v) - 100);
    const maxVal = Math.min(2500, d3.max(data, d => d.v) + 100);
    y.domain([minVal, maxVal]);

    // Zonas de CO₂ en el fondo
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

    // Actualizar línea de referencia (800 ppm - nivel recomendado)
    const recommendedLevel = 800;
    referenceLine
    .attr("x1", 0)
    .attr("y1", y(recommendedLevel))
    .attr("x2", width)
    .attr("y2", y(recommendedLevel));

    // Actualizar etiqueta de referencia
    g.select(".reference-label")
    .attr("x", width - 5)
    .attr("y", y(recommendedLevel) - 5)
    .attr("text-anchor", "end")
    .text(`${recommendedLevel} ppm (Recomendado)`);

    // Actualizar grid
    grid.call(d3.axisLeft(y)
    .ticks(8)
    .tickSize(-width)
    .tickFormat(""))
    .attr("opacity", 0.15)
    .selectAll("line")
    .attr("stroke", "#ffb74d");

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
    .attr("stroke", "#ffb74d")
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
    .attr("stroke", "#ffb74d")
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
        if (d.v < 800) return "#4caf50";
        if (d.v < 1200) return "#ffc107";
        return "#f44336";
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
        if (d.v < 800) return "BUENO";
        if (d.v < 1200) return "MODERADO";
        return "ALTO";
        })();

        const nivelColor = (() => {
        if (d.v < 800) return "#4caf50";
        if (d.v < 1200) return "#ffc107";
        return "#f44336";
        })();

        tooltip
        .html(`
            <div style="display: flex; align-items: center; margin-bottom: 6px;">
            <div style="width: 12px; height: 12px; background: ${nivelColor}; border-radius: 50%; margin-right: 8px;"></div>
            <strong style="font-size: 16px; color: #ffb74d;">${Math.round(d.v)} ppm</strong>
            </div>
            <div style="color: #94a3b8; margin-bottom: 4px;">
            <span style="color: ${nivelColor}; font-weight: 600;">${nivelTexto}</span>
            <span style="margin-left: 8px; font-size: 11px;">
                ${d.v < 800 ? '✅ ' : d.v < 1200 ? '⚠️ ' : '🔴 '}
            </span>
            </div>
            <div style="font-size: 11px; color: #cbd5e1;">
            ${d3.timeFormat("%H:%M:%S")(new Date(d.t))}<br>
            ${d3.timeFormat("%d/%m/%Y")(new Date(d.t))}
            </div>
            ${d.v >= 1200 ? '<div style="margin-top: 8px; padding: 4px 8px; background: rgba(244, 67, 54, 0.1); border-radius: 4px; font-size: 10px; color: #f44336;">Se recomienda ventilación</div>' : ''}
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
    const lastValueColor = lastData.v < 800 ? '#4caf50' : lastData.v < 1200 ? '#ffc107' : '#f44336';
    
    g.append("text")
        .attr("class", "last-value-label")
        .attr("x", width - 10)
        .attr("y", y(lastData.v) - 15)
        .attr("fill", lastValueColor)
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .attr("text-anchor", "end")
        .style("text-shadow", "0 1px 3px rgba(0,0,0,0.5)")
        .text(`${Math.round(lastData.v)} ppm`);
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
    g.selectAll(".co2-zone").remove();
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
const gauge = gaugeCO2("#gauge-co2", 600);
const series = lineChartCO2("#serie-co2");

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