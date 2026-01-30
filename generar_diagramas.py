# generar_diagramas_matplotlib.py
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import networkx as nx

def crear_diagrama_arquitectura():
    # Crear un grafo dirigido
    G = nx.DiGraph()
    
    # Agregar nodos (componentes del sistema)
    nodos = [
        ("App Android", {"color": "lightblue", "shape": "ellipse"}),
        ("API Django", {"color": "lightgreen", "shape": "box"}),
        ("Base de Datos", {"color": "orange", "shape": "cylinder"}),
        ("Dashboard Web", {"color": "lightpink", "shape": "box"}),
        ("Archivos CSV", {"color": "lightyellow", "shape": "box"}),
    ]
    
    for nodo, atributos in nodos:
        G.add_node(nodo, **atributos)
    
    # Agregar conexiones (edges)
    conexiones = [
        ("App Android", "API Django", "HTTP/JSON\nPOST /save/"),
        ("API Django", "Base de Datos", "ORM Django"),
        ("Base de Datos", "Dashboard Web", "Datos para gráficos"),
        ("API Django", "Archivos CSV", "Generación CSV"),
        ("Dashboard Web", "API Django", "AJAX Requests"),
    ]
    
    for origen, destino, label in conexiones:
        G.add_edge(origen, destino, label=label)
    
    # Posicionamiento de los nodos (usando un layout manual para mejor control)
    pos = {
        "App Android": (0, 2),
        "API Django": (2, 2),
        "Base de Datos": (4, 3),
        "Dashboard Web": (4, 1),
        "Archivos CSV": (2, 0),
    }
    
    # Dibujar el grafo
    plt.figure(figsize=(12, 8))
    
    # Dibujar nodos con formas personalizadas (aproximadas)
    node_colors = [G.nodes[nodo]['color'] for nodo in G.nodes()]
    node_shapes = [G.nodes[nodo]['shape'] for nodo in G.nodes()]
    
    # Para cada nodo, dibujar la forma correspondiente
    for nodo, (x, y) in pos.items():
        color = G.nodes[nodo]['color']
        shape = G.nodes[nodo]['shape']
        
        if shape == 'ellipse':
            node_shape = mpatches.Ellipse((x, y), width=1.5, height=0.8, 
            facecolor=color, edgecolor='black', linewidth=2)
        elif shape == 'cylinder':
            # Dibujar un cilindro aproximado
            node_shape = mpatches.Rectangle((x-0.75, y-0.4), 1.5, 0.8, 
                                            facecolor=color, edgecolor='black', linewidth=2)
            # Parte superior del cilindro (elipse)
            top = mpatches.Ellipse((x, y+0.4), width=1.5, height=0.3, 
            facecolor=color, edgecolor='black', linewidth=2)
            plt.gca().add_patch(top)
        else:  # box
            node_shape = mpatches.Rectangle((x-0.75, y-0.4), 1.5, 0.8, 
                                            facecolor=color, edgecolor='black', linewidth=2)
        
        plt.gca().add_patch(node_shape)
        plt.text(x, y, nodo, ha='center', va='center', fontsize=10, fontweight='bold')
    
    # Dibujar las conexiones
    for origen, destino, label in conexiones:
        x1, y1 = pos[origen]
        x2, y2 = pos[destino]
        
        # Ajustar el punto de conexión para que no esté en el centro del nodo
        # Esto es una aproximación simple
        dx = x2 - x1
        dy = y2 - y1
        distancia = (dx**2 + dy**2)**0.5
        
        if distancia > 0:
            x1_con = x1 + (dx * 0.75) / distancia
            y1_con = y1 + (dy * 0.75) / distancia
            x2_con = x2 - (dx * 0.75) / distancia
            y2_con = y2 - (dy * 0.75) / distancia
        else:
            x1_con, y1_con = x1, y1
            x2_con, y2_con = x2, y2
        
        # Dibujar la flecha
        plt.arrow(x1_con, y1_con, x2_con - x1_con, y2_con - y1_con,
            head_width=0.05, head_length=0.1, fc='black', ec='black',
            length_includes_head=True, width=0.002)
        
        # Etiqueta de la conexión
        mid_x = (x1_con + x2_con) / 2
        mid_y = (y1_con + y2_con) / 2
        
        # Ajustar la posición de la etiqueta para que no se superponga
        offset_x = 0
        offset_y = 0
        if abs(dy) < 0.5:  # conexión casi horizontal
            offset_y = -0.2
        else:
            offset_x = 0.2
        
        plt.text(mid_x + offset_x, mid_y + offset_y, label, 
            fontsize=8, ha='center', va='center',
            bbox=dict(boxstyle="round,pad=0.3", facecolor="white", alpha=0.7))

    plt.title("Arquitectura del Sistema HealthSync Pro", fontsize=16, fontweight='bold')
    plt.axis('equal')
    plt.axis('off')
    plt.tight_layout()
    
    # Guardar la figura
    plt.savefig('diagrama_arquitectura.png', dpi=300, bbox_inches='tight')
    plt.show()
    print("✅ Diagrama de arquitectura generado: diagrama_arquitectura.png")

