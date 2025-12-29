let worker = null;
document.addEventListener('DOMContentLoaded', function() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        if (e.data.type === 'RESULT') {
            const info = e.data.payload.info;
            document.getElementById('cert-info').innerHTML = Object.entries(info)
                .map(([k,v]) => `<div class="stat-item"><span class="stat-label">${k}:</span><span class="stat-value">${v}</span></div>`).join('');
            document.getElementById('result-section').classList.remove('hidden');
        }
        document.getElementById('parse-btn').disabled = false;
    };
    document.getElementById('parse-btn').onclick = function() {
        this.disabled = true;
        worker.postMessage({ type: 'PARSE', payload: { pem: document.getElementById('cert-input').value }});
    };
    document.getElementById('sample-btn').onclick = function() {
        document.getElementById('cert-input').value = `-----BEGIN CERTIFICATE-----
MIICpDCCAYwCCQDU+pQ4P2PzDDANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAls
b2NhbGhvc3QwHhcNMjMwMTAxMDAwMDAwWhcNMjQwMTAxMDAwMDAwWjAUMRIwEAYD
VQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC7
-----END CERTIFICATE-----`;
    };
});
