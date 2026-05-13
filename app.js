// 1. CONFIGURACIÓN
const SUPABASE_URL = 'https://wymfzcomfmmuobmqtkzc.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_fmsMMmMpRjw2uA7vEjblIQ_CQbjvc0O';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let db = {
    cuentas: { efectivo: 0, banco: 0 },
    historial: [],
    ramosPrecios: [3, 5, 10, 12, 15, 20, 25, 30],
    inventario: {}
};

let ramoSeleccionado = null;

// --- FUNCIONES GLOBALES (Solución a ReferenceError) ---

window.openTab = function(name) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(name).classList.add('active');
    if(event) event.currentTarget.classList.add('active');
};

window.seleccionarRamo = function(precio, el) {
    ramoSeleccionado = precio;
    document.querySelectorAll('.ramo-item').forEach(i => i.classList.remove('selected'));
    if(el) el.classList.add('selected');
    document.getElementById('confirmacionVenta').style.display = 'flex';
    document.getElementById('tituloRamoSeleccionado').innerText = `Ramo de $${precio}`;
};

window.confirmarVenta = async function() {
    const efe = parseFloat(document.getElementById('cantEfectivo').value) || 0;
    const ban = parseFloat(document.getElementById('cantBanco').value) || 0;
    
    if (Math.abs((efe + ban) - ramoSeleccionado) > 0.01) {
        alert(`Error: La suma debe ser exactamente $${ramoSeleccionado}`);
        return;
    }

    db.cuentas.efectivo += efe;
    db.cuentas.banco += ban;
    addHist('VENTA', `Ramo $${ramoSeleccionado}`, ramoSeleccionado, efe > 0 && ban > 0 ? 'mixto' : (efe > 0 ? 'efectivo' : 'banco'));
    
    window.cancelarVenta();
    await save();
};

window.cancelarVenta = function() {
    document.getElementById('confirmacionVenta').style.display = 'none';
    document.querySelectorAll('.ramo-item').forEach(i => i.classList.remove('selected'));
};

window.registrarGastoRapido = async function() {
    const desc = document.getElementById('descGasto').value;
    const monto = parseFloat(document.getElementById('montoGasto').value);
    const cuenta = document.getElementById('cuentaGasto').value;

    if(!desc || !monto) return;

    db.cuentas[cuenta] -= monto;
    addHist('GASTO', desc, monto, cuenta);
    await save();
    alert("Gasto registrado");
};

// --- LÓGICA DE DATOS ---

async function cargarDatos() {
    let { data } = await _supabase.from('datos_floreria').select('contenido').eq('id', 1).single();
    if (data) {
        db = data.contenido;
        render();
    }
}

async function save() {
    await _supabase.from('datos_floreria').upsert({ id: 1, contenido: db });
    render();
}

function addHist(tipo, desc, monto, cuenta) {
    db.historial.unshift({ f: new Date().toLocaleString(), tipo, desc, monto, cuenta });
}

function render() {
    // Balances
    document.getElementById('balEfectivo').innerText = `$${db.cuentas.efectivo.toFixed(2)}`;
    document.getElementById('balBanco').innerText = `$${db.cuentas.banco.toFixed(2)}`;

    // Ramos
    const grid = document.getElementById('gridRamos');
    grid.innerHTML = db.ramosPrecios.map(p => 
        `<div class="ramo-item" onclick="window.seleccionarRamo(${p}, this)">$${p}</div>`
    ).join('');

    // Inventario
    const lista = document.getElementById('listaInventario');
    lista.innerHTML = Object.keys(db.inventario).map(k => 
        `<tr><td>${k}</td><td>${db.inventario[k]}</td><td><button onclick="eliminar('${k}')">X</button></td></tr>`
    ).join('');

    // Historial
    const histDiv = document.getElementById('listaHistorial');
    histDiv.innerHTML = db.historial.slice(0,10).map(h => 
        `<div style="border-bottom:1px solid #eee; padding:5px;">
            ${h.f} - <b>${h.tipo}</b>: ${h.desc} ($${h.monto})
        </div>`
    ).join('');
}

// Iniciar
cargarDatos();
