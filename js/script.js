// js/script.js - VERSIÓN CORREGIDA
let empresas = [];

// Cargar empresas al iniciar
document.addEventListener('DOMContentLoaded', function() {
    cargarEmpresas();
    aplicarEfectosVisuales();
});

// Cargar empresas desde la API
async function cargarEmpresas() {
    try {
        console.log('Cargando empresas desde API...');
        const response = await fetch('http://localhost:3000/api/empresas');
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            empresas = data.empresas;
            mostrarEmpresas();
        } else {
            throw new Error(data.message || 'Error al cargar empresas');
        }
    } catch (error) {
        console.error('Error cargando empresas:', error);
        mostrarErrorEmpresas();
    }
}

// Mostrar empresas en el grid
function mostrarEmpresas() {
    const grid = document.getElementById('empresasGrid');
    
    if (!grid) {
        console.error('No se encontró el contenedor de empresas');
        return;
    }
    
    if (empresas.length === 0) {
        grid.innerHTML = '<div class="no-empresas">No hay empresas registradas</div>';
        return;
    }
    
    grid.innerHTML = '';
    
    empresas.forEach(empresa => {
        const card = document.createElement('div');
        card.className = 'empresa-card';
        card.onclick = () => seleccionarEmpresa(empresa.EmpresaID, empresa.Nombre);
        
        // Usar el logo de la base de datos o uno por defecto
        const logoPath = empresa.LogoPath || 'images/logo-empresa.png';
        
        card.innerHTML = `
            <div class="empresa-logo">
                <img src="${logoPath}" alt="${empresa.Nombre}" 
                     onerror="this.src='images/logo-empresa.png'">
            </div>
            <h3>${empresa.Nombre}</h3>
            <p>${empresa.Descripcion || 'Sin descripción'}</p>
        `;
        
        grid.appendChild(card);
    });
    
    // Aplicar efectos después de cargar
    setTimeout(aplicarEfectosVisuales, 100);
}

// Seleccionar empresa (CORREGIDA)
function seleccionarEmpresa(empresaId, empresaNombre) {
    console.log('Empresa seleccionada:', empresaId, empresaNombre);
    
    // Guardar la empresa seleccionada en localStorage
    const empresaData = { 
        id: empresaId, 
        nombre: empresaNombre 
    };
    
    localStorage.setItem('empresaSeleccionada', JSON.stringify(empresaData));
    
    // Redirigir al login de empleados
    window.location.href = 'pages/empleado-login.html';
}

function irAdministrador() {
    console.log('Acceso administrador');
    window.location.href = 'pages/admin-login.html';
}

// Mostrar error si no se pueden cargar empresas
function mostrarErrorEmpresas() {
    const grid = document.getElementById('empresasGrid');
    if (grid) {
        grid.innerHTML = `
            <div class="error-empresas">
                <p>❌ Error al cargar las empresas</p>
                <button onclick="cargarEmpresas()">🔄 Reintentar</button>
            </div>
        `;
    }
}

// Efectos visuales
function aplicarEfectosVisuales() {
    const cards = document.querySelectorAll('.empresa-card');
    
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 200);
    });
}

// Recargar empresas cada 30 segundos (opcional)
setInterval(cargarEmpresas, 30000);