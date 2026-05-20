// ============================================
// GRÁFICAS PARA NASA TLX Y ZUNG
// ============================================

// Tooltip global
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "d3-tooltip")
    .style("opacity", 0);

// ========== 1. GRÁFICA NASA TLX (LÍNEA) ==========
function dibujarGraficaTLX(data, elementId) {
    const container = document.getElementById(elementId);
    if (!container || !data || data.length === 0) {
        if (container) container.innerHTML = '<div class="alert alert-info text-center">No hay datos suficientes para mostrar la gráfica</div>';
        return;
    }
    
    container.innerHTML = '';
    
    const margin = { top: 50, right: 30, bottom: 60, left: 60 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = d3.select(`#${elementId}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    const x = d3.scalePoint()
        .domain(data.map(d => d.fecha))
        .range([0, width])
        .padding(0.5);
    
    const y = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);
    
    const line = d3.line()
        .x(d => x(d.fecha))
        .y(d => y(d.puntuacion))
        .curve(d3.curveMonotoneX);
    
    const area = d3.area()
        .x(d => x(d.fecha))
        .y0(y(0))
        .y1(d => y(d.puntuacion))
        .curve(d3.curveMonotoneX);
    
    svg.append("path")
        .datum(data)
        .attr("d", area)
        .attr("fill", "rgba(13, 202, 240, 0.1)")
        .attr("stroke", "none");
    
    svg.append("path")
        .datum(data)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "rgb(13, 202, 240)")
        .attr("stroke-width", 3);
    
    svg.selectAll(".dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.fecha))
        .attr("cy", d => y(d.puntuacion))
        .attr("r", 6)
        .attr("fill", "rgb(13, 202, 240)")
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("r", 10);
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`<strong>${d.fecha_display}</strong><br/>Puntuación: ${d.puntuacion}<br/>Nivel: ${d.nivel}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 6);
            tooltip.transition().duration(500).style("opacity", 0);
        });
    
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickFormat(d => {
            const item = data.find(item => item.fecha === d);
            return item ? item.fecha_display : d;
        }))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .attr("dx", "-0.8em")
        .attr("dy", "0.15em")
        .style("font-size", "11px");
    
    svg.append("g").call(d3.axisLeft(y).ticks(10));
    
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .style("fill", "#6c757d")
        .style("font-size", "12px")
        .text("Fecha de evaluación");
    
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .style("fill", "#6c757d")
        .style("font-size", "12px")
        .text("Puntuación TLX (0-100)");
}

