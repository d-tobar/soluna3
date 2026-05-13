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
    inventario: {}
};

let ramoSeleccionado = null;

// --- FUNCIONES DE SINCRONIZACIÓN ---

async function cargarDatos() {
    try {
        let { data, error } = await _supabase.from('datos_floreria').select('contenido').eq('id', 1).single();
        if (data) {
            db = data.contenido;
            render();
        } else {
            await save(); 
        }
    } catch (e) {
        console.error("Error cargando datos:", e);
    }
}

async function save() {
    try {
        await _supabase.from('datos_floreria').upsert({ id: 1, contenido: db });
        render();
    } catch (e) {
        console.error("Error al guardar:", e);
    }
}

// --- LÓGICA DEL SISTEMA ---

function openTab(name) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(name).classList.add('active');
    if(event) event.currentTarget.classList.add('active');
}

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
    
    if(efe > 0) {
        db.cuentas.efectivo += (ramoSeleccionado * efe);
        addHist('VENTA', `Ramo $${ramoSeleccionado} (x${efe})`, ramoSeleccionado * efe, 'efectivo');
    }
    if(ban > 0) {
        db.cuentas.banco += (ramoSeleccionado * ban);
        addHist('VENTA', `Ramo $${ramoSeleccionado} (x${ban})`, ramoSeleccionado * ban, 'banco');
    }
    
    document.getElementById('cantEfectivo').value = 0;
    document.getElementById('cantBanco').value = 0;
    cancelarVenta(); 
    await save();
}

function cancelarVenta() {
    document.getElementById('confirmacionVenta').style.display = 'none';
    document.querySelectorAll('.ramo-item').forEach(i => i.classList.remove('selected'));
}

async function venderInventario() {
    const p = document.getElementById('selectVenderInventario').value;
    const c = parseInt(document.getElementById('cantVenderOtro').value);
    const $ = parseFloat(document.getElementById('precioVenderOtro').value);
    const m = document.getElementById('metodoOtro').value;
    
    if(!p || isNaN(c) || isNaN($)) return alert("Datos incompletos");
    if(db.inventario[p] < c) return alert("Stock insuficiente.");

    db.inventario[p] -= c;
    db.cuentas[m] += $;
    addHist('VENTA', `Extra: ${p} (x${c})`, $, m);
    
    document.getElementById('cantVenderOtro').value = 1;
    document.getElementById('precioVenderOtro').value = "";
    await save();
}

async function registrarGasto(tipo) {
    let d = "", $ = 0, c = "efectivo", cat = "INVERSIÓN";
    let nomInv = "", cantInv = 0;
    
    if(tipo === 'flor_general') {
        const desc = document.getElementById('descGeneralFlores').value;
        $ = parseFloat(document.getElementById('costoGeneralFlores').value);
        c = document.getElementById('cuentaGeneralFlores').value;
        d = `Compra Lote: ${desc}`;
    } else if(tipo === 'flor_especifica') {
        const f = document.getElementById('selectFlores').value;
        const n = document.getElementById('cantGastoFlor').value;
        $ = parseFloat(document.getElementById('costoGastoFlor').value);
        c = document.getElementById('cuentaGastoFlor').value;
        d = `Compra: ${f} (${n})`;
    } else if(tipo === 'nuevo_producto') {
        nomInv = document.getElementById('nombreNuevoInv').value.trim();
        cantInv = parseInt(document.getElementById('cantNuevoInv').value);
        $ = parseFloat(document.getElementById('costoNuevoInv').value);
        c = document.getElementById('cuentaNuevoInv').value;
        d = `Stock: ${nomInv} (+${cantInv})`;
    } else if(tipo === 'gasto_vario') {
        const desc = document.getElementById('descVario').value;
        $ = parseFloat(document.getElementById('costoVario').value);
        c = document.getElementById('cuentaVario').value;
        d = "Pago: " + desc;
        cat = "GASTO";
    }
    
    if($ > 0) {
        db.cuentas[c] -= $;
        if(tipo === 'nuevo_producto') db.inventario[nomInv] = (db.inventario[nomInv] || 0) + cantInv;
        addHist(cat, d, $, c); 
        await save(); 
        alert("Registrado");
    }
}

