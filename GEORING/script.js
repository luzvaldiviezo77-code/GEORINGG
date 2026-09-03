// Inicializar Mapa centrado en Lima
const map = L.map('map').setView([-12.046374, -77.042793], 11);

// Capa de Mapa Híbrida/Profesional de OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

let marker;

// Base de Datos SIG Local para distritos de Lima Metropolitana
const baseDatosLima = {
  "Miraflores": {
    relieve: "Planicie costera con acantilados de alta pendiente sobre el mar.",
    cobertura: "Zona urbana consolidada, áreas verdes recreativas.",
    hidrografia: "Océano Pacífico (Oeste), quebradas secas efluentes.",
    peligros: "Sismos de alta magnitud, derrumbes en zona de acantilados, riesgo moderado de tsunami en franja costera."
  },
  "Chorrillos": {
    relieve: "Colinado (Morro Solar) y zonas bajas de humedales.",
    cobertura: "Urbano denso, Pantanos de Villa (Humedal protegido).",
    hidrografia: "Océano Pacífico, Acuífero del Río Surco.",
    peligros: "Tsunamis, sismos en suelos saturados (licuación de suelos)."
  },
  "Lima": { // Cercado de Lima
    relieve: "Llano aluvial, suave pendiente hacia el oeste.",
    cobertura: "Urbano histórico intensivo y comercial.",
    hidrografia: "Río Rímac adyacente.",
    peligros: "Sismos (viviendas precarias/patrimoniales), inundaciones/desbordes del Río Rímac."
  },
  "Lurigancho-Chosica": {
    relieve: "Valle estrecho y quebradas de vertiente occidental andina.",
    cobertura: "Urbano-rural, semiárido.",
    hidrografia: "Río Rímac, Río Santa Eulalia, quebradas secas activas.",
    peligros: "Huaicos e inundaciones de alta severidad durante el verano, deslizamientos de rocas."
  },
  "San Isidro": {
    relieve: "Territorio plano aluvial suavemente inclinado hacia el mar.",
    cobertura: "Zona comercial, residencial y parque el Olivar (Área verde protegida).",
    hidrografia: "Cerca al sector marítimo, sin cuerpos continentales activos.",
    peligros: "Sismos de fuerte intensidad, aceleración sísmica alta."
  },
  "Default": {
    relieve: "Planicie costera interfluvial con suave pendiente hacia el mar.",
    cobertura: "Superficie predominantemente urbana.",
    hidrografia: "Cuencas de los ríos Rímac, Chillón o Lurín según sector.",
    peligros: "Sismos de fuerte magnitud (Zona sísmica 4), incendios urbanos."
  }
};

const locateBtn = document.getElementById('locate-btn');
const loader = document.getElementById('loader');

locateBtn.addEventListener('click', () => {
  loader.style.display = 'block';
  locateBtn.disabled = true;

  // Opciones de Geolocalización
  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  };

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
  } else {
    alert("La geolocalización no es soportada por este navegador.");
    loader.style.display = 'none';
    locateBtn.disabled = false;
  }
});

async function onSuccess(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;
  const alt = position.coords.altitude ? `${Math.round(position.coords.altitude)} m s. n. m.` : "105 m s. n. m. (Aprox)";

  // Actualizar Coordenadas en Pantalla
  document.getElementById('val-latitud').textContent = `${lat.toFixed(5)}°`;
  document.getElementById('val-longitud').textContent = `${lon.toFixed(5)}°`;
  document.getElementById('val-altitud').textContent = alt;

  // Mover Mapa e Insertar Marcador
  map.setView([lat, lon], 15);
  if (marker) map.removeLayer(marker);
  
  marker = L.marker([lat, lon]).addTo(map)
    .bindPopup('<b>Ubicación Identificada</b>').openPopup();

  try {
    // 1. Geocodificación Inversa (Dirección y Jurisdicción Política)
    const geoResp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
    const geoData = await geoResp.json();
    
    const addr = geoData.address || {};
    const distrito = addr.suburb || addr.district || addr.neighbourhood || addr.city_district || "Lima";
    const provincia = addr.province || addr.city || "Lima";
    const departamento = addr.state || "Lima";
    const lugar = geoData.display_name ? geoData.display_name.split(',')[0] : "Zona Geográfica";

    document.getElementById('val-lugar').textContent = lugar;
    document.getElementById('val-distrito').textContent = distrito;
    document.getElementById('val-provincia').textContent = provincia;
    document.getElementById('val-departamento').textContent = departamento;

    // 2. Clima y Precipitación en Tiempo Real (API Open-Meteo)
    const weatherResp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=precipitation`);
    const weatherData = await weatherResp.json();
    
    const temp = weatherData.current_weather ? `${weatherData.current_weather.temperature}°C` : "20°C";
    const precip = weatherData.hourly ? `${weatherData.hourly.precipitation[0]} mm` : "0 mm/h";
    
    document.getElementById('val-clima').textContent = `Templado / Desértico (${temp})`;
    document.getElementById('val-precipitacion').textContent = precip;

    // 3. Cruce con Base SIG Local
    const datosSIG = baseDatosLima[distrito] || baseDatosLima["Default"];

    document.getElementById('val-relieve').textContent = datosSIG.relieve;
    document.getElementById('val-cobertura').textContent = datosSIG.cobertura;
    document.getElementById('val-hidrografia').textContent = datosSIG.hidrografia;
    document.getElementById('val-peligros').textContent = datosSIG.peligros;

  } catch (err) {
    console.error("Error al obtener información geográfica:", err);
    alert("Hubo un pequeño retraso al consultar los servidores geográficos. Mostrando datos aproximados.");
  } finally {
    loader.style.display = 'none';
    locateBtn.disabled = false;
  }
}

function onError(error) {
  loader.style.display = 'none';
  locateBtn.disabled = false;
  
  switch(error.code) {
    case error.PERMISSION_DENIED:
      alert("Permiso Denegado: Haz clic en el ícono del candado junto a la URL y permite el acceso a la Ubicación.");
      break;
    case error.POSITION_UNAVAILABLE:
      alert("Ubicación No Disponible: El dispositivo no puede obtener las coordenadas actualmente.");
      break;
    case error.TIMEOUT:
      alert("Tiempo Excedido: La solicitud tardó demasiado en responder.");
      break;
    default:
      alert("Ocurrió un error inesperado al intentar obtener la posición.");
  }
}