// ========== 2. GRÁFICA RADAR DIMENSIONES TLX ==========
function dibujarRadarTLX(data, elementId) {
    const container = document.getElementById(elementId);
    if (!container || !data || data.length === 0) {
        if (container) container.innerHTML = '<div class="alert alert-info text-center">No hay datos suficientes para mostrar la gráfica radar</div>';
        return;
    }
    
    container.innerHTML = '';
    
    const width = Math.min(container.clientWidth, 550);
    const height = 480;
    const radius = Math.min(width, height) / 2.2;
    
    const svg = d3.select(`#${elementId}`)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("display", "block")
        .style("margin", "0 auto")
        .append("g")
        .attr("transform", `translate(${width/2},${height/2})`);
    
    const angleSlice = Math.PI * 2 / data.length;
    
    // Escala automática
    const valores = data.map(d => d.valor);
    const minValor = Math.min(...valores);
    const maxValor = Math.max(...valores);
    const margen = (maxValor - minValor) * 0.2;
    let rangoMin = Math.max(0, Math.floor(minValor - margen));
    let rangoMax = Math.min(100, Math.ceil(maxValor + margen));
    
    const rScale = d3.scaleLinear()
        .domain([rangoMin, rangoMax])
        .range([30, radius - 25]);
    
    // Círculos de fondo
    const niveles = [rangoMin, Math.round((rangoMin + rangoMax)/2), rangoMax];
    niveles.forEach(nivel => {
        const r = rScale(nivel);
        svg.append("circle")
            .attr("r", r)
            .attr("fill", "none")
            .attr("stroke", "#ddd")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4,4");
        
        svg.append("text")
            .attr("x", r + 5)
            .attr("y", -5)
            .style("font-size", "10px")
            .style("fill", "#999")
            .text(nivel);
    });
    
    // Ejes radiales
    data.forEach((d, i) => {
        const angle = i * angleSlice;
        const x = radius * Math.cos(angle - Math.PI/2);
        const y = radius * Math.sin(angle - Math.PI/2);
        
        svg.append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", x)
            .attr("y2", y)
            .attr("stroke", "#ccc")
            .attr("stroke-width", 1);
    });
    
    // Etiquetas de dimensiones
    const abbr = {
        'Demanda Mental': 'Mental',
        'Demanda Física': 'Física',
        'Demanda Temporal': 'Temporal',
        'Rendimiento': 'Rend.',
        'Esfuerzo': 'Esf.',
        'Frustración': 'Frust.'
    };
    
    data.forEach((d, i) => {
        const angle = i * angleSlice;
        const labelRadius = radius + 12;
        const x = labelRadius * Math.cos(angle - Math.PI/2);
        const y = labelRadius * Math.sin(angle - Math.PI/2);
        
        svg.append("text")
            .attr("x", x)
            .attr("y", y)
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .style("fill", "#333")
            .text(abbr[d.dimension] || d.dimension);
    });
    
    // Polígono de datos
    const puntos = data.map((d, i) => {
        const angle = i * angleSlice - Math.PI/2;
        const r = rScale(d.valor);
        return {
            x: r * Math.cos(angle),
            y: r * Math.sin(angle),
            valor: d.valor,
            dimension: d.dimension
        };
    });
    
    for (let i = 0; i < puntos.length; i++) {
        const p1 = puntos[i];
        const p2 = puntos[(i + 1) % puntos.length];
        
        svg.append("line")
            .attr("x1", p1.x)
            .attr("y1", p1.y)
            .attr("x2", p2.x)
            .attr("y2", p2.y)
            .attr("stroke", "#0d6efd")
            .attr("stroke-width", 3)
            .attr("stroke-linejoin", "round");
    }
    
    let pathData = '';
    puntos.forEach((p, i) => {
        if (i === 0) pathData += `M ${p.x} ${p.y}`;
        else pathData += ` L ${p.x} ${p.y}`;
    });
    pathData += ' Z';
    
    svg.append("path")
        .attr("d", pathData)
        .attr("fill", "rgba(13, 110, 253, 0.15)")
        .attr("stroke", "none");
    
    // Puntos interactivos
    puntos.forEach(p => {
        svg.append("circle")
            .attr("cx", p.x)
            .attr("cy", p.y)
            .attr("r", 10)
            .attr("fill", "rgba(13, 110, 253, 0.2)")
            .attr("stroke", "none");
        
        svg.append("circle")
            .attr("cx", p.x)
            .attr("cy", p.y)
            .attr("r", 7)
            .attr("fill", "#0d6efd")
            .attr("stroke", "white")
            .attr("stroke-width", 2)
            .attr("cursor", "pointer")
            .on("mouseover", function(event) {
                d3.select(this).attr("r", 10);
                tooltip.transition().duration(200).style("opacity", 0.9);
                tooltip.html(`<strong>${p.dimension}</strong><br/>Valor: ${p.valor}/100`)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 35) + "px");
            })
            .on("mouseout", function() {
                d3.select(this).attr("r", 7);
                tooltip.transition().duration(500).style("opacity", 0);
            });
        
        const valorColor = p.valor >= 70 ? "#dc3545" : p.valor >= 40 ? "#fd7e14" : "#198754";
        svg.append("text")
            .attr("x", p.x)
            .attr("y", p.y - 10)
            .attr("text-anchor", "middle")
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .style("fill", valorColor)
            .style("stroke", "white")
            .style("stroke-width", "1.5px")
            .style("paint-order", "stroke")
            .text(p.valor);
    });
    
    // Indicador de zoom
    svg.append("text")
        .attr("x", radius - 15)
        .attr("y", radius - 10)
        .attr("text-anchor", "end")
        .style("font-size", "9px")
        .style("fill", "#aaa")
        .style("font-style", "italic")
        .text(`zoom: ${rangoMin}-${rangoMax}`);
}