def crear_diagrama_flujo():
    # Crear un nuevo grafo para el flujo de datos
    G = nx.DiGraph()
    
    # Nodos del flujo
    nodos_flujo = [
        ("Captura Android", 1, 4),
        ("Almacenamiento Local", 2, 4),
        ("Verificar Conexión", 3, 4),
        ("Enviar a API", 4, 3),
        ("Validar Token", 4, 2),
        ("Procesar Datos", 4, 1),
        ("Guardar en BD", 5, 1),
        ("Generar CSV", 5, 2),
        ("Actualizar Web", 5, 3),
        ("Respuesta API", 3, 2),
        ("Marcar Sincronizado", 2, 2),
        ("Sincronización Completa", 1, 2),
    ]
    
    for nodo, x, y in nodos_flujo:
        G.add_node(nodo, pos=(x, y))
    
    # Conexiones del flujo
    conexiones_flujo = [
        ("Captura Android", "Almacenamiento Local", "1. Guardar local"),
        ("Almacenamiento Local", "Verificar Conexión", "2. Preparar sync"),
        ("Verificar Conexión", "Enviar a API", "✅ Online"),
        ("Verificar Conexión", "Sincronización Completa", "❌ Offline"),
        ("Enviar a API", "Validar Token", "3. Autenticación"),
        ("Validar Token", "Procesar Datos", "✅ Token válido"),
        ("Validar Token", "Respuesta API", "❌ Token inválido"),
        ("Procesar Datos", "Guardar en BD", "4. Guardar en BD"),
        ("Guardar en BD", "Generar CSV", "5. Generar backup"),
        ("Guardar en BD", "Actualizar Web", "6. Actualizar web"),
        ("Generar CSV", "Respuesta API", "7. Preparar respuesta"),
        ("Actualizar Web", "Respuesta API", ""),
        ("Respuesta API", "Marcar Sincronizado", "✅ Éxito (201)"),
        ("Marcar Sincronizado", "Sincronización Completa", "8. Completar"),
    ]
    
    for origen, destino, label in conexiones_flujo:
        G.add_edge(origen, destino, label=label)
    
    # Dibujar el flujo
    plt.figure(figsize=(14, 10))
    
    pos = nx.get_node_attributes(G, 'pos')
    
    # Dibujar nodos
    node_colors = []
    for nodo in G.nodes():
        if "Android" in nodo or "Local" in nodo:
            node_colors.append('lightblue')
        elif "API" in nodo or "Token" in nodo:
            node_colors.append('lightgreen')
        elif "BD" in nodo or "CSV" in nodo:
            node_colors.append('orange')
        elif "Web" in nodo:
            node_colors.append('lightpink')
        elif "Completa" in nodo:
            node_colors.append('lightgray')
        else:
            node_colors.append('white')
    
    nx.draw_networkx_nodes(G, pos, node_color=node_colors, 
        node_size=3000, edgecolors='black', 
        node_shape='s', alpha=0.8)

    # Dibujar etiquetas de nodos
    nx.draw_networkx_labels(G, pos, font_size=9, font_weight='bold')
    
    # Dibujar conexiones
    nx.draw_networkx_edges(G, pos, arrowstyle='->', 
        arrowsize=20, edge_color='gray', 
        width=2, connectionstyle="arc3,rad=0.1")
    
    # Etiquetas de las conexiones
    edge_labels = nx.get_edge_attributes(G, 'label')
    nx.draw_networkx_edge_labels(G, pos, edge_labels, font_size=7)
    
    plt.title("Flujo de Sincronización - HealthSync Pro", fontsize=16, fontweight='bold')
    plt.axis('off')
    plt.tight_layout()
    
    # Guardar la figura
    plt.savefig('diagrama_flujo.png', dpi=300, bbox_inches='tight')
    plt.show()
    print("✅ Diagrama de flujo generado: diagrama_flujo.png")

if __name__ == "__main__":
    print("🖼️ Generando diagramas con matplotlib...")
    crear_diagrama_arquitectura()
    crear_diagrama_flujo()
    print("\n🎉 Diagramas generados exitosamente!")
    print("📊 Archivos creados:")
    print("   • diagrama_arquitectura.png")
    print("   • diagrama_flujo.png")