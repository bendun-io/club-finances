
const toggleMenuInit = () => {
    document.getElementById('closebtn').addEventListener('click', function () {
        document.getElementById('mySidebar').style.width = '0';
        document.getElementById('sidebarOpener').style.width = '3em';
        document.getElementById('content').style.left = '3em';
    });
    document.getElementById('opensidebar').addEventListener('click', function () {
        document.getElementById('sidebarOpener').style.width = '0';
        document.getElementById('mySidebar').style.width = '20%';
        document.getElementById('content').style.left = '20%';
    });
}

window.onload = function () {
    fetch('src/navigation.html')
        .then(response => response.text())
        .then(html => document.body.insertAdjacentHTML('afterbegin', html))
        .then(toggleMenuInit);
}