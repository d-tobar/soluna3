const SUPABASE_URL = 'https://wymfzcomfmmuobmqtkzc.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_fmsMMmMpRjw2uA7vEjblIQ_CQbjvc0O';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let db = {
    cuentas: { efectivo: 0, banco: 0 },
    historial: [],
    ramosPrecios: [3, 5, 10, 12, 15, 20, 25, 30],
    tiposFlores: ["Rosas", "Girasoles", "Lirios"],
    inventario: {}
};

let ramoSeleccionado = null;

// --- FUNCIONES GLOBALES ---

window.openTab = (name) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(name).classList.add('active');
};

window.seleccionarRamo = (precio, el) => {
    ramoSeleccionado = precio;
    document.getElementById('confirmacionVenta').style.display = 'block';
    document.getElementById('tituloRamoSeleccionado').innerText = `Ramo de $${precio}`;
};

window.confirmarVenta = async () => {
    const efe = parseFloat(document.getElementById('cantEfectivo').value) || 0;
    const ban = parseFloat(document.getElementById('cantBanco').value) || 0;
    if (Math.abs((efe + ban) - ramoSeleccionado) > 0.01) return alert("Suma incorrecta");

    db.cuentas.efectivo += efe;
    db.cuentas.banco += ban;
    addHist('VENTA', `Ramo $${ramoSeleccionado}`, ramoSeleccionado, efe > 0 && ban > 0 ? 'mixto' : (efe > 0 ? 'efectivo' : 'banco'));
    window.cancelarVenta();
    await save();
};

window.cancelarVenta = () => { document.getElementById('confirmacionVenta').style.display = 'none'; };

window.registrarGasto = async (tipo) => {
    let desc = "", monto = 0, cuenta = "efectivo", cat = "GASTO";

    if(tipo === 'flor_general') {
        desc = document.getElementById('descGeneralFlores').value;
        monto = parseFloat(document.getElementById('costoGeneralFlores').value);
        cuenta = document.getElementById('cuentaGeneralFlores').value;
        cat = "INVERSIÓN";
    } else if(tipo === 'flor_especifica') {
        const flor = document.getElementById('selectFlores').value;
        desc = `Flor: ${flor} (${document.getElementById('cantGastoFlor').value})`;
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
    }

    if(monto > 0) {
        db.cuentas[cuenta] -= monto;
        addHist(cat, desc, monto, cuenta);
        await save();
        alert("Registrado");
    }
};

window.venderInventario = async () => {
    const prod = document.getElementById('selectVenderInventario').value;
    const cant = parseInt(document.getElementById('cantVenderOtro').value);
    const precio = parseFloat(document.getElementById('precioVenderOtro').value);
    const cuenta = document.getElementById('metodoOtro').value;

    if(db.inventario[prod] < cant) return alert("Sin stock");

    db.inventario[prod] -= cant;
    db.cuentas[cuenta] += precio;
    addHist('VENTA', `Extra: ${prod} (x${cant})`, precio, cuenta);
    await save();
};

window.nuevoTipoFlor = () => {
    const n = prompt("Nombre de la flor:");
    if(n) { db.tiposFlores.push(n); save(); }
};

// --- PERSISTENCIA ---

async function save() {
    await _supabase.from('datos_floreria').upsert({ id: 1, contenido: db });
    render();
}

async function cargarDatos() {
    const { data } = await _supabase.from('datos_floreria').select('contenido').eq('id', 1).single();
    if (data) { db = data.contenido; render(); }
}

function addHist(tipo, desc, monto, cuenta) {
    db.historial.unshift({ t: Date.now(), f: new Date().toLocaleString(), tipo, desc, monto, cuenta });
}

window.render = () => {
    // Balances
    document.getElementById('balEfectivo').innerText = `$${db.cuentas.efectivo.toFixed(2)}`;
    document.getElementById('balBanco').innerText = `$${db.cuentas.banco.toFixed(2)}`;

    // Reporte Periodo
    const filtro = document.getElementById('filtroTiempo').value;
    const hoy = new Date().toLocaleDateString();
    let vP = 0, iP = 0, gP = 0;
    
    db.historial.forEach(h => {
        if(filtro === 'hoy' && h.f.split(',')[0] !== hoy) return;
        if(h.tipo === 'VENTA') vP += h.monto;
        else if(h.tipo === 'INVERSIÓN') iP += h.monto;
        else if(h.tipo === 'GASTO') gP += h.monto;
    });

    document.getElementById('venPeriodo').innerText = `$${vP.toFixed(2)}`;
    document.getElementById('invPeriodo').innerText = `$${iP.toFixed(2)}`;
    document.getElementById('gasPeriodo').innerText = `$${gP.toFixed(2)}`;

    // Inventario
    const listInv = document.getElementById('listaInventario');
    const selInv = document.getElementById('selectVenderInventario');
    listInv.innerHTML = ""; selInv.innerHTML = "";
    for(let k in db.inventario) {
        listInv.innerHTML += `<tr><td>${k}</td><td>${db.inventario[k]}</td><td><button onclick="eliminar('${k}')">X</button></td></tr>`;
        selInv.innerHTML += `<option value="${k}">${k}</option>`;
    }

    // Flores Select
    document.getElementById('selectFlores').innerHTML = db.tiposFlores.map(f => `<option value="${f}">${f}</option>`).join('');

    // Historial
    document.getElementById('listaHistorial').innerHTML = db.historial.slice(0, 10).map(h => `<div>${h.f}: ${h.tipo} - ${h.desc} ($${h.monto})</div>`).join('');
    
    // Ramos
    document.getElementById('gridRamos').innerHTML = db.ramosPrecios.map(p => `<div class="ramo-item" onclick="window.seleccionarRamo(${p}, this)">$${p}</div>`).join('');
};

window.resetearSistema = async () => { if(confirm("¿Borrar todo?")) { db.historial = []; db.cuentas = {efectivo:0, banco:0}; await save(); } };
window.eliminar = (k) => { delete db.inventario[k]; save(); };

cargarDatos();