async function realizarTransferencia() {
    const o = document.getElementById('transfOrigen').value;
    const d = document.getElementById('transfDestino').value;
    const $ = parseFloat(document.getElementById('montoTransf').value);
    if(isNaN($) || $ <= 0 || o === d) return;
    
    db.cuentas[o] -= $;
    db.cuentas[d] += $;
    addHist('MOVIMIENTO', `De ${o} a ${d}`, $, o);
    document.getElementById('montoTransf').value = "";
    await save();
}

function addHist(tipo, desc, monto, cuenta) {
    db.historial.unshift({ t: Date.now(), f: new Date().toLocaleString(), tipo, desc, monto, cuenta });
}

function render() {
    // Ramos
    document.getElementById('gridRamos').innerHTML = db.ramosPrecios.map(p => `<div class="ramo-item" onclick="seleccionarRamo(${p}, this)">$${p}</div>`).join('');
    
    // Selects
    document.getElementById('selectFlores').innerHTML = db.tiposFlores.map(f => `<option value="${f}">${f}</option>`).join('');
    
    const listInv = document.getElementById('listaInventario');
    const selInv = document.getElementById('selectVenderInventario');
    listInv.innerHTML = ""; selInv.innerHTML = "";
    for(let k in db.inventario) {
        selInv.innerHTML += `<option value="${k}">${k} (Disp: ${db.inventario[k]})</option>`;
        listInv.innerHTML += `<tr><td>${k}</td><td>${db.inventario[k]}</td><td><button onclick="eliminarItem('${k}')">X</button></td></tr>`;
    }

    // Balances
    const filtro = document.getElementById('filtroTiempo').value;
    const ahora = Date.now();
    let limite = 0;
    if(filtro === 'hoy') { let d = new Date(); d.setHours(0,0,0,0); limite = d.getTime(); }
    else if(filtro === 'semana') limite = ahora - (7*24*60*60*1000);
    else if(filtro === 'mes') { let d = new Date(); d.setDate(1); d.setHours(0,0,0,0); limite = d.getTime(); }

    let vP = 0, iP = 0, gP = 0;
    const filtered = db.historial.filter(h => h.t >= limite || filtro === 'todo');
    filtered.forEach(h => {
        if(h.tipo === 'VENTA') vP += h.monto;
        else if(h.tipo === 'INVERSIÓN') iP += h.monto;
        else if(h.tipo === 'GASTO') gP += h.monto;
    });

    document.getElementById('balEfectivo').innerText = `$${db.cuentas.efectivo.toFixed(2)}`;
    document.getElementById('balBanco').innerText = `$${db.cuentas.banco.toFixed(2)}`;
    document.getElementById('balTotal').innerText = `$${(db.cuentas.efectivo + db.cuentas.banco).toFixed(2)}`;
    document.getElementById('venPeriodo').innerText = `$${vP.toFixed(2)}`;
    document.getElementById('invPeriodo').innerText = `$${iP.toFixed(2)}`;
    document.getElementById('gasPeriodo').innerText = `$${gP.toFixed(2)}`;
    document.getElementById('resultadoDia').innerText = `Neto: $${(vP - iP - gP).toFixed(2)}`;

    document.getElementById('listaHistorial').innerHTML = filtered.map(h => `
        <tr><td>${h.f.split(',')[0]}</td><td>${h.tipo}</td><td>${h.desc}</td><td>$${h.monto}</td><td>${h.cuenta}</td></tr>
    `).join('');
}

async function eliminarItem(key) {
    delete db.inventario[key];
    await save();
}

async function resetearSistema() {
    if(confirm("¿Borrar todo?")) {
        db = { cuentas: { efectivo: 0, banco: 0 }, historial: [], ramosPrecios: [3, 5, 10, 12, 15, 20, 25, 30], tiposFlores: ["Rosas", "Girasoles", "Lirios"], inventario: {} };
        await save();
    }
}

async function nuevoTipoFlor() {
    let f = prompt("Nombre de la flor:");
    if(f) { db.tiposFlores.push(f); await save(); }
}

cargarDatos();