// ========== 3. GRÁFICA ZUNG (LÍNEA) ==========
function dibujarGraficaZung(data, elementId) {
    const container = document.getElementById(elementId);
    if (!container || !data || data.length === 0) {
        if (container) container.innerHTML = '<div class="alert alert-info text-center">No hay datos suficientes para mostrar la gráfica</div>';
        return;
    }
    
    container.innerHTML = '';
    
    const margin = { top: 60, right: 30, bottom: 60, left: 60 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = d3.select(`#${elementId}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    const x = d3.scalePoint()
        .domain(data.map(d => d.fecha))
        .range([0, width])
        .padding(0.5);
    
    const y = d3.scaleLinear()
        .domain([20, 100])
        .range([height, 0]);
    
    // Zonas de color
    svg.append("rect")
        .attr("x", 0)
        .attr("y", y(75))
        .attr("width", width)
        .attr("height", y(20) - y(75))
        .attr("fill", "rgba(220, 53, 69, 0.1)");
    
    svg.append("rect")
        .attr("x", 0)
        .attr("y", y(60))
        .attr("width", width)
        .attr("height", y(75) - y(60))
        .attr("fill", "rgba(255, 193, 7, 0.1)");
    
    svg.append("rect")
        .attr("x", 0)
        .attr("y", y(45))
        .attr("width", width)
        .attr("height", y(60) - y(45))
        .attr("fill", "rgba(25, 135, 84, 0.1)");
    
    const line = d3.line()
        .x(d => x(d.fecha))
        .y(d => y(d.indice))
        .curve(d3.curveMonotoneX);
    
    const area = d3.area()
        .x(d => x(d.fecha))
        .y0(y(20))
        .y1(d => y(d.indice))
        .curve(d3.curveMonotoneX);
    
    svg.append("path")
        .datum(data)
        .attr("d", area)
        .attr("fill", "rgba(220, 53, 69, 0.1)");
    
    svg.append("path")
        .datum(data)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "rgb(220, 53, 69)")
        .attr("stroke-width", 3);
    
    svg.selectAll(".dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.fecha))
        .attr("cy", d => y(d.indice))
        .attr("r", 6)
        .attr("fill", "rgb(220, 53, 69)")
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("r", 10);
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`<strong>${d.fecha_display}</strong><br/>Índice: ${d.indice}<br/>Nivel: ${d.nivel}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 6);
            tooltip.transition().duration(500).style("opacity", 0);
        });
    
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickFormat(d => {
            const item = data.find(item => item.fecha === d);
            return item ? item.fecha_display : d;
        }))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .attr("dx", "-0.8em")
        .attr("dy", "0.15em")
        .style("font-size", "11px");
    
    svg.append("g").call(d3.axisLeft(y).ticks(10));
    
    // Líneas de referencia
    const niveles = [
        { y: 44, label: "Normal", color: "#198754" },
        { y: 59, label: "Mínima a moderada", color: "#ffc107" },
        { y: 74, label: "Marcada a severa", color: "#dc3545" }
    ];
    
    niveles.forEach(n => {
        svg.append("line")
            .attr("x1", 0)
            .attr("y1", y(n.y))
            .attr("x2", width)
            .attr("y2", y(n.y))
            .attr("stroke", n.color)
            .attr("stroke-dasharray", "4,4")
            .attr("stroke-width", 1.5);
    });
    
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .style("fill", "#6c757d")
        .style("font-size", "12px")
        .text("Fecha de evaluación");
    
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .style("fill", "#6c757d")
        .style("font-size", "12px")
        .text("Índice de Ansiedad Zung (25-100)");
}

// Función para redimensionar
function resizeCharts(dataTlx, dataRadar, dataZung) {
    window.addEventListener('resize', function() {
        if (dataTlx && dataTlx.length > 0) dibujarGraficaTLX(dataTlx, "grafica-tlx");
        if (dataRadar && dataRadar.length > 0) dibujarRadarTLX(dataRadar, "grafica-radar-tlx");
        if (dataZung && dataZung.length > 0) dibujarGraficaZung(dataZung, "grafica-zung");
    });
}