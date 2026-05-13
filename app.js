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

// --- FUNCIONES GLOBALES ---

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
        alert(`La suma debe ser $${ramoSeleccionado}`);
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

window.registrarSalida = async function(tipo) {
    const idDesc = tipo === 'INVERSIÓN' ? 'descInversion' : 'descGasto';
    const idMonto = tipo === 'INVERSIÓN' ? 'montoInversion' : 'montoGasto';
    const idCuenta = tipo === 'INVERSIÓN' ? 'cuentaInversion' : 'cuentaGasto';

    const desc = document.getElementById(idDesc).value;
    const monto = parseFloat(document.getElementById(idMonto).value);
    const cuenta = document.getElementById(idCuenta).value;

    if (!desc || isNaN(monto)) {
        alert("Por favor completa los datos");
        return;
    }

    db.cuentas[cuenta] -= monto;
    addHist(tipo, desc, monto, cuenta);
    
    // Limpiar campos
    document.getElementById(idDesc).value = "";
    document.getElementById(idMonto).value = "";
    
    await save();
    alert(tipo + " registrado correctamente");
};

// --- PERSISTENCIA Y RENDER ---

async function cargarDatos() {
    const { data } = await _supabase.from('datos_floreria').select('contenido').eq('id', 1).single();
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
    document.getElementById('balEfectivo').innerText = `$${db.cuentas.efectivo.toFixed(2)}`;
    document.getElementById('balBanco').innerText = `$${db.cuentas.banco.toFixed(2)}`;

    const grid = document.getElementById('gridRamos');
    grid.innerHTML = db.ramosPrecios.map(p => 
        `<div class="ramo-item" onclick="window.seleccionarRamo(${p}, this)">$${p}</div>`
    ).join('');

    const histDiv = document.getElementById('listaHistorial');
    histDiv.innerHTML = db.historial.slice(0, 15).map(h => 
        `<div style="margin-bottom:5px; border-bottom:1px solid #eee">
            ${h.f.split(',')[0]} - <b>${h.tipo}</b>: ${h.desc} ($${h.monto}) [${h.cuenta}]
        </div>`
    ).join('');
}

cargarDatos();
