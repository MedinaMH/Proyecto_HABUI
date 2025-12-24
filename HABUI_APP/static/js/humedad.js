document.addEventListener("DOMContentLoaded", function () {
d3.select("body").style("background-color", "#0b0f19");

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
const frameX = 60;
const frameY = 70;
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
    if (v < 30) return "#adb5bd";        // Gris (seco)
    if (v < 40) return "#ffa94d";        // Naranja (poco seco)
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

// Marcas de escala en el lado
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
        .attr("font-size", "11px")
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
for (let i = 0; i <= 100; i += 20) {
    const y = scale(i);
    svg.append("line")
    .attr("x1", frameX + frameW)
    .attr("y1", y)
    .attr("x2", frameX + frameW + 10)
    .attr("y2", y)
    .attr("stroke", "#4dabf7")
    .attr("stroke-width", 1.5);
}

// VALOR NUMÉRICO
const valueText = svg.append("text")
    .attr("x", width/2)
    .attr("y", frameY + frameH + 50)
    .attr("fill", colorFor(initial))
    .attr("font-size", "28px")
    .attr("font-weight", "700")
    .attr("text-anchor", "middle")
    .text(initial.toFixed(1) + " %");

// INDICADOR DE NIVEL
const nivelText = svg.append("text")
    .attr("x", width/2)
    .attr("y", frameY + frameH + 85)
    .attr("fill", colorFor(initial))
    .attr("font-size", "16px")
    .attr("font-weight", "600")
    .attr("text-anchor", "middle")
    .style("letter-spacing", "0.5px")
    .text(getNivelTexto(initial));

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

    nivelText
        .text(getNivelTexto(newVal))
        .attr("fill", newColor);
    }
};
}

// ===================== SERIE TEMPORAL DE HUMEDAD =====================
function lineChartHumedad(containerId) {
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
    .style("border", "2px solid #1e293b")
    .style("border-radius", "12px")
    .style("box-shadow", "0 4px 20px rgba(0, 0, 0, 0.15)");

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

// Scales
const x = d3.scaleTime().range([0, width]);
const y = d3.scaleLinear().range([height, 0]);

// Gradiente para el área
const gradient = svg.append("defs")
    .append("linearGradient")
    .attr("id", "hum-gradient")
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "0%").attr("y2", "100%");

gradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "rgba(77, 171, 247, 0.4)")
    .attr("stop-opacity", 0.5);

gradient.append("stop")
    .attr("offset", "80%")
    .attr("stop-color", "rgba(77, 171, 247, 0.1)");

gradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "rgba(77, 171, 247, 0.05)");

// Gradiente para la línea
const lineGradient = svg.append("defs")
    .append("linearGradient")
    .attr("id", "line-gradient")
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "100%").attr("y2", "0%");

lineGradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#4dabf7");

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
    .attr("class", "area-hum")
    .attr("fill", "url(#hum-gradient)")
    .attr("stroke", "none");

// Línea principal
const path = g.append("path")
    .attr("class", "line-hum")
    .attr("fill", "none")
    .attr("stroke", "url(#line-gradient)")
    .attr("stroke-width", 3)
    .style("filter", "drop-shadow(0 0 6px rgba(77, 171, 247, 0.3))");

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
    .attr("fill", "#4dabf7")
    .attr("font-size", "12px")
    .attr("font-weight", "600")
    .attr("text-anchor", "middle")
    .text("HUMEDAD (%)");

// Zonas de humedad en el fondo
const humZonesData = [
    {min: 0, max: 30, color: "rgba(173, 181, 189, 0.08)", label: "Muy Seco"},
    {min: 30, max: 40, color: "rgba(255, 169, 77, 0.08)", label: "Seco"},
    {min: 40, max: 60, color: "rgba(77, 171, 247, 0.08)", label: "Ideal"},
    {min: 60, max: 70, color: "rgba(51, 154, 240, 0.08)", label: "Húmedo"},
    {min: 70, max: 100, color: "rgba(34, 139, 230, 0.08)", label: "Muy Húmedo"}
];

// Tooltip
const tooltip = container.append("div")
    .attr("class", "tooltip-humedad")
    .style("position", "absolute")
    .style("background", "rgba(15, 23, 42, 0.95)")
    .style("color", "#e2e8f0")
    .style("padding", "12px 16px")
    .style("border", "2px solid #4dabf7")
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
    .style("filter", "drop-shadow(0 0 6px rgba(0, 255, 204, 0.6))")
    .style("opacity", 0);

