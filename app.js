// 1. CONFIGURACIÓN DE SUPABASE
const SUPABASE_URL = 'https://wymfzcomfmmuobmqtkzc.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_fmsMMmMpRjw2uA7vEjblIQ_CQbjvc0O';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Estructura de datos
let db = {
    cuentas: { efectivo: 0, banco: 0 },
    historial: [],
    ramosPrecios: [3, 5, 10, 12, 15, 20, 25, 30],
    tiposFlores: ["Rosas", "Girasoles", "Lirios"],
    inventario: {}
};

let ramoSeleccionado = null;

// --- SINCRONIZACIÓN ---
async function cargarDatos() {
    try {
        let { data, error } = await _supabase.from('datos_floreria').select('contenido').eq('id', 1).single();
        if (data) {
            db = data.contenido;
            // Asegurar que tiposFlores existe para el selector
            if(!db.tiposFlores) db.tiposFlores = ["Rosas", "Girasoles", "Lirios"];
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

// --- NAVEGACIÓN ---
window.openTab = function(name) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(name).classList.add('active');
    if(event) event.currentTarget.classList.add('active');
};

// --- VENTAS DE RAMOS ---
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
    
    document.getElementById('cantEfectivo').value = 0;
    document.getElementById('cantBanco').value = 0;
    window.cancelarVenta(); 
    await save();
};

window.cancelarVenta = function() {
    document.getElementById('confirmacionVenta').style.display = 'none';
    document.querySelectorAll('.ramo-item').forEach(i => i.classList.remove('selected'));
};

// --- VENTAS DE EXTRAS (INVENTARIO) ---
window.venderInventario = async function() {
    const producto = document.getElementById('selectVenderInventario').value;
    const cant = parseInt(document.getElementById('cantVenderOtro').value);
    const precio = parseFloat(document.getElementById('precioVenderOtro').value);
    const cuenta = document.getElementById('metodoOtro').value;

    if(!producto || isNaN(cant) || isNaN(precio)) return;
    if(db.inventario[producto] < cant) { alert("No hay suficiente stock"); return; }

    db.inventario[producto] -= cant;
    db.cuentas[cuenta] += precio;
    addHist('VENTA', `Extra: ${producto} (x${cant})`, precio, cuenta);
    await save();
};

// --- GASTOS E INVERSIONES ---
window.registrarGasto = async function(tipo) {
    let desc = "", monto = 0, cuenta = "efectivo", cat = "GASTO";

    if(tipo === 'flor_general') {
        desc = document.getElementById('descGeneralFlores').value;
        monto = parseFloat(document.getElementById('costoGeneralFlores').value);
        cuenta = document.getElementById('cuentaGeneralFlores').value;
        cat = "INVERSIÓN";
    } else if(tipo === 'flor_especifica') {
        const flor = document.getElementById('selectFlores').value;
        const cant = document.getElementById('cantGastoFlor').value;
        desc = `Flor: ${flor} (${cant})`;
        monto = parseFloat(document.getElementById('costoGastoFlor').value);
        cuenta = document.getElementById('cuentaGastoFlor').value;
        cat = "INVERSIÓN";
    } else if(tipo === 'nuevo_producto') {
        const nom = document.getElementById('nombreNuevoInv').value;
        const cant = parseInt(document.getElementById('cantNuevoInv').value);
        monto = parseFloat(document.getElementById('costoNuevoInv').value);
        cuenta = document.getElementById('cuentaNuevoInv').value;
        db.inventario[nom] = (db.inventario[nom] || 0) + cant;
        desc = `Stock: ${nom} (+${cant})`;
        cat = "INVERSIÓN";
    } else if(tipo === 'gasto_vario') {
        desc = document.getElementById('descVario').value;
        monto = parseFloat(document.getElementById('costoVario').value);
        cuenta = document.getElementById('cuentaVario').value;
        cat = "GASTO";
    }

    if(monto > 0) {
        db.cuentas[cuenta] -= monto;
        addHist(cat, desc, monto, cuenta);
        await save();
        alert("Registrado con éxito");
    }
};

window.nuevoTipoFlor = function() {
    const n = prompt("Nombre de la nueva flor:");
    if(n) { db.tiposFlores.push(n); save(); }
};

function addHist(tipo, desc, monto, cuenta) {
    db.historial.unshift({ t: Date.now(), f: new Date().toLocaleString(), tipo, desc, monto, cuenta });
}

// --- RENDERIZADO ---
function render() {
    const filtro = document.getElementById('filtroTiempo').value;
    const ahora = Date.now();
    const unDia = 24*60*60*1000;

    let vPeriodo = 0, iPeriodo = 0, gPeriodo = 0;

    // Filtrar historial y calcular periodos
    const filtrado = db.historial.filter(h => {
        if(filtro === 'todo') return true;
        const diff = ahora - h.t;
        if(filtro === 'hoy') return diff < unDia;
        if(filtro === 'semana') return diff < unDia * 7;
        if(filtro === 'mes') return diff < unDia * 30;
        return true;
    });

    filtrado.forEach(h => {
        if(h.tipo === 'VENTA') vPeriodo += h.monto;
        else if(h.tipo === 'INVERSIÓN') iPeriodo += h.monto;
        else if(h.tipo === 'GASTO') gPeriodo += h.monto;
    });

    // Actualizar Reportes en Pantalla
    document.getElementById('venPeriodo').innerText = `$${vPeriodo.toFixed(2)}`;
    document.getElementById('invPeriodo').innerText = `$${iPeriodo.toFixed(2)}`;
    document.getElementById('gasPeriodo').innerText = `$${gPeriodo.toFixed(2)}`;
    document.getElementById('resultadoDia').innerText = `Neto: $${(vPeriodo - iPeriodo - gPeriodo).toFixed(2)}`;

    // Balances de Caja
    document.getElementById('balEfectivo').innerText = `$${db.cuentas.efectivo.toFixed(2)}`;
    document.getElementById('balBanco').innerText = `$${db.cuentas.banco.toFixed(2)}`;
    document.getElementById('balTotal').innerText = `$${(db.cuentas.efectivo + db.cuentas.banco).toFixed(2)}`;

    // Ramos
    const grid = document.getElementById('gridRamos');
    grid.innerHTML = db.ramosPrecios.map(p => `<div class="ramo-item" onclick="seleccionarRamo(${p}, this)">$${p}</div>`).join('');

    // Inventario y Selects
    const listaInv = document.getElementById('listaInventario');
    listaInv.innerHTML = "";
    const selVenta = document.getElementById('selectVenderInventario');
    selVenta.innerHTML = '<option value="">Seleccionar...</option>';

    for(let k in db.inventario) {
        listaInv.innerHTML += `<tr><td>${k}</td><td>${db.inventario[k]}</td><td><button onclick="eliminarItem('${k}')">X</button></td></tr>`;
        selVenta.innerHTML += `<option value="${k}">${k} (${db.inventario[k]})</option>`;
    }

    // Select Flores
    const selFlores = document.getElementById('selectFlores');
    selFlores.innerHTML = db.tiposFlores.map(f => `<option value="${f}">${f}</option>`).join('');

    // Historial Tabla
    document.getElementById('listaHistorial').innerHTML = filtrado.slice(0, 30).map(h => `
        <tr><td>${h.f.split(',')[0]}</td><td>${h.tipo}</td><td>${h.desc}</td><td>$${h.monto.toFixed(2)}</td><td>${h.cuenta}</td></tr>
    `).join('');
}

window.eliminarItem = function(k) { if(confirm("¿Eliminar?")) { delete db.inventario[k]; save(); } };

window.realizarTransferencia = async function() {
    const ori = document.getElementById('transfOrigen').value;
    const des = document.getElementById('transfDestino').value;
    const mon = parseFloat(document.getElementById('montoTransf').value);
    if(mon > 0 && ori !== des) {
        db.cuentas[ori] -= mon;
        db.cuentas[des] += mon;
        addHist('AJUSTE', `Traspaso ${ori} -> ${des}`, mon, 'caja');
        await save();
    }
};

window.resetearSistema = async function() {
    if(confirm("¿ESTÁS SEGURO? Se borrará todo el historial y dinero.")) {
        db = { cuentas: { efectivo: 0, banco: 0 }, historial: [], ramosPrecios: [3, 5, 10, 12, 15, 20, 25, 30], tiposFlores: ["Rosas", "Girasoles", "Lirios"], inventario: {} };
        await save();
    }
};

cargarDatos();
