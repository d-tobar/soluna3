// 1. CONFIGURACIÓN DE SUPABASE
const SUPABASE_URL = 'https://wymfzcomfmmuobmqtkzc.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_fmsMMmMpRjw2uA7vEjblIQ_CQbjvc0O';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Objeto global de datos
let db = {
    cuentas: { efectivo: 0, banco: 0 },
    historial: [],
    ramosPrecios: [3, 5, 10, 12, 15, 20, 25, 30],
    tiposFlores: ["Rosas", "Girasoles", "Lirios"],
    inventario: {},
    totales: { ventas: 0, gastos: 0 } // Agregado para el apartado de ventas y gastos
};

let ramoSeleccionado = null;

// --- FUNCIONES DE SINCRONIZACIÓN ---
async function cargarDatos() {
    try {
        let { data, error } = await _supabase.from('datos_floreria').select('contenido').eq('id', 1).single();
        if (data) {
            db = data.contenido;
            // Asegurar que existan los campos de totales si no estaban
            if(!db.totales) db.totales = { ventas: 0, gastos: 0 }; 
            render();
        } else {
            await save(); 
        }
    } catch (e) { console.error("Error:", e); }
}

async function save() {
    try {
        await _supabase.from('datos_floreria').upsert({ id: 1, contenido: db });
        render();
    } catch (e) { console.error("Error al guardar:", e.message); }
}

// --- SOLUCIÓN ERROR 1: VENTAS ---
async function confirmarVenta() {
    const efe = parseFloat(document.getElementById('cantEfectivo').value) || 0;
    const ban = parseFloat(document.getElementById('cantBanco').value) || 0;
    
    // Validación corregida: debe sumar el precio total del ramo
    if (Math.abs((efe + ban) - ramoSeleccionado) > 0.01) {
        alert(`La suma total de efectivo y banco debe ser $${ramoSeleccionado}`);
        return;
    }

    db.cuentas.efectivo += efe;
    db.cuentas.banco += ban;
    db.totales.ventas += ramoSeleccionado; // Ahora sí se refleja en el apartado de ventas
    
    addHist('VENTA', `Ramo $${ramoSeleccionado}`, ramoSeleccionado, efe > 0 && ban > 0 ? 'mixto' : (efe > 0 ? 'efectivo' : 'banco'));
    
    document.getElementById('cantEfectivo').value = 0;
    document.getElementById('cantBanco').value = 0;
    cancelarVenta(); 
    await save();
}

// --- SOLUCIÓN ERROR 2: VENDER EXTRA (INVENTARIO) ---
function actualizarSelectsInventario() {
    const selects = ['selectInvExtra', 'nombreNuevoInv']; // IDs de tus selects en HTML
    selects.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.innerHTML = '<option value="">Seleccionar...</option>';
            for(let item in db.inventario) {
                el.innerHTML += `<option value="${item}">${item} (${db.inventario[item]})</option>`;
            }
        }
    });
}

// --- SOLUCIÓN ERROR 3 Y 4: SALIDAS E INVERSIÓN ---
async function registrarGasto(tipo) {
    let desc = "", monto = 0, cuenta = "efectivo", categoria = "GASTO";
    
    if(tipo === 'nuevo_stock') {
        const nombre = document.getElementById('nombreStock').value; // Asegúrate que el ID coincida en tu HTML
        const cantidad = parseInt(document.getElementById('cantidadStock').value);
        monto = parseFloat(document.getElementById('costoStock').value);
        cuenta = document.getElementById('cuentaStock').value;
        
        db.inventario[nombre] = (db.inventario[nombre] || 0) + cantidad;
        desc = `Compra: ${nombre} (+${cantidad})`;
        categoria = "INVERSIÓN";
    }

    if(monto > 0) {
        db.cuentas[cuenta] -= monto;
        db.totales.gastos += monto; // Reflejo en el apartado de gastos
        addHist(categoria, desc, monto, cuenta);
        await save();
    }
}

// --- SOLUCIÓN ERROR 5: REFLEJO EN APARTADO VENTAS/GASTOS ---
function render() {
    // Actualizar apartado de Totales (Ventas y Gastos)
    if(document.getElementById('montoVentas')) {
        document.getElementById('montoVentas').innerText = `$${db.totales.ventas.toFixed(2)}`;
    }
    if(document.getElementById('montoGastos')) {
        document.getElementById('montoGastos').innerText = `$${db.totales.gastos.toFixed(2)}`;
    }

    // Actualizar Balances Principales
    document.getElementById('balEfectivo').innerText = `$${db.cuentas.efectivo.toFixed(2)}`;
    document.getElementById('balBanco').innerText = `$${db.cuentas.banco.toFixed(2)}`;

    // Renderizar botones de ramos
    const grid = document.getElementById('gridRamos');
    if(grid) {
        grid.innerHTML = db.ramosPrecios.map(p => 
            `<div class="ramo-item" onclick="seleccionarRamo(${p}, this)">$${p}</div>`
        ).join('');
    }

    actualizarSelectsInventario(); // Actualiza los menús desplegables del inventario
    // ... (resto de tus funciones de renderizado de historial)
}

function addHist(tipo, desc, monto, cuenta) {
    db.historial.unshift({ t: Date.now(), f: new Date().toLocaleString(), tipo, desc, monto, cuenta });
}

cargarDatos();
