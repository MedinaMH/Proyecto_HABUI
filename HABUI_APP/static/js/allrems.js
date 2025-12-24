// ============================================================
// ============ TANQUE DE AGUA ============
// ============================================================
function crearTanqueAguaRealista(containerId, valorInicial) {
const container = d3.select(containerId);
container.html(""); // Limpiar contenedor

const width = 400;
const height = 520;

const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("overflow", "visible");

// Título
svg.append("text")
    .attr("x", width / 2)
    .attr("y", 35)
    .attr("fill", "#00bfff")
    .attr("font-size", "22px")
    .attr("font-weight", "bold")
    .attr("text-anchor", "middle")
    .text("NIVEL DE AGUA");

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

// Gradiente para el agua
const gradienteAgua = defs.append("linearGradient")
    .attr("id", "gradAgua")
    .attr("x1", "0%").attr("y1", "100%")
    .attr("x2", "0%").attr("y2", "0%");

gradienteAgua.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#1e90ff")
    .attr("stop-opacity", 0.9);

gradienteAgua.append("stop")
    .attr("offset", "50%")
    .attr("stop-color", "#00bfff")
    .attr("stop-opacity", 0.8);

gradienteAgua.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#87ceeb")
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
svg.append("rect")
    .attr("x", tanqueX)
    .attr("y", tanqueY)
    .attr("width", tanqueWidth)
    .attr("height", tanqueHeight)
    .attr("rx", tanqueCurvatura)
    .attr("ry", tanqueCurvatura)
    .attr("fill", "url(#gradTanque)")
    .attr("stroke", "#4a6572")
    .attr("stroke-width", 3);

// Reflejo metálico
svg.append("rect")
    .attr("x", tanqueX + 5)
    .attr("y", tanqueY + 5)
    .attr("width", 40)
    .attr("height", tanqueHeight - 10)
    .attr("rx", 8)
    .attr("fill", "rgba(255, 255, 255, 0.15)")
    .attr("opacity", 0.6);

// Tapa superior del tanque
svg.append("rect")
    .attr("x", tanqueX - 10)
    .attr("y", tanqueY - 15)
    .attr("width", tanqueWidth + 20)
    .attr("height", 20)
    .attr("rx", 10)
    .attr("fill", "#2c3e50")
    .attr("stroke", "#4a6572")
    .attr("stroke-width", 2);

// Indicador de llenado (barra lateral)
svg.append("rect")
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
for (let i = 0; i <= 100; i += 25) {
    const y = tanqueY + tanqueHeight - (i / 100) * tanqueHeight;
    
    // Líneas grandes cada 25%
    svg.append("line")
    .attr("x1", tanqueX - 15)
    .attr("x2", tanqueX - 5)
    .attr("y1", y)
    .attr("y2", y)
    .attr("stroke", "#00bfff")
    .attr("stroke-width", 2);
    
    // Texto de porcentaje
    svg.append("text")
    .attr("x", tanqueX - 20)
    .attr("y", y + 4)
    .attr("fill", "#00bfff")
    .attr("font-size", "12px")
    .attr("text-anchor", "end")
    .text(i + "%");
}

// Líneas pequeñas cada 10%
for (let i = 10; i < 100; i += 10) {
    if (i % 25 !== 0) {
    const y = tanqueY + tanqueHeight - (i / 100) * tanqueHeight;
    svg.append("line")
        .attr("x1", tanqueX - 10)
        .attr("x2", tanqueX - 5)
        .attr("y1", y)
        .attr("y2", y)
        .attr("stroke", "#4a6572")
        .attr("stroke-width", 1);
    }
}

// --- DISPLAY NUMÉRICO MEJORADO ---
const displayX = tanqueX + tanqueWidth - 110;
const displayY = tanqueY + tanqueHeight + 25;

svg.append("rect")
    .attr("x", displayX)
    .attr("y", displayY)
    .attr("width", 120)
    .attr("height", 45)
    .attr("rx", 8)
    .attr("fill", "#1a252f")
    .attr("stroke", "#00bfff")
    .attr("stroke-width", 2);

const textoNivel = svg.append("text")
    .attr("x", displayX + 60)
    .attr("y", displayY + 30)
    .attr("fill", "#00ffcc")
    .attr("font-size", "22px")
    .attr("font-weight", "bold")
    .attr("text-anchor", "middle")
    .style("font-family", "'Courier New', monospace")
    .text("00.0%");

svg.append("text")
    .attr("x", displayX + 60)
    .attr("y", displayY + 55)
    .attr("fill", "#00bfff")
    .attr("font-size", "11px")
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
    let colorDisplay = "#00ffcc";
    
    if (porcentaje < 20) {
    colorAgua = "#ff4444";
    colorIndicador = "#ff4444";
    colorDisplay = "#ff4444";
    } else if (porcentaje < 40) {
    colorAgua = "#ffaa00";
    colorIndicador = "#ffaa00";
    colorDisplay = "#ffaa00";
    } else if (porcentaje < 70) {
    colorAgua = "#00bfff";
    colorIndicador = "#00bfff";
    colorDisplay = "#00ffcc";
    } else {
    colorAgua = "#00cc66";
    colorIndicador = "#00cc66";
    colorDisplay = "#00ffcc";
    }
    
    // Actualizar gradiente del agua
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
    textoNivel.attr("fill", colorDisplay);
    
    return porcentaje;
}

