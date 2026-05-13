// 1. CONFIGURACIÓN DE SUPABASE
const SUPABASE_URL = 'https://wymfzcomfmmuobmqtkzc.supabase.co'; // Sin el /rest/v1/
const SUPABASE_KEY = 'sb_publishable_fmsMMmMpRjw2uA7vEjblIQ_CQbjvc0O';

// Cambiamos el nombre a _supabase para evitar el error de la imagen image_dbbd53.png
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
        let { data, error } = await _supabase
            .from('datos_floreria')
            .select('contenido')
            .eq('id', 1)
            .single();

        if (data) {
            db = data.contenido;
            render();
        } else {
            console.log("No hay datos, inicializando...");
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
        console.error("Error al guardar:", e.message);
    }
}

// --- LÓGICA DE NAVEGACIÓN ---
function openTab(name) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(name).classList.add('active');
    if(event) event.currentTarget.classList.add('active');
}

// (El resto de tus funciones de venta e inventario deben usar _supabase para guardar)

function render() {
    // Esta función dibujará los botones que ahora no ves
    const grid = document.getElementById('gridRamos');
    if (grid) {
        grid.innerHTML = db.ramosPrecios.map(p => 
            `<div class="ramo-item" onclick="seleccionarRamo(${p}, this)">$${p}</div>`
        ).join('');
    }
    // ... resto del renderizado
}

// Arrancar app
cargarDatos();
