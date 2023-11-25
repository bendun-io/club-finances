const navigationMap = {
    "Home": "html/home.html",
    "Settings": "html/settings.html",
    "TransactionCollection": "html/transactionCollection.html",
}

const initLoadedPage = (filename) => {
    // Replace 'html' with 'js' in the filename
    const jsFilename = filename.replace('.html', '.js');

    // Fetch the JavaScript file
    fetch(jsFilename)
        .then(response => {
            if (response.ok) {
                return response.text();
            } else {
                console.log('JavaScript file not found: ' + jsFilename);
            }
        })
        .then(js => {
            // Create a new function from the loaded script
            const scriptFunction = new Function(js);
            // Run the function
            scriptFunction();

            // If the function defines an 'init' function, run it and then delete it
            if (typeof window.init === 'function') {
                window.init();
                window.init = undefined;
            }
        })
        .catch(_error => console.log('JavaScript file ' + jsFilename + ' not found: ' + _error));
};

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
    // for every navagation map entry add a event listener to load the page into the content div
    for (const [key, value] of Object.entries(navigationMap)) {
        document.getElementById("menu" + key).addEventListener('click', function () {
            fetch(value)
                .then(response => response.text())
                .then(html => {
                    document.getElementById('content').innerHTML = html;
                    initLoadedPage(value);
                });
        });
    }
};

const onSaveSettingsClick = async function () {
    var username = document.querySelector('input[name="username"]').value.toString();
    var password = document.querySelector('input[name="password"]').value.toString();
    var settings = {
        username: username,
        password: password
    };

    const response = await window.storage.saveSettings(settings);
    // console.log(response); // reponse indicates error/success
};

window.onload = function () {
    fetch('html/navigation.html')
        .then(response => response.text())
        .then(html => document.body.insertAdjacentHTML('afterbegin', html))
        .then(toggleMenuInit);
};