// Inicializar con el valor inicial
actualizar(valorInicial);
return actualizar;
}

// ===================== GAUGE VERTICAL (Oxígeno %) =====================
function gaugeO2(containerId, initial) {
const container = d3.select(containerId);
container.html("");

const width = 280;
const height = 420;
const min = 18.0;
const max = 23.0;

const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

// Paleta de verdes
const greenPalette = {
    light: "#34d399",
    medium: "#10b981",
    dark: "#059669",
    amber: "#f59e0b",
    red: "#dc2626"
};

// outer frame
const frameX = 50;
const frameY = 40;
const frameW = 180;
const frameH = 300;

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
    .attr("y", frameY + frameH + 35)
    .attr("fill", greenPalette.light)
    .attr("font-size", "22px")
    .attr("font-weight", "700")
    .attr("text-anchor", "middle")
    .text(initial.toFixed(2) + " %");

// Indicador de calidad
const qualityText = svg.append("text")
    .attr("x", width/2)
    .attr("y", frameY + frameH + 60)
    .attr("fill", greenPalette.medium)
    .attr("font-size", "14px")
    .attr("font-weight", "600")
    .attr("text-anchor", "middle")
    .text(getQualityText(initial));

// Marcas de escala
for (let i = min; i <= max; i += 1) {
    if (i % 2 === 0) {
    const y = scale(i);
    svg.append("line")
        .attr("x1", frameX - 5)
        .attr("x2", frameX)
        .attr("y1", y)
        .attr("y2", y)
        .attr("stroke", greenPalette.dark)
        .attr("stroke-width", 1);
    
    if (i % 4 === 0) {
        svg.append("text")
        .attr("x", frameX - 10)
        .attr("y", y + 4)
        .attr("fill", greenPalette.dark)
        .attr("font-size", "10px")
        .attr("text-anchor", "end")
        .text(i + "%");
    }
    }
}

function colorFor(v) {
    if (v >= 21.0) return greenPalette.light;
    if (v >= 19.5) return greenPalette.amber;
    return greenPalette.red;
}

function getQualityText(v) {
    if (v >= 21.0) return "ÓPTIMO";
    if (v >= 19.5) return "ACEPTABLE";
    return "¡BAJO!";
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

// ===================== GAUGE VERTICAL (CO2 ppm) =====================
function gaugeCO2(containerId, initial) {
const container = d3.select(containerId);
container.html("");

const width = 280;
const height = 420;

const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

// outer frame
const frameX = 50;
const frameY = 40;
const frameW = 180;
const frameH = 300;

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
    .attr("y", frameY + frameH + 35)
    .attr("fill", "#ffb74d")
    .attr("font-size", "22px")
    .attr("font-weight", "700")
    .attr("text-anchor", "middle")
    .text(initial + " ppm");

// Marcas de escala
for (let i = min; i <= max; i += 500) {
    const y = scale(i);
    svg.append("line")
    .attr("x1", frameX - 5)
    .attr("x2", frameX)
    .attr("y1", y)
    .attr("y2", y)
    .attr("stroke", "#ffb74d")
    .attr("stroke-width", 1.5);
    
    svg.append("text")
    .attr("x", frameX - 10)
    .attr("y", y + 4)
    .attr("fill", "#ffb74d")
    .attr("font-size", "10px")
    .attr("text-anchor", "end")
    .text(i);
}

function colorFor(v) {
    if (v < 800) return "#7ef9a3";
    if (v < 1200) return "#ffd86b";
    return "#ff7a7a";
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
    }
};
}

// ===================== GAUGE TERMÓMETRO =====================
function gaugeTemperatura(containerId, initial) {
const container = d3.select(containerId);
container.html("");

const width = 300;
const height = 480;
const min = 0;
const max = 45;

const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

const tempPalette = {
    cold: "#4dabf7",
    cool: "#69db7c",
    warm: "#ffd43b",
    hot: "#ff922b",
    veryHot: "#ff6b6b"
};

// Diseño tipo termómetro
const termometroX = width/2 - 15;
const termometroY = 50;
const termometroH = 340;
const bulboRadio = 30;

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

// Mercurio
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
    .attr("y", termometroY + termometroH + bulboRadio + 90)
    .attr("fill", tempPalette.veryHot)
    .attr("font-size", "24px")
    .attr("font-weight", "700")
    .attr("text-anchor", "middle")
    .text(initial.toFixed(1) + " °C");

// Indicador de nivel
const levelText = svg.append("text")
    .attr("x", width/2)
    .attr("y", termometroY + termometroH + bulboRadio + 120)
    .attr("fill", tempPalette.veryHot)
    .attr("font-size", "14px")
    .attr("font-weight", "600")
    .attr("text-anchor", "middle")
    .text(getTempLevel(initial).level);

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
    
    if (temp % 10 === 0) {
    svg.append("text")
        .attr("x", termometroX - 15)
        .attr("y", y + 4)
        .attr("fill", tempPalette.veryHot)
        .attr("font-size", "10px")
        .attr("text-anchor", "end")
        .text(temp + "°");
    }
}

function colorFor(v) {
    if (v < 16) return tempPalette.cold;
    if (v < 22) return tempPalette.cool;
    if (v < 28) return tempPalette.warm;
    if (v < 32) return tempPalette.hot;
    return tempPalette.veryHot;
}

function getTempLevel(v) {
    if (v < 16) return {level: "FRÍO"};
    if (v < 22) return {level: "FRESCO"};
    if (v < 28) return {level: "CÁLIDO"};
    if (v < 32) return {level: "CALIENTE"};
    return {level: "MUY CALIENTE"};
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

// ===================== GAUGE VERTICAL (HUMEDAD %) =====================
function gaugeHumedad(containerId, initial) {
const container = d3.select(containerId);
container.html("");

const width = 300;
const height = 480;
const min = 0;
const max = 100;

const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

// Marco exterior vertical
const frameX = 50;
const frameY = 50;
const frameW = 200;
const frameH = 340;

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

// Escala
const scale = d3.scaleLinear()
    .domain([min, max])
    .range([frameY + frameH, frameY]);

function colorFor(v) {
    if (v < 30) return "#adb5bd";
    if (v < 40) return "#ffa94d";
    if (v < 60) return "#4dabf7";
    if (v < 70) return "#339af0";
    return "#228be6";
}

function getNivelTexto(v) {
    if (v < 30) return "MUY SECO";
    if (v < 40) return "SECO";
    if (v < 60) return "IDEAL";
    if (v < 70) return "HÚMEDO";
    return "MUY HÚMEDO";
}

// Rectángulo de llenado
const fillRect = svg.append("rect")
    .attr("x", frameX)
    .attr("width", frameW)
    .attr("y", scale(initial))
    .attr("height", Math.max(2, (frameY + frameH) - scale(initial)))
    .attr("fill", colorFor(initial))
    .attr("rx", 12);

// Marcas de escala
for (let i = 0; i <= 100; i += 20) {
    const y = scale(i);
    svg.append("line")
    .attr("x1", frameX - 10)
    .attr("y1", y)
    .attr("x2", frameX)
    .attr("y2", y)
    .attr("stroke", "#4dabf7")
    .attr("stroke-width", 1.5);
    
    svg.append("text")
    .attr("x", frameX - 15)
    .attr("y", y + 4)
    .attr("fill", "#4dabf7")
    .attr("font-size", "11px")
    .attr("font-weight", "500")
    .attr("text-anchor", "end")
    .text(i + "%");
}

// VALOR NUMÉRICO
const valueText = svg.append("text")
    .attr("x", width/2)
    .attr("y", frameY + frameH + 45)
    .attr("fill", colorFor(initial))
    .attr("font-size", "24px")
    .attr("font-weight", "700")
    .attr("text-anchor", "middle")
    .text(initial.toFixed(1) + " %");

// INDICADOR DE NIVEL
const nivelText = svg.append("text")
    .attr("x", width/2)
    .attr("y", frameY + frameH + 75)
    .attr("fill", colorFor(initial))
    .attr("font-size", "14px")
    .attr("font-weight", "600")
    .attr("text-anchor", "middle")
    .text(getNivelTexto(initial));

return {
    update: function(newVal) {
    const y = scale(newVal);
    const h = Math.max(2, (frameY + frameH) - y);
    const newColor = colorFor(newVal);

    fillRect
        .transition()
        .duration(300)
        .attr("y", y)
        .attr("height", h)
        .attr("fill", newColor);

    valueText
        .text(newVal.toFixed(1) + " %")
        .attr("fill", newColor);

    nivelText
        .text(getNivelTexto(newVal))
        .attr("fill", newColor);
    }
};
}

// ===================== SISTEMA PRINCIPAL =====================
// Instancias de gráficos
let tanqueAguaActualizar = null;
let gaugeO2Instancia = null;
let gaugeCO2Instancia = null;
let gaugeTempInstancia = null;
let gaugeHumInstancia = null;

// WebSockets
let wsAgua = null;
let wsO2 = null;
let wsCO2 = null;
let wsTemp = null;
let wsHum = null;

// Conexión status
let connectionStatus = {
agua: false,
oxigeno: false,
co2: false,
temperatura: false,
humedad: false
};

// Tiempos de última actualización
let lastUpdate = {
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
    document.getElementById('last-update').textContent = 
        `Última actualización: ${now.toLocaleTimeString()}`;
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
connectionElement.style.display = 'flex';
connectionElement.className = 'connection-status connected';
connectionElement.innerHTML = '<i class="fas fa-circle"></i><span>Conectando WebSockets...</span>';

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
            
            timeElement.textContent = new Date(fecha).toLocaleTimeString();
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
            
            document.getElementById('temp-time').textContent = 
                new Date(data.fecha_hora).toLocaleTimeString();
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
            
            document.getElementById('humidity-time').textContent = 
                new Date(data.fecha_hora).toLocaleTimeString();
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

qualityElement.textContent = calidad;
qualityElement.style.color = color;

// Usar el timestamp más reciente
const latestTime = new Date(Math.max(
    new Date(lastUpdate.oxigeno || 0),
    new Date(lastUpdate.co2 || 0)
));

if (latestTime.getTime() > 0) {
    timeElement.textContent = latestTime.toLocaleTimeString();
}
}

// Función para agregar alertas al panel
function agregarAlerta(mensaje, tipo = "info") {
const container = document.getElementById('alerts-container');
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
[wsAgua, wsO2, wsCO2, wsTemp, wsHum].forEach(ws => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
    }
});
});

// Debug: Verificar si hay errores en la consola
window.addEventListener('error', function(e) {
console.error("Error global detectado:", e.error);
});