
window.init = () => {
    // console.log('settings.js loaded');
    window.storage.loadSettings().then(
        (settings) => {
            document.querySelector('input[name="username"]').value = settings.username ?? '';
            document.querySelector('input[name="password"]').value = settings.password ?? '';

            document.querySelector('input[name="orgname"]').value = settings.orgname ?? '';
            document.querySelector('input[name="treasurer_name"]').value = settings.treasurer_name ?? '';
            document.querySelector('input[name="treasurer_role"]').value = settings.treasurer_role ?? '';
            document.querySelector('input[name="treasurer_street"]').value = settings.treasurer_street ?? '';
            document.querySelector('input[name="treasurer_postal"]').value = settings.treasurer_postal ?? '';
            document.querySelector('input[name="treasurer_city"]').value = settings.treasurer_city ?? '';
            document.querySelector('input[name="treasurer_email"]').value = settings.treasurer_email ?? '';
            document.querySelector('input[name="treasurer_phone"]').value = settings.treasurer_phone ?? '';

            document.querySelector('input[name="emailsender"]').value = settings.email.account ?? '';
            document.querySelector('input[name="emailpassword"]').value = settings.email.password ?? '';

            if (settings.bankDetails) {
                initBankDetails(settings.bankDetails);
            } else {
                addBankDetails();
            }
        }
    );
    document.getElementById('addBankDetailsButton').addEventListener('click', addBankDetails);
    document.getElementById('sendTestEmailButton').addEventListener('click', onSendTestEmailButtonClick);
}

var maxId = 0;

const initBankDetails = (data) => {
    for (let bankDetails of data) {
        let bankDetailsDiv = getDetailsDiv(maxId, bankDetails.accountName, bankDetails.institute, bankDetails.iban, bankDetails.bic, bankDetails.gleaubigerId);
        document.querySelector('fieldset[id="bankdetails"]').appendChild(bankDetailsDiv);
        maxId++;
    }
}

const addBankDetails = () => {
    console.log("addBankDetails");
    // add a div at the bottom of the fieldset with id bankdetails
    let bankDetailsDiv = getDetailsDiv(maxId, '', '', '', '', '');
    document.querySelector('fieldset[id="bankdetails"]').appendChild(bankDetailsDiv);
    maxId++;
}

const getDetailsDiv = (id, accountName, institute, iban, bic, gleaubigerId) => {
    let bankDetailsDiv = document.createElement('div');
    bankDetailsDiv.id = 'bankDetails' + id;
    bankDetailsDiv.className = 'bankDetails';
    bankDetailsDiv.innerHTML = `
        <input type="text" name="accountName" placeholder="Account Name" value="${accountName}" required />
        <input type="text" name="institute" placeholder="Credit Institute" value="${institute}" required />
        <input type="text" name="iban" placeholder="IBAN" value="${iban}" required />
        <input type="text" name="bic" placeholder="BIC" value="${bic}" required />
        <input type="text" name="gleaubigerId" placeholder="Glaeubiger ID" value="${gleaubigerId}" required />
        <input type="button" value="X" onclick="document.getElementById('bankDetails${id}').remove()" />
        `;
    return bankDetailsDiv;
}

const onSendTestEmailButtonClick = async () => {
    let testEmailButton = document.getElementById('sendTestEmailButton');
    let receiver = document.querySelector('input[name="testEmail"]').value;
    let includeAttachement = document.getElementById('includeAttachment').checked;

    // Regular expression for email validation
    let emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (emailRegex.test(receiver)) {
        testEmailButton.disabled = true; // disable the button

        window.email.sendTestMail(receiver, includeAttachement).then(
            (rslt) => {
                if(rslt.success) {
                    alert('Test email successfully sent to ' + receiver);
                } else {
                    alert("Error sendin testmail: " + rslt.error);
                }
                testEmailButton.disabled = false; // enable the button
            },
            (error) => {
                alert('Error sending test email: ' + error);
                testEmailButton.disabled = false; // enable the button
            }
        );
        
    } else {
        alert('Invalid email address: ' + receiver);
    }
}