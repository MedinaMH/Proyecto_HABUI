let mediaRecorder = null;
let recordedChunks = [];
let mediaStream = null;
let tiempo = 0;
let timer = null;
let grabando = false;
let videoSettings = null;
const DURACION = 120;
let startTime = null;
const form = document.getElementById('nasa-tlx-form');
const urlGuardarVideo = form?.dataset.videoUrl;

function iniciarPruebaTLX() {
    const panelInicial = document.getElementById('panel-inicial');
    const contenidoPrueba = document.getElementById('contenido-prueba');
    const videoPreview = document.getElementById('video-preview-background');
    const indicator = document.getElementById('grabacion-indicator');
    if (panelInicial) panelInicial.style.display = 'none';
    if (contenidoPrueba) contenidoPrueba.style.display = 'block';
    startTime = new Date().toISOString();
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
            mediaStream = stream;
            const track = stream.getVideoTracks()[0];
            videoSettings = track.getSettings();
            if (indicator) indicator.style.display = 'flex';
            if (videoPreview) {
                videoPreview.srcObject = stream;
                videoPreview.play();
            }
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
            
            // ✅ CORREGIDO: Ahora pasa los parámetros correctamente
            mediaRecorder.onstop = () => {
                const csrf = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
                const videoPathInput = document.getElementById('video_path');
                enviarVideo(csrf, videoPathInput);
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
        });
}

function detenerGrabacion() {
    if (!grabando) return;
    clearInterval(timer);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
    grabando = false;
    const indicator = document.getElementById('grabacion-indicator');
    if (indicator) indicator.style.display = 'none';
}

function enviarVideo(csrf, videoPathInput) {
    if (recordedChunks.length === 0) {
        console.warn('⚠️ No hay video');
        return;
    }
    
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const formData = new FormData();
    formData.append('video', blob, `video_${Date.now()}.webm`);
    
    // Enviar metadatos adicionales
    const metadata = {
        device_info: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
        },
        video_settings: videoSettings,
        screen_size: {
            width: window.screen.width,
            height: window.screen.height,
        },
        timestamp_start: startTime,
        timestamp_end: new Date().toISOString(),
    };
    
    formData.append('metadata', JSON.stringify(metadata));
    
    if (startTime) {
        formData.append('start_timestamp', startTime);
    }
    
    fetch(urlGuardarVideo, {
        method: 'POST',
        body: formData,
        headers: { 'X-CSRFToken': csrf || '' }
    })
    .then(res => res.json())
    .then(data => {
        console.log('✅ Video guardado:', data);
        console.log('📷 Metadatos:', data.metadata);
        if (data.video_path) {
            videoPathInput.value = data.video_path;
            console.log('✅ Video path asignado al formulario:', data.video_path);
        }
    })
    .catch(err => console.error('❌ Error en envío:', err));
}

// Detener grabación al enviar el formulario
if (form) {
    form.addEventListener('submit', function() {
        if (grabando) detenerGrabacion();
    });
}

// Navegación pasos
document.addEventListener('DOMContentLoaded', function() {
    const sliders = document.querySelectorAll('.form-range');
    sliders.forEach(slider => {
        const valSpan = document.getElementById(slider.id + '_value');
        if (valSpan) {
            valSpan.textContent = slider.value;
            slider.addEventListener('input', () => valSpan.textContent = slider.value);
        }
    });
    const steps = document.querySelectorAll('.step');
    const progressBar = document.getElementById('progress-bar');
    window.showStep = function(stepId) {
        steps.forEach(s => s.classList.add('d-none'));
        document.getElementById(stepId).classList.remove('d-none');
        const stepNum = parseInt(stepId.split('-')[1]);
        if (progressBar) progressBar.style.width = `${(stepNum / 3) * 100}%`;
    };
    document.querySelectorAll('.next-step').forEach(btn => {
        btn.addEventListener('click', () => showStep(btn.dataset.next));
    });
    document.querySelectorAll('.prev-step').forEach(btn => {
        btn.addEventListener('click', () => showStep(btn.dataset.prev));
    });
    showStep('step-1');
    if (form) {
        form.addEventListener('submit', function(e) {
            const comps = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
            let allSelected = true;
            for (let i of comps) {
                if (!document.querySelector(`input[name="comparacion_${i}"]:checked`)) allSelected = false;
            }
            if (!allSelected) {
                e.preventDefault();
                alert('Completa todas las comparaciones.');
                showStep('step-3');
            }
        });
    }
});