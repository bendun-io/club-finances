
window.init = () => {
    console.log('settings.js loaded');
    window.storage.loadSettings().then(
        (settings) => { 
            document.querySelector('input[name="username"]').value = settings.username ?? '';
            document.querySelector('input[name="password"]').value = settings.password ?? '';
        }
    );
}