// Línea vertical guía
const verticalLine = g.append("line")
    .attr("class", "vertical-line")
    .attr("stroke", "rgba(255, 255, 255, 0.3)")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "5,5")
    .style("opacity", 0);

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
    const minVal = Math.max(0, d3.min(data, d => d.v) - 5);
    const maxVal = Math.min(100, d3.max(data, d => d.v) + 5);
    y.domain([minVal, maxVal]);

    // Zonas de humedad en el fondo
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

    // Actualizar grid
    grid.call(d3.axisLeft(y)
    .ticks(8)
    .tickSize(-width)
    .tickFormat(""))
    .attr("opacity", 0.1)
    .selectAll("line")
    .attr("stroke", "#4dabf7");

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
    .ticks(8)
    .tickFormat(d => d + "%")
    .tickSizeOuter(0))
    .selectAll("text")
    .attr("fill", "#94a3b8")
    .attr("font-size", "10px")
    .attr("font-weight", "500");

    yAxisG.selectAll("path, line")
    .attr("stroke", "#64748b")
    .attr("opacity", 0.5);

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
        if (d.v < 30) return "#adb5bd";      // Gris
        if (d.v < 40) return "#ffa94d";      // Naranja
        if (d.v < 60) return "#4dabf7";      // Azul ideal
        if (d.v < 70) return "#339af0";      // Azul medio
        return "#228be6";                    // Azul oscuro
    })
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 1)
    .style("opacity", 0.8)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
        const mouseX = x(new Date(d.t));
        const mouseY = y(d.v);
        
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
        const nivelTexto = (() => {
        if (d.v < 30) return "MUY SECO";
        if (d.v < 40) return "SECO";
        if (d.v < 60) return "IDEAL";
        if (d.v < 70) return "HÚMEDO";
        return "MUY HÚMEDO";
        })();

        tooltip
        .html(`
            <div style="display: flex; align-items: center; margin-bottom: 6px;">
            <div style="width: 12px; height: 12px; background: ${d.v < 30 ? '#adb5bd' : d.v < 40 ? '#ffa94d' : d.v < 60 ? '#4dabf7' : d.v < 70 ? '#339af0' : '#228be6'}; border-radius: 50%; margin-right: 8px;"></div>
            <strong style="font-size: 14px; color: #4dabf7;">${d.v.toFixed(1)}%</strong>
            </div>
            <div style="color: #94a3b8; margin-bottom: 4px; font-size: 12px;">
            <span style="color: #00ffcc; font-weight: 600;">${nivelTexto}</span>
            </div>
            <div style="font-size: 11px; color: #94a3b8;">
            ${d3.timeFormat("%H:%M:%S")(new Date(d.t))}<br>
            ${d3.timeFormat("%d/%m/%Y")(new Date(d.t))}
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

    // Último valor destacado
    const lastData = data[data.length - 1];
    g.selectAll(".last-value-label").remove();
    
    if (lastData) {
    g.append("text")
        .attr("class", "last-value-label")
        .attr("x", width - 10)
        .attr("y", y(lastData.v) - 12)
        .attr("fill", lastData.v < 30 ? '#adb5bd' : lastData.v < 40 ? '#ffa94d' : lastData.v < 60 ? '#4dabf7' : lastData.v < 70 ? '#339af0' : '#228be6')
        .attr("font-size", "10px")
        .attr("font-weight", "600")
        .attr("text-anchor", "end")
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
    
    // Limpiar elementos
    g.selectAll(".data-point").remove();
    g.selectAll(".hum-zone").remove();
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
const gauge = gaugeHumedad("#gauge-humedad", 50.0);
const series = lineChartHumedad("#serie-humedad");

// ================= WEBSOCKET =================
const socket = new WebSocket("ws://" + window.location.host + "/ws/humedad/");

socket.onmessage = function(e) {
const mensaje = JSON.parse(e.data);
const valor = mensaje.valor;
const fecha = mensaje.fecha_hora;

gauge.update(valor);
series.push(valor, fecha);
};

socket.onopen = function() {
console.log("WebSocket Humedad conectado");
};

socket.onerror = function() {
console.error("Error en WebSocket Humedad");
};

socket.onclose = function() {
console.warn("WebSocket Humedad desconectado");
};
});