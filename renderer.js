const navigationMap = {
    "Home": "html/home.html",
    "Settings": "html/settings.html",
    "TransactionCollection": "html/transactionCollection.html",
    "Bills": "html/bills.html",
    "BillsGeneral": "html/billsGeneral.html",
    "Emails": "html/emails.html",
}

const initLoadedPage = (filename) => {
    // Replace 'html' with 'js' in the filename
    const jsFilename = filename.replace('.html', '.js');
    const tsFilename = filename.replace('.html', '.ts');

    // Fetch the JavaScript file
    loadFile(jsFilename)
        .catch(_error => loadFile(tsFilename)
        .catch(_error => console.log('JavaScript file ' + jsFilename + ' not found: ' + _error))
    );
};

const loadFile = (filename) => {
    return fetch(filename)
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
        });
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
        if(document.getElementById("menu" + key) == null) {
            console.log("menu" + key + " not found");
            continue;
        }
        document.getElementById("menu" + key).addEventListener('click', function () {
            fetch(value)
                .then(response => response.text())
                .then(html => {
                    document.getElementById('content').innerHTML = html;
                    initLoadedPage(value);
                });
        });
    }

    document.getElementById("menuHome").click();
};

const onSaveSettingsClick = async function () {
    var username = document.querySelector('input[name="username"]').value.toString();
    var password = document.querySelector('input[name="password"]').value.toString();

    var orgname = document.querySelector('input[name="orgname"]').value.toString();
    var treasurer_name = document.querySelector('input[name="treasurer_name"]').value.toString();
    var treasurer_role = document.querySelector('input[name="treasurer_role"]').value.toString();
    var treasurer_street = document.querySelector('input[name="treasurer_street"]').value.toString();
    var treasurer_postal = document.querySelector('input[name="treasurer_postal"]').value.toString();
    var treasurer_city = document.querySelector('input[name="treasurer_city"]').value.toString();
    var treasurer_email = document.querySelector('input[name="treasurer_email"]').value.toString();
    var treasurer_phone = document.querySelector('input[name="treasurer_phone"]').value.toString();

    var emailsender = document.querySelector('input[name="emailsender"]').value.toString();
    var emailpassword = document.querySelector('input[name="emailpassword"]').value.toString();

    var settings = {
        username: username,
        password: password,
        bankDetails: [],
        
        orgname: orgname,
        treasurer_name: treasurer_name,
        treasurer_role: treasurer_role,
        treasurer_street: treasurer_street,
        treasurer_postal: treasurer_postal,
        treasurer_city: treasurer_city,
        treasurer_email: treasurer_email,
        treasurer_phone: treasurer_phone,

        email: {
            account: emailsender,
            password: emailpassword
        }
    };

    for (let bankDetails of document.querySelectorAll('.bankDetails')) {
        settings.bankDetails.push({
            accountName: bankDetails.querySelector('input[name="accountName"]').value.toString(),
            institute: bankDetails.querySelector('input[name="institute"]').value.toString(),
            iban: bankDetails.querySelector('input[name="iban"]').value.toString(),
            bic: bankDetails.querySelector('input[name="bic"]').value.toString(),
            gleaubigerId: bankDetails.querySelector('input[name="gleaubigerId"]').value.toString(),
        });
    }

    const response = await window.storage.saveSettings(settings);
    // console.log(response); // reponse indicates error/success
};

window.onload = function () {
    fetch('html/navigation.html')
        .then(response => response.text())
        .then(html => document.body.insertAdjacentHTML('afterbegin', html))
        .then(toggleMenuInit);
};