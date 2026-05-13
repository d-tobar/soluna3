// 1. CONFIGURACIÓN DE SUPABASE
const SUPABASE_URL = 'https://wymfzcomfmmuobmqtkzc.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_fmsMMmMpRjw2uA7vEjblIQ_CQbjvc0O';

// Corregido: Usamos _supabase para evitar el error 'already declared' de image_db5ee2.png
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Objeto global de datos (Estado inicial)
let db = {
    cuentas: { efectivo: 0, banco: 0 },
    historial: [],
    ramosPrecios: [3, 5, 10, 12, 15, 20, 25, 30],
    tiposFlores: ["Rosas", "Girasoles", "Lirios"],
    inventario: {}
};

let ramoSeleccionado = null;

// --- FUNCIONES DE SINCRONIZACIÓN ---

async function cargarDatos() {
    try {
        let { data, error } = await _supabase
            .from('datos_floreria')
            .select('contenido')
            .eq('id', 1)
            .single();

        if (data) {
            db = data.contenido;
            render();
        } else {
            console.log("No hay datos en la nube, inicializando...");
            await save(); 
        }
    } catch (e) {
        console.error("Error cargando datos:", e);
    }
}

async function save() {
    try {
        const { error } = await _supabase
            .from('datos_floreria')
            .upsert({ id: 1, contenido: db });

        if (error) throw error;
        render();
    } catch (e) {
        console.error("Error al guardar en la nube:", e.message);
    }
}

// --- LÓGICA DE NAVEGACIÓN ---

function openTab(name) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(name).classList.add('active');
    if(event) event.currentTarget.classList.add('active');
}

// --- LÓGICA DE VENTAS ---

function seleccionarRamo(precio, el) {
    ramoSeleccionado = precio;
    document.querySelectorAll('.ramo-item').forEach(i => i.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('confirmacionVenta').style.display = 'flex';
    document.getElementById('tituloRamoSeleccionado').innerText = `Ramo de $${precio}`;
}

async function confirmarVenta() {
    const efe = parseFloat(document.getElementById('cantEfectivo').value) || 0;
    const ban = parseFloat(document.getElementById('cantBanco').value) || 0;
    
    if ((efe + ban) !== ramoSeleccionado) {
        alert(`La suma debe ser exactamente $${ramoSeleccionado}`);
        return;
    }

    db.cuentas.efectivo += efe;
    db.cuentas.banco += ban;
    
    addHist('VENTA', `Ramo $${ramoSeleccionado}`, ramoSeleccionado, efe > 0 && ban > 0 ? 'mixto' : (efe > 0 ? 'efectivo' : 'banco'));
    
    document.getElementById('cantEfectivo').value = 0;
    document.getElementById('cantBanco').value = 0;
    cancelarVenta(); 
    await save();
}

function cancelarVenta() {
    document.getElementById('confirmacionVenta').style.display = 'none';
    document.querySelectorAll('.ramo-item').forEach(i => i.classList.remove('selected'));
}

// --- GESTIÓN DE GASTOS E INVENTARIO ---

async function registrarGasto(tipo) {
    let d = "", $ = 0, c = "efectivo", cat = "INVERSIÓN";
    
    if(tipo === 'nuevo_producto') {
        const nom = document.getElementById('nombreNuevoInv').value.trim();
        const cant = parseInt(document.getElementById('cantNuevoInv').value);
        $ = parseFloat(document.getElementById('costoNuevoInv').value);
        c = document.getElementById('cuentaNuevoInv').value;
        if(!nom || isNaN(cant)) return;
        db.inventario[nom] = (db.inventario[nom] || 0) + cant;
        d = `Stock: ${nom} (+${cant})`;
    } else if(tipo === 'gasto_vario') {
        d = document.getElementById('descVario').value;
        $ = parseFloat(document.getElementById('costoVario').value);
        c = document.getElementById('cuentaVario').value;
        cat = "GASTO";
    }

    if($ > 0) {
        db.cuentas[c] -= $;
        addHist(cat, d, $, c);
        await save();
        alert("Registrado correctamente");
    }
}

function addHist(tipo, desc, monto, cuenta) {
    db.historial.unshift({ 
        t: Date.now(), 
        f: new Date().toLocaleString(), 
        tipo, 
        desc, 
        monto, 
        cuenta 
    });
}

// --- RENDERIZADO DE INTERFAZ ---

function render() {
    // Dibujar botones de Ramos
    const grid = document.getElementById('gridRamos');
    if(grid) {
        grid.innerHTML = db.ramosPrecios.map(p => 
            `<div class="ramo-item" onclick="seleccionarRamo(${p}, this)">$${p}</div>`
        ).join('');
    }

    // Dibujar Inventario
    const listInv = document.getElementById('listaInventario');
    if(listInv) {
        listInv.innerHTML = "";
        for(let k in db.inventario) {
            listInv.innerHTML += `<tr><td>${k}</td><td>${db.inventario[k]}</td><td><button class="btn-small" onclick="eliminarItem('${k}')">Borrar</button></td></tr>`;
        }
    }

    // Actualizar Balances
    document.getElementById('balEfectivo').innerText = `$${db.cuentas.efectivo.toFixed(2)}`;
    document.getElementById('balBanco').innerText = `$${db.cuentas.banco.toFixed(2)}`;
    document.getElementById('balTotal').innerText = `$${(db.cuentas.efectivo + db.cuentas.banco).toFixed(2)}`;

    // Dibujar Historial
    const hist = document.getElementById('listaHistorial');
    if(hist) {
        hist.innerHTML = db.historial.slice(0, 20).map(h => `
            <tr>
                <td>${h.f.split(',')[0]}</td>
                <td class="tipo-${h.tipo}">${h.tipo}</td>
                <td>${h.desc}</td>
                <td>$${h.monto.toFixed(2)}</td>
                <td>${h.cuenta.toUpperCase()}</td>
            </tr>
        `).join('');
    }
}

async function eliminarItem(key) {
    if(confirm(`¿Eliminar ${key} del inventario?`)) {
        delete db.inventario[key];
        await save();
    }
}

// Iniciar aplicación
cargarDatos();
