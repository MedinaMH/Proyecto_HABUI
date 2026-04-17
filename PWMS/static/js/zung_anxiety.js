let mediaRecorder = null;
let recordedChunks = [];
let mediaStream = null;
let tiempo = 0;
let timer = null;
let grabando = false;
let videoSettings = null;
const DURACION = 120;
let startTime = null;
let videoSubido = false;
let videoPathGuardado = null;
let videoSizeGuardado = null;
const form = document.getElementById('zung-form');
const urlGuardarVideo = form?.dataset.videoUrl;

function iniciarPruebaZung() {
    const panelInicial = document.getElementById('panel-inicial');
    const contenidoPrueba = document.getElementById('contenido-prueba');
    const indicator = document.getElementById('grabacion-indicator');
    if (panelInicial) panelInicial.style.display = 'none';
    if (contenidoPrueba) contenidoPrueba.style.display = 'block';
    startTime = new Date().toISOString();
    videoSubido = false;
    videoPathGuardado = null;
    videoSizeGuardado = null;
    
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
            mediaStream = stream;
            const track = stream.getVideoTracks()[0];
            videoSettings = track.getSettings();
            if (indicator) indicator.style.display = 'flex';
            recordedChunks = [];
            
            const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
            let options = {};
            for (let type of mimeTypes) {
                if (MediaRecorder.isTypeSupported(type)) {
                    options = { mimeType: type };
                    break;
                }
            }
            mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
            
            mediaRecorder.onstop = () => {
                const csrf = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
                subirVideo(csrf);
            };
            
            mediaRecorder.start(1000);
            grabando = true;
            tiempo = 0;
            const statusSpan = document.getElementById('grabacion-tiempo');
            timer = setInterval(() => {
                tiempo++;
                if (statusSpan) statusSpan.textContent = tiempo;
                if (tiempo >= DURACION) detenerGrabacion();
            }, 1000);
        })
        .catch(err => {
            console.error(err);
            alert('No se pudo acceder a la cámara. La prueba continuará sin grabación.');
            // Habilitar el formulario aunque no haya cámara
            document.getElementById('btn-enviar').disabled = false;
        });
}

function detenerGrabacion() {
    if (!grabando) return;
    clearInterval(timer);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
    }
    grabando = false;
    const indicator = document.getElementById('grabacion-indicator');
    if (indicator) indicator.style.display = 'none';
}

function subirVideo(csrf) {
    if (recordedChunks.length === 0) {
        console.warn('⚠️ No hay video');
        videoSubido = true;
        habilitarBotonEnviar();
        return;
    }
    
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const formData = new FormData();
    formData.append('video', blob, `video_${Date.now()}.webm`);
    
    fetch(urlGuardarVideo, {
        method: 'POST',
        body: formData,
        headers: { 'X-CSRFToken': csrf || '' }
    })
    .then(res => res.json())
    .then(data => {
        if (data.video_path) {
            videoPathGuardado = data.video_path;
            videoSizeGuardado = data.video_size;
            videoSubido = true;
            console.log('✅ Video subido:', videoPathGuardado);
        }
        habilitarBotonEnviar();
    })
    .catch(err => {
        console.error('❌ Error:', err);
        videoSubido = true;
        habilitarBotonEnviar();
    });
}

function habilitarBotonEnviar() {
    const btnEnviar = document.querySelector('#zung-form button[type="submit"]');
    if (btnEnviar) {
        btnEnviar.disabled = false;
        btnEnviar.innerHTML = '<i class="bi bi-check-circle me-2"></i>Enviar evaluación';
    }
}

// Deshabilitar el botón de enviar al inicio
document.addEventListener('DOMContentLoaded', function() {
    const btnEnviar = document.querySelector('#zung-form button[type="submit"]');
    if (btnEnviar) {
        btnEnviar.disabled = true;
        btnEnviar.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Procesando video...';
    }
    
    // Tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});

// Cuando se envía el formulario, los campos ocultos ya tienen los datos
if (form) {
    form.addEventListener('submit', function(e) {
        if (!videoSubido && recordedChunks.length > 0) {
            e.preventDefault();
            alert('Espera a que el video termine de subirse...');
            return;
        }
        
        // Agregar los campos ocultos con los datos del video
        if (videoPathGuardado) {
            let videoPathInput = document.getElementById('video_path');
            if (!videoPathInput) {
                videoPathInput = document.createElement('input');
                videoPathInput.type = 'hidden';
                videoPathInput.name = 'video_path';
                videoPathInput.id = 'video_path';
                form.appendChild(videoPathInput);
            }
            videoPathInput.value = videoPathGuardado;
            
            let sizeInput = document.createElement('input');
            sizeInput.type = 'hidden';
            sizeInput.name = 'video_size';
            sizeInput.value = videoSizeGuardado;
            form.appendChild(sizeInput);
        }
    });
}