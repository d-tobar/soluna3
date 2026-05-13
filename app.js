// 1. CONFIGURACIÓN DE SUPABASE
const SUPABASE_URL = 'https://wymfzcomfmmuobmqtkzc.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_fmsMMmMpRjw2uA7vEjblIQ_CQbjvc0O';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Objeto global de datos
let db = {
    cuentas: { efectivo: 0, banco: 0 },
    historial: [],
    ramosPrecios: [3, 5, 10, 12, 15, 20, 25, 30],
    inventario: {},
    totales: { ventas: 0, gastos: 0 }
};

let ramoSeleccionado = null;

// --- FUNCIONES DE SINCRONIZACIÓN ---
async function cargarDatos() {
    try {
        let { data, error } = await _supabase.from('datos_floreria').select('contenido').eq('id', 1).single();
        if (data) {
            db = data.contenido;
            if(!db.totales) db.totales = { ventas: 0, gastos: 0 };
            render();
        } else {
            await save(); 
        }
    } catch (e) { console.error("Error al cargar:", e); }
}

async function save() {
    try {
        await _supabase.from('datos_floreria').upsert({ id: 1, contenido: db });
        render();
    } catch (e) { console.error("Error al guardar:", e.message); }
}

// --- NAVEGACIÓN (Corrige error openTab de image_dad3bb.png) ---
window.openTab = function(name) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(name);
    if(target) target.classList.add('active');
    if(event) event.currentTarget.classList.add('active');
};

// --- VENTAS (Corrige error seleccionarRamo de image_dad3bb.png) ---
window.seleccionarRamo = function(precio, el) {
    ramoSeleccionado = precio;
    document.querySelectorAll('.ramo-item').forEach(i => i.classList.remove('selected'));
    if(el) el.classList.add('selected');
    
    const modal = document.getElementById('confirmacionVenta');
    if(modal) {
        modal.style.display = 'flex';
        document.getElementById('tituloRamoSeleccionado').innerText = `Ramo de $${precio}`;
    }
};

window.confirmarVenta = async function() {
    const efe = parseFloat(document.getElementById('cantEfectivo').value) || 0;
    const ban = parseFloat(document.getElementById('cantBanco').value) || 0;
    
    // CORRECCIÓN: Validación por precio total del ramo
    if (Math.abs((efe + ban) - ramoSeleccionado) > 0.01) {
        alert(`La suma debe ser exactamente $${ramoSeleccionado}`);
        return;
    }

    db.cuentas.efectivo += efe;
    db.cuentas.banco += ban;
    db.totales.ventas += ramoSeleccionado; // Se refleja en apartado ventas
    
    addHist('VENTA', `Ramo $${ramoSeleccionado}`, ramoSeleccionado, efe > 0 && ban > 0 ? 'mixto' : (efe > 0 ? 'efectivo' : 'banco'));
    
    document.getElementById('cantEfectivo').value = 0;
    document.getElementById('cantBanco').value = 0;
    window.cancelarVenta(); 
    await save();
};

window.cancelarVenta = function() {
    const modal = document.getElementById('confirmacionVenta');
    if(modal) modal.style.display = 'none';
    document.querySelectorAll('.ramo-item').forEach(i => i.classList.remove('selected'));
};

// --- INVENTARIO Y GASTOS ---
window.registrarGasto = async function(tipo) {
    let desc = "", monto = 0, cuenta = "efectivo", cat = "GASTO";
    
    if(tipo === 'nuevo_stock') {
        const nombre = document.getElementById('nombreStock').value; 
        const cantidad = parseInt(document.getElementById('cantidadStock').value);
        monto = parseFloat(document.getElementById('costoStock').value);
        cuenta = document.getElementById('cuentaStock').value;
        
        if(!nombre || isNaN(cantidad) || isNaN(monto)) return;

        db.inventario[nombre] = (db.inventario[nombre] || 0) + cantidad;
        desc = `Stock: ${nombre} (+${cantidad})`;
        cat = "INVERSIÓN";
    }

    if(monto > 0) {
        db.cuentas[cuenta] -= monto;
        db.totales.gastos += monto; // CORRECCIÓN: Ahora se refleja en apartado gastos
        addHist(cat, desc, monto, cuenta);
        await save();
        alert("Registro exitoso");
    }
};

function addHist(tipo, desc, monto, cuenta) {
    db.historial.unshift({ t: Date.now(), f: new Date().toLocaleString(), tipo, desc, monto, cuenta });
}

function render() {
    // Totales de Balance y Reportes
    if(document.getElementById('montoVentas')) document.getElementById('montoVentas').innerText = `$${db.totales.ventas.toFixed(2)}`;
    if(document.getElementById('montoGastos')) document.getElementById('montoGastos').innerText = `$${db.totales.gastos.toFixed(2)}`;
    
    document.getElementById('balEfectivo').innerText = `$${db.cuentas.efectivo.toFixed(2)}`;
    document.getElementById('balBanco').innerText = `$${db.cuentas.banco.toFixed(2)}`;

    // Botones de ramos
    const grid = document.getElementById('gridRamos');
    if(grid) {
        grid.innerHTML = db.ramosPrecios.map(p => 
            `<div class="ramo-item" onclick="seleccionarRamo(${p}, this)">$${p}</div>`
        ).join('');
    }

    // Actualizar select de Inventario para "Vender Extra"
    const selectExtra = document.getElementById('selectInvExtra');
    if(selectExtra) {
        selectExtra.innerHTML = '<option value="">Seleccionar producto...</option>';
        for(let item in db.inventario) {
            selectExtra.innerHTML += `<option value="${item}">${item} (${db.inventario[item]})</option>`;
        }
    }
}

cargarDatos();
